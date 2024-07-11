import {
	Event,
	EventEmitter,
	ThemeIcon,
	TreeDataProvider,
	TreeItem,
	Uri,
	TreeItemCollapsibleState,
} from "vscode";
import axios from "axios";
import { capitalizeFirstLetter } from "../utilities/stringUtils";

interface SnippetData {
	id: number;
	name: string;
	label: string;
	description: string | null;
}

interface CategoryData {
	id: number;
	name: string;
	parent_id: number | null;
	children: (CategoryData | SnippetData)[];
}

class SnippetsDataProvider implements TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: EventEmitter<undefined | void> = new EventEmitter<
		undefined | void
	>();
	readonly onDidChangeTreeData: Event<undefined | void> = this._onDidChangeTreeData.event;

	categories: CategoryData[] = [];
	private isLoading: boolean = false;

	constructor(private apiUrl: string, private token: string) { }

	getTreeItem(element: TreeItem): TreeItem {
		return element;
	}

	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		if (!element) {
			return this.categories.map(category => this.createCategoryTreeItem(category));
		}

		const item = element.id ? this.findItemById(Number(element.id)) : null;
		if (item && 'children' in item) {
			return item.children.map(child =>
				'children' in child
					? this.createCategoryTreeItem(child as CategoryData)
					: this.createSnippetTreeItem(child as SnippetData)
			);
		}

		return [];
	}

	private createCategoryTreeItem(category: CategoryData): TreeItem {
		const treeItem = new TreeItem(
			capitalizeFirstLetter(category.name),
			TreeItemCollapsibleState.Collapsed
		);
		treeItem.id = category.id.toString();
		treeItem.description = `${category.children.length} items`;
		treeItem.iconPath = new ThemeIcon("folder");

		// Set different contextValue based on whether it's a top-level category or subcategory
		if (category.parent_id === null) {
			treeItem.contextValue = "category";
		} else {
			treeItem.contextValue = "subcategory";
		}

		return treeItem;
	}

	private createSnippetTreeItem(snippet: SnippetData): TreeItem {
		const treeItem = new TreeItem(
			capitalizeFirstLetter(snippet.name),
			TreeItemCollapsibleState.None
		);
		treeItem.contextValue = "snippet";
		treeItem.id = snippet.id.toString();
		treeItem.description = snippet.label;
		treeItem.tooltip = snippet.description || snippet.label;
		treeItem.resourceUri = Uri.file(`${snippet.name}.html`);
		treeItem.command = {
			title: "Open snippet",
			command: "solwind.openSnippet",
			arguments: [snippet],
		};
		return treeItem;
	}

	private findItemById(id: number): CategoryData | SnippetData | undefined {
		const findInCategory = (category: CategoryData): CategoryData | SnippetData | undefined => {
			if (category.id === id) return category;
			for (const child of category.children) {
				if ('children' in child) {
					const found = findInCategory(child as CategoryData);
					if (found) return found;
				} else if (child.id === id) {
					return child;
				}
			}
			return undefined;
		};

		for (const category of this.categories) {
			const found = findInCategory(category);
			if (found) return found;
		}
		return undefined;
	}

	async init(): Promise<void> {
		await this.fetchCategories();
	}

	async refresh(): Promise<void> {
		if (this.isLoading) {
			throw new Error("Refresh already in progress");
		}

		this.isLoading = true;
		try {
			await this.fetchCategories();
		} finally {
			this.isLoading = false;
		}
	}

	private async fetchCategories(): Promise<void> {
		try {
			const response = await axios.get(this.apiUrl, {
				headers: { Authorization: `Bearer ${this.token}` }
			});

			this.categories = response.data;
		} catch (error) {
			console.error('Error fetching categories:', error);
			throw new Error("Failed to fetch categories");
		} finally {
			this._onDidChangeTreeData.fire();
		}
	}

	dispose(): void {
		this.categories = [];
		this._onDidChangeTreeData.fire(undefined);
	}
}

export default SnippetsDataProvider;