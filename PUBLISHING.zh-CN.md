# GitHub 与 VS Code 扩展商店发布清单

简体中文 | [English](PUBLISHING.md)

当前目录由已安装扩展还原而来。完成下列检查后可用于运行测试，但尚不是适合长期维护的完整源码仓库。

## 公开发布前必须解决

1. **确认再分发权利。** 上游仓库目前没有可识别的许可证文件。代码公开可见并不等同于获得复制、修改和重新发布许可。发布此修改版本前，应请上游作者补充许可证或取得明确授权。
2. **确认扩展身份。** 当前包保留发布者 `shelus2021` 和名称 `tabs-group-pro`（完整 ID 为 `shelus2021.tabs-group-pro`），显示名称为 **Tab Group Pro**，版本为 `2.0.9`，仓库为 `shelus2021/tab-group-pro`。
3. 首次发布前，确认 `name` 和 `displayName` 在扩展商店中可用。
4. 恢复可维护的源码工程。当前目录的 `scripts/*.js` 是打包后的运行时代码，并包含 `package-lock.json`，但缺少 TypeScript `src`、`tsconfig.json` 和代码检查配置。建议从上游源码仓库创建 fork，再把本次改动移植回 TypeScript 源码。

## 扩展商店展示

- 在扩展根目录保留 `README.md`、`CHANGELOG.md` 和最终许可证文件。
- 已包含商店图标 `resources/tab-group-pro.png`，应保持至少 128×128 像素；扩展商店图标不能使用 SVG。
- `resources/tab-group.svg` 是 VS Code 活动栏单色图标，`resources/tab-group-pro.svg` 是可编辑的品牌图标源稿。
- 仓库地址确定后，补充 `galleryBanner`、`homepage` 和 `bugs`。
- README 和 CHANGELOG 中的远程图片必须使用 HTTPS；扩展商店会拒绝不受信任的 SVG 内容。

## 本地验证

在扩展目录中执行：

```powershell
npm run check
npx @vscode/vsce ls
npx @vscode/vsce package
```

将生成的 VSIX 安装到干净的 VS Code 配置中，并检查：

- 首次激活与空白欢迎视图；
- 创建、重命名、排序、清空和删除分组；
- 从资源管理器和编辑器右键菜单添加文件；
- 在两个配置分别启用和关闭时添加全部文本标签；
- 打开或关闭包含已移动、已删除文件的分组；
- 单击预览、双击固定和右键 **Open Tab**；
- 重载 VS Code 后恢复分组展开状态；
- 如果声明跨平台支持，应分别验证 Windows、macOS 和 Linux 的路径显示。

## GitHub 准备

1. 明确许可证后，fork 或克隆上游源码仓库。
2. 将运行时代码改动应用到 TypeScript 源码，不要只维护生成后的 JavaScript。
3. 添加与上游许可证兼容的许可证，并保留所有必要声明和署名。
4. 添加 `.gitignore`、依赖锁文件、自动化测试和 CI 检查。
5. 只有在 VSIX 通过干净环境测试后，才提交发布说明并创建 SemVer 标签。

## 发布

使用最新版 `@vscode/vsce`。先确认扩展商店中的 `shelus2021` 发布者，然后先在本地打包测试，再执行发布：

```powershell
npx @vscode/vsce package
npx @vscode/vsce publish
```

自动发布建议采用当前的 Microsoft Entra ID 商店身份验证方案。Azure DevOps 全局 PAT 计划于 2026 年 12 月 1 日退役。
