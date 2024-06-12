import { commands, ExtensionContext, WebviewPanel, window, ViewColumn, Uri, TreeItem, languages, TextDocument, Position, CompletionList, CompletionItemKind, SnippetString } from "vscode";
import * as fs from "fs";
import * as path from "path";

import { baseHTML } from "./utilities/base";
import { fetchMatchingSnippets, retrieveSnippets, pb } from "./pocketbase/pocketbase";
import { SnippetsDataProvider } from "./providers/SnippetsDataProvider";
import { promptForCategory, promptForSubcategory } from "./utilities/prompts";
import { getWebviewContent } from "./ui/getWebviewContent";

export async function activate(context: ExtensionContext) {
	const snippetsDataProvider = new SnippetsDataProvider();
	let panel: WebviewPanel | undefined = undefined;

	const treeView = window.createTreeView("solwind.snippets", {
		treeDataProvider: snippetsDataProvider,
		showCollapseAll: false,
	});

	// Command to render a webview-based note view
  const openSnippet = commands.registerCommand("solwind.showSnippetDetailView", () => {
    const selectedTreeViewItem = treeView.selection[0];
    const matchingSnippet = snippetsDataProvider.snippets.find((x) => x.id === selectedTreeViewItem.id);
    if (!matchingSnippet) {
      window.showErrorMessage("No matching note found");
      return;
    }

    // If no panel is open, create a new one and update the HTML
    if (!panel) {
      panel = window.createWebviewPanel("noteDetailView", matchingSnippet.title, ViewColumn.One, {
        // Enable JavaScript in the webview
        enableScripts: true,
        // Restrict the webview to only load resources from the `out` directory
        localResourceRoots: [Uri.joinPath(context.extensionUri, "out")],
      });
    }

    // If a panel is open, update the HTML with the selected item's content
    panel.title = matchingSnippet.title;
    panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, matchingSnippet);

    // If a panel is open and receives an update message, update the notes array and the panel title/html
    panel.webview.onDidReceiveMessage((message) => {
      const command = message.command;
      const note = message.note;
      switch (command) {
        case "updateSnippet":
					console.log("updateSnippet", note);

          // const updatedNoteId = snippet.id;
          // const copyOfNotesArray = [...notes];
          // const matchingSnippetIndex = copyOfNotesArray.findIndex((note) => note.id === updatedNoteId);
          // copyOfNotesArray[matchingSnippetIndex] = note;
          // notes = copyOfNotesArray;
          // notepadDataProvider.refresh(notes);
          panel
            ? ((panel.title = note.title),
              (panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, note)))
            : null;
          break;
      }
    });

    panel.onDidDispose(
      () => {
        // When the panel is closed, cancel any future updates to the webview content
        panel = undefined;
      },
      null,
      context.subscriptions
    );
  });

	// Command to add snippet from selection
	const insertSnippet = commands.registerCommand("solwind.addSnippetFromSelection", async () => {
		const editor = window.activeTextEditor;
		if (!editor) {
			window.showErrorMessage("No active editor found.");
			return;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);
		if (!selectedText) {
			window.showErrorMessage("No text selected.");
			return;
		}

		try {
			const [categoriesResponse, subcategoriesResponse] = await Promise.all([pb.collection("categories").getList(1, 100, { sort: "name" }), pb.collection("subcategories").getList(1, 100, { sort: "name", expand: "category" })]);

			const categories: any[] = categoriesResponse.items || [];
			const subcategories: any[] = subcategoriesResponse.items || [];

			const selectedCategoryName = await promptForCategory(categories);
			if (!selectedCategoryName) {
				window.showErrorMessage("Category selection is required.");
				return;
			}

			const selectedCategory = categories.find((category) => category.name === selectedCategoryName);
			const selectedSubcategoryName = await promptForSubcategory(subcategories, selectedCategory.id);
			if (!selectedSubcategoryName) {
				window.showErrorMessage("Subcategory selection is required.");
				return;
			}

			const selectedSubcategory = subcategories.find((subcat) => subcat.name === selectedSubcategoryName);
			const snippetLabel = await window.showInputBox({ prompt: "Enter snippet label" });
			const snippetDocumentation = await window.showInputBox({ prompt: "Enter snippet documentation" });

			if (!snippetLabel) {
				window.showErrorMessage("Snippet label is required.");
				return;
			}

			await pb.collection("snippets").create({
				label: snippetLabel,
				documentation: snippetDocumentation || "",
				insertText: selectedText,
				category: selectedCategory.id,
				subcategory: selectedSubcategory.id,
			});

			window.showInformationMessage("Snippet created successfully!");
			retrieveSnippets(snippetsDataProvider); // Refresh snippets after adding
		} catch (error) {
			console.error("Error creating snippet:", error);
			window.showErrorMessage("Failed to create snippet.");
		}
	});

	const deleteSnippet = commands.registerCommand("solwind.deleteSnippet", async (item: TreeItem) => {
		try {
			const deleteSnippet = await window.showInformationMessage(`Do you confirm deletion of snippet ${item.label}?`, "Yes", "No");
			if (deleteSnippet === "No") return;
			await pb.collection("snippets").delete(item.id!);
			window.showInformationMessage(`Snippet "${item.label}" deleted successfully!`);
			retrieveSnippets(snippetsDataProvider);
			// Close the panel if it's open
			// panel?.dispose();
		} catch (error) {
			console.error("Error deleting snippet:", error);
			window.showErrorMessage("Failed to delete snippet.");
		}
	});

	const completionProvider = languages.registerCompletionItemProvider("html", {
		provideCompletionItems: async function (document: TextDocument, position: Position): Promise<any> {
			const activeEditor = window.activeTextEditor;
			if (!activeEditor) return new CompletionList([], true);
			const { text } = activeEditor.document.lineAt(activeEditor.selection.active.line);

			try {
				const matchingSnippets = (await fetchMatchingSnippets(text.trim())) as any[];

				const completionItems = matchingSnippets.map((snippet: any) => {
					return {
						label: snippet.label,
						kind: CompletionItemKind.Snippet,
						documentation: snippet.documentation,
						insertText: new SnippetString(snippet.insertText),
					};
				});
				return new CompletionList(completionItems, true);
			} catch (error) {
				console.error("Error retrieving snippets:", error);
				return new CompletionList([], true);
			}
		},
	});

	const generateTemplate = commands.registerCommand("extension.generateFromTemplate", async (folderUri: Uri) => {
		try {
			const response = await pb.collection("templates").getFullList({
				sort: "-created",
			});
			console.log(response);

			const templates: any[] = response || [];
			const templateNames = templates.map((template) => template.name);

			window.showQuickPick(templateNames).then(async (selectedTemplateName: any) => {
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
							const overwrite = await window.showInformationMessage("The file already exists do you want to overwrite it?", "Yes", "No");
							if (overwrite === "No") return;
							// User confirmed to overwrite the file
							await fs.promises.writeFile(filePath, baseHTML(fileContent), { encoding: "utf8", flag: "w" });
							window.showInformationMessage(`Template '${fileName}' generated successfully!`);
						} else {
							// File doesn't exist, create it
							await fs.promises.writeFile(filePath, baseHTML(fileContent), { encoding: "utf8", flag: "w" });
							window.showInformationMessage(`Template '${fileName}' generated successfully!`);
						}
					}
				}
			});
		} catch (error) {
			console.error("Error fetching templates:", error);
			window.showErrorMessage("Failed to fetch templates from the database.");
		}
	});

	await retrieveSnippets(snippetsDataProvider);

	context.subscriptions.push(openSnippet);
	context.subscriptions.push(insertSnippet);
	context.subscriptions.push(deleteSnippet);
	context.subscriptions.push(completionProvider);
	context.subscriptions.push(generateTemplate);
}
