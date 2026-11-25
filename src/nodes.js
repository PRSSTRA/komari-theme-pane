import { state, t, getFilteredNodes, dataMessage, CONTINENT_ORDER, UNGROUPED_KEY, normalizeGroupName,
  formatGroupLabel, renderFlagBadge, isNodeFeatured, renderPinnedBadge, formatUptime, formatPriceLabel,
  formatRate, formatRateParts, formatTrafficGB, formatTrafficPartsGB, toneColor, nodeStatusColor, percent } from './state.js';
import { renderMapMarkers } from './world-map.js';

function renderGroups() {
  const counts = Object.assign(Object.create(null), { ALL: state.nodes.length });
  state.nodes.forEach((n) => {
    const g = normalizeGroupName(n.group);
    if (!g) return;
    counts[g] = (counts[g] || 0) + 1;
  });
  const presentGroups = Object.keys(counts)
    .filter((g) => g !== "ALL" && counts[g] > 0)
    .sort((a, b) => {
      if (a === UNGROUPED_KEY && b !== UNGROUPED_KEY) return 1;
      if (b === UNGROUPED_KEY && a !== UNGROUPED_KEY) return -1;
      const ia = CONTINENT_ORDER.indexOf(a);
      const ib = CONTINENT_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  if (state.group !== "ALL" && !counts[state.group]) {
    state.group = "ALL";
  }
  const groups = ["ALL", ...presentGroups];

  const container = document.getElementById("group-tabs");
  const groupSig = `${state.lang}|${groups.map((g) => `${g}:${counts[g]}`).join(",")}`;
  if (container.dataset.sig !== groupSig) {
    container.dataset.sig = groupSig;
    container.innerHTML = groups.map((g, idx) => {
      const label = formatGroupLabel(g);
      const spanAll = idx === 0 && groups.length % 2 === 1;
      return `
        <button type="button" role="tab" data-slot="tabs-trigger" data-group="${idx}" data-span-all="${spanAll}" class="shrink-0 whitespace-nowrap px-2.5 text-xs">
          <span>${label}</span>
          <span class="mono-num text-[11px] opacity-65">${counts[g]}</span>
        </button>
      `;
    }).join("");

    container.querySelectorAll("[data-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.group = groups[Number(btn.getAttribute("data-group"))];
        renderGroups();
        renderNodes();
        renderMapMarkers();
      });
    });
  }

  container.querySelectorAll("[data-group]").forEach((btn) => {
    const active = state.group === groups[Number(btn.getAttribute("data-group"))];
    btn.setAttribute("data-active", String(active));
    btn.setAttribute("aria-selected", String(active));
  });
}

function renderMeter(label, valueText, pct, subText, metricKey) {
  const color = toneColor(pct);
  return `
    <div class="space-y-1">
      <div class="flex items-center justify-between text-[11px]">
        <span style="color: var(--sg-muted-fg);">${label}</span>
        <span data-m-val="${metricKey}" class="mono-num font-medium" style="color: ${pct >= 70 ? color : "var(--sg-fg)"};">
          ${valueText}${subText ? `<span class="ml-1 font-normal" style="color: var(--sg-subtle-fg);">${subText}</span>` : ""}
        </span>
      </div>
      <div data-slot="progress-track" class="h-1.5 w-full overflow-hidden rounded-full">
        <div data-m-bar="${metricKey}" data-slot="progress-indicator" class="h-full rounded-full" style="width: ${Math.min(100, Math.max(0, pct))}%; background: ${color};"></div>
      </div>
    </div>
  `;
}

