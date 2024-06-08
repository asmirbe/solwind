import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import snippets from "./snippets.json";

function createHTMLProposals(document: vscode.TextDocument, position: vscode.Position) {
	return snippets.map((snippet: any) => {
		console.log(snippets[0]);
		const startPosition = position.translate(0, -3); // Recule de 2 caractères (longueur de "sw")
		const endPosition = position;
		const range = new vscode.Range(startPosition, endPosition);

		return {
			label: snippet.label,
			kind: vscode.CompletionItemKind.Snippet,
			documentation: snippet.documentation,
			insertText: new vscode.SnippetString(snippet.insertText),
			range: range,
		};
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
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				console.log("provideCompletionItems called");
				const linePrefix = document.lineAt(position).text.slice(0, position.character);
				if (!linePrefix.endsWith("tw-")) {
					return undefined;
				}

				return createHTMLProposals(document, position);
			},
		},
		""
	);

	context.subscriptions.push(htmlConsoleCompletionProvider, templateManager);
}
