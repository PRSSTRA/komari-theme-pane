import './pane.css';
import { state, t, mediaDark, resolveAppearance, rememberPreferences, SORT_OPTIONS, formatCityName,
  formatGroupLabel, normalizeGroupName, renderFlagBadge, renderPinnedBadge, isNodeFeatured,
  formatUptime, formatRate, formatRateParts, formatTrafficGB, formatPriceLabel, PIN_BTN_ICON_SVG } from './state.js';
import { initNodeList, renderGroups, renderNodes } from './nodes.js';
import { drawWorldMapCanvas, initWorldMapInteractions, renderMapMarkers, updateUtc8Clock, formatUtc8Time } from './world-map.js';
import { fmtClock, fmtRateTick, drawSlatRoundRect, sgSmoothstep, fillEasedVignette, computeSlatWave,
  renderSummary, drawNetSlatsChartCanvas, recordNetwork, resetNetwork, seedNetwork } from './network.js';
import { initEvents, recordEvents, renderEventFeed, resetEvents } from './events.js';
import { initHeroWordmarkShuffle } from './wordmark.js';
import { loadSite, loadNodes, loadRecentReports, getSession, login, logout, saveSettings, subscribeTelemetry, normalizeNodes } from './komari.js';
import { createDetail } from './detail.js';

const { renderDetailModal, closeDetailModal, drawDetailSlatsChartCanvas, drawDetailNetSlatsCanvas } = createDetail({
  state, t, formatUptime, formatRate, formatRateParts, formatTrafficGB, formatPriceLabel,
  formatCityName, formatGroupLabel, normalizeGroupName, renderFlagBadge, isNodeFeatured, renderPinnedBadge,
  togglePinnedNode, PIN_BTN_ICON_SVG, drawSlatRoundRect, sgSmoothstep, fillEasedVignette, computeSlatWave, fmtClock, fmtRateTick,
});

function renderOverviewLayout() {
  const hero = document.getElementById("overview-hero");
  const mapPanel = document.getElementById("world-map-panel");
  const mapViewport = document.getElementById("map-viewport");
  const summaryPanel = document.getElementById("summary-bar");
  const eventPanel = document.getElementById("event-feed-panel");
  const eventInner = document.getElementById("event-feed-inner");
  const wordmarkWrap = document.getElementById("hero-wordmark-wrap");

  const showMap = Boolean(state.settings.show_world_map);
  const showSummary = Boolean(state.settings.show_summary_bar);
  const showEvents = Boolean(state.settings.show_event_feed);
  const showClock = Boolean(state.settings.show_map_clock);
  const visibleCount = (showMap ? 1 : 0) + (showSummary ? 1 : 0) + (showEvents ? 1 : 0);
  const hasHero = visibleCount > 0;

  const mapClockEl = document.getElementById("map-utc8-clock");
  if (mapClockEl) {
    mapClockEl.classList.toggle("hidden", !showClock);
    mapClockEl.classList.toggle("inline-flex", showClock);
    if (showClock) {
      const clockTimeEl = document.getElementById("map-utc8-time");
      if (clockTimeEl) clockTimeEl.textContent = formatUtc8Time(Date.now());
    }
  }

  // Keep wordmark tucked behind the top panels when hero is visible; cleanly spaced if all hero panels are hidden
  wordmarkWrap.className = hasHero
    ? "pointer-events-none relative z-0 -mb-3 overflow-x-clip select-none text-center sm:-mb-5"
    : "pointer-events-none relative z-0 mb-1 overflow-x-clip select-none text-center";

  // Reset base panel classes cleanly (applying hidden AFTER base classes so toggles always work reliably)
  if (!hasHero) {
    hero.className = "hidden";
  } else if (visibleCount === 3) {
    hero.className = "relative z-10 grid w-full items-stretch gap-4 lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[1.45fr_0.95fr_0.82fr]";
  } else if (visibleCount === 2) {
    if (showMap) {
      hero.className = "relative z-10 grid w-full items-stretch gap-4 lg:grid-cols-[1.58fr_1fr]";
    } else {
      hero.className = "relative z-10 grid w-full items-stretch gap-4 lg:grid-cols-[1.28fr_1fr]";
    }
  } else {
    hero.className = "relative z-10 grid w-full grid-cols-1 gap-4";
  }

  mapPanel.className = showMap
    ? "sg-panel sg-glass-backdrop relative order-1 flex min-w-0 flex-col overflow-hidden rounded-xl p-4"
    : "hidden";

  if (mapViewport) {
    if (showMap && visibleCount === 1) {
      mapViewport.className = "relative h-[340px] w-full overflow-hidden rounded-lg sm:h-[400px]";
      mapViewport.style.aspectRatio = "";
      mapViewport.style.maxHeight = "";
    } else {
      mapViewport.className = "relative w-full overflow-hidden rounded-lg";
      mapViewport.style.aspectRatio = "1024 / 473";
      mapViewport.style.maxHeight = "400px";
    }
  }

  if (!showSummary) {
    summaryPanel.className = "hidden";
  } else if (visibleCount === 3) {
    // When 3 panels are enabled and width < xl (not enough for 3 columns), Network & Traffic drops to full-width row 2 (order-3)
    // while Live Events swaps up beside the map (order-2); on xl+, Network & Traffic sits in the middle column (xl:order-2).
    summaryPanel.className = "sg-panel sg-glass-backdrop relative order-3 flex h-[280px] min-w-0 flex-col overflow-hidden rounded-xl lg:col-span-2 xl:order-2 xl:col-span-1 xl:h-full xl:min-h-0";
  } else if (showMap) {
    summaryPanel.className = "sg-panel sg-glass-backdrop relative order-2 flex h-full min-h-[280px] min-w-0 flex-col overflow-hidden rounded-xl lg:min-h-0";
  } else {
    summaryPanel.className = "sg-panel sg-glass-backdrop relative order-1 flex h-[320px] min-w-0 flex-col overflow-hidden rounded-xl sm:h-[340px]";
  }

  if (!showEvents) {
    eventPanel.className = "hidden";
  } else if (visibleCount === 3) {
    eventPanel.className = "sg-panel sg-glass-backdrop relative order-2 flex min-h-[240px] min-w-0 flex-col overflow-hidden rounded-xl lg:min-h-0 xl:order-3";
    if (eventInner) eventInner.className = "flex max-h-[260px] min-h-0 flex-1 flex-col lg:absolute lg:inset-0 lg:max-h-none";
  } else if (visibleCount === 2 && showMap) {
    eventPanel.className = "sg-panel sg-glass-backdrop relative order-2 flex min-h-[260px] min-w-0 flex-col overflow-hidden rounded-xl lg:min-h-0";
    if (eventInner) eventInner.className = "flex max-h-[260px] min-h-0 flex-1 flex-col lg:absolute lg:inset-0 lg:max-h-none";
  } else if (visibleCount === 2) {
    eventPanel.className = "sg-panel sg-glass-backdrop relative order-2 flex h-[320px] min-w-0 flex-col overflow-hidden rounded-xl sm:h-[340px]";
    if (eventInner) eventInner.className = "flex h-full min-h-0 flex-1 flex-col";
  } else {
    eventPanel.className = "sg-panel sg-glass-backdrop relative order-1 flex h-[300px] min-w-0 flex-col overflow-hidden rounded-xl";
    if (eventInner) eventInner.className = "flex h-full min-h-0 flex-1 flex-col";
  }
}

