"use strict";

// Tree view state and group/tab actions.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabGroupTreeProvider = void 0;
const vscode = require("vscode");
const path = require("path");
const { TabGroupItem } = require("./tree-item");
const { GroupPersistence, GroupImportExport, normalizePath, resolveWorkspaceFile } = require("./group-data");
const {
    EXTENSION_ID,
    NEW_GROUP_LABEL,
    EditorTabs,
    logMessage,
    validateWorkspace,
    createQuickPickGroupsOptions,
    getCurrentlyOpenFiles
} = require("./vscode-utils");
const { TabGroupDragAndDrop } = require("./tree-drag-drop");
/**
 * The tree view class. Represents the explorer tree.
 */
class TabGroupTreeProvider {
    /**
     * Create a new tree view.
     * Register all the commands available for this tree.
     * @param context The context of the extension
     */
    constructor(context) {
        // m_data holds all tree items
        this.m_data = [];
        // with the vscode.EventEmitter we can refresh our  tree view
        this.m_onDidChangeTreeData = new vscode.EventEmitter();
        // and vscode will access the event by using a readonly onDidChangeTreeData
        //(this member has to be named like here, otherwise vscode doesnt update our treeview.
        this.onDidChangeTreeData = this.m_onDidChangeTreeData.event;
        this.context = context;
        this.persistence = new GroupPersistence(context.workspaceState, resolveWorkspaceFile, logMessage);
        this.editorTabs = new EditorTabs();
        this.groupImportExport = new GroupImportExport(
            () => this.m_data,
            async newGroups => {
                this.m_data.push(...newGroups);
                await this.commitChanges();
            }
        );
        this.dragAndDropController = new TabGroupDragAndDrop(
            () => this.m_data,
            async (groups, replaceGroups = false) => {
                if (replaceGroups) this.m_data = groups;
                await this.commitChanges();
            },
            this.editorTabs
        );
        // treeView事件监听器集合
        this._treeViewDisposables = [];
        // 用以判断用户操作避免在editor切换时的触发事件函数中执行高亮
        this.isUserAction = false;
        // 用于确定操作的分组
        this.groupLabel = null;
        // 记录上一次点击的时间戳
        this.lastClickTime = 0;
        // 用于确定点击的item
        this.itemId = '';
    }

    setTreeView(treeView) {
        this.treeView = treeView;
        this._treeViewDisposables.push(
            // 分组展开/折叠事件
            this.treeView.onDidExpandElement(item => this.setGroupExpandState(item, true)),
            this.treeView.onDidCollapseElement(item => this.setGroupExpandState(item, false)),
            // editor切换事件
            vscode.window.onDidChangeActiveTextEditor(editor => this.highlightFileInGroup(editor)),
        );
    }

