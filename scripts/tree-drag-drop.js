"use strict";

// Drag-and-drop behavior shared by the tree and editor area.

const vscode = require("vscode");
const { TREE_MIME_TYPE, URI_LIST_MIME_TYPE } = require("./vscode-utils");
const { TabGroupItem } = require("./tree-item");
const {
    normalizePath,
    resolveWorkspaceFile,
    getPathComparisonKey,
    getAbsolutePathComparisonKey
} = require("./group-data");

class TabGroupDragAndDrop {
    constructor(getGroups, commitChanges, editorTabs) {
        this.getGroups = getGroups;
        this.commitChanges = commitChanges;
        this.editorTabs = editorTabs;
        this.dragMimeTypes = [TREE_MIME_TYPE, URI_LIST_MIME_TYPE];
        this.dropMimeTypes = [TREE_MIME_TYPE, URI_LIST_MIME_TYPE];
    }

    findGroupContainingItem(item) {
        return this.getGroups().find(group => group.children.includes(item));
    }

    async handleDrag(source, dataTransfer, token) {
        if (token.isCancellationRequested || !source || source.length === 0) return;
        dataTransfer.set(TREE_MIME_TYPE, new vscode.DataTransferItem(source));
        const openEditorPathKeys = this.editorTabs.getOpenPathKeys();
        const filePaths = [];
        for (const item of source) {
            if (item.isRoot) {
                for (const child of item.children) {
                    if (!child.file || openEditorPathKeys.has(getAbsolutePathComparisonKey(child.file))) continue;
                    filePaths.push(child.file);
                }
            } else if (item.file) {
                filePaths.push(item.file);
            }
        }
        const seenPathKeys = new Set();
        const fileUris = filePaths
            .filter(filePath => {
                const pathKey = getAbsolutePathComparisonKey(filePath);
                if (seenPathKeys.has(pathKey)) return false;
                seenPathKeys.add(pathKey);
                return true;
            })
            .map(filePath => vscode.Uri.file(filePath).toString());
        if (fileUris.length > 0) {
            dataTransfer.set(URI_LIST_MIME_TYPE, new vscode.DataTransferItem(fileUris.join("\r\n")));
        }
    }

    async handleDrop(target, dataTransfer, token) {
        if (token.isCancellationRequested) return;
        const transferItem = dataTransfer.get(TREE_MIME_TYPE);
        if (!transferItem) {
            await this.handleUriDrop(target, dataTransfer, token);
            return;
        }
        const sources = transferItem.value;
        if (!Array.isArray(sources) || sources.length !== 1) {
            vscode.window.showWarningMessage("Drag one group or tab at a time.");
            return;
        }
        const source = sources[0];
        if (!source || source === target) return;
        const groups = this.getGroups();
        if (source.isRoot) {
            if (target && !target.isRoot) {
                vscode.window.showWarningMessage("A group can only be dropped on another group or the empty tree area.");
                return;
            }
            const reorderedGroups = groups.filter(group => group !== source);
            if (reorderedGroups.length === groups.length) return;
            if (target) {
                const targetIndex = reorderedGroups.indexOf(target);
                if (targetIndex < 0) return;
                reorderedGroups.splice(targetIndex, 0, source);
            } else {
                reorderedGroups.push(source);
            }
            await this.commitChanges(reorderedGroups, true);
            return;
        }
        if (!target) {
            vscode.window.showWarningMessage("Drop a tab on a group or another tab.");
            return;
        }
        const sourceGroup = this.findGroupContainingItem(source);
        const targetGroup = target.isRoot ? target : this.findGroupContainingItem(target);
        if (!sourceGroup || !targetGroup) return;
        const sourcePathKey = getPathComparisonKey(source.relativeFile);
        const duplicateInTarget = targetGroup.children.some(child =>
            child !== source && getPathComparisonKey(child.relativeFile) === sourcePathKey
        );
        if (duplicateInTarget) {
            vscode.window.showWarningMessage(`Tab '${source.relativeFile}' already exists in Group '${targetGroup.label}'.`);
            return;
        }
        const sourceChildren = sourceGroup.children.filter(child => child !== source);
        const targetChildren = sourceGroup === targetGroup ? sourceChildren : [...targetGroup.children];
        if (target.isRoot) {
            targetChildren.push(source);
        } else {
            const targetIndex = targetChildren.indexOf(target);
            if (targetIndex < 0) return;
            targetChildren.splice(targetIndex, 0, source);
        }
        if (sourceGroup === targetGroup) {
            sourceGroup.children = targetChildren;
        } else {
            sourceGroup.children = sourceChildren;
            targetGroup.children = targetChildren;
            source.setParentLabel(targetGroup.label.toString());
        }
        sourceGroup.updateTooltip();
        targetGroup.updateTooltip();
        await this.commitChanges();
    }

