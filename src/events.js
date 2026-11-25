import { state, t, formatPriceLabel, renderFlagBadge, dataMessage } from './state.js';
import { fmtClock } from './network.js';

// ---- Real-time Telemetry Event Feed (Derived strictly from public node telemetry & state diffs) ----
const eventFeed = {
  items: [],
  nextId: 1,
  highCpuSet: new Set(),
};

function formatEventMessage(ev) {
  const en = state.lang === "en";
  switch (ev.type) {
    case "offline":
      return en ? "Node offline · No heartbeat" : "节点离线 · 心跳中断";
    case "high_cpu":
      return en
        ? `High CPU ${ev.cpu.toFixed(1)}% · Load ${ev.load.toFixed(2)}`
        : `CPU ${ev.cpu.toFixed(1)}% 高载 · Load ${ev.load.toFixed(2)}`;
    case "recovered":
      return en
        ? `CPU settled at ${ev.cpu.toFixed(1)}% · Back to normal`
        : `CPU 回落至 ${ev.cpu.toFixed(1)}% · 已恢复正常`;
    case "quota":
      return en
        ? `Monthly traffic at ${ev.pct.toFixed(0)}% (${ev.used.toFixed(2)}/${ev.limit.toFixed(1)} TB)`
        : `月流量已用 ${ev.pct.toFixed(0)}%（${ev.used.toFixed(2)}/${ev.limit.toFixed(1)} TB）`;
    case "expiring":
      return en
        ? `Expires in ${ev.days} ${ev.days === 1 ? "day" : "days"} · ${formatPriceLabel(ev.price)}`
        : `距到期仅剩 ${ev.days} 天 · ${ev.price}`;
    case "online":
      return en ? "Node reconnected · Online" : "节点重连 · 已恢复在线";
    case "reboot":
      return en ? "System reboot detected" : "检测到节点系统重启";
    default:
      return "";
  }
}

function eventSeverityColor(sev) {
  if (sev === "danger") return "var(--sg-danger)";
  if (sev === "warn") return "var(--sg-warn)";
  if (sev === "success") return "var(--sg-success)";
  return "var(--sg-subtle-fg)";
}

export function resetEvents() {
  eventFeed.items = [];
  eventFeed.highCpuSet.clear();
}

export function recordEvents(previous, now) {
  const before = new Map(previous.map(node => [node.uuid, node]));
  for (const node of state.nodes) {
    const last = before.get(node.uuid);
    const add = (type, severity, fields = {}) => eventFeed.items.unshift({
      id: eventFeed.nextId++, nodeUuid: node.uuid, nodeName: node.name, region: node.region,
      type, severity, isAlert: severity === 'danger' || severity === 'warn',
      timeStr: last || node.online ? fmtClock(now) : '—', ...fields,
    });
    if (!node.online) {
      if (last?.online || !last) add('offline', 'danger');
      eventFeed.highCpuSet.delete(node.uuid);
    } else {
      if (last && !last.online) add('online', 'success');
      if (last?.online && node.uptimeSec + 10 < last.uptimeSec) add('reboot', 'info');
      if (!eventFeed.highCpuSet.has(node.uuid) && node.cpu >= 88) {
        eventFeed.highCpuSet.add(node.uuid);
        add('high_cpu', 'warn', { cpu: node.cpu, load: node.load });
      } else if (eventFeed.highCpuSet.has(node.uuid) && node.cpu < 78) {
        eventFeed.highCpuSet.delete(node.uuid);
        add('recovered', 'success', { cpu: node.cpu });
      }
    }
    const pct = node.trafficLimitTB > 0 ? node.trafficUsedTB / node.trafficLimitTB * 100 : 0;
    const oldPct = last?.trafficLimitTB > 0 ? last.trafficUsedTB / last.trafficLimitTB * 100 : 0;
    if ((pct >= 85 && oldPct < 85) || (pct >= 98 && oldPct < 98)) {
      add('quota', pct >= 98 ? 'danger' : 'warn', { pct, used: node.trafficUsedTB, limit: node.trafficLimitTB });
    }
    if (state.loggedIn && node.expireDays !== null && node.expireDays > 0 && node.expireDays <= 7 &&
      (last?.expireDays == null || last.expireDays > 7)) {
      add('expiring', 'warn', { days: node.expireDays, price: node.price });
    }
  }
  if (eventFeed.items.length > 32) eventFeed.items.length = 32;
}

let openNodeDetail;
export function initEvents(openDetail) { openNodeDetail = openDetail; }

