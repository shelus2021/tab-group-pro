"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disposeOutputChannel = exports.logMessage = exports.getCurrentlyOpenFiles = exports.normalizePath = exports.createQuickPickGroupsOptions = exports.validateWorkspace = exports.NEW_GROUP_LABEL = exports.EXTENSION_ID = void 0;
const vscode_1 = require("vscode");
const path_1 = require("path");
exports.EXTENSION_ID = "tabs_group_pro";
exports.NEW_GROUP_LABEL = "Create New Group";
function validateWorkspace(fileUri) {
    // 如果没有提供 fileUri，则尝试从 activeTextEditor 获取
    if (!fileUri && !vscode_1.window.activeTextEditor) {
        return { hasError: true, error: "No file is selected and no tab is opened.", workspaceDir: "" };
    }
    // 获取文件的 URI
    const fileUriToCheck = fileUri || vscode_1.window.activeTextEditor.document.uri;
    // vscode_1.window.showInformationMessage(JSON.stringify(fileUriToCheck));
    // 检查文件是否属于某个工作区
    const currentWorkSpace = vscode_1.workspace.getWorkspaceFolder(fileUriToCheck);
    // vscode_1.window.showInformationMessage(JSON.stringify(currentWorkSpace));
    if (!currentWorkSpace) {
        return { hasError: true, error: "The selected file does not belong to any workspace.", workspaceDir: "" };
    }
    return { hasError: false, error: "", workspaceDir: currentWorkSpace.uri.fsPath };
}
exports.validateWorkspace = validateWorkspace;
function createQuickPickGroupsOptions(groupsList, allowNewGroup, filePath) {
    // 构建 QuickPick 的选项列表
    let groupLabels = [];
    filePath = filePath || undefined;
    // vscode_1.window.showInformationMessage(JSON.stringify(filePath));
    groupsList.forEach((element) => { 
        let children = element.children;
        if(children.length === 0){ 
            groupLabels.push({ label: element.label }) 
        }
        else { // 如果这个group下有这个文件则不显示
            let exists = children.some((item) => item.file === filePath);
            if(!exists){ groupLabels.push({ label: element.label }) }
        }
    });
    const fileSeparator = { kind: vscode_1.QuickPickItemKind.Separator };
    if (allowNewGroup) {
        groupLabels.push(fileSeparator);
        groupLabels.push({ label: exports.NEW_GROUP_LABEL });
    }
    return groupLabels;
}
exports.createQuickPickGroupsOptions = createQuickPickGroupsOptions;
function normalizePath(workDir, fileDir) {
    return (0, path_1.relative)(workDir, fileDir);
}
exports.normalizePath = normalizePath;
function getCurrentlyOpenFiles(workspaceDir) {
    var result = [];
    vscode_1.window.tabGroups.all.forEach((group) => group.tabs.forEach((tab) => {
        if (!(tab.input instanceof vscode_1.TabInputText)) return;
        const label = (0, path_1.relative)(workspaceDir, tab.input.uri.fsPath);
        if (label.startsWith(`..${path_1.sep}`) || (0, path_1.isAbsolute)(label)) return;
        result.push({ label });
    }));
    return result;
}
exports.getCurrentlyOpenFiles = getCurrentlyOpenFiles;
// 创建一个输出通道
const outputChannel = vscode_1.window.createOutputChannel('Tabs Group Pro',{
    log: !0
});
function logMessage(message) {
    // 写入日志信息
    outputChannel.appendLine(message);
}
exports.logMessage = logMessage;
function disposeOutputChannel() {
    outputChannel.dispose();
}
exports.disposeOutputChannel = disposeOutputChannel;
//# sourceMappingURL=Util.js.map
