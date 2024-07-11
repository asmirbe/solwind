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
import axios from "axios";


export async function activate(context: ExtensionContext) {
	setGlobalContext(context);
	const authStore = new CustomAuthStore();

	// const { newVer, nextExtensionVersion } = await authStore.getVersion();
	// if (newVer) {
	// 	window.showInformationMessage(
	// 		`New Solwind version available: v${nextExtensionVersion}`
	// 	);
	// }

	const setApiKeyAndInitialize = async () => {
		const apiKeyEvent = await setApiKey();
		apiKeyEvent(async () => {
			await initializeExtension(context, authStore);
		});
	};

	const token = authStore.getToken();

	if (!token) {
		await setApiKeyAndInitialize();
	} else {
		try {
			// Attempt to validate the existing token
			const isValid = await validateExistingToken(authStore);
			if (isValid) {
				await initializeExtension(context, authStore);
			} else {
				await setApiKeyAndInitialize();
			}
		} catch (error) {
			console.error("Error during token validation:", error);
			await setApiKeyAndInitialize();
		}
	}
}

async function validateExistingToken(authStore: CustomAuthStore): Promise<boolean> {
	try {
		// You'll need to implement this method in your CustomAuthStore
		// It should make a request to your server to validate the token
		const isValid = await authStore.validateToken();
		return isValid;
	} catch (error) {
		console.error("Token validation failed:", error);
		return false;
	}
}

// Extension init
async function initializeExtension(context: ExtensionContext, authStore: CustomAuthStore) {
	const token = authStore.getToken();
	axios.defaults.baseURL = 'http://localhost:3000/api/';
	axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

	const snippetsDataProvider = new SnippetsDataProvider('http://localhost:3000/api/snippets', token!);
	const panelMap = new Map<string, WebviewPanel>();
	await authStore.setData();
	await snippetsDataProvider.init();

	const treeView = window.createTreeView("solwind.snippets", {
		treeDataProvider: snippetsDataProvider,
		showCollapseAll: false,
	});

	await setContext(true);

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
			const response = await axios.get('categories');
			const { parentCategories, subcategories } = response.data;

			const selectedCategoryName = await promptForCategory(parentCategories);
			if (!selectedCategoryName) return;

			const selectedCategory = parentCategories.find(
				(category: any) => category.name === selectedCategoryName
			);

			const selectedSubcategoryName = await promptForSubcategory(
				subcategories,
				selectedCategory.id
			);

			if (!selectedSubcategoryName) return;

			const selectedSubcategory = subcategories.find(
				(subcat: any) => subcat.name === selectedSubcategoryName && subcat.parent_id === selectedCategory.id
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


			if (!snippetLabel) {
				window.showErrorMessage("Snippet label is required.");
				return;
			}

			snippetLabel = formatLabel(snippetLabel);

			const snippetData: any = {
				name: snippetName,
				label: snippetLabel,
				insertText: selectedText,
				category: selectedCategory.id,
				subcategory: selectedSubcategory.id,
			};

			try {
				const res = await axios.post('snippets', snippetData, {
					headers: { Authorization: `Bearer ${token}` }
				});

				await snippetsDataProvider.refresh();
				window.showInformationMessage("Snippet created successfully!");
			} catch (error) {
				if (axios.isAxiosError(error)) {
					const axiosError = error;
					if (axiosError.response) {
						// The request was made and the server responded with a status code
						// that falls out of the range of 2xx
						if (axiosError.response.status === 400) {
							// Bad request - likely a validation error
							const errorMessage = axiosError.response.data.message || "Invalid input for snippet creation.";
							window.showErrorMessage(`Failed to create snippet: ${errorMessage}`);
						} else if (axiosError.response.status === 401) {
							// Unauthorized
							window.showErrorMessage("Unauthorized. Please check your authentication token.");
						} else if (axiosError.response.status === 500) {
							// Server error
							window.showErrorMessage("Server error occurred while creating snippet. Please try again later.");
						} else {
							// Other status codes
							window.showErrorMessage(`Failed to create snippet. Server responded with status ${axiosError.response.status}.`);
						}
					} else if (axiosError.request) {
						// The request was made but no response was received
						window.showErrorMessage("No response received from server. Please check your internet connection.");
					} else {
						// Something happened in setting up the request that triggered an Error
						window.showErrorMessage(`Error setting up the request: ${axiosError.message}`);
					}
				} else {
					// Non-Axios error
					window.showErrorMessage(`An unexpected error occurred: ${(error as Error).message}`);
				}
				console.error("Error creating snippet:", error);
			}
		} catch (error) {
			console.error("Error fetching categories:", error);
			window.showErrorMessage("Failed to fetch categories. Please try again later.");
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

			const categories = snippetsDataProvider.categories;
			const refreshFunction = () => snippetsDataProvider.refresh();
			await loadWebviewContent(panel, snippet.id, authStore, refreshFunction);
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
				window.showInformationMessage("Successfully deleted!");
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
		try {
			await snippetsDataProvider.refresh();
			window.showInformationMessage("Snippets refreshed successfully!");
		} catch (error:any) {
			window.showErrorMessage(`Failed to refresh snippets: ${error.message}`);
		}
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
			window.showInformationMessage(
				`Subcategory '${capitalizedSubcategoryName}' added successfully`
			);
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
				// await pb.collection("subcategories").delete(item.id!);
				await axios.delete(`subcategories/${item.id}`);
				// await axios.delete()
				window.showInformationMessage("Successfully deleted!");
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
			const currentLabel = typeof item.label === 'string' ? item.label : item.label?.label || '';

			const newName = await renamePrompt({
				message: "Enter new subcategory name",
				value: currentLabel,
			});
			if (!newName || !item.id) return;

			try {
				const capitalizedNewName = capitalizeFirstLetter(newName);
				await axios.put(`subcategories/${item.id}/rename`, { name: capitalizedNewName });
				window.showInformationMessage(
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
			// await pb.collection("categories").create({ name: capitalizedCategoryName });
			axios.post('categories', { name: capitalizedCategoryName });
			window.showInformationMessage(`Category '${capitalizedCategoryName}' added successfully`);
			await snippetsDataProvider.refresh();
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
				// await pb.collection("categories").update(item.id!, { name: capitalizedNewName });
				await axios.put(`subcategories/${item.id}/rename`, {name: capitalizedNewName});
				window.showInformationMessage(
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

				await axios.delete(`categories/${item.id}`);
				window.showInformationMessage("Successfully deleted!");
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
