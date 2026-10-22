# Tab Group Pro

[简体中文](README.zh-CN.md) | English

Create persistent file groups for each VS Code workspace and reopen the files you need in a predictable order.

[Install Tab Group Pro from Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=shelus2021.tabs-group-pro)

## Features

- Create, rename, reorder, clear, and remove file groups.
- Drag groups to reorder them and drag tabs within or across groups. You can also drag editor tabs into groups, or drag groups and tabs into the editor to open them. Dragging a group into the editor opens its tabs in saved order and skips files that are already open. The Move Up and Move Down actions remain available as a fallback.
- Add the current file or all open text tabs to a group.
- Open or close every file in a group in the saved order.
- Keep group data and expanded state per workspace.
- Persist grouped tabs as workspace-relative paths so exported groups can follow a relocated project.
- Import or export one or more groups as JSON from the view toolbar.
- Preview a file with one click, or pin it with **Open Tab** or a double-click.
- Display file-theme icons, file names, relative folders, full-path tooltips, and the number of files in each group.
- Copy all absolute or workspace-relative paths from a group.
- Follow the active editor in expanded groups.
- Avoid duplicate file and group choices while adding files.

## Preview

| Create your first group | Manage grouped files |
| --- | --- |
| <img src="screenshots/empty-state.png" alt="Tab Group Pro empty state with an action to create a group" width="360"> | <img src="screenshots/group-actions.png" alt="Tab Group Pro showing grouped files and the group actions menu" width="360"> |

## Getting started

1. Open a folder or workspace in VS Code.
2. Open **Tab Group Pro** from the Activity Bar.
3. Run **Tab Group Pro: Add a New Group**, or use **Add All Opened Tabs to Group**.
4. Drag groups or tabs to reorder them. Drop a tab on another group to move it across groups, or drag tabs in either direction between the editor and a group.

Groups are stored in VS Code workspace state and restored when that workspace is opened again. Grouped tabs are persisted as workspace-relative paths and resolved against the currently open workspace when loaded.

Use the **Import Groups from JSON** and **Export Groups to JSON** buttons in the view title. Export lets you select individual groups or select all groups at once. Import validates the entire file before changing any data; if any tab path does not match an existing workspace file, no groups are imported.

The JSON format is:

```json
{
  "groups": [
    {
      "name": "Frontend",
      "tabs": [
        "src/app.js",
        "src/styles.css"
      ]
    }
  ]
}
```

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `tab-group-pro.closeTabsOnOpenGroup` | `false` | Close all currently open editors before opening a group. |
| `tab-group-pro.closeTabsOnAddAllToGroup` | `false` | Close open text tabs after adding all of them to a group. |

## Notes and limitations

- Files must belong to an open VS Code workspace.
- Only text-file tabs can be added through **Add All Opened Tabs to Group**.
- Group data is workspace-specific and is not synchronized between machines by this extension.
- Imported tab paths must be relative, stay inside the workspace, and match existing files. A conflicting group name, duplicate entry, ambiguous multi-root match, or missing file blocks the whole import.
- The current repository snapshot contains the packaged JavaScript runtime, not the original TypeScript source tree. See [PUBLISHING.md](PUBLISHING.md) before starting long-term development.

## Release notes

See [CHANGELOG.md](CHANGELOG.md). A [Simplified Chinese changelog](CHANGELOG.zh-CN.md) is also available.

## Acknowledgements

Based on the original work by [bentodaniel](https://github.com/bentodaniel/vs-tab-groups). Preserve the original author's attribution and confirm redistribution terms before publishing a fork.

## License and attribution

Original additions and modifications authored by shelus2021 are provided under the MIT License. Portions derived from the upstream VS Tab Groups project remain subject to the rights of their respective copyright holders because no upstream license was found when this version was prepared.

See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) for the exact scope. If you believe this project infringes your rights, contact [shelus2021@foxmail.com](mailto:shelus2021@foxmail.com).
