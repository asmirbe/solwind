import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
// import snippets from "./snippets.json";
import { Client, Databases, Models, Query } from "appwrite";
import { baseHTML } from "./base";

const client = new Client();
const databases = new Databases(client);

client.setEndpoint("https://setups.gallery/v1").setProject("666496b50037dcfde788");

function callToAPIAndRetrieve(term: string) {
	return new Promise((resolve, reject) => {
		databases.listDocuments("snippets", "snippets", [Query.contains("label", term)]).then((response) => {
			const snippets = response.documents || [];
			const matchingSnippets = snippets.filter((obj) => obj && obj.label && obj.label.includes(term));
			if (matchingSnippets.length > 0) {
				resolve(matchingSnippets);
			} else {
				reject(term);
			}
		});
	});
}

export function activate(context: vscode.ExtensionContext) {
	const templateManager = vscode.commands.registerCommand("extension.generateFromTemplate", async function () {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			try {
				const response = await databases.listDocuments("templates", "pages");
				const templates: Models.Document[] = response.documents || [];

				const templateNames = templates.map((template: Models.Document) => template["name"]);

				vscode.window.showQuickPick(templateNames).then(async (selectedTemplateName:any) => {
					if (selectedTemplateName) {
						const selectedTemplate = templates.find((template: Models.Document) => template["name"] === selectedTemplateName);
						if (selectedTemplate) {
							const fileName = selectedTemplate["name"];
							const fileContent = selectedTemplate["content"];
							const styleContent = selectedTemplate["styles"].content;

							const filePath = path.join(workspaceFolders[0].uri.fsPath, fileName).concat(".html");
							const fileStylePath = path.join(workspaceFolders[0].uri.fsPath, "style.css");
							await fs.promises.writeFile(filePath, baseHTML(fileContent), {encoding:'utf8',flag:'w'})
							await fs.promises.writeFile(fileStylePath, styleContent, { flag: "a" });

							vscode.window.showInformationMessage(`File '${fileName}.html' generated successfully!`);
						}
					}
				});
			} catch (error) {
				console.error("Error fetching templates:", error);
				vscode.window.showErrorMessage("Failed to fetch templates from the database.");
			}
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
			provideCompletionItems: async function (document: vscode.TextDocument, position: vscode.Position): Promise<any> {
				const activeEditor = vscode.window.activeTextEditor;
				if (!activeEditor) return new vscode.CompletionList([], true);
				const { text } = activeEditor.document.lineAt(activeEditor.selection.active.line);

				try {
					const matchingSnippets = (await callToAPIAndRetrieve(text.trim())) as any[];

					const completionItems = matchingSnippets.map((snippet: any) => {
						return {
							label: snippet.label,
							kind: vscode.CompletionItemKind.Snippet,
							documentation: snippet.description,
							insertText: new vscode.SnippetString(snippet.value),
						};
					});
					return new vscode.CompletionList(completionItems, true);
				} catch (error) {
					console.error("Error retrieving snippets:", error);
					return new vscode.CompletionList([], true);
				}
			},
		}
	);

	context.subscriptions.push(htmlConsoleCompletionProvider, templateManager);
}
