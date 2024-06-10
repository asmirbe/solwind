import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import snippets from "./snippets.json";
import { Client, Databases } from "appwrite";

// Appwrite setup
const client = new Client();
const db = new Databases(client);

client.setEndpoint("https://setups.gallery/v1").setProject("666496b50037dcfde788");

function callToAPIAndRetrieve(term: string) {
	return new Promise((resolve, reject) => {
		const matchingSnippets = snippets.filter((obj) => obj && obj.label && obj.label.includes(term));
		if (matchingSnippets.length > 0) {
			resolve(matchingSnippets);
		} else {
			reject("No snippets found");
		}
	});
}

export function activate(context: vscode.ExtensionContext) {
	const templateManager = vscode.commands.registerCommand("extension.generateFromTemplate", function () {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			const templateFolders = fs.readdirSync(path.join(__dirname, "templates"));
			vscode.window.showQuickPick(templateFolders).then((selectedTemplate) => {
				if (selectedTemplate) {
					const templatePath = path.join(__dirname, "templates", selectedTemplate);
					const files = fs.readdirSync(templatePath);
					files.forEach((file) => {
						const filePath = path.join(templatePath, file);
						const destinationPath = path.join(workspaceFolders[0].uri.fsPath, file);
						fs.copyFileSync(filePath, destinationPath);
					});
					vscode.window.showInformationMessage("Template files generated successfully!");
				}
			});
		} else {
			vscode.window.showErrorMessage("No folder is open. Please open a folder to generate template files.");
			vscode.window
				.showOpenDialog({
					canSelectFiles: false,
					canSelectFolders: true,
					canSelectMany: false,
					openLabel: "Select Folder",
				})
				.then((folderUri) => {
					if (folderUri && folderUri[0]) {
						vscode.commands.executeCommand("vscode.openFolder", folderUri[0]);
					}
				});
		}
	});

	const htmlConsoleCompletionProvider = vscode.languages.registerCompletionItemProvider(
		"html",
		{
			provideCompletionItems: async function (model, position): Promise<vscode.CompletionList> {
				const activeEditor = vscode.window.activeTextEditor;
				if (!activeEditor) return new vscode.CompletionList([], true);
				const { text } = activeEditor.document.lineAt(activeEditor.selection.active.line);
				console.log("Text", text);
				try {
					const matchingSnippets = (await callToAPIAndRetrieve(text)) as any[];
					const completionItems = matchingSnippets.map((snippet: any) => {
						const completionItem = new vscode.CompletionItem(snippet.label);
						completionItem.documentation = new vscode.MarkdownString(snippet.documentation);
						completionItem.insertText = new vscode.SnippetString(snippet.insertText);
						return completionItem;
					});
					return new vscode.CompletionList(completionItems, true);
				} catch (error) {
					console.error("Error retrieving snippets:", error);
					return new vscode.CompletionList([], true);
				}
			},
		},
		"tw"
	);

	context.subscriptions.push(htmlConsoleCompletionProvider, templateManager);
}
