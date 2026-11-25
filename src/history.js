const HOUR_MS = 60 * 60 * 1000;
const MIB = 1024 * 1024;
const LOAD_FIELDS = ['cpu', 'ram', 'up', 'down'];

async function getData(path, signal) {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`Komari history request failed (HTTP ${response.status})`);
  const body = await response.json();
  if (body?.status !== 'success' || body.data == null) {
    throw new Error(body?.message || 'Komari history request failed');
  }
  return body.data;
}

function getRecords(data) {
  // The legacy Go adapter can serialize an empty slice as null.
  if (data.records === null) return [];
  if (!Array.isArray(data.records)) throw new Error('Invalid Komari history records');
  return data.records;
}

function nonnegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function recordTime(record, uuid) {
  if (typeof record?.time !== 'string' || (record.client && record.client !== uuid)) return NaN;
  return Date.parse(record.time);
}

function timeline(hours, endTime, project) {
  const startTime = endTime - hours * HOUR_MS;
  const samples = new Map();

  return {
    startTime,
    endTime,
    sample(cols, ramCapacityBytes) {
      if (!Number.isInteger(cols) || cols < 1) throw new RangeError('Expected at least one history column');
      const cached = samples.get(cols);
      if (cached && cached.ramCapacityBytes === ramCapacityBytes) return cached.result;

      const step = (endTime - startTime) / cols;
      const times = Array.from({ length: cols }, (_, i) => Math.round(startTime + (i + 0.5) * step));
      // Trust the server's requested range: rollup timestamps can precede the first bucket's edge.
      const column = (time) => Math.max(0, Math.min(cols - 1, Math.floor((time - startTime) / step)));
      const result = { times, ...project(cols, column, ramCapacityBytes) };
      // Load and Network cards use different widths and redraw on pointer movement.
      if (!cached && samples.size === 2) samples.delete(samples.keys().next().value);
      samples.set(cols, { ramCapacityBytes, result });
      return result;
    },
  };
}

function loadHistory(data, uuid, hours, endTime) {
  const points = [];
  for (const record of getRecords(data)) {
    const time = recordTime(record, uuid);
    if (!Number.isFinite(time)) continue;
    points.push({
      time,
      cpu: nonnegative(record.cpu) ? record.cpu : null,
      ramUsed: nonnegative(record.ram) ? record.ram : null,
      ramTotal: record.ram_total,
      up: nonnegative(record.net_out) ? record.net_out / MIB : null,
      down: nonnegative(record.net_in) ? record.net_in / MIB : null,
    });
  }

  return { empty: points.length === 0, ...timeline(hours, endTime, (cols, column, currentRamBytes) => {
    const sums = LOAD_FIELDS.map(() => Array(cols).fill(0));
    const counts = LOAD_FIELDS.map(() => new Uint32Array(cols));
    let usesCurrentRamCapacity = false;
    const hasCurrentCapacity = Number.isFinite(currentRamBytes) && currentRamBytes > 0;
    const accumulate = (field, index, value) => {
      if (value === null) return;
      sums[field][index] += value;
      counts[field][index]++;
    };

    for (const point of points) {
      const index = column(point.time);
      const hasHistoricalCapacity = Number.isFinite(point.ramTotal) && point.ramTotal > 0;
      const canUseCurrentCapacity = !hasHistoricalCapacity && hasCurrentCapacity
        && point.ramUsed !== null && point.ramUsed <= currentRamBytes;
      accumulate(0, index, point.cpu);
      if (point.ramUsed !== null && (hasHistoricalCapacity || canUseCurrentCapacity)) {
        const capacity = hasHistoricalCapacity ? point.ramTotal : currentRamBytes;
        accumulate(1, index, 100 * point.ramUsed / capacity);
        usesCurrentRamCapacity ||= canUseCurrentCapacity;
      }
      accumulate(2, index, point.up);
      accumulate(3, index, point.down);
    }

    const result = { usesCurrentRamCapacity };
    for (let field = 0; field < LOAD_FIELDS.length; field++) {
      const values = sums[field];
      for (let i = 0; i < cols; i++) values[i] = counts[field][i] ? values[i] / counts[field][i] : null;
      result[LOAD_FIELDS[field]] = values;
    }
    return result;
  }) };
}

