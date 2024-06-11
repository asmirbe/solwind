/* eslint-disable */
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { baseHTML } from "./base";
const PocketBase = require("pocketbase/cjs");

const pb = new PocketBase("https://sw-pocketbase.up.railway.app", {
	requestTimeout: 30000,
});

function callToAPIAndRetrieve(term: string) {
	return new Promise((resolve, reject) => {
		const maxRetries = 3;
		let retryCount = 0;

		function makeRequest() {
			pb.collection("snippets")
				.getList(1, 20, {
					filter: pb.filter("label ~ {:query}", { query: term }),
				})
				.then((response: any) => {
					const snippets = response.items || [];
					const matchingSnippets = snippets.filter((obj: any) => obj && obj.label && obj.label.includes(term));
					if (matchingSnippets.length > 0) {
						resolve(matchingSnippets);
					} else {
						reject(term);
					}
				})
				.catch((error: any) => {
					if (retryCount < maxRetries) {
						retryCount++;
						console.log(`Retrying request... (Attempt ${retryCount})`);
						setTimeout(makeRequest, 2000); // Retry after 2 seconds
					} else {
						reject(error);
					}
				});
		}

		makeRequest();
	});
}

class SnippetsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	public snippets: any[] = [];
	public categories: any[] = [];
	public subcategories: any[] = [];

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
			return element;
	}

	async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
			if (!element) {
					// Root level: show categories
					return this.categories.map((category) => {
							const treeItem = new vscode.TreeItem(category.name, vscode.TreeItemCollapsibleState.Collapsed);
							treeItem.contextValue = "category";
							treeItem.id = category.id;
							treeItem.iconPath = new vscode.ThemeIcon("folder");
							return treeItem;
					});
			} else if (element.contextValue === "category") {
					// Category level: show subcategories
					const subcategories = this.subcategories.filter((subcat) => subcat.category === element.id);
					return subcategories.map((subcategory) => {
							const treeItem = new vscode.TreeItem(subcategory.name, vscode.TreeItemCollapsibleState.Collapsed);
							treeItem.contextValue = "subcategory";
							treeItem.id = subcategory.id;
							treeItem.label = `${subcategory.name} - ${this.snippets.filter((snippet) => snippet.subcategory === subcategory.id).length}`
							treeItem.iconPath = new vscode.ThemeIcon("folder");
							return treeItem;
					});
			} else if (element.contextValue === "subcategory") {
					// Subcategory level: show snippets
					const snippets = this.snippets.filter((snippet) => snippet.subcategory === element.id);
					return snippets.map((snippet) => {
							const treeItem = new vscode.TreeItem(snippet.label, vscode.TreeItemCollapsibleState.None);
							treeItem.contextValue = "snippet";
							treeItem.id = snippet.id;
							treeItem.description = snippet.documentation || "";
							treeItem.tooltip = snippet.tooltip || "";
							treeItem.iconPath = new vscode.ThemeIcon("symbol-snippet");
							return treeItem;
					});
			}
			return [];
	}

	refresh(): void {
			this._onDidChangeTreeData.fire(undefined);
	}

	private _onDidChangeTreeData: vscode.EventEmitter<undefined | void> = new vscode.EventEmitter<undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<undefined | void> = this._onDidChangeTreeData.event;
}


const snippetsProvider = new SnippetsProvider();
vscode.window.registerTreeDataProvider("snippets", snippetsProvider);

