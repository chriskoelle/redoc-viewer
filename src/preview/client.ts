import * as vscode from 'vscode';
import * as YAML from 'js-yaml';
import * as path from 'path';

import { PreviewServer } from './server';


class BrowserPreview {

	constructor(private previewUrl: string, private filename: string){
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(this.previewUrl));
	}

}

function hashString(str: string): string{
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash += Math.pow(str.charCodeAt(i) * 31, str.length - i);
		hash = hash & hash;
	}
	return hash.toString();
}

function getParsedContent(document: vscode.TextDocument){
	const fileContent = document.getText();
	try{
		if (document.languageId === "json") {
			return JSON.parse(fileContent);
		} else if (document.languageId === "yaml") {
			return YAML.safeLoad(fileContent);
		} else if (document.languageId === "plaintext") {
			if (fileContent.match(/^\s*[{[]/)) {
				return JSON.parse(fileContent);
			} else {
				return YAML.safeLoad(fileContent);
			}
		}
	}
	catch(ex){
		return null;
	}
}

let previewServer: PreviewServer = null;

export function activate(context: vscode.ExtensionContext){
	previewServer = new PreviewServer();
	let disposable = vscode.commands.registerCommand('extension.previewReDoc', () => {
		let editor = vscode.window.activeTextEditor;
		if(!editor) return;
		let document = editor.document;
		let fileName = document.fileName;
		let fileHash = hashString(fileName.toLowerCase());
		let fileContent = getParsedContent(document);
		previewServer.update(fileName, fileHash, fileContent);
		new BrowserPreview(previewServer.getUrl(fileHash), fileName);
	});
	vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
		if (e.document === vscode.window.activeTextEditor.document) {
			let fileName = e.document.fileName;
			let fileHash = hashString(fileName.toLowerCase());
			previewServer.update(fileName, fileHash, getParsedContent(e.document));
		}
	});
	context.subscriptions.push(disposable);
}

export function deactivate(){
	if(previewServer) previewServer.stop();
}