function validTaskId(id) {
  return Number.isSafeInteger(id) && id > 0;
}

function taskName(name) {
  return typeof name === 'string' && name.trim() ? name : '';
}

async function pingHistory(data, uuid, hours, endTime, signal) {
  const tasks = new Map();
  for (const task of data.tasks ?? []) {
    if (validTaskId(task?.id)) tasks.set(task.id, { api: task, points: [] });
  }
  for (const record of getRecords(data)) {
    const time = recordTime(record, uuid);
    if (!Number.isFinite(time) || !validTaskId(record.task_id) || !Number.isFinite(record.value)) continue;
    const id = record.task_id;
    if (!tasks.has(id)) tasks.set(id, { api: { id }, points: [] });
    const failed = record.value < 0;
    tasks.get(id).points.push({ time, value: failed ? null : record.value, loss: failed ? 100 : 0 });
  }

  const groups = [...tasks.values()];
  const publicNames = new Map();
  if (groups.some(({ api }) => !taskName(api.name))) {
    // The node response normally has names. Resolve older or unassigned tasks from the public catalog.
    try {
      const catalog = await getData('/api/task/ping', signal);
      for (const task of catalog) publicNames.set(task.id, taskName(task.name));
    } catch (error) {
      if (signal?.aborted) throw error;
      // A missing name must not discard otherwise valid history. The task ID remains displayable.
    }
  }

  const series = groups.map(({ api, points }) => {
    let latest = null;
    let maxLatency = null;
    let failures = 0;
    for (const point of points) {
      if (!latest || point.time > latest.time) latest = point;
      if (point.value === null) failures++;
      else if (maxLatency === null || point.value > maxLatency) maxLatency = point.value;
    }
    const serverLoss = api.total > 0 && nonnegative(api.loss) && api.loss <= 100 ? api.loss : null;
    return {
      id: api.id,
      name: taskName(api.name) || publicNames.get(api.id) || `#${api.id}`,
      latest,
      avgLoss: serverLoss ?? (points.length ? 100 * failures / points.length : null),
      maxLatency,
    };
  });

  return {
    ...timeline(hours, endTime, (cols, column) => ({
      series: groups.map(({ points }, i) => {
        const values = Array(cols).fill(0);
        const losses = Array(cols).fill(0);
        const successes = new Uint32Array(cols);
        for (const point of points) {
          const index = column(point.time);
          if (point.value === null) losses[index]++;
          else {
            values[index] += point.value;
            successes[index]++;
          }
        }
        for (let c = 0; c < cols; c++) {
          const total = successes[c] + losses[c];
          values[c] = successes[c] ? values[c] / successes[c] : null;
          losses[c] = total ? 100 * losses[c] / total : null;
        }
        return { ...series[i], values, losses };
      }),
    })),
    series,
  };
}

/** Fetch one history tab. Sample values are bucket means; empty buckets are null, not zero. */
export async function loadNodeHistory(uuid, hours, tab, signal) {
  if (typeof uuid !== 'string' || !uuid) throw new TypeError('A node UUID is required');
  if (!Number.isInteger(hours) || hours <= 0) throw new RangeError('Expected a positive history hour count');
  if (tab !== 'load' && tab !== 'ping') throw new TypeError('Unknown history tab');

  const params = new URLSearchParams({ uuid, hours });
  if (tab === 'load') params.set('load_type', 'all');
  const data = await getData(`/api/records/${tab}?${params}`, signal);
  const endTime = Date.now();
  return tab === 'load' ? loadHistory(data, uuid, hours, endTime) : pingHistory(data, uuid, hours, endTime, signal);
}