export function activate(context: vscode.ExtensionContext) {
	const snippetsProvider = new SnippetsProvider();

	const snippetsTreeView = vscode.window.createTreeView("snippets", {
		treeDataProvider: snippetsProvider,
	});

	async function fetchSnippets() {
		try {
			const [snippetsResponse, categoriesResponse, subcategoriesResponse] = await Promise.all([pb.collection("snippets").getList(1, 30, { expand: "category,subcategory" }), pb.collection("categories").getList(1, 100, { sort: "name" }), pb.collection("subcategories").getList(1, 100, { sort: "name", expand: "category" })]);

			const snippets: any[] = snippetsResponse.items || [];
			const categories: any[] = categoriesResponse.items || [];
			const subcategories: any[] = subcategoriesResponse.items || [];

			console.log("Fetched snippets:", snippets);
			console.log("Fetched categories:", categories);
			console.log("Fetched subcategories:", subcategories);

			snippetsProvider.snippets = snippets;
			snippetsProvider.categories = categories;
			snippetsProvider.subcategories = subcategories;
			snippetsProvider.refresh();
		} catch (error) {
			console.error("Error fetching snippets and categories:", error);
			vscode.window.showErrorMessage("Failed to fetch snippets and categories from the database.");
		}
	}

	const folderContextMenuProvider = vscode.commands.registerCommand("extension.generateFromTemplate", async (folderUri: vscode.Uri) => {
		try {
			const response = await pb.collection("templates").getFullList({
				sort: "-created",
			});
			console.log(response);

			const templates: any[] = response || [];
			const templateNames = templates.map((template) => template.name);

			vscode.window.showQuickPick(templateNames).then(async (selectedTemplateName: any) => {
				if (selectedTemplateName) {
					const selectedTemplate = templates.find((template) => template.name === selectedTemplateName);
					console.log(selectedTemplate);

					if (selectedTemplate) {
						const fileName = selectedTemplate.name;
						const fileContent = selectedTemplate.content;

						const filePath = path.join(folderUri.fsPath, "index.html");

						// Check if the file already exists
						const fileExists = await fs.promises
							.access(filePath, fs.constants.F_OK)
							.then(() => true)
							.catch(() => false);

						if (fileExists) {
							// Prompt the user for confirmation to overwrite the file
							const overwrite = await vscode.window.showInformationMessage("The file already exists do you want to overwrite it?", "Yes", "No");
							if (overwrite === "No") return;
							// User confirmed to overwrite the file
							await fs.promises.writeFile(filePath, baseHTML(fileContent), { encoding: "utf8", flag: "w" });
							vscode.window.showInformationMessage(`Template '${fileName}' generated successfully!`);
						} else {
							// File doesn't exist, create it
							await fs.promises.writeFile(filePath, baseHTML(fileContent), { encoding: "utf8", flag: "w" });
							vscode.window.showInformationMessage(`Template '${fileName}' generated successfully!`);
						}
					}
				}
			});
		} catch (error) {
			console.error("Error fetching templates:", error);
			vscode.window.showErrorMessage("Failed to fetch templates from the database.");
		}
	});

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.deleteSnippet", async (item: vscode.TreeItem) => {
			try {
				const deleteSnippet = await vscode.window.showInformationMessage(`Do you confirm deletion of snippet ${item.label}?`, "Yes", "No");
				if (deleteSnippet === "No") return;
				await pb.collection("snippets").delete(item.id!);
				vscode.window.showInformationMessage(`Snippet "${item.label}" deleted successfully!`);
				fetchSnippets();
			} catch (error) {
				console.error("Error deleting snippet:", error);
				vscode.window.showErrorMessage("Failed to delete snippet.");
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.editSnippet", async (item: vscode.TreeItem) => {
			const snippet = snippetsProvider.snippets.find((snippet) => snippet.id === item.id);
			console.log(item.id);

			if (!snippet) {
				vscode.window.showErrorMessage("Snippet not found.");
				return;
			}

			const label = await vscode.window.showInputBox({ prompt: "Enter snippet label", value: snippet.label });
			const documentation = await vscode.window.showInputBox({ prompt: "Enter snippet documentation", value: snippet.documentation });
			const insertText = await vscode.window.showInputBox({ prompt: "Enter snippet insert text", value: snippet.insertText });

			if (!label || !insertText) {
				vscode.window.showErrorMessage("All fields are required to edit a snippet.");
				return;
			}

			try {
				await pb.collection("snippets").update(snippet.id, {
					label,
					documentation,
					insertText,
				});
				vscode.window.showInformationMessage(`Snippet "${label}" updated successfully!`);
				fetchSnippets();
			} catch (error) {
				console.error("Error updating snippet:", error);
				vscode.window.showErrorMessage("Failed to update snippet.");
			}
		})
	);

	vscode.workspace.onDidChangeWorkspaceFolders((event) => {
		event.added.forEach((folder) => {
			const folderPath = folder.uri.fsPath;
			vscode.commands.executeCommand("setContext", "folderPath", folderPath);
		});
	});

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.insertSnippet", async (item: vscode.TreeItem) => {
			const snippet = snippetsProvider.snippets.find((snippet) => snippet.id === item.id);
			if (!snippet) {
				vscode.window.showErrorMessage("Snippet not found.");
				return;
			}

			const activeEditor = vscode.window.activeTextEditor;
			if (activeEditor) {
				const currentPosition = activeEditor.selection.active;
				activeEditor.insertSnippet(new vscode.SnippetString(snippet.insertText), currentPosition);
			}
		})
	);

	// snippetsTreeView.onDidChangeSelection((e) => {
	// 	if (e.selection.length > 0 && e.selection[0].contextValue === "snippet") {
	// 		vscode.commands.executeCommand("extension.insertSnippet", e.selection[0]);
	// 	}
	// });

	const htmlConsoleCompletionProvider = vscode.languages.registerCompletionItemProvider("html", {
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
						documentation: snippet.documentation,
						insertText: new vscode.SnippetString(snippet.insertText),
					};
				});
				return new vscode.CompletionList(completionItems, true);
			} catch (error) {
				console.error("Error retrieving snippets:", error);
				return new vscode.CompletionList([], true);
			}
		},
	});

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.refreshSnippets", () => {
			fetchSnippets();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("extension.addSnippet", async () => {
			const label = await vscode.window.showInputBox({ prompt: "Enter snippet label" });
			const documentation = await vscode.window.showInputBox({ prompt: "Enter snippet documentation" });
			const insertText = await vscode.window.showInputBox({ prompt: "Enter snippet insert text" });
			const tooltip = await vscode.window.showInputBox({ prompt: "Enter snippet tooltip" });
			if (!label || !documentation || !insertText) {
				vscode.window.showErrorMessage("All fields are required to add a snippet.");
				return;
			}

			try {
				const categoriesResponse = await pb.collection("categories").getList(1, 100, { sort: "name" });
				const categories: any[] = categoriesResponse.items || [];
				const categoryNames = categories.map((category) => category.name);

				const selectedCategoryName = await vscode.window.showQuickPick(categoryNames, { placeHolder: "Select a category for the snippet" });
				if (!selectedCategoryName) {
					vscode.window.showErrorMessage("Category selection is required.");
					return;
				}

				const selectedCategory = categories.find((category) => category.name === selectedCategoryName);
				if (!selectedCategory) {
					vscode.window.showErrorMessage("Invalid category selected.");
					return;
				}

				await pb.collection("snippets").create({
					label,
					documentation,
					insertText,
					tooltip,
					categories: selectedCategory.id,
				});

				vscode.window.showInformationMessage(`Snippet "${label}" added successfully!`);
				fetchSnippets();
			} catch (error) {
				console.error("Error adding snippet:", error);
				vscode.window.showErrorMessage("Failed to add snippet.");
			}
		})
	);

	fetchSnippets();

	context.subscriptions.push(htmlConsoleCompletionProvider, snippetsTreeView, folderContextMenuProvider);
}
