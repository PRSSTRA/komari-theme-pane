# 安装 Komari Pane

请参阅 [README 的安装与快速开始](./README.md#安装与快速开始)。

## 自动发布

所有分支的推送和 Pull Request 都会执行类型检查、测试和构建。仅推送到 `main` 且检查通过后，GitHub Actions 才读取 `komari-theme.json` 的版本；若 `v<版本>` 尚未发布，则为本次构建的提交打标签并上传 Komari 主题 ZIP。已发布的版本不会被覆盖。