function clampMenuInViewport(rootEl, menuEl) {
  if (!rootEl || !menuEl || menuEl.getAttribute("data-open") !== "true") return;
  menuEl.style.left = "";
  menuEl.style.right = "0px";
  const rootRect = rootEl.getBoundingClientRect();
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const menuW = Math.min(menuEl.offsetWidth || 200, vw - 24);
  const desiredLeft = rootRect.right - menuW;
  const clampedLeft = Math.max(12, Math.min(vw - menuW - 12, desiredLeft));
  menuEl.style.right = "auto";
  menuEl.style.left = `${Math.round(clampedLeft - rootRect.left)}px`;
}

let lastSortMenuSig = "";

function renderSortSelect() {
  const currentOpt = SORT_OPTIONS.find((o) => o.value === state.sortBy) || SORT_OPTIONS[0];
  const iconEl = document.getElementById("sort-select-icon");
  if (iconEl) iconEl.innerHTML = currentOpt.icon;
  document.getElementById("sort-select-label").textContent = t(currentOpt.key);

  const trigger = document.getElementById("sort-select-trigger");
  const menu = document.getElementById("sort-select-menu");
  trigger.setAttribute("aria-expanded", String(state.sortMenuOpen));
  menu.setAttribute("data-open", String(state.sortMenuOpen));

  const sig = state.lang;
  if (lastSortMenuSig !== sig) {
    lastSortMenuSig = sig;
    menu.innerHTML = SORT_OPTIONS.map((opt) => `
      <button type="button" role="option" data-slot="select-item" data-sort-val="${opt.value}" class="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left" style="color: var(--sg-fg);">
        <span class="inline-flex items-center gap-2">
          <span data-sort-icon class="inline-flex items-center">${opt.icon}</span>
          <span>${t(opt.key)}</span>
        </span>
        <svg data-sort-check class="h-3.5 w-3.5 shrink-0 transition-opacity duration-150" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
      </button>
    `).join("");

    menu.querySelectorAll("[data-sort-val]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.sortBy = btn.getAttribute("data-sort-val");
        state.sortMenuOpen = false;
        renderSortSelect();
        renderNodes();
      });
    });
  }

  menu.querySelectorAll("[data-sort-val]").forEach((btn) => {
    const selected = btn.getAttribute("data-sort-val") === state.sortBy;
    btn.setAttribute("data-selected", String(selected));
    const ic = btn.querySelector("[data-sort-icon]");
    if (ic) ic.style.color = selected ? "var(--sg-fg)" : "var(--sg-muted-fg)";
    const ck = btn.querySelector("[data-sort-check]");
    if (ck) ck.style.opacity = selected ? "1" : "0";
  });

  if (state.sortMenuOpen) {
    clampMenuInViewport(document.getElementById("sort-select-root"), menu);
  }
}

