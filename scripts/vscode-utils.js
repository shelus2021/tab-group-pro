"use strict";

// Shared VS Code workspace, editor, logging, and extension helpers.

const vscode = require("vscode");
const path = require("path");
const { getAbsolutePathComparisonKey } = require("./group-data");

const EXTENSION_ID = "tab_group_pro";
const NEW_GROUP_LABEL = "Create New Group";
const TREE_MIME_TYPE = "application/vnd.code.tree.tab_group_pro";
const URI_LIST_MIME_TYPE = "text/uri-list";

class EditorTabs {
    getOpenPathKeys() {
        const openPathKeys = new Set();
        vscode.window.tabGroups.all.forEach(group => group.tabs.forEach(tab => {
            if (tab.input instanceof vscode.TabInputText) {
                openPathKeys.add(getAbsolutePathComparisonKey(tab.input.uri.fsPath));
            }
        }));
        return openPathKeys;
    }

    async getOpenDocuments(filePaths) {
        const results = await Promise.all(filePaths.map(async (filePath, index) => {
            const openDocument = vscode.workspace.textDocuments.find(document => document.fileName === filePath);
            if (openDocument) return { doc: openDocument, index };
            try {
                return { doc: await vscode.workspace.openTextDocument(filePath), index };
            } catch (_) {
                return { doc: null, index };
            }
        }));
        return results
            .sort((left, right) => left.index - right.index)
            .map(result => result.doc)
            .filter(document => document !== null);
    }

    async open(filePaths, preserveFocus, preview) {
        const documents = await this.getOpenDocuments(filePaths);
        if (documents.length === 0) {
            vscode.window.showErrorMessage(`Failed to open Document from ['${filePaths}'].`);
            return;
        }
        for (const document of documents) {
            try {
                await vscode.window.showTextDocument(document, { preserveFocus, preview });
            } catch (_) {
                vscode.window.showErrorMessage(`Failed to show Document '${document}'.`);
            }
        }
    }

    async getOpenDocumentsInWorkspace(filePaths) {
        if (!filePaths) return undefined;
        const editorTabs = [];
        vscode.window.tabGroups.all.forEach(group => group.tabs.forEach(tab => {
            if (tab.input instanceof vscode.TabInputText && filePaths.includes(tab.input.uri.fsPath)) {
                editorTabs.push(tab.input.uri.fsPath);
            }
        }));
        return editorTabs.length === 0 ? undefined : this.getOpenDocuments(editorTabs);
    }

    async close(filePaths) {
        const documents = await this.getOpenDocumentsInWorkspace(filePaths);
        if (!documents || documents.length === 0) return;
        for (const document of documents) {
            try {
                await vscode.window.showTextDocument(document, { preview: false });
                await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
            } catch (_) {
                vscode.window.showErrorMessage(`Failed to close Document '${document.uri.fsPath}'.`);
            }
        }
    }
}

function validateWorkspace(fileUri) {
    if (!fileUri && !vscode.window.activeTextEditor) {
        return { hasError: true, error: "No file is selected and no tab is opened.", workspaceDir: "" };
    }
    const fileUriToCheck = fileUri || vscode.window.activeTextEditor.document.uri;
    const currentWorkspace = vscode.workspace.getWorkspaceFolder(fileUriToCheck);
    if (!currentWorkspace) {
        return { hasError: true, error: "The selected file does not belong to any workspace.", workspaceDir: "" };
    }
    return { hasError: false, error: "", workspaceDir: currentWorkspace.uri.fsPath };
}

function createQuickPickGroupsOptions(groups, allowNewGroup, filePath) {
    const options = [];
    for (const group of groups) {
        const alreadyIncluded = filePath && group.children.some(item => item.file === filePath);
        if (!alreadyIncluded) options.push({ label: group.label });
    }
    if (allowNewGroup) {
        options.push({ kind: vscode.QuickPickItemKind.Separator });
        options.push({ label: NEW_GROUP_LABEL });
    }
    return options;
}

function getCurrentlyOpenFiles(workspaceDir) {
    const result = [];
    vscode.window.tabGroups.all.forEach(group => group.tabs.forEach(tab => {
        if (!(tab.input instanceof vscode.TabInputText)) return;
        const relativePath = path.relative(workspaceDir, tab.input.uri.fsPath);
        if (relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) return;
        result.push({ label: relativePath.split(path.sep).join("/") });
    }));
    return result;
}

const outputChannel = vscode.window.createOutputChannel("Tab Group Pro", { log: true });

function logMessage(message) {
    outputChannel.appendLine(message);
}

function disposeOutputChannel() {
    outputChannel.dispose();
}

exports.EXTENSION_ID = EXTENSION_ID;
exports.NEW_GROUP_LABEL = NEW_GROUP_LABEL;
exports.TREE_MIME_TYPE = TREE_MIME_TYPE;
exports.URI_LIST_MIME_TYPE = URI_LIST_MIME_TYPE;
exports.EditorTabs = EditorTabs;
exports.validateWorkspace = validateWorkspace;
exports.createQuickPickGroupsOptions = createQuickPickGroupsOptions;
exports.getCurrentlyOpenFiles = getCurrentlyOpenFiles;
exports.logMessage = logMessage;
exports.disposeOutputChannel = disposeOutputChannel;
