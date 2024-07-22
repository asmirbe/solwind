import * as fs from "node:fs";
import * as path from "node:path";

import { baseHTML } from "./utilities/baseHTML";

import type { ExtensionContext, WebviewPanel, TreeItem } from "vscode";
import { commands, window, ViewColumn, Uri } from "vscode";
import SnippetsDataProvider from "./providers/SnippetsDataProvider";
import HTMLCompletionProvider from "./providers/HTMLCompletionProvider";
import { pb, createSubcategory, CustomAuthStore, getTailwindConfig } from "./pocketbase/pocketbase";
import { promptForCategory, promptForSubcategory, renamePrompt } from "./utilities/prompts";
import { capitalizeFirstLetter, formatLabel } from "./utilities/stringUtils";
import { loadWebviewContent } from "./utilities/loadWebviewContent";
import { setApiKey } from "./utilities/apiKey";
import { setGlobalContext } from "./context/globalContext";
import type { Snippet } from "./types/Snippet";
import type { DataCategories } from "./types/Category";
import { setContext } from "./utilities/setContext";
import { showMessageWithTimeout } from "./utilities/errorMessage";

export async function activate(context: ExtensionContext) {
	setGlobalContext(context);
	const authStore = new CustomAuthStore();
	const apiKey = authStore.getApiKey();

	// const { newVer, nextExtensionVersion } = await authStore.getVersion();
	// if (newVer) {
	// 	window.showInformationMessage(
	// 		`New Solwind version available: v${nextExtensionVersion.version}`
	// 	);
	// }

	const setApiKeyAndInitialize = async () => {
		try {
			await setApiKey();
			await initializeExtension(context, authStore);
		} catch (error) {
			console.error('Error setting API key:', error);
		}
	};

	if (!apiKey) {
		await setApiKeyAndInitialize();
	} else {
		await initializeExtension(context, authStore);
	}
}