const VIEW_OPTION_ICONS = {
  show_offline_first: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>`,
  show_total_traffic: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>`,
  show_traffic_bar: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="9" width="20" height="6" rx="3"/><path d="M6 12h7"/></svg>`,
  show_tags: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".75" fill="currentColor"/></svg>`,
  show_load_temp: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`,
  show_pricing: `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`,
};

let lastViewOptionsSig = "";

function renderViewOptionsMenu() {
  const trigger = document.getElementById("btn-view-options");
  const menu = document.getElementById("view-options-menu");
  if (!trigger || !menu) return;

  const isCard = state.view === "card";
  const en = state.lang === "en";
  trigger.setAttribute("aria-expanded", String(state.viewOptionsOpen));
  menu.setAttribute("data-open", String(state.viewOptionsOpen));

  const sig = `${state.view}|${state.lang}|${state.loggedIn}`;
  if (lastViewOptionsSig !== sig) {
    lastViewOptionsSig = sig;
    const rawFields = isCard
      ? [
          { key: "show_offline_first", label: en ? "Pin Offline First" : "离线节点置顶" },
          { key: "show_total_traffic", label: en ? "Cumulative Traffic" : "节点累计流量", sub: en ? "Up / Down" : "↑ 上行 / ↓ 下行" },
          { key: "show_pricing", label: en ? "Billing & Expiry" : "费用与到期时间" },
          { key: "show_traffic_bar", label: en ? "Monthly Quota Bar" : "月流量配额进度条" },
          { key: "show_tags", label: en ? "Node Tags" : "节点标签" },
          { key: "show_load_temp", label: en ? "Load & Temp" : "Load 负载与温度" },
        ]
      : [
          { key: "show_offline_first", label: en ? "Pin Offline First" : "离线节点置顶" },
          { key: "show_total_traffic", label: en ? "Cumulative Traffic" : "累计流量列", sub: en ? "Up / Down" : "↑ 上行 / ↓ 下行" },
          { key: "show_pricing", label: en ? "Billing Info" : "费用与到期时间" },
          { key: "show_traffic_bar", label: en ? "Monthly Quota" : "月流量配额进度条" },
          { key: "show_tags", label: en ? "Node Tags" : "节点标签" },
          { key: "show_load_temp", label: en ? "Load & Temp" : "Load 负载与温度" },
        ];
    const fields = state.loggedIn ? rawFields : rawFields.filter((f) => f.key !== "show_pricing");

    const headerTitle = isCard
      ? (en ? "Card Display" : "卡片显示项")
      : (en ? "Table Columns" : "列表显示项");

    const densityBlock = isCard
      ? `
        <div class="mb-3 space-y-1.5">
          <div class="text-[11px] font-medium" style="color: var(--sg-muted-fg);">${en ? "Card Density" : "卡片密度"}</div>
          <div data-slot="tabs-list" data-variant="default" class="flex h-8 w-full">
            <button type="button" data-slot="tabs-trigger" data-vo-density="comfortable" class="flex-1 px-2 text-xs">${en ? "Standard" : "标准"}</button>
            <button type="button" data-slot="tabs-trigger" data-vo-density="compact" class="flex-1 px-2 text-xs">${en ? "Compact" : "紧凑"}</button>
          </div>
        </div>
      `
      : "";

    menu.innerHTML = `
      <div class="mb-2.5 flex items-center">
        <span class="text-[11px] font-semibold tracking-tight" style="color: var(--sg-fg);">${headerTitle}</span>
      </div>
      ${densityBlock}
      <div class="space-y-1">
        ${fields.map((f) => {
          const icon = VIEW_OPTION_ICONS[f.key] || "";
          return `
            <div class="flex items-center justify-between gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--sg-hover-faint)]">
              <div class="flex min-w-0 items-center gap-2">
                <span data-vo-icon="${f.key}" class="inline-flex shrink-0 items-center transition-colors duration-150">${icon}</span>
                <div class="min-w-0">
                  <div class="truncate text-xs" style="color: var(--sg-fg);">${f.label}</div>
                  ${f.sub ? `<div class="mono-num truncate text-[10px]" style="color: var(--sg-subtle-fg);">${f.sub}</div>` : ""}
                </div>
              </div>
              <button type="button" role="switch" data-slot="switch" data-vo-sw="${f.key}" aria-label="${f.label}" class="shrink-0">
                <span data-slot="switch-thumb"></span>
              </button>
            </div>
          `;
        }).join("")}
      </div>
    `;

    menu.querySelectorAll("[data-vo-density]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.settings.card_density = btn.getAttribute("data-vo-density");
        rememberPreferences();
        renderAll();
      });
    });

    menu.querySelectorAll("[data-vo-sw]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const k = btn.getAttribute("data-vo-sw");
        const next = !state.settings[k];
        state.settings[k] = next;
        // One-way open coupling: turning ON either Node Tags or Load & Temp enables both; turning OFF acts independently
        if (next) {
          if (k === "show_tags") state.settings.show_load_temp = true;
          else if (k === "show_load_temp") state.settings.show_tags = true;
        }
        rememberPreferences();
        renderAll();
      });
    });
  }

  // Patch density tabs & switches in-place so CSS thumb/tab transitions run smoothly
  menu.querySelectorAll("[data-vo-density]").forEach((btn) => {
    const active = btn.getAttribute("data-vo-density") === state.settings.card_density;
    btn.setAttribute("data-active", String(active));
  });
  menu.querySelectorAll("[data-vo-sw]").forEach((btn) => {
    const k = btn.getAttribute("data-vo-sw");
    const checked = Boolean(state.settings[k]);
    btn.setAttribute("aria-checked", String(checked));
    btn.setAttribute("data-checked", String(checked));
    const ic = menu.querySelector(`[data-vo-icon="${k}"]`);
    if (ic) ic.style.color = checked ? "var(--sg-fg)" : "var(--sg-muted-fg)";
  });

  // Keep #view-options-menu strictly within viewport (left >= 12px and right <= vw - 12px)
  if (state.viewOptionsOpen) {
    clampMenuInViewport(document.getElementById("view-tabs-root"), menu);
  }
}

function setDrawerOpen(open) {
  state.drawerOpen = open;
  const drawer = document.getElementById("managed-drawer");
  const btn = document.getElementById("btn-managed");
  btn.setAttribute("aria-expanded", String(open));

  if (open) {
    if (!drawer.open) drawer.showModal();
    requestAnimationFrame(() => {
      drawer.setAttribute("data-open", "true");
    });
  } else {
    drawer.setAttribute("data-open", "false");
    setTimeout(() => {
      if (!state.drawerOpen && drawer.open) {
        drawer.close();
      }
    }, 230);
  }
}

async function togglePinnedNode(uuid) {
  if (!state.loggedIn) return;
  const pinned = state.settings.featured_nodes;
  await updateManaged('featured_nodes', pinned.includes(uuid) ? pinned.filter(id => id !== uuid) : [...pinned, uuid]);
}

function renderPinnedNodesDrawer() {
  const isZh = state.lang === "zh-CN";
  const lbl = document.getElementById("drawer-pinned-label");
  const cntEl = document.getElementById("drawer-pinned-count");
  const clearBtn = document.getElementById("btn-clear-pinned");
  const searchEl = document.getElementById("input-pinned-search");
  const listEl = document.getElementById("pinned-nodes-list");
  const emptyEl = document.getElementById("pinned-nodes-empty");
  if (!listEl) return;

  const pinnedSet = new Set(Array.isArray(state.settings.featured_nodes) ? state.settings.featured_nodes : []);
  if (lbl) lbl.textContent = isZh ? "置顶服务器" : "Pinned Servers";
  if (cntEl) cntEl.textContent = pinnedSet.size > 0 ? String(pinnedSet.size) : "";
  if (clearBtn) {
    clearBtn.textContent = isZh ? "清空" : "Clear";
    clearBtn.classList.toggle("hidden", pinnedSet.size === 0);
  }
  if (searchEl) searchEl.placeholder = isZh ? "筛选服务器…" : "Filter servers…";
  if (emptyEl) emptyEl.textContent = isZh ? "无匹配服务器" : "No matching servers";

  const nodeSig = state.nodes.map((n) => n.uuid).join(",");
  if (listEl.dataset.sig !== nodeSig) {
    listEl.dataset.sig = nodeSig;
    listEl.innerHTML = state.nodes.map((n) => `
      <div data-pin-row="${n.uuid}" class="sg-event-row flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2 py-1.5">
        <span class="flex min-w-0 flex-1 items-center gap-2">
          ${renderFlagBadge(n.region, "sm")}
          <span class="truncate text-xs" style="color: var(--sg-fg);">${n.name}</span>
        </span>
        <button type="button" role="switch" data-slot="switch" data-pin-sw="${n.uuid}" class="shrink-0" aria-label="${n.name}">
          <span data-slot="switch-thumb"></span>
        </button>
      </div>
    `).join("");

    listEl.querySelectorAll("[data-pin-row]").forEach((row) => {
      row.addEventListener("click", () => {
        togglePinnedNode(row.getAttribute("data-pin-row"));
      });
    });
  }

  const q = (state.pinnedSearch || "").trim().toLowerCase();
  let visibleCount = 0;
  state.nodes.forEach((n) => {
    const row = listEl.querySelector(`[data-pin-row="${n.uuid}"]`);
    const sw = listEl.querySelector(`[data-pin-sw="${n.uuid}"]`);
    const checked = pinnedSet.has(n.uuid);
    if (sw) {
      sw.setAttribute("aria-checked", String(checked));
      sw.setAttribute("data-checked", String(checked));
    }
    if (row) {
      const hay = `${n.name} ${n.region} ${n.city} ${formatCityName(n.city)} ${normalizeGroupName(n.group)} ${formatGroupLabel(normalizeGroupName(n.group))}`.toLowerCase();
      const match = !q || hay.includes(q);
      row.classList.toggle("hidden", !match);
      if (match) visibleCount += 1;
    }
  });
  if (emptyEl) emptyEl.classList.toggle("hidden", visibleCount > 0);
}

function renderHeader() {
  state.theme = resolveAppearance(state.appearance);
  document.documentElement.lang = state.lang;
  const stage = document.getElementById("sg-stage");
  document.documentElement.classList.toggle('dark', state.theme === 'dark');
  stage.setAttribute("data-glass", state.settings.reduce_transparency ? "opaque" : "translucent");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.getElementById("btn-lang").textContent = state.lang === "zh-CN" ? "中" : "EN";

  const isZh = state.lang === "zh-CN";
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.placeholder = isZh ? "搜索节点、地区、CPU、标签…" : "Search nodes, region, CPU, tags…";
    searchInput.setAttribute("aria-label", searchInput.placeholder);
  }
  const themeTitleMap = isZh
    ? { dark: "暗黑模式", light: "明亮模式", system: "跟随系统" }
    : { dark: "Dark mode", light: "Light mode", system: "System theme" };
  document.querySelectorAll("#theme-tabs [data-appearance]").forEach((tab) => {
    const mode = tab.getAttribute("data-appearance");
    if (themeTitleMap[mode]) {
      tab.setAttribute("title", themeTitleMap[mode]);
      tab.setAttribute("aria-label", themeTitleMap[mode]);
    }
  });
  const viewOptBtn = document.getElementById("btn-view-options");
  if (viewOptBtn) {
    const voTitle = isZh ? "显示项设置" : "Display options";
    viewOptBtn.setAttribute("title", voTitle);
    viewOptBtn.setAttribute("aria-label", voTitle);
  }
  const replayBtn = document.getElementById("btn-replay-hero");
  if (replayBtn) {
    replayBtn.textContent = isZh ? "重播入场" : "Replay";
    replayBtn.setAttribute("title", isZh ? "重播顶部标语动画" : "Replay wordmark animation");
  }
  const managedLabel = document.getElementById("btn-managed-label");
  const managedBtn = document.getElementById("btn-managed");
  if (managedLabel) managedLabel.textContent = isZh ? "主题配置" : "Theme";
  if (managedBtn) {
    const titleTxt = isZh ? "主题配置" : "Theme Settings";
    managedBtn.setAttribute("title", titleTxt);
    managedBtn.setAttribute("aria-label", titleTxt);
  }

  const authBtn = document.getElementById("btn-auth");
  const authIcon = document.getElementById("btn-auth-icon");
  const authLabel = document.getElementById("btn-auth-label");
  const adminMenu = document.getElementById("admin-menu");
  if (authBtn && authIcon && authLabel) {
    if (state.loggedIn) {
      authIcon.innerHTML = `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`;
      authLabel.textContent = isZh ? "管理后台" : "Admin";
      authBtn.setAttribute("title", isZh ? "Komari 管理后台" : "Komari Admin");
      authBtn.setAttribute("aria-expanded", String(state.adminMenuOpen));
    } else {
      authIcon.innerHTML = `<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>`;
      authLabel.textContent = isZh ? "登录" : "Sign in";
      authBtn.setAttribute("title", isZh ? "登录 Komari" : "Sign in to Komari");
      authBtn.setAttribute("aria-expanded", "false");
    }
  }
  if (adminMenu) {
    const openAdmin = state.loggedIn && state.adminMenuOpen;
    adminMenu.setAttribute("data-open", String(openAdmin));
    if (openAdmin) {
      clampMenuInViewport(document.getElementById("auth-control-root"), adminMenu);
    }
  }
  const setSimpleTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };
  setSimpleTxt("admin-goto-label", isZh ? "进入 Komari 后台" : "Open Komari Admin");
  setSimpleTxt("admin-logout-label", isZh ? "退出登录" : "Sign Out");
  setSimpleTxt("auth-title", isZh ? "登录 Komari" : "Sign in to Komari");
  setSimpleTxt("auth-desc", isZh ? "登录后可进入 Komari 后台管理，并查看节点费用与续费信息。" : "Sign in to access Komari Admin and view node billing & renewal info.");
  setSimpleTxt("auth-user-label", isZh ? "用户名" : "Username");
  setSimpleTxt("auth-pass-label", isZh ? "密码" : "Password");
  setSimpleTxt("btn-auth-cancel", isZh ? "取消" : "Cancel");
  setSimpleTxt("auth-submit-label", isZh ? "登录" : "Sign in");
  setSimpleTxt("auth-otp-label", isZh ? "两步验证码" : "Two-factor code");
  setSimpleTxt("auth-sso", isZh ? "单点登录" : "Single sign-on");
  const sso = document.getElementById('auth-sso');
  sso.classList.toggle('hidden', !state.site.oauth_enable);
  sso.classList.toggle('inline-flex', Boolean(state.site.oauth_enable));
  for (const id of ['auth-user', 'auth-pass']) document.getElementById(id).parentElement.classList.toggle('hidden', Boolean(state.site.disable_password_login));
  document.getElementById('btn-auth-submit').classList.toggle('hidden', Boolean(state.site.disable_password_login));
  authBtn.setAttribute('aria-label', authLabel.textContent);

  // Only show custom hero_title & pinned_nodes fields inside Theme Drawer when logged in
  const heroField = document.getElementById("hero-title-field");
  if (heroField) {
    heroField.classList.toggle("hidden", !state.loggedIn);
  }
  const pinnedField = document.getElementById("pinned-nodes-field");
  if (pinnedField) {
    pinnedField.classList.toggle("hidden", !state.loggedIn);
  }
  renderPinnedNodesDrawer();

  // Solid Glass Theme Mode Tabs (Dark / Light / System)
  document.querySelectorAll("#theme-tabs [data-appearance]").forEach((tab) => {
    const active = tab.getAttribute("data-appearance") === state.appearance;
    tab.setAttribute("data-active", String(active));
    tab.setAttribute("aria-selected", String(active));
  });

  // Solid Glass View Switcher Tabs (Card / Table) in Server List Toolbar
  const cardBtn = document.getElementById("btn-view-card");
  const tableBtn = document.getElementById("btn-view-table");
  cardBtn.setAttribute("aria-label", t("cardView"));
  tableBtn.setAttribute("aria-label", t("tableView"));
  cardBtn.setAttribute("data-active", String(state.view === "card"));
  cardBtn.setAttribute("aria-selected", String(state.view === "card"));
  tableBtn.setAttribute("data-active", String(state.view === "table"));
  tableBtn.setAttribute("aria-selected", String(state.view === "table"));

  // Solid Glass Online Toggle
  const onlyOnlineBtn = document.getElementById("btn-online-only");
  onlyOnlineBtn.setAttribute("aria-pressed", String(state.onlyOnline));

  // Guard removed "raw" overlap mode -> fallback to "cluster"
  if (state.mapOverlapMode !== "cluster" && state.mapOverlapMode !== "spread") {
    state.mapOverlapMode = "cluster";
  }

  // Drawer Density Tabs (if present)
  document.querySelectorAll(".density-btn").forEach((btn) => {
    const active = btn.getAttribute("data-density") === state.settings.card_density;
    btn.setAttribute("data-active", String(active));
  });

  const heroLbl = document.getElementById("drawer-hero-label");
  if (heroLbl) heroLbl.textContent = isZh ? "顶部自定义标语" : "Hero Wordmark";

  // Render Panel-Grouped Managed Settings Cards once per language, then patch switches & tabs in-place for smooth animations
  const swContainer = document.getElementById("managed-switches");
  const swHtml = (key) => `
    <button type="button" role="switch" data-slot="switch" data-sw="${key}" class="shrink-0">
      <span data-slot="switch-thumb"></span>
    </button>
  `;

  if (swContainer.dataset.langSig !== state.lang) {
    swContainer.dataset.langSig = state.lang;
    swContainer.innerHTML = `
      <!-- Panel Card: World Map -->
      <div class="sg-inset-pane rounded-xl p-3.5">
        <div class="flex items-center justify-between gap-3">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
            <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span>${t("mapTitle")}</span>
          </span>
          ${swHtml("show_world_map")}
        </div>

        <div id="drawer-map-subopts" class="mt-3 space-y-2.5 transition-opacity duration-200">
          <div class="space-y-1.5">
            <div class="text-[11px]" style="color: var(--sg-muted-fg);">${isZh ? "同区策略" : "Overlap Strategy"}</div>
            <div data-slot="tabs-list" data-variant="default" class="flex h-8 w-full">
              <button type="button" data-slot="tabs-trigger" data-overlap="cluster" class="overlap-btn flex-1 px-2 text-xs">${isZh ? "聚合" : "Cluster"}</button>
              <button type="button" data-slot="tabs-trigger" data-overlap="spread" class="overlap-btn flex-1 px-2 text-xs">${isZh ? "微散开" : "Spread"}</button>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 pt-0.5">
            <span class="text-xs" style="color: var(--sg-muted-fg);">${isZh ? "地图时间显示" : "Map Clock (UTC+8)"}</span>
            ${swHtml("show_map_clock")}
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-xs" style="color: var(--sg-muted-fg);">${isZh ? "地图昼夜晨昏线" : "Solar Terminator"}</span>
            ${swHtml("show_solar_terminator")}
          </div>
        </div>
      </div>

      <!-- Panel Card: Network & Traffic -->
      <div class="sg-inset-pane rounded-xl p-3.5">
        <div class="flex items-center justify-between gap-3">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
            <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span>${t("networkTitle")}</span>
          </span>
          ${swHtml("show_summary_bar")}
        </div>
      </div>

      <!-- Panel Card: Live Events -->
      <div class="sg-inset-pane rounded-xl p-3.5">
        <div class="flex items-center justify-between gap-3">
          <span class="inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
            <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
            <span>${t("eventsTitle")}</span>
          </span>
          ${swHtml("show_event_feed")}
        </div>
      </div>

      <!-- Panel Card: Appearance & Performance -->
      <div class="sg-inset-pane space-y-2.5 rounded-xl p-3.5">
        <div class="flex items-center gap-1.5 text-xs font-semibold tracking-tight" style="color: var(--sg-fg);">
          <svg class="h-3.5 w-3.5 shrink-0" style="color: var(--sg-muted-fg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
          <span>${isZh ? "外观与性能" : "Appearance & Performance"}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs" style="color: var(--sg-muted-fg);">${isZh ? "低透明高性能模式" : "Reduce Transparency"}</span>
          ${swHtml("reduce_transparency")}
        </div>
      </div>
    `;

    swContainer.querySelectorAll("[data-sw]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const k = btn.getAttribute("data-sw");
        state.settings[k] = !state.settings[k];
        rememberPreferences();
        renderAll();
      });
    });

    swContainer.querySelectorAll(".overlap-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mapOverlapMode = btn.getAttribute("data-overlap");
        rememberPreferences();
        state.pinnedClusterKey = null;
        state.hoveredClusterKey = null;
        const mapTip = document.getElementById("map-tooltip");
        if (mapTip) mapTip.classList.add("hidden");
        renderAll();
      });
    });
  }

  // Patch switches, overlap tabs, and map sub-options state in-place for smooth CSS transitions
  swContainer.querySelectorAll("[data-sw]").forEach((btn) => {
    const k = btn.getAttribute("data-sw");
    const checked = Boolean(state.settings[k]);
    btn.setAttribute("aria-label", btn.previousElementSibling.textContent.trim());
    btn.setAttribute("aria-checked", String(checked));
    btn.setAttribute("data-checked", String(checked));
  });
  swContainer.querySelectorAll(".overlap-btn").forEach((btn) => {
    const active = btn.getAttribute("data-overlap") === state.mapOverlapMode;
    btn.setAttribute("data-active", String(active));
  });
  const mapSubOpts = document.getElementById("drawer-map-subopts");
  if (mapSubOpts) {
    const mapOn = Boolean(state.settings.show_world_map);
    mapSubOpts.classList.toggle("pointer-events-none", !mapOn);
    mapSubOpts.classList.toggle("opacity-45", !mapOn);
  }

  renderSortSelect();
  renderViewOptionsMenu();

  const noticeBar = document.getElementById("notice-bar");
  const hasNotice = Boolean(state.settings.site_notice && state.settings.site_notice.trim());
  noticeBar.classList.toggle("hidden", !hasNotice);
  noticeBar.classList.toggle("flex", hasNotice);
  document.getElementById("notice-text").textContent = state.settings.site_notice;
}

// ---- Event Listeners ----
document.querySelectorAll("#theme-tabs [data-appearance]").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.appearance = tab.getAttribute("data-appearance");
    rememberPreferences();
    renderAll();
  });
});

if (mediaDark && mediaDark.addEventListener) {
  mediaDark.addEventListener("change", () => {
    if (state.appearance === "system") renderAll();
  });
}

document.getElementById("btn-view-card").addEventListener("click", () => { state.view = "card"; renderAll(); });
document.getElementById("btn-view-table").addEventListener("click", () => { state.view = "table"; renderAll(); });
document.getElementById("btn-lang").addEventListener("click", () => { state.lang = state.lang === "zh-CN" ? "en" : "zh-CN"; rememberPreferences(); renderAll(); });
document.getElementById("btn-online-only").addEventListener("click", () => { state.onlyOnline = !state.onlyOnline; renderAll(); });
document.getElementById("search-input").addEventListener("input", (e) => {
  state.search = e.target.value;
  renderNodes();
  renderMapMarkers();
});

// Integrated View Display Options Popover & Custom Solid Glass Select (mutually exclusive with Admin menu)
document.getElementById("btn-view-options").addEventListener("click", (e) => {
  e.stopPropagation();
  state.viewOptionsOpen = !state.viewOptionsOpen;
  if (state.viewOptionsOpen) {
    if (state.sortMenuOpen) { state.sortMenuOpen = false; renderSortSelect(); }
    if (state.adminMenuOpen) { state.adminMenuOpen = false; renderHeader(); }
  }
  renderViewOptionsMenu();
});
document.getElementById("sort-select-trigger").addEventListener("click", (e) => {
  e.stopPropagation();
  state.sortMenuOpen = !state.sortMenuOpen;
  if (state.sortMenuOpen) {
    if (state.viewOptionsOpen) { state.viewOptionsOpen = false; renderViewOptionsMenu(); }
    if (state.adminMenuOpen) { state.adminMenuOpen = false; renderHeader(); }
  }
  renderSortSelect();
});

// Native <dialog> Right Drawer handlers (Escape via cancel, light-dismiss outside sheet)
const managedDrawerEl = document.getElementById("managed-drawer");
const managedDrawerPanelEl = document.getElementById("managed-drawer-panel");
document.getElementById("btn-managed").addEventListener("click", (e) => {
  e.stopPropagation();
  setDrawerOpen(!state.drawerOpen);
});
document.getElementById("btn-drawer-close").addEventListener("click", () => setDrawerOpen(false));
managedDrawerEl.addEventListener("cancel", (e) => {
  if (e.cancelable) {
    e.preventDefault();
    setDrawerOpen(false);
  }
});
managedDrawerEl.addEventListener("close", () => {
  state.drawerOpen = false;
  managedDrawerEl.setAttribute("data-open", "false");
  document.getElementById("btn-managed").setAttribute("aria-expanded", "false");
});
let drawerPressedOutside = false;
managedDrawerEl.addEventListener("pointerdown", (e) => {
  drawerPressedOutside = !managedDrawerPanelEl.contains(e.target);
});
managedDrawerEl.addEventListener("pointerup", (e) => {
  if (drawerPressedOutside && !managedDrawerPanelEl.contains(e.target)) {
    setDrawerOpen(false);
  }
  drawerPressedOutside = false;
});

// Native <dialog> Detail Modal handlers (animated Alert-Dialog Esc + backdrop light-dismiss)
const detailModalEl = document.getElementById("detail-modal");
const detailCardEl = document.getElementById("detail-dialog");
detailModalEl.addEventListener("cancel", (e) => {
  if (e.cancelable) {
    e.preventDefault();
    closeDetailModal();
  }
});
detailModalEl.addEventListener("close", () => {
  state.selectedNodeId = null;
  detailModalEl.setAttribute("data-open", "false");
  detailModalEl.returnValue = "";
});
let detailPressedOutside = false;
const isOutsideEl = (e, el) => {
  const r = el.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
};
detailModalEl.addEventListener("pointerdown", (e) => {
  detailPressedOutside = isOutsideEl(e, detailCardEl);
});
detailModalEl.addEventListener("pointerup", (e) => {
  if (detailPressedOutside && isOutsideEl(e, detailCardEl)) {
    closeDetailModal();
  }
  detailPressedOutside = false;
});

// Auth Modal (Login Alert Dialog) + Komari Admin Gear Menu handlers
const authModalEl = document.getElementById("auth-modal");
const authDialogEl = document.getElementById("auth-dialog");
let authCloseTimer = 0;

function openAuthModal() {
  clearTimeout(authCloseTimer);
  report("auth-error", "");
  if (!authModalEl.open) {
    authModalEl.setAttribute("data-open", "false");
    authModalEl.showModal();
    void authDialogEl.offsetWidth;
    requestAnimationFrame(() => {
      if (authModalEl.open) authModalEl.setAttribute("data-open", "true");
    });
  } else {
    authModalEl.setAttribute("data-open", "true");
  }
}

function closeAuthModal() {
  if (!authModalEl.open) return;
  authModalEl.setAttribute("data-open", "false");
  clearTimeout(authCloseTimer);
  authCloseTimer = setTimeout(() => {
    if (authModalEl.getAttribute("data-open") === "false" && authModalEl.open) {
      authModalEl.close();
    }
  }, 170);
}

document.getElementById("btn-auth").addEventListener("click", (e) => {
  e.stopPropagation();
  if (!state.loggedIn) {
    openAuthModal();
  } else {
    state.adminMenuOpen = !state.adminMenuOpen;
    if (state.adminMenuOpen) {
      if (state.sortMenuOpen) { state.sortMenuOpen = false; renderSortSelect(); }
      if (state.viewOptionsOpen) { state.viewOptionsOpen = false; renderViewOptionsMenu(); }
    }
    renderHeader();
  }
});
document.getElementById("btn-auth-close").addEventListener("click", () => closeAuthModal());
document.getElementById("btn-auth-cancel").addEventListener("click", () => closeAuthModal());
authDialogEl.addEventListener('submit', async event => {
  event.preventDefault();
  if (state.site.disable_password_login) return;
  const submit = document.getElementById('btn-auth-submit');
  const otp = document.getElementById('auth-otp');
  report('auth-error', '');
  submit.disabled = true;
  try {
    await login({ username: document.getElementById('auth-user').value.trim(),
      password: document.getElementById('auth-pass').value, twoFactorCode: otp.value.trim() });
    state.loggedIn = true;
    state.adminMenuOpen = false;
    authDialogEl.reset();
    document.getElementById('auth-otp-field').classList.add('hidden');
    closeAuthModal();
    await connect();
  } catch (error) {
    if (/2fa|two.factor|otp|两步|二次/i.test(error.message)) {
      document.getElementById('auth-otp-field').classList.remove('hidden');
      otp.focus();
    }
    report('auth-error', error.message);
  } finally {
    submit.disabled = false;
  }
});
authModalEl.addEventListener("cancel", (e) => {
  if (e.cancelable) {
    e.preventDefault();
    closeAuthModal();
  }
});
authModalEl.addEventListener("close", () => {
  authModalEl.setAttribute("data-open", "false");
  authModalEl.returnValue = "";
});
let authPressedOutside = false;
authModalEl.addEventListener("pointerdown", (e) => {
  authPressedOutside = isOutsideEl(e, authDialogEl);
});
authModalEl.addEventListener("pointerup", (e) => {
  if (authPressedOutside && isOutsideEl(e, authDialogEl)) {
    closeAuthModal();
  }
  authPressedOutside = false;
});
document.getElementById('btn-goto-admin').addEventListener('click', () => location.assign('/admin'));
document.getElementById('btn-logout').addEventListener('click', async () => {
  try {
    await logout();
    location.reload();
  } catch (error) {
    report('site-error', error.message);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.sortMenuOpen) {
      state.sortMenuOpen = false;
      renderSortSelect();
    }
    if (state.viewOptionsOpen) {
      state.viewOptionsOpen = false;
      renderViewOptionsMenu();
    }
    if (state.adminMenuOpen) {
      state.adminMenuOpen = false;
      renderHeader();
    }
  }
});

document.addEventListener("click", (e) => {
  const sortRoot = document.getElementById("sort-select-root");
  if (state.sortMenuOpen && sortRoot && !sortRoot.contains(e.target)) {
    state.sortMenuOpen = false;
    renderSortSelect();
  }
  const viewRoot = document.getElementById("view-tabs-root");
  if (state.viewOptionsOpen && viewRoot && !viewRoot.contains(e.target)) {
    state.viewOptionsOpen = false;
    renderViewOptionsMenu();
  }
  const authRoot = document.getElementById("auth-control-root");
  if (state.adminMenuOpen && authRoot && !authRoot.contains(e.target)) {
    state.adminMenuOpen = false;
    renderHeader();
  }
  const mapTooltip = document.getElementById("map-tooltip");
  if (state.pinnedClusterKey && !mapTooltip.contains(e.target)) {
    state.pinnedClusterKey = null;
    mapTooltip.classList.add("hidden");
    drawWorldMapCanvas();
  }
});

// rAF-throttled resize to avoid redundant canvas re-rasterization
let resizeRaf = 0;
window.addEventListener("resize", () => {
  if (resizeRaf) return;
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0;
    drawWorldMapCanvas();
    drawNetSlatsChartCanvas();
    if (state.selectedNodeId) {
      drawDetailSlatsChartCanvas();
      drawDetailNetSlatsCanvas();
    }
    if (state.viewOptionsOpen) clampMenuInViewport(document.getElementById("view-tabs-root"), document.getElementById("view-options-menu"));
    if (state.sortMenuOpen) clampMenuInViewport(document.getElementById("sort-select-root"), document.getElementById("sort-select-menu"));
    if (state.loggedIn && state.adminMenuOpen) clampMenuInViewport(document.getElementById("auth-control-root"), document.getElementById("admin-menu"));
  });
});

// ---- Solid Glass Component Library Tooltip Controller (Top-Layer popover="manual", zero native OS tooltips) ----
function initSolidGlassTooltip() {
  const tipEl = document.getElementById("sg-tooltip");
  if (!tipEl) return;

  let activeTrigger = null;
  let showTimer = 0;
  let hideTimer = 0;

  const extractTooltipText = (el) => {
    if (!el || el.nodeType !== 1) return "";
    const rawTitle = el.getAttribute("title");
    if (rawTitle) {
      el.setAttribute("data-sg-tip", rawTitle);
      el.removeAttribute("title");
    }
    return el.getAttribute("data-sg-tip") || "";
  };

  const findTooltipTarget = (node) => {
    let cur = node;
    while (cur && cur !== document.body && cur.nodeType === 1) {
      if (cur.hasAttribute("title") || cur.hasAttribute("data-sg-tip")) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return null;
  };

  const positionTooltip = (anchor) => {
    const rect = anchor.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tipW = tipEl.offsetWidth || 120;
    const tipH = tipEl.offsetHeight || 28;
    const gap = 7;

    let side = "top";
    let top = rect.top - tipH - gap;
    if (top < 8) {
      side = "bottom";
      top = rect.bottom + gap;
    }
    if (top + tipH > vh - 8) {
      top = Math.max(8, vh - tipH - 8);
    }
    const left = Math.max(8, Math.min(vw - tipW - 8, rect.left + rect.width * 0.5 - tipW * 0.5));
    tipEl.setAttribute("data-side", side);
    tipEl.style.left = `${Math.round(left)}px`;
    tipEl.style.top = `${Math.round(top)}px`;
  };

  const showFor = (el, immediate = false) => {
    const text = extractTooltipText(el);
    if (!text) return;
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    activeTrigger = el;

    const reveal = () => {
      if (activeTrigger !== el || !el.isConnected) return;
      const freshText = extractTooltipText(el);
      if (!freshText) return;
      tipEl.textContent = freshText;
      try {
        if (!tipEl.matches(":popover-open")) tipEl.showPopover();
      } catch {
        tipEl.style.display = "block";
      }
      positionTooltip(el);
      requestAnimationFrame(() => {
        if (activeTrigger === el) {
          positionTooltip(el);
          tipEl.setAttribute("data-open", "true");
        }
      });
    };

    if (immediate) reveal();
    else showTimer = setTimeout(reveal, 160);
  };

  const hideNow = () => {
    clearTimeout(showTimer);
    activeTrigger = null;
    tipEl.setAttribute("data-open", "false");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (tipEl.getAttribute("data-open") === "false") {
        try {
          if (tipEl.matches(":popover-open")) tipEl.hidePopover();
        } catch {
          tipEl.style.display = "none";
        }
      }
    }, 110);
  };

  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const target = findTooltipTarget(e.target);
    if (!target) {
      if (activeTrigger) hideNow();
      return;
    }
    if (target === activeTrigger) return;
    showFor(target, false);
  }, true);

  document.addEventListener("pointerout", (e) => {
    if (!activeTrigger) return;
    const nextTarget = findTooltipTarget(e.relatedTarget);
    if (nextTarget !== activeTrigger) {
      hideNow();
    }
  }, true);

  document.addEventListener("focusin", (e) => {
    const target = findTooltipTarget(e.target);
    if (target && target.matches(":focus-visible")) {
      showFor(target, true);
    }
  }, true);

  document.addEventListener("focusout", () => {
    if (activeTrigger) hideNow();
  }, true);

  document.addEventListener("pointerdown", () => {
    if (activeTrigger) hideNow();
  }, true);

  window.addEventListener("scroll", () => {
    if (activeTrigger) hideNow();
  }, true);
}


function report(id, message) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('hidden', !message);
}

function renderAll() {
  renderHeader();
  renderOverviewLayout();
  renderSummary();
  renderEventFeed();
  renderGroups();
  renderNodes();
  requestAnimationFrame(renderMapMarkers);
  if (state.selectedNodeId) renderDetailModal();
}

function applySite(site) {
  state.site = site;
  const settings = site.theme_settings;
  state.settings.hero_title = typeof settings?.hero_title === 'string' ? settings.hero_title.trim().slice(0, 32) : 'Komari Pane';
  state.settings.site_notice = typeof settings?.site_notice === 'string' ? settings.site_notice : '';
  state.settings.featured_nodes = Array.isArray(settings?.featured_nodes) ? settings.featured_nodes : [];
  const input = document.getElementById('input-hero-title');
  input.value = state.settings.hero_title;
}

let saving = false;
async function updateManaged(key, value) {
  if (!state.loggedIn || saving) return;
  saving = true;
  const errorTarget = state.drawerOpen ? 'settings-error' : state.selectedNodeId ? 'detail-settings-error' : 'site-error';
  report(errorTarget, '');
  const controls = document.querySelectorAll('#input-hero-title, #btn-clear-pinned, [data-pin-sw], [data-unpin-node], #btn-detail-pin');
  for (const control of controls) control.disabled = true;
  try {
    await saveSettings({ [key]: value });
    state.settings[key] = value;
    if (key === 'hero_title') initHeroWordmarkShuffle();
    renderAll();
  } catch (error) {
    document.getElementById('input-hero-title').value = state.settings.hero_title;
    report(document.getElementById(errorTarget) ? errorTarget : 'site-error', error.message);
  } finally {
    saving = false;
    for (const control of controls) control.disabled = false;
  }
}

let stopTelemetry;
let reconnectPage;
let connection;
async function connect() {
  stopTelemetry?.();
  clearTimeout(reconnectPage);
  connection = undefined;
  state.dataStatus = 'loading';
  state.nodes = [];
  resetEvents();
  resetNetwork();
  renderAll();
  try {
    const [site, session] = await Promise.all([loadSite(), getSession()]);
    applySite(site);
    state.loggedIn = Boolean(session?.logged_in);
    if (site.private_site && !state.loggedIn) {
      state.dataStatus = 'private';
      renderAll();
      initHeroWordmarkShuffle();
      openAuthModal();
      return;
    }
    const clients = await loadNodes();
    const activeConnection = Symbol();
    connection = activeConnection;
    let firstFrame = true;
    stopTelemetry = subscribeTelemetry(snapshot => {
      const previous = state.nodes;
      state.nodes = normalizeNodes(clients, snapshot, previous);
      const redraw = state.dataStatus !== 'ready';
      state.dataStatus = 'ready';
      const now = Date.now();
      recordEvents(previous, now);
      recordNetwork(now);
      if (redraw) {
        report('site-error', '');
        renderAll();
      } else {
        renderSummary();
        renderEventFeed();
        renderNodes();
        renderMapMarkers();
      }
      if (firstFrame) {
        firstFrame = false;
        if (state.settings.show_summary_bar) {
          loadRecentReports(state.nodes.filter(node => node.online).map(node => node.uuid)).then(history => {
            if (connection !== activeConnection) return;
            seedNetwork(history, now);
            renderSummary();
          });
        }
        initHeroWordmarkShuffle();
      }
    }, () => {
      state.dataStatus = 'error';
      report('site-error', state.lang === 'en' ? 'Connection interrupted · Reconnecting…' : '连接中断 · 正在重连…');
      renderEventFeed();
      renderNodes();
    });
  } catch (error) {
    state.dataStatus = error.status === 401 || error.status === 403 ? 'private' : 'error';
    renderAll();
    if (state.dataStatus === 'private') openAuthModal();
    else reconnectPage = setTimeout(connect, 5000);
  }
}

const heroInput = document.getElementById('input-hero-title');
heroInput.addEventListener('change', () => updateManaged('hero_title', heroInput.value.trim()));
heroInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); heroInput.blur(); }
});
document.getElementById('btn-replay-hero').addEventListener('click', initHeroWordmarkShuffle);
document.getElementById('input-pinned-search').addEventListener('input', event => {
  state.pinnedSearch = event.target.value;
  renderPinnedNodesDrawer();
});
document.getElementById('btn-clear-pinned').addEventListener('click', () => updateManaged('featured_nodes', []));

initSolidGlassTooltip();
initNodeList(renderDetailModal, togglePinnedNode);
initWorldMapInteractions(renderDetailModal);
initEvents(renderDetailModal);
updateUtc8Clock();
setInterval(() => { if (!document.hidden) updateUtc8Clock(); }, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateUtc8Clock(); });
connect();
