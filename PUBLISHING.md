# GitHub and VS Code Marketplace publishing checklist

[简体中文](PUBLISHING.zh-CN.md) | English

This directory was recovered from an installed extension. It is suitable for runtime testing after the checks below, but it is not yet a complete long-term source repository.

## Blockers to resolve before public publishing

1. **Confirm redistribution rights.** The upstream repository does not currently contain a detected license file. A public repository is not, by itself, a redistribution license. Ask the upstream author to add a license or obtain explicit permission before publishing this modified build.
2. **Confirm the extension identity.** The package retains publisher `shelus2021` and name `tabs-group-pro` (full ID `shelus2021.tabs-group-pro`), uses display name **Tab Group Pro**, version `2.0.9`, and repository `shelus2021/tab-group-pro`.
3. Confirm that `name` and `displayName` are available in the Marketplace before the first publication.
4. Restore a maintainable source tree. The current snapshot contains the packaged runtime in `scripts/*.js` and includes `package-lock.json`, but not the TypeScript `src` directory, `tsconfig.json`, or lint configuration. Prefer applying these changes to a fresh fork of the upstream source repository.

## Marketplace presentation

- Keep `README.md`, `CHANGELOG.md`, and the final license file in the extension root.
- The included `resources/tab-group-pro.png` is the Marketplace icon. Keep it at least 128×128 pixels; Marketplace icons cannot be SVG.
- The monochrome `resources/tab-group.svg` is the VS Code Activity Bar icon. The editable brand source is `resources/tab-group-pro.svg`.
- Add `galleryBanner`, `homepage`, and `bugs` after the final repository URL is known.
- Use HTTPS for all remote images in README and CHANGELOG. Marketplace publishing rejects untrusted SVG content.

## Local validation

Run from this directory:

```powershell
npm run check
npx @vscode/vsce ls
npx @vscode/vsce package
```

Install the generated VSIX into a clean VS Code profile and verify:

- first activation and empty welcome view;
- create, rename, reorder, clear, and remove group;
- add a file from Explorer and from an editor context menu;
- add all open text tabs with both settings enabled and disabled;
- open and close a group containing missing or moved files;
- single-click preview, double-click pin, and context-menu Open Tab;
- expansion-state restoration after reloading VS Code;
- Windows, macOS, and Linux path display if cross-platform support is claimed.

## GitHub preparation

1. Fork or clone the upstream source repository after licensing is clarified.
2. Apply the runtime changes to the TypeScript source rather than maintaining only generated JavaScript.
3. Add a license that is compatible with the upstream license and preserves required notices.
4. Add `.gitignore`, a dependency lock file, tests, and CI checks.
5. Commit the release notes and create a SemVer tag only after the VSIX passes clean-profile testing.

## Publishing

Use the latest `@vscode/vsce`. Confirm the `shelus2021` Marketplace publisher first, then package locally before publishing:

```powershell
npx @vscode/vsce package
npx @vscode/vsce publish
```

For automation, prefer current Microsoft Entra ID-based Marketplace authentication. Global Azure DevOps PATs are scheduled for retirement on December 1, 2026.