// Extension init
async function initializeExtension(context: ExtensionContext, authStore: CustomAuthStore) {
	const snippetsDataProvider = new SnippetsDataProvider();
	const panelMap = new Map<string, WebviewPanel>();
	await authStore.setData();

	const treeView = window.createTreeView("solwind.snippets", {
		treeDataProvider: snippetsDataProvider,
		showCollapseAll: false,
	});

	await setContext(true);
	await snippetsDataProvider.refresh();

	const createSnippet = commands.registerCommand("solwind.createSnippet", async () => {
		const editor = window.activeTextEditor;
		if (!editor) return;

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);
		if (!selectedText) {
			window.showErrorMessage("No code selected.");
			return;
		}

		try {
			const [categoriesResponse, subcategoriesResponse] = await Promise.all([
				pb.collection("categories").getList(1, 100, { sort: "name" }),
				pb.collection("subcategories").getList(1, 100, { sort: "name", expand: "category" }),
			]);

			const categories: any[] = categoriesResponse.items || [];
			const subcategories: any[] = subcategoriesResponse.items || [];

			const selectedCategoryName = await promptForCategory(categories);
			if (!selectedCategoryName) return;

			const selectedCategory = categories.find(
				(category) => category.name === selectedCategoryName
			);

			const selectedSubcategoryName = await promptForSubcategory(
				subcategories,
				selectedCategory.id
			);

			if (!selectedSubcategoryName) return;

			const selectedSubcategory = subcategories.find(
				(subcat) => subcat.name === selectedSubcategoryName
			);

			if (!selectedSubcategory) {
				window.showErrorMessage("Selected subcategory not found.");
				return;
			}

			const snippetName = await window.showInputBox({
				prompt: "Enter snippet name",
				validateInput: (text) => {
					if (text.trim().length === 0) {
						return "Snippet name cannot be empty";
					}
					if (/[^a-zA-Z0-9\s]/.test(text)) {
						return "Snippet name cannot contain special characters";
					}
					return null;
				},
			});

			let snippetLabel = await window.showInputBox({
				prompt: "Enter snippet label",
				validateInput: (text) => {
					if (text.trim().length === 0) {
						return "Snippet label cannot be empty";
					}
					if (/[^a-zA-Z0-9\s-]/.test(text)) {
						return "Snippet label can only contain letters, digits, spaces, and hyphens";
					}
					return null;
				},
			});


			if (!snippetLabel) return;

			snippetLabel = formatLabel(snippetLabel);

			const snippetData: any = {
				name: snippetName,
				label: snippetLabel,
				insertText: selectedText,
				category: selectedCategory.id,
				subcategory: selectedSubcategory.id,
			};


			await pb.collection("snippets").create(snippetData);

			// window.showInformationMessage("Snippet created successfully!");
			showMessageWithTimeout("Snippet created successfully!");
			await snippetsDataProvider.refresh();
		} catch (error) {
			console.error("Error creating snippet:", error);
			window.showErrorMessage("Failed to create snippet.");
		}
	});

	const openSnippet = commands.registerCommand("solwind.openSnippet", async (snippet: Snippet) => {
		let panel = panelMap.get(snippet.id);

		if (panel) {
			panel.reveal(ViewColumn.One);
		} else {
			panel = window.createWebviewPanel(
				"snippetDetailView",
				snippet.name,
				ViewColumn.One,
				{
					enableScripts: true,
					localResourceRoots: [Uri.joinPath(context.extensionUri, "out")],
					retainContextWhenHidden: true
				},
			);

			panelMap.set(snippet.id, panel);

			panel.onDidDispose(() => {
				panelMap.delete(snippet.id);
			});

			const data: DataCategories = {
				categories: snippetsDataProvider.categories,
				subcategories: snippetsDataProvider.subcategories
			};
			const refreshFunction = () => snippetsDataProvider.refresh();
			await loadWebviewContent(panel, snippet.id, data, authStore, refreshFunction);
		}

		// Ensure the icon path is set correctly
		try {
			panel.iconPath = Uri.joinPath(context.extensionUri, "resources", "logo.svg");
		} catch (error) {
			console.error("Failed to set icon path:", error);
		}
	});

	const deleteSnippet = commands.registerCommand(
		"solwind.deleteSnippet",
		async (item: TreeItem) => {
			try {
				const deleteSnippet = await window.showInformationMessage(
					`Do you want to delete "${item.label}"?`,
					"Yes",
					"No"
				);
				if (deleteSnippet === "No" || !deleteSnippet || deleteSnippet === undefined) return;
				await pb.collection("snippets").delete(item.id!);
				showMessageWithTimeout("Successfully deleted!");
				await snippetsDataProvider.refresh();
				const panel = panelMap.get(item.id!);
				panel?.dispose();
			} catch (error) {
				console.error("Error deleting snippet:", error);
				window.showErrorMessage("Failed to delete snippet.");
			}
		}
	);

	const generateTemplate = commands.registerCommand(
		"solwind.generateTemplate",
		async (folderUri: Uri) => {
			try {
				const response = await pb.collection("templates").getFullList({
					sort: "-created",
				});

				const templates: any[] = response || [];
				const templateNames = templates.map((template) => template.name);

				window.showQuickPick(templateNames).then(async (selectedTemplateName: any) => {
					if (selectedTemplateName) {
						const selectedTemplate = templates.find(
							(template) => template.name === selectedTemplateName
						);

						if (selectedTemplate) {
							const fileName = selectedTemplate.name;
							const fileContent = selectedTemplate.content;
							const tailwindConfig = await getTailwindConfig();

							const filePath = path.join(folderUri.fsPath, "index.html");

							const fileExists = await fs.promises
								.access(filePath, fs.constants.F_OK)
								.then(() => true)
								.catch(() => false);

							if (fileExists) {
								const overwrite = await window.showInformationMessage(
									"The file already exists. Do you want to overwrite it?",
									"Yes",
									"No"
								);
								if (overwrite === "No" || !overwrite || overwrite === undefined) return;
								await fs.promises.writeFile(filePath, baseHTML(fileContent, tailwindConfig), {
									encoding: "utf8",
									flag: "w",
								});
								window.showInformationMessage(
									`Template '${fileName}' generated successfully!`
								);
							} else {
								await fs.promises.writeFile(filePath, baseHTML(fileContent, tailwindConfig), {
									encoding: "utf8",
									flag: "w",
								});
								window.showInformationMessage(
									`Template '${fileName}' generated successfully!`
								);
							}
						}
					}
				});
			} catch (error) {
				console.error("Error fetching templates:", error);
				window.showErrorMessage("Failed to fetch templates from the database.");
			}
		}
	);

	const refreshSnippets = commands.registerCommand("solwind.refreshSnippets", async () => {
		await snippetsDataProvider.refresh().then(() => {
			// window.showInformationMessage("Snippets refreshed successfully!");
			showMessageWithTimeout("Snippets refreshed successfully");
		});
	});

	const addSubcategory = commands.registerCommand("solwind.addSubcategory", async (category) => {
		const subcategoryName = await window.showInputBox({
			placeHolder: "Enter the subcategory name",
			prompt: "New Subcategory Name",
			validateInput: (text) => {
				return text.trim().length === 0 ? "Subcategory name cannot be empty" : null;
			},
		});

		if (!subcategoryName) return;

		try {
			const capitalizedSubcategoryName = capitalizeFirstLetter(subcategoryName);
			await createSubcategory(category.id, capitalizedSubcategoryName);
			showMessageWithTimeout(`Subcategory '${capitalizedSubcategoryName}' added successfully`);
			snippetsDataProvider.refresh();
		} catch (error: any) {
			window.showErrorMessage(`Failed to add subcategory: ${error.message}`);
		}
	});

	const deleteSubcategory = commands.registerCommand(
		"solwind.deleteSubcategory",
		async (item: TreeItem) => {
			try {
				const deleteSubcategory = await window.showInformationMessage(
					`Do you want to delete "${item.label}"?`,
					"Yes",
					"No"
				);
				if (deleteSubcategory === "No" || !deleteSubcategory || deleteSubcategory === undefined)
					return;
				await pb.collection("subcategories").delete(item.id!);
				showMessageWithTimeout("Successfully deleted!");
				await snippetsDataProvider.refresh();
			} catch (error) {
				console.error("Error deleting subcategory:", error);
				window.showErrorMessage("Failed to delete subcategory.");
			}
		}
	);

	const renameSubcategory = commands.registerCommand(
		"solwind.renameSubcategory",
		async (item: TreeItem) => {
			let currentLabel: string;
			if (typeof item.label === "string") {
				currentLabel = item.label;
			} else if (item.label && typeof item.label.label === "string") {
				currentLabel = item.label.label;
			} else {
				currentLabel = "default-label";
			}

			const newName = await renamePrompt({
				message: "Enter new subcategory name",
				value: currentLabel,
			});
			if (!newName) return;

			try {
				const capitalizedNewName = capitalizeFirstLetter(newName);
				await pb.collection("subcategories").update(item.id!, { name: capitalizedNewName });
				showMessageWithTimeout(
					`Subcategory "${currentLabel}" renamed to "${capitalizedNewName}"`
				);
				await snippetsDataProvider.refresh();
			} catch (error) {
				console.error("Error renaming subcategory:", error);
				window.showErrorMessage("Failed to rename subcategory.");
			}
		}
	);

	const addCategory = commands.registerCommand("solwind.addCategory", async () => {
		const categoryName = await window.showInputBox({
			placeHolder: "Enter the category name",
			prompt: "New Category Name",
			validateInput: (text) => {
				return text.trim().length === 0 ? "Category name cannot be empty" : null;
			},
		});

		if (!categoryName) return;

		try {
			const capitalizedCategoryName = capitalizeFirstLetter(categoryName);
			await pb.collection("categories").create({ name: capitalizedCategoryName });
			showMessageWithTimeout(`Category '${capitalizedCategoryName}' added successfully`);
			snippetsDataProvider.refresh();
		} catch (error: any) {
			window.showErrorMessage(`Error: ${error.message}`);
		}
	});

	const renameCategory = commands.registerCommand(
		"solwind.renameCategory",
		async (item: TreeItem) => {
			let currentLabel: string;
			if (typeof item.label === "string") {
				currentLabel = item.label;
			} else if (item.label && typeof item.label.label === "string") {
				currentLabel = item.label.label;
			} else {
				currentLabel = "default-label";
			}

			const newName = await renamePrompt({
				message: "Enter new category name",
				value: currentLabel,
			});
			if (!newName) return;

			try {
				const capitalizedNewName = capitalizeFirstLetter(newName);
				await pb.collection("categories").update(item.id!, { name: capitalizedNewName });
				showMessageWithTimeout(
					`Category "${currentLabel}" renamed to "${capitalizedNewName}"`
				);
				await snippetsDataProvider.refresh();
			} catch (error) {
				console.error("Error renaming category:", error);
				window.showErrorMessage("Failed to rename category.");
			}
		}
	);

	const deleteCategory = commands.registerCommand(
		"solwind.deleteCategory",
		async (item: TreeItem) => {
			try {
				const deleteCategory = await window.showInformationMessage(
					`Do you want to delete "${item.label}"?`,
					"Yes",
					"No"
				);
				if (deleteCategory === "No" || !deleteCategory || deleteCategory === undefined) return;
				await pb.collection("categories").delete(item.id!);
				showMessageWithTimeout("Successfully deleted!");
				await snippetsDataProvider.refresh();
			} catch (error) {
				console.error("Error deleting category:", error);
				window.showErrorMessage("Failed to delete category.");
			}
		}
	);

	const deleteApiKey = commands.registerCommand("solwind.deleteApiKey", async () => {
		authStore.clear();
		treeView.dispose();
		snippetsDataProvider.dispose();
	});

	context.subscriptions.push(
		treeView,
		openSnippet,
		createSnippet,
		deleteSnippet,
		generateTemplate,
		refreshSnippets,
		addSubcategory,
		deleteSubcategory,
		renameSubcategory,
		addCategory,
		renameCategory,
		deleteCategory,
		HTMLCompletionProvider,
		deleteApiKey
	);
}
