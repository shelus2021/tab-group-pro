"use strict";

// Group persistence, import/export, and workspace-relative path handling.

const vscode = require("vscode");
const path = require("path");
const { TabGroupItem } = require("./tree-item");

class GroupImportExport {
    constructor(getGroups, commitChanges) {
        this.getGroups = getGroups;
        this.commitChanges = commitChanges;
    }

    async selectGroupsToExport() {
        const groups = this.getGroups();
        if (groups.length === 0) {
            vscode.window.showInformationMessage("There are no tab groups to export.");
            return undefined;
        }
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = "Export Tab Groups";
        quickPick.placeholder = "Select one or more groups to export.";
        quickPick.canSelectMany = true;
        quickPick.items = groups.map(group => ({
            label: group.label.toString(),
            description: `${group.children.length} tabs`,
            group
        }));
        const selectAllButton = {
            iconPath: new vscode.ThemeIcon("check-all"),
            tooltip: "Select All Groups"
        };
        quickPick.buttons = [selectAllButton];
        return new Promise(resolve => {
            let settled = false;
            const disposables = [];
            const finish = value => {
                if (settled) return;
                settled = true;
                disposables.forEach(disposable => disposable.dispose());
                quickPick.dispose();
                resolve(value);
            };
            disposables.push(
                quickPick.onDidTriggerButton(button => {
                    if (button === selectAllButton) quickPick.selectedItems = quickPick.items;
                }),
                quickPick.onDidAccept(() => {
                    if (quickPick.selectedItems.length === 0) {
                        vscode.window.showWarningMessage("Select at least one group to export.");
                        return;
                    }
                    finish(quickPick.selectedItems.map(item => item.group));
                }),
                quickPick.onDidHide(() => finish(undefined))
            );
            quickPick.show();
        });
    }

