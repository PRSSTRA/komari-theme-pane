# Komari Pane

将 Solid Glass 样式应用到 Komari 公开监控页面，保留 Komari 自带的管理后台和终端。

## 安装

1. 使用 Node.js 22.13+、pnpm 11 和 `zip`，运行 `pnpm install --frozen-lockfile`、`pnpm package`。
2. 在 Komari 管理后台的主题管理上传 `release/komari-theme-pane-<version>.zip`，然后启用 **Komari Pane**。不要上传源码压缩包。
3. 访问站点首页。管理员可通过主题配置抽屉设置顶部标语和置顶服务器，通过后台主题配置管理站点公告。外观、语言和显示项保存在当前浏览器。

## 本地开发

```sh
KOMARI_URL=http://127.0.0.1:25774 pnpm dev
```

`KOMARI_URL` 指向现有 Komari 实例，Vite 转发公开 API 和实时 WebSocket。需要验证全局主题配置写入时，请在测试实例上安装并启用 Pane。`temp/` 保存本地样稿、截图和 ZIP，不纳入版本控制。

已使用 Komari 1.6.2 验证。地图使用节点上报的国家或地区位置，不从名称或 IP 推算城市。今日流量、温度和历史记录以接口实测字段为准；缺失字段不生成演示数据。

[Komari 主题开发指南](https://komari-document.pages.dev/dev/theme)
