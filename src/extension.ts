import * as fs from "fs";
import * as path from "path";

import { baseHTML } from "./utilities/baseHTML";

import {
   commands,
   ExtensionContext,
   window,
   ViewColumn,
   Uri,
   TreeItem,
	extensions,
} from "vscode";
import SnippetsDataProvider from "./providers/SnippetsDataProvider";
import HTMLCompletionProvider from "./providers/HTMLCompletionProvider";
import {
   pb,
   createSubcategory,
   CustomAuthStore,
} from "./pocketbase/pocketbase";
import { getWebviewContent } from "./ui/getWebviewContent";
import { promptForCategory, promptForSubcategory, renamePrompt } from "./utilities/prompts";
import { capitalizeFirstLetter, formatLabel } from "./utilities/stringUtils";
import { setApiKey } from "./utilities/apiKey";
import { setGlobalContext } from "./context/globalContext";

export async function activate(context: ExtensionContext) {
	// Get actual extension version
	const currentExtensionVersion = extensions.getExtension('asmirbe.solwind')?.packageJSON.version;
	const nextExtensionVersion = await pb.collection('version').getOne("yr0aiacmjhc5jz0", { fields: "version" });

	if (currentExtensionVersion !== nextExtensionVersion.version) {
		window.showInformationMessage(`New Solwind version available: v${nextExtensionVersion.version}`);
	}

   setGlobalContext(context);
   const authStore = new CustomAuthStore();
   const contextApiKey = context.globalState.get("solwind.apiKey");
   const apiKey = authStore.getApiKey();
   const setApiKeyAndInitialize = async () => {
      const apiKeyEvent = await setApiKey();
      apiKeyEvent(() => {
         commands.executeCommand("setContext", "solwind.apiKeySet", true);
         initializeExtension(context, authStore);
      });
   };

   const handleTokenRefreshError = async (error: any) => {
      console.error("Token refresh failed during extension activation:", error);
      await commands.executeCommand("setContext", "solwind.apiKeySet", false);
      await setApiKeyAndInitialize();
   };

   if (!apiKey) {
      await commands.executeCommand("setContext", "solwind.apiKeySet", false);
      await setApiKeyAndInitialize();
   } else {
      try {
         await authStore.refresh(); // Refresh the token with the existing API key
         if (authStore.isValid()) {
            await commands.executeCommand("setContext", "solwind.apiKeySet", true);
            initializeExtension(context, authStore);
         } else {
            await commands.executeCommand("setContext", "solwind.apiKeySet", false);
            await setApiKeyAndInitialize();
         }
      } catch (error) {
         await handleTokenRefreshError(error);
      }
   }
}

// Extension init
async function initializeExtension(context: ExtensionContext, authStore: CustomAuthStore) {
   const snippetsDataProvider = new SnippetsDataProvider();
   let panel: any | undefined = undefined;

   const treeView = window.createTreeView("solwind.snippets", {
      treeDataProvider: snippetsDataProvider,
      showCollapseAll: false,
   });

   await snippetsDataProvider.refresh();

   const openSnippet = commands.registerCommand("solwind.openSnippet", () => {
      const selectedTreeViewItem = treeView.selection[0];
      const matchingSnippet = snippetsDataProvider.snippets.find(
         (x) => x.id === selectedTreeViewItem.id
      );

      if (!matchingSnippet) {
         window.showErrorMessage("No matching snippet found");
         return;
      }

      if (!panel) {
         panel = window.createWebviewPanel(
            "snippetDetailView",
            matchingSnippet.name,
            ViewColumn.One,
            {
               enableScripts: true,
               localResourceRoots: [Uri.joinPath(context.extensionUri, "out")],
            }
         );
      }

      panel.title = matchingSnippet.name;
      panel.iconPath = Uri.joinPath(context.extensionUri, "resources", "logo.svg");
      panel.webview.html = getWebviewContent(
         panel.webview,
         context.extensionUri,
         matchingSnippet,
         snippetsDataProvider.categories,
         snippetsDataProvider.subcategories
      );

      panel.webview.onDidReceiveMessage((message: any) => {
         const command = message.command;
         const snippet = message.snippet;

         switch (command) {
            case "updateSnippet":
               pb.collection("snippets").update(snippet.id, snippet);
               snippetsDataProvider.refresh();
               if (panel) {
                  panel.title = snippet.name;
                  panel.webview.html = getWebviewContent(
                     panel.webview,
                     context.extensionUri,
                     snippet,
                     snippetsDataProvider.categories,
                     snippetsDataProvider.subcategories
                  );
               }
               break;
            case "cancel":
               panel.dispose();
               break;
         }
      });

      panel.onDidDispose(() => {
         panel = undefined;
      });
   });

   const insertSnippet = commands.registerCommand("solwind.insertSnippet", async () => {
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

         const snippetName = await window.showInputBox({ prompt: "Enter snippet name" });
         let snippetLabel = await window.showInputBox({ prompt: "Enter snippet label" });

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

         console.log(snippetData);

         await pb.collection("snippets").create(snippetData);

         window.showInformationMessage("Snippet created successfully!");
         await snippetsDataProvider.refresh();
      } catch (error) {
         console.error("Error creating snippet:", error);
         window.showErrorMessage("Failed to create snippet.");
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
            window.showInformationMessage(`Successfully deleted!`);
            await snippetsDataProvider.refresh();

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
            console.log(response);

            const templates: any[] = response || [];
            const templateNames = templates.map((template) => template.name);

            window.showQuickPick(templateNames).then(async (selectedTemplateName: any) => {
               if (selectedTemplateName) {
                  const selectedTemplate = templates.find(
                     (template) => template.name === selectedTemplateName
                  );
                  console.log(selectedTemplate);

                  if (selectedTemplate) {
                     const fileName = selectedTemplate.name;
                     const fileContent = selectedTemplate.content;

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
                        await fs.promises.writeFile(filePath, baseHTML(fileContent), {
                           encoding: "utf8",
                           flag: "w",
                        });
                        window.showInformationMessage(
                           `Template '${fileName}' generated successfully!`
                        );
                     } else {
                        await fs.promises.writeFile(filePath, baseHTML(fileContent), {
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
         window.showInformationMessage("Snippets refreshed successfully!");
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
            await pb.collection("subcategories").delete(item.id!);
            window.showInformationMessage(`Successfully deleted!`);
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
         await pb.collection("categories").create({ name: capitalizedCategoryName });
         window.showInformationMessage(`Category '${capitalizedCategoryName}' added successfully`);
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
            await pb.collection("categories").delete(item.id!);
            window.showInformationMessage(`Successfully deleted!`);
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
      insertSnippet,
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