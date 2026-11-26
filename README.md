# Komari Pane

![Version](https://img.shields.io/badge/version-v1.0.1-18181b?style=flat-square)
![Design System](https://img.shields.io/badge/Solid%20Glass-3--Tier%20Materiality-3f3f46?style=flat-square)
![Theme](https://img.shields.io/badge/Komari%20Monitor-Theme-52525b?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-63ba89?style=flat-square)

[中文文档](#中文文档) · [English Overview](#english-overview)

![Komari Pane Preview](./preview.png)

---

## 中文文档

**Komari Pane** 是面向 [Komari Monitor](https://github.com/komari-monitor/komari) 的监控主题，使用 **JavaScript、Vite、Tailwind CSS v4** 和 **Solid Glass** 设计系统，将节点状态、流量和历史指标集中呈现在一个面板中。

### 核心特性

- **Solid Glass 三层物理材质与性能模式**
  - 严格区分三层玻璃厚度：`glass-panel`（顶部总览面板与工具栏）、`bg-card`（节点卡片、统计卡与图表卡）与 `bg-popover`（弹出层与详情弹窗），表面保持中性灰并仅以语义色标示运行状态。
  - 原生支持 **深色 / 浅色 / 跟随系统** 外观切换（同步 `localStorage["appearance"]`）与 **中 / 英** 双语切换（同步 `localStorage["language"]`）。
  - 支持 `reduce_transparency`（`data-glass="opaque"`）低透明高性能模式，在低性能设备上关闭 backdrop-filter 模糊的同时保留边缘高光与层级对比。

- **208×96 半调点阵世界地图**
  - 基于 `208×96` Halftone Pattern Waves 点阵渲染全球轮廓，实时绘制太阳晨昏线（Solar Terminator）与 `UTC+8` 时钟。
  - 支持 `cluster`（聚合气泡）与 `spread`（微距展开）两种重合节点展示模式，鼠标悬浮自动钳位在视口内并可点击直达节点详情。
  - 内置智能城市关键词与 ISO-2 地区码双级坐标解析，未配置地域或无法识别坐标的节点自动跳过绘制，避免错误落点。

- **5.5×5.5 Micro Slats 遥测图表**
  - 首页「网络与流量」面板采用 `5.5×5.5` 微型条栅 Canvas 实时绘制全网聚合上/下行速率，右上角真实汇总全节点 `↑ 总上行 / ↓ 总下行` 累计流量。
  - 节点详情弹窗提供自适应速率刻度的单节点网络图表，以及 **CPU / RAM 负载历史** 与 **多轨 Ping 延迟图表**（1–3 轨独立分隔，支持点击图例芯片单轨全高放大）。
  - Ping 图表支持 **L1 丢包与超时可视化**：部分丢包在柱顶以警示红提示，100% 超时渲染半透明红柱与亮红顶盖。

- **多形态视图与访客本地偏好**
  - 支持 **标准卡片（`comfortable`）**、**紧凑卡片（`compact`）** 与 **内凹表体列表视图（Recessed Table）** 三种浏览形态。
  - 全链路速率与流量采用自适应单位（`B/s`–`GB/s` 与 `B`–`PB`），所有实时数字启用 `tabular-nums` 等宽对齐防抖动；支持大洲规范化分组标签栏、关键词搜索、仅看在线筛选与多维度排序。
  - 访客可通过右上角「主题配置」抽屉按个人习惯覆盖面板显隐与性能模式（持久化于 `localStorage["komari_pane_prefs_v1"]`），并支持**一键恢复站点默认**。

---

### 安装与使用

1. 按下方步骤构建主题 ZIP，例如 `temp/komari-theme-pane-1.0.1.zip`，无需解压。
2. 登录你的 Komari Monitor 管理后台，进入 **主题管理（Theme Management）**。
3. 上传 ZIP 并启用 **Komari Pane**，打开站点首页查看节点。
4. 可在后台主题设置中修改顶部自定义标语、置顶服务器和公告。

---

### 本地开发与自行构建

```bash
# 克隆仓库并安装依赖
git clone https://github.com/PRSSTRA/komari-theme-pane.git
cd komari-theme-pane
npm install

# 生产构建并打包
npm run package
```

ZIP 输出到 `temp/komari-theme-pane-<版本号>.zip`。如需本地预览，启动开发服务器并将 API 和 WebSocket 代理到可访问的 Komari 后端：

```bash
VITE_API_TARGET=http://127.0.0.1:25774 npm run dev
```

---

## English Overview

**Komari Pane** is a theme for [Komari Monitor](https://github.com/komari-monitor/komari), built with **JavaScript, Vite, Tailwind CSS v4**, and the **Solid Glass** design system.

### Highlights

- **Solid Glass 3-Tier Materiality**: Calibrated neutral glass hierarchy (`glass-panel`, `bg-card`, `bg-popover`) with Dark / Light / System appearance (`localStorage["appearance"]`), bilingual `zh-CN` / `en` UI (`localStorage["language"]`), and a `reduce_transparency` (`data-glass="opaque"`) high-performance mode.

- **208×96 Halftone World Map**: Pattern Waves dot-matrix projection featuring a live solar terminator, UTC+8 clock, `cluster | spread` overlap modes, and smart city-keyword + ISO-2 coordinate resolution.

- **5.5×5.5 Micro Slats Telemetry Charts**: High-precision canvas slat charts for aggregate and per-node network throughput, CPU/RAM load history, and multi-track Ping latency with L1 packet-loss / 100% timeout visualization and single-track zoom.

- **Card, Compact & Recessed Table Views**: Supports `comfortable` / `compact` cards and a recessed table view with adaptive `B/s`–`GB/s` and `B`–`PB` units (`tabular-nums`), continent-normalized group tabs, and a visitor local preference drawer (`localStorage["komari_pane_prefs_v1"]`) with one-click reset to site defaults.

- **Live Telemetry**: Streams node telemetry over Komari's `/api/clients` WebSocket. Billing and expiry figures are visible only when signed in and the billing display is enabled.

---
### Quick Start

1. Build the theme ZIP as shown below, for example `temp/komari-theme-pane-1.0.1.zip`. Do not extract it.
2. Open your Komari Admin panel → **Theme Management**.
3. Upload the ZIP, activate **Komari Pane**, and open your site's home page to view its nodes.
4. Optionally set the hero wordmark, pinned servers, and announcement in the admin theme settings.

---
### Development & Build

```bash
npm install
npm run package
```

The archive is written to `temp/komari-theme-pane-<version>.zip`. For local development, point the dev server at a running Komari backend to proxy API and WebSocket traffic:

```bash
VITE_API_TARGET=http://127.0.0.1:25774 npm run dev
```

---

## Credits & License

- **[Komari Monitor](https://github.com/komari-monitor/komari)** — Server monitoring backend and theme ecosystem
- **[Solid Glass (`deeplethe/solid-glass`)](https://github.com/deeplethe/solid-glass)** — Physical glass surface tokens and component styling
- **Repository**: [https://github.com/PRSSTRA/komari-theme-pane](https://github.com/PRSSTRA/komari-theme-pane)
- **License**: Released under the [MIT License](./LICENSE) © 2026 **Prstra**