    async exportGroups() {
        try {
            const selectedGroups = await this.selectGroupsToExport();
            if (!selectedGroups) return;
            const workspaceFolders = vscode.workspace.workspaceFolders || [];
            if (workspaceFolders.length === 0) {
                vscode.window.showErrorMessage("Open a workspace before exporting tab groups.");
                return;
            }
            const exportData = {
                groups: selectedGroups.map(group => ({
                    name: group.label.toString(),
                    tabs: group.children.map(child => normalizeRelativePath(child.relativeFile))
                }))
            };
            const targetUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.joinPath(workspaceFolders[0].uri, "tab-group-pro-groups.json"),
                filters: { "JSON files": ["json"] },
                saveLabel: "Export"
            });
            if (!targetUri) return;
            await vscode.workspace.fs.writeFile(
                targetUri,
                Buffer.from(`${JSON.stringify(exportData, null, 2)}\n`, "utf8")
            );
            vscode.window.showInformationMessage(`Exported ${selectedGroups.length} tab group(s).`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export tab groups: ${error.message}`);
        }
    }

    async importGroups() {
        try {
            const sourceUris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: { "JSON files": ["json"] },
                openLabel: "Import"
            });
            if (!sourceUris || sourceUris.length === 0) return;
            const fileBytes = await vscode.workspace.fs.readFile(sourceUris[0]);
            const fileText = Buffer.from(fileBytes).toString("utf8").replace(/^\uFEFF/, "");
            let importData;
            try {
                importData = JSON.parse(fileText);
            } catch (_) {
                throw new Error("The selected file is not valid JSON.");
            }
            if (!importData || !Array.isArray(importData.groups) || importData.groups.length === 0) {
                throw new Error("The JSON file must contain a non-empty 'groups' array.");
            }
            const existingNames = new Set(this.getGroups().map(group => group.label.toString()));
            const importedNames = new Set();
            const validatedGroups = [];
            for (const groupData of importData.groups) {
                if (!groupData || typeof groupData.name !== "string" || groupData.name.trim() === "") {
                    throw new Error("Every imported group must have a non-empty string name.");
                }
                const groupName = groupData.name.trim();
                if (existingNames.has(groupName) || importedNames.has(groupName)) {
                    throw new Error(`Group '${groupName}' already exists or is duplicated in the import file.`);
                }
                if (!Array.isArray(groupData.tabs)) {
                    throw new Error(`Group '${groupName}' must contain a 'tabs' array.`);
                }
                importedNames.add(groupName);
                const seenTabs = new Set();
                const validatedTabs = [];
                for (const tabPath of groupData.tabs) {
                    const resolved = await resolveWorkspaceFile(tabPath, true);
                    const duplicateKey = process.platform === "win32"
                        ? resolved.relativePath.toLowerCase()
                        : resolved.relativePath;
                    if (seenTabs.has(duplicateKey)) {
                        throw new Error(`Group '${groupName}' contains duplicate tab path '${resolved.relativePath}'.`);
                    }
                    seenTabs.add(duplicateKey);
                    validatedTabs.push(resolved);
                }
                validatedGroups.push({ name: groupName, tabs: validatedTabs });
            }
            const now = Date.now();
            const newGroups = validatedGroups.map((groupData, groupIndex) => {
                const group = new TabGroupItem(
                    groupData.name,
                    null,
                    true,
                    `group-import-${groupIndex}-${now}-${Math.random().toString(36).substring(2, 8)}`
                );
                groupData.tabs.forEach((tab, tabIndex) => {
                    const child = new TabGroupItem(
                        tab.relativePath,
                        tab.filePath,
                        false,
                        `item-import-${groupIndex}-${tabIndex}-${now}-${Math.random().toString(36).substring(2, 8)}`
                    );
                    child.setParentLabel(groupData.name);
                    group.add_child(child);
                });
                group.updateTooltip();
                return group;
            });
            await this.commitChanges(newGroups);
            vscode.window.showInformationMessage(`Imported ${newGroups.length} tab group(s).`);
        } catch (error) {
            vscode.window.showErrorMessage(`Import blocked: ${error.message}`);
        }
    }
}

class GroupPersistence {
    constructor(workspaceState, resolveFile, logger) {
        this.workspaceState = workspaceState;
        this.resolveFile = resolveFile;
        this.logger = logger;
    }

    async save(groups) {
        const treeData = {};
        for (let index = 0; index < groups.length; index++) {
            treeData[`key_${index}`] = this.serializeItem(groups[index]);
        }
        await this.workspaceState.update("treeData", treeData);
    }

    serializeItem(item) {
        const children = {};
        for (let index = 0; index < item.children.length; index++) {
            children[`key_${index}`] = this.serializeItem(item.children[index]);
        }
        return {
            label: item.label,
            collapsibleState: item.collapsibleState,
            id: item.id,
            isRoot: item.isRoot,
            relativeFile: item.isRoot ? undefined : item.relativeFile,
            parentLabel: item.parentLabel,
            children
        };
    }

    async load() {
        const groups = [];
        const treeData = this.workspaceState.get("treeData") || {};
        if (this.logger) this.logger(JSON.stringify(treeData));
        for (const key in treeData) {
            const item = await this.deserializeItem(treeData[key]);
            item.updateTooltip();
            groups.push(item);
        }
        return groups;
    }

    async deserializeItem(data) {
        const label = data.label;
        const isRoot = data.isRoot;
        const relativeFile = isRoot ? undefined : (data.relativeFile || label);
        const filePath = isRoot ? null : (await this.resolveFile(relativeFile, false)).filePath;
        const item = new TabGroupItem(isRoot ? label : relativeFile, filePath, isRoot, data.id);
        if (isRoot && "collapsibleState" in data) {
            item.collapsibleState = data.collapsibleState === true ||
                data.collapsibleState === vscode.TreeItemCollapsibleState.Expanded
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.Collapsed;
        }
        if (!isRoot && "parentLabel" in data) item.setParentLabel(data.parentLabel);
        for (const key in (data.children || {})) {
            item.add_child(await this.deserializeItem(data.children[key]));
        }
        return item;
    }
}

function normalizePath(workspaceDir, filePath) {
    return path.relative(workspaceDir, filePath).split(path.sep).join("/");
}

function normalizeRelativePath(relativeFile) {
    if (typeof relativeFile !== "string" || relativeFile.trim() === "") {
        throw new Error("A tab path must be a non-empty string.");
    }
    const platformPath = relativeFile.replace(/[\\/]+/g, path.sep);
    if (path.isAbsolute(platformPath)) {
        throw new Error(`Tab path '${relativeFile}' must be relative to the workspace.`);
    }
    const normalized = path.normalize(platformPath);
    if (normalized === "." || normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
        throw new Error(`Tab path '${relativeFile}' is outside the workspace.`);
    }
    return normalized.split(path.sep).join("/");
}

function getPathComparisonKey(relativeFile) {
    const normalizedPath = normalizeRelativePath(relativeFile);
    return process.platform === "win32" ? normalizedPath.toLowerCase() : normalizedPath;
}

function getAbsolutePathComparisonKey(filePath) {
    const normalizedPath = path.normalize(filePath);
    return process.platform === "win32" ? normalizedPath.toLowerCase() : normalizedPath;
}

async function resolveWorkspaceFile(relativeFile, requireExisting) {
    const normalizedRelativePath = normalizeRelativePath(relativeFile);
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    if (workspaceFolders.length === 0) {
        throw new Error("Open a workspace before importing or loading tab groups.");
    }
    const pathSegments = normalizedRelativePath.split("/");
    const candidates = workspaceFolders.map(folder => ({
        folder,
        filePath: path.join(folder.uri.fsPath, ...pathSegments)
    }));
    const existingCandidates = [];
    for (const candidate of candidates) {
        try {
            const stat = await vscode.workspace.fs.stat(vscode.Uri.file(candidate.filePath));
            if ((stat.type & vscode.FileType.File) !== 0) existingCandidates.push(candidate);
        } catch (_) {
            // Missing candidates are handled after every workspace root is checked.
        }
    }
    if (existingCandidates.length > 1) {
        throw new Error(`Tab path '${normalizedRelativePath}' matches more than one workspace folder.`);
    }
    if (existingCandidates.length === 1) {
        return { relativePath: normalizedRelativePath, filePath: existingCandidates[0].filePath };
    }
    if (requireExisting) {
        throw new Error(`Tab path '${normalizedRelativePath}' does not match an existing workspace file.`);
    }
    return { relativePath: normalizedRelativePath, filePath: candidates[0].filePath };
}

exports.GroupImportExport = GroupImportExport;
exports.GroupPersistence = GroupPersistence;
exports.normalizePath = normalizePath;
exports.normalizeRelativePath = normalizeRelativePath;
exports.getPathComparisonKey = getPathComparisonKey;
exports.getAbsolutePathComparisonKey = getAbsolutePathComparisonKey;
exports.resolveWorkspaceFile = resolveWorkspaceFile;
