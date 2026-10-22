"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// VS Code extensibility API
const vscode = require("vscode");
const { TabGroupTreeProvider } = require("./tree-provider");
const { EXTENSION_ID, disposeOutputChannel } = require("./vscode-utils");

function registerCommands(target) {
    const handlers = {
        expandAllGroups: () => target.expandAllGroups(),
        collapseAllGroups: () => target.collapseAllGroups(),
        addTabGroup: () => target.addTabGroup(),
        removeAllGroups: () => target.removeAllGroups(),
        importGroups: () => target.importGroups(),
        exportGroups: () => target.exportGroups(),
        addEntry: parent => target.addChildToItem(parent),
        openTabGroup: item => target.openTabGroup(item),
        closeTabGroup: item => target.closeTabGroup(item),
        copyTabsPathInGroup: item => target.copyTabsPathInGroup(item),
        copyTabsRelativePathInGroup: item => target.copyTabsRelativePathInGroup(item),
        editTabGroupName: item => target.editTabGroupName(item),
        clearTabsInGroup: item => target.clearTabsInGroup(item),
        removeTabGroup: item => target.removeTabGroup(item),
        openTab: item => target.openTab(item),
        closeTab: item => target.closeTab(item),
        removeTab: item => target.removeTab(item),
        item_clicked: item => target.item_clicked(item),
        moveUp: item => target.moveItemUp(item),
        moveDown: item => target.moveItemDown(item),
        addEntryToGroup: item => target.addEntryToGroup(item),
        addAllToGroup: () => target.addAllOpenTabsToGroup()
    };
    return Object.entries(handlers).map(([command, handler]) =>
        vscode.commands.registerCommand(`tab_group_pro.${command}`, handler)
    );
}
/**
 * Called when the extension is started
 */
async function activate(context) {
    const treeDataProvider = new TabGroupTreeProvider(context);
    const treeView = vscode.window.createTreeView(EXTENSION_ID, {
        treeDataProvider: treeDataProvider,
        dragAndDropController: treeDataProvider.dragAndDropController
    });
    treeDataProvider.setTreeView(treeView);
    await treeDataProvider.load();
    // 注册所有需要清理的资源
    context.subscriptions.push(
        ...registerCommands(treeDataProvider),
        treeDataProvider,
        treeView           // TreeView 本身是 Disposable
    );
    return context;
}
exports.activate = activate;
/**
 * Called when the extension is stopped, or vscode is closed
 */
function deactivate() {
    disposeOutputChannel();
}
exports.deactivate = deactivate;