function renderCardGrid(list) {
  const compact = state.settings.card_density === "compact";
  const minCardW = compact ? "272px" : "320px";
  return `
    <div class="grid ${compact ? "gap-3" : "gap-3.5"} px-4 pb-4 pt-1" style="grid-template-columns: repeat(auto-fill, minmax(min(100%, ${minCardW}), 1fr));">
      ${list.map((n) => {
        const ramPct = percent(n.ramUsed, n.ramTotal);
        const diskPct = percent(n.diskUsed, n.diskTotal);
        const quotaPct = n.trafficLimitTB > 0 ? (n.trafficUsedTB / n.trafficLimitTB) * 100 : 0;
        const dotColor = nodeStatusColor(n);

        return `
          <article data-slot="card" data-node="${n.uuid}" class="km-node-card sg-card sg-card-interactive relative flex cursor-pointer flex-col rounded-xl ${compact ? "gap-3 p-4" : "gap-4 p-5"} ${!n.online ? "opacity-65" : ""}">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  ${renderFlagBadge(n.region, "md")}
                  <h3 class="min-w-0 truncate text-sm font-medium tracking-tight"><button type="button" data-open-node class="truncate text-left">${n.name}</button></h3>
                  ${isNodeFeatured(n) ? renderPinnedBadge(n.uuid, true) : ""}
                </div>
              </div>
              <span data-slot="badge" data-variant="secondary" class="shrink-0 px-2 py-0.5 text-[11px] mono-num">
                <span data-m-dot class="h-[6px] w-[6px] rounded-[1.5px]" style="background: ${dotColor};"></span>
                <span data-m-uptime>${n.online ? formatUptime(n.uptimeSec) : t("offline")}</span>
              </span>
            </div>

            <div class="grid ${compact ? "grid-cols-3 gap-2.5" : "grid-cols-1 gap-2"}">
              ${renderMeter("CPU", n.online ? `${n.cpu.toFixed(1)}%` : "—", n.online ? n.cpu : 0, "", "cpu")}
              ${renderMeter("RAM", n.online && n.ramTotal > 0 ? `${ramPct.toFixed(0)}%` : "—", n.online ? ramPct : 0, compact || !n.online || !n.ramTotal ? "" : `${n.ramUsed.toFixed(1)}/${+n.ramTotal.toFixed(1)}G`, "ram")}
              ${renderMeter("Disk", n.diskTotal > 0 ? `${diskPct.toFixed(0)}%` : "—", diskPct, compact || !n.diskTotal ? "" : `${n.diskUsed.toFixed(0)}/${+n.diskTotal.toFixed(1)}G`, "disk")}
            </div>

            <div class="sg-inset-pane rounded-lg px-2.5 py-2 text-[11px]">
              <div class="flex items-center justify-between mono-num">
                <span style="color: var(--sg-muted-fg);">↑ <strong data-m-up class="font-medium" style="color: var(--sg-fg);">${formatRate(n.online ? n.netOut : 0)}</strong></span>
                <span style="color: var(--sg-muted-fg);">↓ <strong data-m-down class="font-medium" style="color: var(--sg-fg);">${formatRate(n.online ? n.netIn : 0)}</strong></span>
              </div>
              ${state.settings.show_total_traffic ? `
                <div class="mt-1 flex items-center justify-between mono-num text-[10.5px]" style="color: var(--sg-subtle-fg);">
                  <span>↑ <span data-m-totup>${formatTrafficGB(n.totalUpGB)}</span></span>
                  <span>↓ <span data-m-totdown>${formatTrafficGB(n.totalDownGB)}</span></span>
                </div>
              ` : ""}
              ${state.settings.show_traffic_bar && n.trafficLimitTB > 0 ? `
                <div class="mt-2 space-y-1">
                  <div class="flex items-center justify-between text-[10px] mono-num" style="color: var(--sg-subtle-fg);">
                    <span>${t("quota")}</span>
                    <span>${n.trafficUsedTB.toFixed(2)} / ${n.trafficLimitTB.toFixed(1)} TB (${quotaPct.toFixed(0)}%)</span>
                  </div>
                  <div data-slot="progress-track" class="h-1 w-full overflow-hidden rounded-full">
                    <div data-slot="progress-indicator" class="h-full rounded-full" style="width: ${Math.min(100, quotaPct)}%; background: ${toneColor(quotaPct)};"></div>
                  </div>
                </div>
              ` : ""}
            </div>

            ${(state.settings.show_tags || state.settings.show_load_temp || (state.loggedIn && state.settings.show_pricing)) ? `
              <div class="mt-auto flex min-h-[24px] flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]" style="color: var(--sg-subtle-fg);">
                <div class="flex flex-wrap items-center gap-1.5">
                  ${state.settings.show_tags ? n.tags.slice(0, compact ? 2 : 3).map((tag) => `<span data-slot="tag">${tag}</span>`).join("") : ""}
                </div>
                <div class="flex items-center gap-2 mono-num">
                  ${state.settings.show_load_temp && n.online ? `<span data-m-load>L ${n.load.toFixed(2)}</span>${n.temp > 0 ? `<span>${n.temp.toFixed(0)}°C</span>` : ""}` : ""}
                  ${state.loggedIn && state.settings.show_pricing && (Boolean(n.price) || n.expireDays !== null) ? `<span style="color: var(--sg-muted-fg);">${formatPriceLabel(n.price)}${n.price && n.expireDays !== null ? " · " : ""}${n.expireDays !== null ? `${n.expireDays}d` : ""}</span>` : ""}
                </div>
              </div>
            ` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderTableView(list) {
  const en = state.lang === "en";
  const showBillingCol = state.loggedIn && state.settings.show_pricing;
  const cols = [
    { min: 220, track: "minmax(220px, 2.6fr)" },
    { min: 76, track: "minmax(76px, 0.80fr)" },
    { min: 76, track: "minmax(76px, 0.80fr)" },
    { min: 76, track: "minmax(76px, 0.80fr)" },
    { min: 104, track: "minmax(104px, 0.96fr)" },
  ];
  if (state.settings.show_total_traffic) cols.push({ min: 96, track: "minmax(96px, 0.88fr)" });
  if (state.settings.show_traffic_bar) cols.push({ min: 98, track: "minmax(98px, 0.90fr)" });
  if (state.settings.show_load_temp) cols.push({ min: 82, track: "minmax(82px, 0.72fr)" });
  cols.push(showBillingCol ? { min: 108, track: "minmax(108px, 0.80fr)" } : { min: 78, track: "minmax(78px, 0.56fr)" });

  const gridCols = cols.map((c) => c.track).join(" ");
  const minTableWidth = cols.reduce((acc, c) => acc + c.min, 24);
  const dirLegend = `<span class="ml-1 mono-num text-[10px] font-normal"><span style="color: var(--sg-fg);">↑</span><span style="color: var(--sg-subtle-fg);">/↓</span></span>`;

  return `
    <div class="px-4 pb-4 pt-1">
      <div data-slot="table-container" class="sg-table-shell overflow-hidden rounded-xl">
        <div class="sg-scroll-thin overflow-x-auto">
          <div data-slot="table" role="table" class="km-ui-table w-full text-left text-xs" style="min-width: ${minTableWidth}px; --sg-table-cols: ${gridCols};">
            <!-- Bright outer top header slab (px-3 = 6px outer frame + 6px inner well padding for 1:1 column alignment) -->
            <div data-slot="table-header" role="rowgroup" class="px-3">
              <div role="row" class="sg-table-grid items-center py-2.5 text-[11px] font-medium" style="color: var(--sg-muted-fg);">
                <div role="columnheader" class="min-w-0 px-2.5">${en ? "Node / Region" : "节点 / 区域"}</div>
                <div role="columnheader" class="min-w-0 px-2.5">CPU</div>
                <div role="columnheader" class="min-w-0 px-2.5">${en ? "RAM" : "内存"}</div>
                <div role="columnheader" class="min-w-0 px-2.5">${en ? "Disk" : "磁盘"}</div>
                <div role="columnheader" class="min-w-0 whitespace-nowrap px-2.5">${en ? "Live Speed" : "实时速率"}${dirLegend}</div>
                ${state.settings.show_total_traffic ? `<div role="columnheader" class="min-w-0 whitespace-nowrap px-2.5">${en ? "Total Traffic" : "累计流量"}${dirLegend}</div>` : ""}
                ${state.settings.show_traffic_bar ? `<div role="columnheader" class="min-w-0 px-2.5">${en ? "Monthly Quota" : "月流量"}</div>` : ""}
                ${state.settings.show_load_temp ? `<div role="columnheader" class="min-w-0 px-2.5">${en ? "Load / Temp" : "负载 / 温度"}</div>` : ""}
                <div role="columnheader" class="min-w-0 px-2.5 text-right">${showBillingCol ? (en ? "Uptime / Billing" : "在线 / 费用") : (en ? "Uptime" : "在线时长")}</div>
              </div>
            </div>

            <!-- Recessed rounded-rectangle shadow body well (zero row separators) -->
            <div class="px-1.5 pb-1.5">
              <div data-slot="table-body" role="rowgroup" class="sg-table-body space-y-0.5 rounded-[9px] p-1.5">
                ${list.map((n) => {
                  const ramPct = percent(n.ramUsed, n.ramTotal);
                  const diskPct = percent(n.diskUsed, n.diskTotal);
                  const quotaPct = n.trafficLimitTB > 0 ? (n.trafficUsedTB / n.trafficLimitTB) * 100 : 0;
                  const dotColor = nodeStatusColor(n);
                  const upParts = formatRateParts(n.online ? n.netOut : 0);
                  const downParts = formatRateParts(n.online ? n.netIn : 0);
                  const totUpParts = formatTrafficPartsGB(n.totalUpGB);
                  const totDownParts = formatTrafficPartsGB(n.totalDownGB);

                  const miniBar = (pct, key) => `
                    <div data-slot="progress-track" class="mt-1 h-1 w-14 overflow-hidden rounded-full">
                      <div ${key ? `data-m-bar="${key}"` : ""} data-slot="progress-indicator" class="h-full rounded-full" style="width: ${pct}%; background: ${toneColor(pct)};"></div>
                    </div>
                  `;

                  return `
                    <div data-slot="table-row" role="row" data-node="${n.uuid}" class="km-ui-table-row sg-table-row sg-table-grid cursor-pointer items-center py-2 ${!n.online ? "opacity-60" : ""}">
                      <div role="cell" class="min-w-0 px-2.5">
                        <div class="flex items-center gap-2">
                          <span data-m-dot class="h-[6px] w-[6px] shrink-0 rounded-[1.5px]" style="background: ${dotColor};"></span>
                          ${renderFlagBadge(n.region, "md")}
                          <button type="button" data-open-node class="truncate text-left font-medium">${n.name}</button>
                          ${isNodeFeatured(n) ? renderPinnedBadge(n.uuid, true) : ""}
                        </div>
                        <div class="mt-0.5 truncate pl-3.5 text-[11px]" style="color: var(--sg-subtle-fg);">${formatGroupLabel(normalizeGroupName(n.group))}${state.settings.show_tags && n.tags.length ? ` · ${n.tags.slice(0, 2).join(" / ")}` : ""}</div>
                      </div>
                      <div role="cell" class="min-w-0 px-2.5 mono-num">
                        <div data-m-val="cpu" style="color: ${n.cpu >= 70 ? toneColor(n.cpu) : "var(--sg-fg)"};">${n.online ? `${n.cpu.toFixed(1)}%` : "—"}</div>
                        ${miniBar(n.online ? n.cpu : 0, "cpu")}
                      </div>
                      <div role="cell" class="min-w-0 px-2.5 mono-num">
                        <div style="color: ${ramPct >= 70 ? toneColor(ramPct) : "var(--sg-fg)"};">${n.online && n.ramTotal > 0 ? `${ramPct.toFixed(0)}%` : "—"}</div>
                        ${miniBar(n.online ? ramPct : 0, "")}
                      </div>
                      <div role="cell" class="min-w-0 px-2.5 mono-num">
                        <div>${n.diskTotal > 0 ? `${diskPct.toFixed(0)}%` : "—"}</div>
                        ${miniBar(diskPct, "")}
                      </div>
                      <div role="cell" class="min-w-0 px-2.5 mono-num whitespace-nowrap">
                        <div class="sg-rate-line">
                          <span data-m-up>${upParts.value}</span>
                          <span data-m-up-unit style="color: var(--sg-subtle-fg);">${upParts.unit}</span>
                        </div>
                        <div class="sg-rate-line" style="color: var(--sg-muted-fg);">
                          <span data-m-down>${downParts.value}</span>
                          <span data-m-down-unit style="color: var(--sg-subtle-fg);">${downParts.unit}</span>
                        </div>
                      </div>
                      ${state.settings.show_total_traffic ? `
                        <div role="cell" class="min-w-0 px-2.5 mono-num whitespace-nowrap">
                          <div class="sg-traffic-line">
                            <span data-m-totup>${totUpParts.value}</span>
                            <span data-m-totup-unit style="color: var(--sg-subtle-fg);">${totUpParts.unit}</span>
                          </div>
                          <div class="sg-traffic-line" style="color: var(--sg-muted-fg);">
                            <span data-m-totdown>${totDownParts.value}</span>
                            <span data-m-totdown-unit style="color: var(--sg-subtle-fg);">${totDownParts.unit}</span>
                          </div>
                        </div>
                      ` : ""}
                      ${state.settings.show_traffic_bar ? `
                        <div role="cell" class="min-w-0 px-2.5 mono-num whitespace-nowrap">
                          <div class="truncate">${n.trafficLimitTB > 0 ? `${n.trafficUsedTB.toFixed(2)}/${n.trafficLimitTB}T` : formatTrafficGB(n.trafficUsedTB * 1024)}</div>
                          ${n.trafficLimitTB > 0 ? miniBar(quotaPct, "") : `<div class="text-[10px]" style="color: var(--sg-subtle-fg);">${en ? "Unlimited" : "不限"}</div>`}
                        </div>
                      ` : ""}
                      ${state.settings.show_load_temp ? `
                        <div role="cell" class="min-w-0 px-2.5 mono-num whitespace-nowrap">
                          <div data-m-load>${n.online ? n.load.toFixed(2) : "—"}</div>
                          ${n.online && n.temp > 0 ? `<div class="text-[11px]" style="color: var(--sg-subtle-fg);">${n.temp.toFixed(1)}°C</div>` : ""}
                        </div>
                      ` : ""}
                      <div role="cell" class="min-w-0 px-2.5 text-right mono-num whitespace-nowrap">
                        <div data-m-uptime>${n.online ? formatUptime(n.uptimeSec) : t("offline")}</div>
                        ${showBillingCol && (Boolean(n.price) || n.expireDays !== null) ? `<div class="truncate text-[11px]" style="color: var(--sg-subtle-fg);">${formatPriceLabel(n.price)}${n.price && n.expireDays !== null ? " · " : ""}${n.expireDays !== null ? `${n.expireDays}d` : ""}</div>` : ""}
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

let lastNodesSignature = "";

export function initNodeList(openDetail, onPin) {
  document.getElementById('nodes-container').addEventListener('click', (event) => {
    const pin = event.target.closest('[data-unpin-node]');
    if (pin) { onPin(pin.dataset.unpinNode); return; }
    const row = event.target.closest('[data-node]');
    if (row) { state.selectedNodeId = row.dataset.node; openDetail(); }
  });
}

function renderNodes() {
  const container = document.getElementById("nodes-container");
  const list = getFilteredNodes();
  if (!list.length) {
    lastNodesSignature = "";
    container.innerHTML = `<div class="py-14 text-center text-xs" style="color: var(--sg-muted-fg);">${state.dataStatus === "ready" ? t("empty") : dataMessage()}</div>`;
    return;
  }

  const markup = state.view === "card" ? renderCardGrid(list) : renderTableView(list);
  if (markup === lastNodesSignature) return;
  const focused = document.activeElement?.closest('[data-node]');
  const focusKey = focused?.dataset.node;
  const focusAction = document.activeElement?.hasAttribute('data-unpin-node') ? 'data-unpin-node' : 'data-open-node';
  const scroll = container.querySelector('.overflow-x-auto')?.scrollLeft ?? 0;
  lastNodesSignature = markup;
  container.innerHTML = markup;
  if (scroll) container.querySelector('.overflow-x-auto')?.scrollTo(scroll, 0);
  if (focusKey) container.querySelector(`[data-node="${CSS.escape(focusKey)}"] [${focusAction}]`)?.focus({ preventScroll: true });
}


export { renderGroups, renderNodes };
