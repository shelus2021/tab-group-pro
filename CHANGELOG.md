# Changelog

[简体中文](CHANGELOG.zh-CN.md) | English

All notable changes to Tabs Group Pro are documented here.

## [2.0.7] - 2026-10-17

> Before updating, make a record of your existing groups.

1. Tabs are stored as workspace-relative paths, so they continue to open correctly after the project is moved.
2. Powerful drag and drop: freely reorder groups, move tabs within or across groups, drag editor tabs into groups, and drag groups or tabs into the editor to open them.
3. Flexible group JSON import and export: select one or more groups, select all during export, and validate the complete file before importing.

## [2.0.6] - 2026-10-12

### Changed

- Updated the Marketplace preview screenshots to reflect the current extension name and interface.

## [2.0.5] - 2026-10-12

### Changed

- Renamed the extension identity to `tabs-group-pro` / **Tabs Group Pro**.
- Updated command, view, configuration, Marketplace, repository, and icon references to the new identity.

## [2.0.4] - 2026-10-12

### Changed

- Normalized the publisher identity and related links to lowercase `shelus2021`.

## [2.0.3] - 2026-10-09

### Changed

- Displayed the two preview images side by side at a smaller size.

## [2.0.2] - 2026-10-09

### Added

- Added Marketplace preview images for the empty state and group actions.

## [2.0.1] - 2026-10-09

### Changed

- Simplified the introductory Marketplace description by removing a duplicated attribution and licensing notice. The full attribution remains in the acknowledgement and license sections.

## [2.0.0] - 2026-10-08

### Added

- Added a dedicated Tabs Group Pro Marketplace icon and editable SVG source.
- Added a scoped MIT license for shelus2021-authored contributions, upstream attribution, and a rights-holder contact notice.
- Remembered expanded and collapsed state for each group.
- Clear-group action that keeps the group itself.
- Commands to copy all absolute or relative file paths from a group.
- Optional closing of open tabs after adding all tabs to a group.
- File-theme icons, relative folder descriptions, full-path tooltips, and group file counts.
- Active-editor tracking in expanded groups.
- Single-click preview and double-click pinning behavior.

### Changed

- Open groups in their saved order and wait for every document operation.
- Show only currently open tabs when adding entries from a group.
- Hide files and groups that would create duplicate entries.
- Keep new groups collapsed by default.
- Remove empty groups without an extra confirmation.
- Use built-in VS Code product icons for actions.
- Default `tabs-group-pro.closeTabsOnOpenGroup` to `false`.
- Improve command names, menus, prompts, and error messages.
- Dispose commands, views, event listeners, emitters, and the output channel cleanly.

### Fixed

- Group renaming now updates child-parent references used by reorder and removal actions.
- Explorer context-menu files can be added without relying on the active editor.
- File names containing spaces are no longer truncated.
- Group expansion state uses the correct VS Code enum and migrates previously saved Boolean state.
- Cancelling new-group creation no longer adds a file to the last existing group.
- Workspace-relative paths now use platform-safe path handling.

### Removed

- Recursive workspace scanning and the legacy `ignorePaths` setting.
- The non-functional nesting-depth setting.
- The unreliable command that synchronized group order from editor tabs.
- Custom colored group icons and bundled action PNGs.

## Original releases

### [1.3.0] - 2024-08-04

- Added group renaming.

### [1.2.0] - 2024-04-04

- Added synchronization of editor-tab order to a group.
- Fixed the extension name in the UI.

### [1.1.0] - 2024-03-16

- Added expand/collapse, group and file reordering, and commands for adding open tabs.

### [1.0.0] - 2023-01-03

- Initial release.