    /**
     * Save this tree in the workspace.
     */
    async save() {
        await this.persistence.save(this.m_data);
    }
    /**
     * Load a tree from the workspace.
     */
    async load() {
        this.m_data = await this.persistence.load();
        this.refresh();
    }
    refresh() {
        this.m_onDidChangeTreeData.fire(undefined);
    }
    async commitChanges() {
        this.refresh();
        await this.save();
    }
    /**
     * Dispose
     */
    dispose() {
        // 1. 清理 EventEmitter
        this.m_onDidChangeTreeData.dispose();
        // 2. 清空引用
        this.m_data = [];
        this.treeView = null;
        // 清空treeView事件监听器
        this._treeViewDisposables.forEach(d => d.dispose());
    }
    /**
     * 渲染树视图
     * @inheritDoc
     */
    getTreeItem(item) {
        let title = item.label ? item.label.toString() : "";
        let result = new vscode.TreeItem(title, item.collapsibleState);
        // here we add our command which executes our memberfunction
        result.command = {
            command: "tab_group_pro.item_clicked",
            title: title,
            arguments: [item],
        };
        result.contextValue = item.isRoot ? "tgp_root_item" : "tgp_child_item";
        result.resourceUri = item.resourceUri; // 文件属性
        result.description = item.description; // 文件描述
        result.tooltip = item.tooltip; // 悬停提示
        return result;
    }
    /**
     * 渲染树视图
     * @inheritDoc
     */
    getChildren(element) {
        if (!element) {
            return this.m_data.map(item => {
                if (this.treeView && item.isRoot) {
                    this.treeView.reveal(item, {
                        expand: item.collapsibleState === vscode.TreeItemCollapsibleState.Expanded,
                        focus: false, // 避免初始化时聚焦
                        select: false // 避免初始化时聚焦
                    });
                }
                return item;
            });
        }
        return element.children;
    }
    /**
     * 渲染树视图
     * @inheritdoc
     */
    getParent(element) {
        if (this.m_data.includes(element)) {
            return undefined;
        }
        for (let item of this.m_data) {
            if (item.children.includes(element)) {
                return item;
            }
        }
    }
    findGroupContainingItem(item) {
        return this.m_data.find(group => group.children.includes(item));
    }
    /*** TOP LEVEL ***/
    getItemIndexByParentLabel(label) {
        for (let index = 0; index < this.m_data.length; index++) {
            if (this.m_data[index].label === label) {
                return index;
            }
        }
        return -1;
    }
    /**
     * Expand all groups of tabs.
     */
    async expandAllGroups() {
        if (!this.treeView) return;
        for (var item of this.m_data) {
            try {
                if (item.isRoot) { item.collapsibleState = vscode.TreeItemCollapsibleState.Expanded; }
                await this.treeView.reveal(item, {
                    select: false,
                    expand: true
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to expand Group "${item.label}":`, error);
            }
        }
        this.save();
    }
    /**
     * Collapse all groups of tabs.
     */
    async collapseAllGroups() {
        if (!this.treeView) return;
        await vscode.commands.executeCommand(`workbench.actions.treeView.${EXTENSION_ID}.collapseAll`);
        this.m_data.forEach(item => {
            if (item.isRoot) { item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed; }
        });
        this.save();
    }
    /**
     * Create a new group of tabs.
     */
    async addTabGroup() {
        const input = await vscode.window.showInputBox({
            prompt: "Type in the Name for New Group.\n",
        });
        if (input && input !== "") {
            if ( this.getItemIndexByParentLabel(input) !== -1 ) {
                vscode.window.showErrorMessage(`Cannot have two Groups with name '${input}'`);
                return;
            }
            const newItem = new TabGroupItem(input, null, true, `group-${Date.now()}-${Math.random().toString(36).substring(2,8)}`); // 使用唯一ID
            this.m_data.push(newItem);
            this.m_onDidChangeTreeData.fire(undefined);
            this.save();
            return newItem;
        }
        return undefined;
    }
    /**
     * Remove all groups of tabs. Fully clears the tree.
     */
    removeAllGroups() {
        vscode.window.showInformationMessage("Confirm removal of all Groups.", "Yes", "No")
            .then((answer) => {
            if (answer === "Yes") {
                this.m_data = [];
                this.m_onDidChangeTreeData.fire(undefined);
                this.save();
            }
        });
    }
    async exportGroups() {
        await this.groupImportExport.exportGroups();
    }
    async importGroups() {
        await this.groupImportExport.importGroups();
    }
    /*** MID LEVEL ***/

    async addEntryToGroup(item) {
        if(!item){
            vscode.window.showErrorMessage('Only can be added to Group when right click on a file.');
            return;
        }
        const selectedFilePath = item.fsPath || item._fsPath;
        if (!selectedFilePath) {
            vscode.window.showErrorMessage('The selected item is not a file.');
            return;
        }
        const validationResult = validateWorkspace(vscode.Uri.file(selectedFilePath));
        if (validationResult.hasError) {
            vscode.window.showErrorMessage(validationResult.error);
            return;
        }
        let groupLabels = createQuickPickGroupsOptions(this.m_data, true, selectedFilePath);
        vscode.window.showQuickPick(groupLabels, {
            canPickMany: false,
            placeHolder: "Select Group without this Tab.",
        })
            .then(async (groupSelection) => {
            if (!groupSelection)
                return;
            let parent;
            if (groupSelection.label === NEW_GROUP_LABEL) {
                parent = await this.addTabGroup();
                if (!parent) return;
            }
            else {
                let dataIndex = this.getItemIndexByParentLabel(groupSelection.label);
                parent = this.m_data[dataIndex];
            }
            let filePath = normalizePath(validationResult.workspaceDir, selectedFilePath);
            const newChild = new TabGroupItem(filePath, selectedFilePath, false, `item-0-${Date.now()}-${Math.random().toString(36).substring(2,8)}`);
            newChild.setParentLabel(parent.label?.toString());
            parent.add_child(newChild);
            parent.updateTooltip();
            this.m_onDidChangeTreeData.fire(undefined);
            // Save the tree to the context
            this.save();
            // this.closeEditor([item._fsPath]);
        });
    }
    async addAllOpenTabsToGroup() {
        const validationResult = validateWorkspace();
        if (validationResult.hasError) {
            // 这里取消警告
            // vscode.window.showErrorMessage(validationResult.error);
            // 替换为在没有打开任何标签时，直接新建组
            this.addTabGroup();
            return;
        }
        const openFiles = getCurrentlyOpenFiles(validationResult.workspaceDir);
        let groupLabels = createQuickPickGroupsOptions(this.m_data, true);
        vscode.window.showQuickPick(groupLabels, {
            canPickMany: false,
            placeHolder: `Select Group to Add All Opened ${openFiles.length} Tabs.`,
        })
            .then(async (groupSelection) => {
            if (!groupSelection)
                return;
            let parent;
            if (groupSelection.label === NEW_GROUP_LABEL) {
                parent = await this.addTabGroup();
                if (!parent) return;
            }
            else {
                let dataIndex = this.getItemIndexByParentLabel(groupSelection.label);
                parent = this.m_data[dataIndex];
            }
            let filePaths = [];
            let count = 0;
            for (let f of openFiles) {
                count++;
                let filePath = path.join(validationResult.workspaceDir, f.label);
                const newChild = new TabGroupItem(f.label, filePath, false,`item-${count}-${Date.now()}-${Math.random().toString(36).substring(2,8)}`);;
                newChild.setParentLabel(parent.label?.toString());
                parent.add_child(newChild);
                filePaths.push(filePath);
            }
            if(vscode.workspace.getConfiguration("tab-group-pro").get("closeTabsOnAddAllToGroup")){
                await this.editorTabs.close(filePaths);
            }
            parent.updateTooltip();
            this.m_onDidChangeTreeData.fire(undefined);
            // Save the tree to the context
            this.save();
        });
    }

    /**
     * Add an entry to a parent item.
     * @param parent The parent item.
     */
    async addChildToItem(parent) {
        if (!parent) { return; }
        const validationResult = validateWorkspace();
        if (validationResult.hasError) {
            // 在没有已打开标签的情况下，无需提示
            // vscode.window.showErrorMessage(validationResult.error);
            return;
        }
        // 获取当前group中已有的文件路径
        const existedFiles = parent.children.map(child => child.file);
        // 获取所有已打开的文件
        const quickPickItems = getCurrentlyOpenFiles(validationResult.workspaceDir);
        // 获取当前group已有的文件
        const existedItems = quickPickItems.filter(item => existedFiles.includes(path.join(validationResult.workspaceDir, item.label)));
        // 获取当前group没有的文件
        const ungroupedItems = quickPickItems.filter(item => !existedItems.includes(item));
        // if (ungroupedItems.length === 0) { return; }
        // 显示选择框（不显示当前group已有文件）
        const filesSelections = await vscode.window.showQuickPick(ungroupedItems, {
            canPickMany: true,
            placeHolder: `${ungroupedItems.length} Opened Tabs not in this Group to Select.`
        });
        // Add to tree if something was selected
        if (filesSelections) {
            var count = 0;
            for (let selectionObj of filesSelections) {
                count++;
                var label = selectionObj["label"];
                var file_path = path.join(validationResult.workspaceDir, label);
                var newChild = new TabGroupItem(label, file_path, false, `item-${count}-${Date.now()}-${Math.random().toString(36).substring(2,8)}`);
                if (parent.label) {
                    newChild.setParentLabel(parent.label.toString());
                }
                parent.add_child(newChild);
            }
            parent.updateTooltip();
            this.m_onDidChangeTreeData.fire(undefined);
            // Save the tree to the context
            this.save();
        }
    }
    /**
     * Open the tab group, i.e., all files in the group, in the editor.
     * @param item The item that represents the root of the group.
     */
    async openTabGroup(item) {
        // Check if the user wants the other tabs to be closed when opening a new group
        if (vscode.workspace.getConfiguration("tab-group-pro").get("closeTabsOnOpenGroup")) {
            // close every open tab
            await vscode.commands.executeCommand("workbench.action.closeAllEditors");
        }
        var file_paths = [];
        for (let child of item.children) {
            if (child.file) {
                file_paths.push(child.file);
            }
        }
        this.groupLabel = item.label;
        await this.editorTabs.open(file_paths, false, false);
        this.groupLabel = null;
        vscode.window.showInformationMessage(`Opened Group '${item.label}' Successfully.`);
    }
    /**
     * Close the tab group, i.e., all files in the group, in the editor.
     * @param item The item that represents the root of the group.
     */
    async closeTabGroup(item) {
        var file_paths = [];
        for (let child of item.children) {
            if (child.file) {
                file_paths.push(child.file);
            }
        }
        this.isUserAction = true;
        await this.editorTabs.close(file_paths);
        this.isUserAction = false;
        vscode.window.showInformationMessage(`Closed Group '${item.label}' Successfully.`);
    }
    /**
     * Change the name of the group's root.
     * @param item The item representing the root of the group.
     */
    async editTabGroupName(item) {
        const input = await vscode.window.showInputBox({
            prompt: "Type in new Name for this Group.\n",
        });
        if (input && input !== "") {
            if ( this.getItemIndexByParentLabel(input) !== -1 ) {
                vscode.window.showErrorMessage(`Cannot have two Groups with name '${input}'`);
                return;
            }
            item.label = input;
            item.tooltip = input;
            // 更新子项的parentLabel
            if(item.children.length > 0){
                item.children.forEach((child) => {
                    child.setParentLabel(input);
                });
            }
            this.m_onDidChangeTreeData.fire(undefined);
            this.save();
        }
    }
    async copyTabsPathInGroup(item) {
        // 确保该项存在
        if (!item || !item.children || item.children.length === 0) { return; }
        try {
            // 提取所有子项的路径
            var paths = item.children.map(child => child.file);
            var pathsString = paths.join('\n');
            await vscode.env.clipboard.writeText(pathsString);
            vscode.window.showInformationMessage(`Copied ${paths.length} files Paths to clipboard.`);
        } catch (error) {
            vscode.window.showErrorMessage("Failed to copy file paths: " + error.message);
        }
    }
    async copyTabsRelativePathInGroup(item) {
        // 确保该项存在
        if (!item || !item.children || item.children.length === 0) { return; }
        try {
            // 提取所有子项的路径
            var paths = item.children.map(child => child.relativeFile);
            var pathsString = paths.join('\n');
            await vscode.env.clipboard.writeText(pathsString);
            vscode.window.showInformationMessage(`Copied ${paths.length} files Relative Paths to clipboard.`);
        } catch (error) {
            vscode.window.showErrorMessage("Failed to copy file paths: " + error.message);
        }
    }
    /**
     * Clears the tabs within a tab group but does not remove the group itself.
     * @param item The item representing the root of the group.
     */
    clearTabsInGroup(item) {
        // 确保该项存在
        if (!item || !item.children || item.children.length === 0) { return; }
        // 显示确认对话框给用户
        vscode.window.showInformationMessage(`Confirm clearing all tabs in Group '${item.label}'.`, "Yes", "No")
            .then((answer) => {
                if (answer === "Yes") {
                    // 清空组内的所有子项（tabs）
                    item.children.length = 0; // 直接清空数组
                    item.updateTooltip();
                    // 通知视图数据已更改
                    this.m_onDidChangeTreeData.fire(undefined);
                    // 将更新保存到上下文
                    this.save();
                }
            }).catch(error => {
                // 错误处理
                vscode.window.showErrorMessage(`Failed to clear tabs in Group '${item.label}'.`);
            });
    }
    /**
     * Removes the tab group from the tree
     * @param item The item representing the root of the group.
     */
    removeTabGroup(item) {
        var index = this.m_data.indexOf(item, 0);
        if (index <= -1) { return; }
        // 如果组内没有文件或子组，则直接移除
        if (!item.children || item.children.length === 0) {
            this.m_data.splice(index, 1);
            this.m_onDidChangeTreeData.fire(undefined);
            // Save the tree to the context
            this.save();
        } else {
            // 如果组内有文件或子组，询问用户是否确认删除
            vscode.window.showInformationMessage(`Confirm removal of Group '${item.label}'.`, "Yes", "No")
                .then((answer) => {
                    if (answer === "Yes") {
                        this.m_data.splice(index, 1);
                        this.m_onDidChangeTreeData.fire(undefined);
                        // Save the tree to the context
                        this.save();
                    }
                }).catch(error => {
                    // 错误处理
                    vscode.window.showErrorMessage(`Failed to remove Group '${item.label}'.`);
                });
        }
    }

    /*** LOW LEVEL ***/
    findParentOfItem(item) {
        if (item.isRoot) {
            return this.m_data;
        }
        return this.findGroupContainingItem(item)?.children || [];
    }
    array_move(arr, old_index, new_index) {
        arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
        return arr;
    }
    ;
    moveItemUp(item) {
        const parent = this.findParentOfItem(item);
        const index = parent.indexOf(item);
        if (index <= 0) {
            // 无法再移动时也无需提示
            // vscode.window.showErrorMessage(`Cannot move this item up.`);
            return;
        }
        this.array_move(parent, index, index - 1);
        this.treeView?.reveal(item);
        this.m_onDidChangeTreeData.fire(undefined);
        this.save();
    }
    moveItemDown(item) {
        const parent = this.findParentOfItem(item);
        const index = parent.indexOf(item);
        if (index === parent.length - 1) {
            // 无法再移动时也无需提示
            // vscode.window.showErrorMessage(`Cannot move this item down.`);
            return;
        }
        this.array_move(parent, index, index + 1);
        this.treeView?.reveal(item);
        this.m_onDidChangeTreeData.fire(undefined);
        this.save();
    }
    /**
     * Open a tab in the editor.
     * @param item The item representing the file to be opened.
     */
    async openTab(item) {
        if(item.file){
            this.isUserAction = true;
            await this.editorTabs.open([item.file], false, false);
            this.isUserAction = false;
        }
    }
    /**
     * Close a tab in the editor.
     * @param item The item representing the file to be closed.
     */
    async closeTab(item) {
        if(item.file) {
            await this.editorTabs.close([item.file]);
        }
    }
    /**
     * Remove a tab/file from the group.
     * @param item The item representing the file to be removed from the group.
     */
    removeTab(item) {
        // Loop through every group in the tree
        for (let tab_group of this.m_data) {
            // If the group is not the parent of the item, continue
            if (tab_group.label !== item.parentLabel) {
                continue;
            }
            // Find the index of the item in the group's children
            var index = tab_group.children.indexOf(item, 0);
            if (index > -1) {
                tab_group.children.splice(index, 1);
                tab_group.updateTooltip();
                this.m_onDidChangeTreeData.fire(undefined);
                // Save the tree to the context
                this.save();
                break;
            }
        }
    }

    /*** GENERAL ***/
    /**
     * Open the clicked tab/file in the editor.
     * @param item The item representing the tab/file that was clicked.
     */
    // 单击预览，双击固定
    async item_clicked(item) {
        logMessage('click: '+item.id);
        var currentTime = Date.now();
        // 切换item则立即重置时间戳
        if ( item.id !== this.itemId ) {
            this.lastClickTime = 0;
        }
        logMessage('lastClickTime: '+this.lastClickTime);
        var timeDiff = currentTime - this.lastClickTime;
        // 设置双击的时间阈值（例如 300 毫秒）
        var doubleClickThreshold = 300;
        var preview = true;
        if (timeDiff < doubleClickThreshold) {
            preview = false;
        }
        // 避免因切换editor同时触发事件函数
        this.isUserAction = true;
        if (!item.isRoot) {
            await this.editorTabs.open([item.file], true, preview);
        }
        this.isUserAction = false;
        // 记录每次点击的item
        this.itemId = item.id;
        // 更新每次点击的时间戳
        this.lastClickTime = currentTime;

    }

    // 处理分组展开/折叠
    setGroupExpandState(item, isExpanded) {
        if (item.element.isRoot) {
            item.element.collapsibleState = isExpanded
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.Collapsed;
            this.save();
        }
    }

    /**
     * 根据当前激活的editor自动选中group中对应文件
     * @param editor The editor that is currently active
     */
    async highlightFileInGroup(editor) {
        if (!editor) { return; }
        if (this.isUserAction) { return; }
        // 检查视图是否可见
        if (!this.treeView.visible) { return; }
        try{
            var groupLabel = this.groupLabel;
            var filePath = editor.document.uri.fsPath;
            // 遍历所有分组和子项，找到匹配的文件
            for (let group of this.m_data) {
                // 如果不是操作的分组则跳过
                if ( groupLabel && groupLabel!== group.label ) { continue; }
                // 如果当前分组未展开则跳过
                if (group.collapsibleState !== vscode.TreeItemCollapsibleState.Expanded) { continue; }
                for (let item of group.children) {
                    if (item.file === filePath) {
                        // 选中
                        this.treeView?.reveal(item, { focus: false, select: true });
                        // 等待 500ms
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                // 操作完当前分组则返回
                if ( groupLabel && groupLabel == group.label ) { return; }
            }
        }catch(err){
            vscode.window.showErrorMessage(`Failed to highlight file in Group.`);
        }
        // 重置为 false
        this.isUserAction = false;
        // 重置为 null
        this.groupLabel = null;
    }
}
exports.TabGroupTreeProvider = TabGroupTreeProvider;
