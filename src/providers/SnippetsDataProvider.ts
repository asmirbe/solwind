import { Event, EventEmitter, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from "vscode";

interface ISnippetProvider extends TreeDataProvider<TreeItem> {
	refresh(): void;
	setSnippets(snippets: any[], categories: any[], subcategories: any[]): void;
}

export class SnippetsDataProvider implements TreeDataProvider<TreeItem> {
	public snippets: any[] = [];
	public categories: any[] = [];
	public subcategories: any[] = [];

	getTreeItem(element: TreeItem): TreeItem {
		return element;
	}

	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		if (!element) {
			// Root level: show categories
			return this.categories.map((category) => {
				const treeItem = new TreeItem(category.name, TreeItemCollapsibleState.Collapsed);
				treeItem.contextValue = "category";
				treeItem.id = category.id;
				// treeItem.iconPath = new ThemeIcon("folder");
				return treeItem;
			});
		} else if (element.contextValue === "category") {
			// Category level: show subcategories
			const subcategories = this.subcategories.filter((subcat) => subcat.category === element.id);
			return subcategories.map((subcategory) => {
				const treeItem = new TreeItem(subcategory.name, TreeItemCollapsibleState.Collapsed);
				treeItem.contextValue = "subcategory";
				treeItem.id = subcategory.id;
				treeItem.label = `${subcategory.name} - ${this.snippets.filter((snippet) => snippet.subcategory === subcategory.id).length}`;
				// treeItem.iconPath = new ThemeIcon("folder");
				return treeItem;
			});
		} else if (element.contextValue === "subcategory") {
			// Subcategory level: show snippets
			const snippets = this.snippets.filter((snippet) => snippet.subcategory === element.id);
			return snippets.map((snippet) => {
				const treeItem = new TreeItem(snippet.label, TreeItemCollapsibleState.None);
				treeItem.contextValue = "snippet";
				treeItem.id = snippet.id;
				treeItem.description = snippet.documentation || "";
				treeItem.tooltip = snippet.tooltip || "";
				treeItem.iconPath = new ThemeIcon("code");
				treeItem.command = {
					title: "Open note",
					command: "solwind.showSnippetDetailView",
				};
				return treeItem;
			});
		}
		return [];
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	private _onDidChangeTreeData: EventEmitter<undefined | void> = new EventEmitter<undefined | void>();
	readonly onDidChangeTreeData: Event<undefined | void> = this._onDidChangeTreeData.event;

	setSnippets(snippets: any[], categories: any[], subcategories: any[]): void {
		this.snippets = snippets;
		this.categories = categories;
		this.subcategories = subcategories;
		this.refresh();
	}
}