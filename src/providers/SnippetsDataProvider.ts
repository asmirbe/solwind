import {
   Event,
   EventEmitter,
   ThemeIcon,
   TreeDataProvider,
   TreeItem,
   Uri,
   TreeItemCollapsibleState,
} from "vscode";
import {retrieveSnippets} from "../pocketbase/pocketbase"; // Adjust the import path as necessary
import {Category, Subcategory} from "../types/Category";
import {Snippet} from "../types/Snippet";
import {capitalizeFirstLetter} from "../utilities/stringUtils";

class SnippetsDataProvider implements TreeDataProvider<TreeItem> {
   public snippets: Snippet[] = [];
   public categories: Category[] = [];
   public subcategories: Subcategory[] = [];
   private isLoading: boolean = false;

   private _onDidChangeTreeData: EventEmitter<undefined | void> = new EventEmitter<
      undefined | void
   >();
   readonly onDidChangeTreeData: Event<undefined | void> = this._onDidChangeTreeData.event;

   getTreeItem(element: TreeItem): TreeItem {
      return element;
   }

   async getChildren(element?: TreeItem): Promise<TreeItem[]> {
      if (!element) {
         // Root level: show categories
         return this.categories.map((category) => {
            const snippetsCount = this.snippets.filter(
               (snippet) => snippet.category === category.id
            ).length;
            const treeItem = new TreeItem(
               capitalizeFirstLetter(category.name),
               TreeItemCollapsibleState.Collapsed
            );
            treeItem.contextValue = "category";
            treeItem.id = category.id;
            treeItem.description = `${snippetsCount} items`;
            treeItem.iconPath = new ThemeIcon("folder");
            return treeItem;
         });
      }

      switch (element.contextValue) {
         case "category": {
            // Category level: show subcategories and direct snippets
            const subcategories = this.subcategories.filter(
               (subcat) => subcat.category === element.id
            );
            const subcategoryItems = subcategories.map((subcategory) => {
               const snippetsCount = this.snippets.filter(
                  (snippet) => snippet.subcategory === subcategory.id
               ).length;
               const treeItem = new TreeItem(
                  capitalizeFirstLetter(subcategory.name),
                  TreeItemCollapsibleState.Collapsed
               );
               treeItem.contextValue = "subcategory";
               treeItem.id = subcategory.id;
               treeItem.description = `${snippetsCount} items`;
               treeItem.iconPath = new ThemeIcon("folder");
               return treeItem;
            });

            // Snippets directly under this category
            const directSnippets = this.snippets.filter(
               (snippet) => snippet.category === element.id && !snippet.subcategory
            );
            const snippetItems = directSnippets.map((snippet) => {
               const treeItem = new TreeItem(
                  capitalizeFirstLetter(snippet.name),
                  TreeItemCollapsibleState.None
               );
               treeItem.contextValue = "snippet";
               treeItem.id = snippet.id;
               treeItem.description = snippet.label;
               treeItem.tooltip = snippet.label;
               treeItem.resourceUri = Uri.file(`${snippet.name}.html`);
               treeItem.command = {
                  title: "Open snippet",
                  command: "solwind.openSnippet",
                  arguments: [snippet], // Pass the snippet as an argument to the command
               };
               return treeItem;
            });

            return [...subcategoryItems, ...snippetItems];
         }
         case "subcategory": {
            // Subcategory level: show snippets
            const snippets = this.snippets.filter((snippet) => snippet.subcategory === element.id);
            return snippets.map((snippet) => {
               const treeItem = new TreeItem(
                  capitalizeFirstLetter(snippet.name),
                  TreeItemCollapsibleState.None
               );
               treeItem.contextValue = "snippet";
               treeItem.id = snippet.id;
               treeItem.description = snippet.label;
               treeItem.tooltip = snippet.label;
               treeItem.resourceUri = Uri.file(`${snippet.name}.html`);
               treeItem.command = {
                  title: "Open snippet",
                  command: "solwind.openSnippet",
                  arguments: [snippet], // Pass the snippet as an argument to the command
               };
               return treeItem;
            });
         }
         default:
            return [];
      }
   }

   async refresh(): Promise<void> {
      if (this.isLoading) {
         return; // Prevent multiple refresh calls if already loading
      }
      this.setLoading(true);

      try {
         await retrieveSnippets(this);
      } finally {
         this.setLoading(false);
      }
      this._onDidChangeTreeData.fire(undefined);
   }

   setSnippets(snippets: Snippet[], categories: Category[], subcategories: Subcategory[]): void {
      this.snippets = snippets;
      this.categories = categories;
      this.subcategories = subcategories;
      this._onDidChangeTreeData.fire(undefined);
   }

   private setLoading(loading: boolean): void {
      this.isLoading = loading;
   }

   dispose(): void {
      // Clear commands from all TreeItems
      this.snippets.forEach((snippet) => {
         snippet.command = undefined;
      });

      this.snippets = [];
      this.categories = [];
      this.subcategories = [];
      this._onDidChangeTreeData.fire(undefined);
   }
}

export default SnippetsDataProvider;