    async handleUriDrop(target, dataTransfer, token) {
        const uriTransferItem = dataTransfer.get(URI_LIST_MIME_TYPE);
        if (!uriTransferItem) return;
        const targetGroup = target?.isRoot ? target : target ? this.findGroupContainingItem(target) : undefined;
        if (!targetGroup) {
            vscode.window.showWarningMessage("Drop editor tabs on a group or a tab inside that group.");
            return;
        }
        try {
            const uriList = await uriTransferItem.asString();
            if (token.isCancellationRequested) return;
            const uriStrings = uriList
                .split(/\r?\n/)
                .map(value => value.trim())
                .filter(value => value && !value.startsWith("#"));
            if (uriStrings.length === 0) return;

            const existingPathKeys = new Set(
                targetGroup.children.map(child => getPathComparisonKey(child.relativeFile))
            );
            const pendingPathKeys = new Set();
            const validatedTabs = [];
            let skippedDuplicates = 0;

            for (const uriString of uriStrings) {
                if (token.isCancellationRequested) return;
                let fileUri;
                try {
                    fileUri = vscode.Uri.parse(uriString);
                } catch (_) {
                    throw new Error(`'${uriString}' is not a valid file URI.`);
                }
                if (fileUri.scheme !== "file") {
                    throw new Error(`Only saved local files can be added. Unsupported URI: '${uriString}'.`);
                }
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
                if (!workspaceFolder) {
                    throw new Error(`File '${fileUri.fsPath}' does not belong to the current workspace.`);
                }
                try {
                    const stat = await vscode.workspace.fs.stat(fileUri);
                    if ((stat.type & vscode.FileType.File) === 0) {
                        throw new Error("not a file");
                    }
                } catch (_) {
                    throw new Error(`File '${fileUri.fsPath}' does not exist or is not a regular file.`);
                }
                const relativePath = normalizePath(workspaceFolder.uri.fsPath, fileUri.fsPath);
                const resolved = await resolveWorkspaceFile(relativePath, true);
                const pathKey = getPathComparisonKey(resolved.relativePath);
                if (existingPathKeys.has(pathKey) || pendingPathKeys.has(pathKey)) {
                    skippedDuplicates++;
                    continue;
                }
                pendingPathKeys.add(pathKey);
                validatedTabs.push(resolved);
            }

            if (validatedTabs.length === 0) {
                vscode.window.showInformationMessage(`All dragged tabs already exist in Group '${targetGroup.label}'.`);
                return;
            }
            const now = Date.now();
            const newItems = validatedTabs.map((tab, index) => {
                const item = new TabGroupItem(
                    tab.relativePath,
                    tab.filePath,
                    false,
                    `item-drop-${index}-${now}-${Math.random().toString(36).substring(2, 8)}`
                );
                item.setParentLabel(targetGroup.label.toString());
                return item;
            });
            if (target.isRoot) {
                targetGroup.children.push(...newItems);
            } else {
                const targetIndex = targetGroup.children.indexOf(target);
                if (targetIndex < 0) return;
                targetGroup.children.splice(targetIndex, 0, ...newItems);
            }
            targetGroup.updateTooltip();
            await this.commitChanges();
            const duplicateMessage = skippedDuplicates > 0
                ? ` Skipped ${skippedDuplicates} duplicate tab(s).`
                : "";
            vscode.window.showInformationMessage(
                `Added ${newItems.length} tab(s) to Group '${targetGroup.label}'.${duplicateMessage}`
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Cannot add dragged tab(s): ${error.message}`);
        }
    }
}

exports.TabGroupDragAndDrop = TabGroupDragAndDrop;
