"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const vscode = require("vscode");
const TreeDataProvider_1 = require("../../TreeDataProvider");
suite('TreeDataProvider Test Suite', () => {
    vscode.window.showInformationMessage('Start all \'TreeDataProvider\' tests.');
    test("Should start extension 'Tabs Group Pro'", async () => {
        const started = vscode.extensions.getExtension("shelus2021.tabs-group-pro");
        assert.notEqual(started, undefined);
        assert.equal(started?.isActive, true);
    });
    test("Create new tree data provider", async () => {
        const ext = vscode.extensions.getExtension("shelus2021.tabs-group-pro");
        if (!ext) {
            throw Error("Could not get extension.");
        }
        const extensionContext = await ext.activate();
        const treeDataProvider = new TreeDataProvider_1.TreeDataProvider(extensionContext);
        //assert.equal()
    });
    // TODO
});
//# sourceMappingURL=TreeDataProviderTest.test.js.map
