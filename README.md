# Tab Groups Pro

[简体中文](README.zh-CN.md) | English

Create persistent file groups for each VS Code workspace and reopen the files you need in a predictable order.

[Install Tab Groups Pro from Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=shelus2021.tab-groups-pro)

## Features

- Create, rename, reorder, clear, and remove file groups.
- Add the current file or all open text tabs to a group.
- Open or close every file in a group in the saved order.
- Keep group data and expanded state per workspace.
- Preview a file with one click, or pin it with **Open Tab** or a double-click.
- Display file-theme icons, file names, relative folders, full-path tooltips, and the number of files in each group.
- Copy all absolute or workspace-relative paths from a group.
- Follow the active editor in expanded groups.
- Avoid duplicate file and group choices while adding files.

## Preview

| Create your first group | Manage grouped files |
| --- | --- |
| <img src="screenshots/empty-state.png" alt="Tab Groups Pro empty state with actions to create a group or add all open tabs" width="360"> | <img src="screenshots/group-actions.png" alt="Tab Groups Pro showing grouped files and the group actions menu" width="360"> |

## Getting started

1. Open a folder or workspace in VS Code.
2. Open **Tab Groups Pro** from the Activity Bar.
3. Run **Tab Groups Pro: Add a New Group**, or use **Add All Opened Tabs to Group**.
4. Use a group's inline and context-menu actions to add, reorder, open, close, copy, clear, or remove entries.

Groups are stored in VS Code workspace state and restored when that workspace is opened again.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `tab-groups-pro.closeTabsOnOpenGroup` | `false` | Close all currently open editors before opening a group. |
| `tab-groups-pro.closeTabsOnAddAllToGroup` | `false` | Close open text tabs after adding all of them to a group. |

## Notes and limitations

- Files must belong to an open VS Code workspace.
- Only text-file tabs can be added through **Add All Opened Tabs to Group**.
- Group data is workspace-specific and is not synchronized between machines by this extension.
- The current repository snapshot contains the packaged JavaScript runtime, not the original TypeScript source tree. See [PUBLISHING.md](PUBLISHING.md) before starting long-term development.

## Release notes

See [CHANGELOG.md](CHANGELOG.md). A [Simplified Chinese changelog](CHANGELOG.zh-CN.md) is also available.

## Acknowledgements

Based on the original work by [bentodaniel](https://github.com/bentodaniel/vs-tab-groups). Preserve the original author's attribution and confirm redistribution terms before publishing a fork.

## License and attribution

Original additions and modifications authored by shelus2021 are provided under the MIT License. Portions derived from the upstream VS Tab Groups project remain subject to the rights of their respective copyright holders because no upstream license was found when this version was prepared.

See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) for the exact scope. If you believe this project infringes your rights, contact [shelus2021@foxmail.com](mailto:shelus2021@foxmail.com).