export function renderEventFeed() {
  if (!state.settings.show_event_feed) return;
  const inner = document.getElementById("event-feed-inner");
  if (!inner) return;

  const eligibleItems = state.loggedIn
    ? eventFeed.items
    : eventFeed.items.filter((ev) => ev.type !== "expiring");
  const alertCount = eligibleItems.filter((ev) => ev.isAlert).length;
  const visibleItems = state.eventFilter === "alert"
    ? eligibleItems.filter((ev) => ev.isAlert)
    : eligibleItems;

  if (!inner.dataset.inited) {
    inner.dataset.inited = "1";
    inner.innerHTML = `
      <div class="flex min-h-7 shrink-0 items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <div class="flex min-w-0 items-center gap-2">
          <span class="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
            <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
            <span id="event-feed-title" class="truncate"></span>
          </span>
          <span id="event-feed-alert-badge" class="mono-num hidden shrink-0 items-center gap-1 text-[10.5px]" style="color: var(--sg-muted-fg);"><span class="h-[6px] w-[6px] rounded-[1.5px]" style="background: var(--sg-danger);"></span><span id="event-feed-alert-num"></span></span>
        </div>
        <div data-slot="tabs-list" data-variant="default" role="tablist" class="h-7 shrink-0">
          <button type="button" role="tab" data-slot="tabs-trigger" data-evfilter="all" data-active="true" aria-selected="true" class="px-2 text-[11px]"></button>
          <button type="button" role="tab" data-slot="tabs-trigger" data-evfilter="alert" data-active="false" aria-selected="false" class="px-2 text-[11px]"></button>
        </div>
      </div>
      <div id="event-feed-list" class="sg-scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-2.5"></div>
    `;
    inner.querySelectorAll("[data-evfilter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.eventFilter = btn.getAttribute("data-evfilter");
        renderEventFeed();
      });
    });
  }

  const evTitleEl = document.getElementById("event-feed-title");
  if (evTitleEl) evTitleEl.textContent = t("eventsTitle");
  const evAlertBadge = document.getElementById("event-feed-alert-badge");
  const evAlertNum = document.getElementById("event-feed-alert-num");
  if (evAlertBadge && evAlertNum) {
    if (alertCount > 0) {
      evAlertNum.textContent = String(alertCount);
      evAlertBadge.classList.remove("hidden");
      evAlertBadge.classList.add("inline-flex");
    } else {
      evAlertBadge.classList.add("hidden");
      evAlertBadge.classList.remove("inline-flex");
    }
  }
  inner.querySelectorAll("[data-evfilter]").forEach((btn) => {
    const key = btn.getAttribute("data-evfilter");
    const active = state.eventFilter === key;
    btn.setAttribute("data-active", String(active));
    btn.setAttribute("aria-selected", String(active));
    btn.textContent = key === "all" ? t("eventsAll") : t("eventsAlerts");
  });

  const listEl = document.getElementById("event-feed-list");
  if (!listEl) return;
  const signature = `${state.lang}|${state.dataStatus}|${state.eventFilter}|${visibleItems.map(ev => ev.id).join(',')}`;
  if (listEl.dataset.signature === signature) return;
  listEl.dataset.signature = signature;
  listEl.innerHTML = visibleItems.length ? visibleItems.map((ev) => {
    const evNode = state.nodes.find((x) => x.uuid === ev.nodeUuid);
    const evRegion = ev.region || (evNode ? evNode.region : "");
    return `
    <button type="button" data-event-node="${ev.nodeUuid}" class="sg-event-row flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left">
      <span class="mt-[5px] h-[6px] w-[6px] shrink-0 rounded-[1.5px]" style="background: ${eventSeverityColor(ev.severity)};"></span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <span class="flex min-w-0 items-center gap-1.5 text-[11.5px] font-medium">
            ${renderFlagBadge(evRegion, "sm")}
            <span class="truncate" style="color: var(--sg-fg);">${ev.nodeName}</span>
          </span>
          <span class="mono-num shrink-0 text-[10px]" style="color: var(--sg-subtle-fg);">${ev.timeStr}</span>
        </div>
        <div class="mt-0.5 truncate text-[10.5px] mono-num" style="color: var(--sg-muted-fg);">${formatEventMessage(ev)}</div>
      </div>
    </button>
  `;
  }).join("") : `
    <div class="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 text-center text-[11.5px]" style="color: var(--sg-muted-fg);">
      <span class="h-[6px] w-[6px] rounded-[1.5px]" style="background: ${state.dataStatus === "ready" ? "var(--sg-success)" : "var(--sg-muted-fg)"};"></span>
      <span>${state.dataStatus !== "ready" ? dataMessage() : state.eventFilter === "alert" ? t("eventsEmptyAlerts") : t("eventsHealthy")}</span>
    </div>
  `;

  listEl.querySelectorAll("[data-event-node]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedNodeId = row.getAttribute("data-event-node");
      openNodeDetail();
    });
  });
}

