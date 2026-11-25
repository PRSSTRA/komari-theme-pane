import { fetchNodesLatestViaRpc2, isPrivate, parseWebSocketSnapshot, type TelemetrySnapshot } from '../api/komari.ts';

const WS_PERIOD = 2_000;
const WS_TIMEOUT = 6_000;
const RPC_PERIOD = 2_500;

export function subscribeTelemetry(
  onSnapshot: (snapshot: TelemetrySnapshot) => void,
  onDisconnect: () => void,
  onPrivate: () => void,
): () => void {
  const url = new URL('/api/clients', window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  let stopped = false;
  let socket: WebSocket | undefined;
  let socketTimer: ReturnType<typeof setTimeout> | undefined;
  let rpcTimer: ReturnType<typeof setTimeout> | undefined;
  let rpc: AbortController | undefined;
  let failures = 0;

  function pauseRpc() {
    clearTimeout(rpcTimer);
    rpcTimer = undefined;
    rpc?.abort();
    rpc = undefined;
  }

  async function pollRpc() {
    if (stopped || document.hidden || rpc || failures < 2) return;
    const request = new AbortController();
    rpc = request;
    const started = performance.now();
    try {
      const snapshot = await fetchNodesLatestViaRpc2(request.signal);
      if (rpc === request) onSnapshot(snapshot);
    } catch (error) {
      if (rpc === request) {
        if (isPrivate(error)) onPrivate();
        else onDisconnect();
      }
    } finally {
      if (rpc === request) {
        rpc = undefined;
        const delay = Math.max(0, RPC_PERIOD - (performance.now() - started));
        rpcTimer = setTimeout(() => { rpcTimer = undefined; void pollRpc(); }, delay);
      }
    }
  }

  function reconnect() {
    clearTimeout(socketTimer);
    const previous = socket;
    socket = undefined;
    previous?.close();
    if (stopped) return;
    failures++;
    if (failures === 1 || failures === 2) onDisconnect();
    socketTimer = setTimeout(connect, Math.min(30_000, 1_000 * 2 ** Math.min(failures - 1, 5)));
    if (failures === 2) void pollRpc();
  }

  function connect() {
    if (stopped) return;
    let ws: WebSocket;
    try { ws = new WebSocket(url); } catch { reconnect(); return; }
    socket = ws;
    let awaitingReply = false;
    let started = 0;
    const fail = () => { if (socket === ws) reconnect(); };
    function poll() {
      if (socket !== ws) return;
      awaitingReply = true;
      started = performance.now();
      try { ws.send('get'); } catch { fail(); return; }
      socketTimer = setTimeout(fail, WS_TIMEOUT);
    }
    socketTimer = setTimeout(fail, WS_TIMEOUT);
    ws.onopen = () => {
      if (socket !== ws) return;
      clearTimeout(socketTimer);
      poll();
    };
    ws.onmessage = ({ data }) => {
      if (socket !== ws || !awaitingReply) return;
      let snapshot: TelemetrySnapshot | null;
      try { snapshot = parseWebSocketSnapshot(JSON.parse(data)); } catch { fail(); return; }
      if (!snapshot) return;
      clearTimeout(socketTimer);
      awaitingReply = false;
      failures = 0;
      pauseRpc();
      onSnapshot(snapshot);
      socketTimer = setTimeout(poll, Math.max(0, WS_PERIOD - (performance.now() - started)));
    };
    ws.onclose = ws.onerror = fail;
  }

  function visibility() {
    if (document.hidden) pauseRpc();
    else if (!rpcTimer) void pollRpc();
  }

  document.addEventListener('visibilitychange', visibility);
  connect();
  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', visibility);
    pauseRpc();
    reconnect();
  };
}
