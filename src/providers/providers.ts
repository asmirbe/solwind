import * as vscode from "vscode";

export class SnippetsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
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
				// treeItem.iconPath = new vscode.ThemeIcon("folder");
				return treeItem;
			});
		} else if (element.contextValue === "category") {
			// Category level: show subcategories
			const subcategories = this.subcategories.filter((subcat) => subcat.category === element.id);
			return subcategories.map((subcategory) => {
				const treeItem = new vscode.TreeItem(subcategory.name, vscode.TreeItemCollapsibleState.Collapsed);
				treeItem.contextValue = "subcategory";
				treeItem.id = subcategory.id;
				treeItem.label = `${subcategory.name} - ${this.snippets.filter((snippet) => snippet.subcategory === subcategory.id).length}`;
				// treeItem.iconPath = new vscode.ThemeIcon("folder");
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
				treeItem.iconPath = new vscode.ThemeIcon("code");
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

	setSnippets(snippets: any[], categories: any[], subcategories: any[]): void {
		this.snippets = snippets;
		this.categories = categories;
		this.subcategories = subcategories;
		this.refresh();
	}
}

export class SnippetWebViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "extension.addSnippet";

	private _view?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri, private readonly snippetsProvider: SnippetsProvider) {}

	public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage((data) => {
			switch (data.type) {
				case "colorSelected": {
					vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
					break;
				}
			}
		});
	}

	public addSnippet() {
		if (this._view) {
			this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
			this._view.webview.postMessage({ type: "addSnippet" });
		}
	}

	private _getSnippetsHtml() {
		const snippets = this.snippetsProvider.snippets;
		const categories = this.snippetsProvider.categories;
		const subcategories = this.snippetsProvider.subcategories;

		let html = "<ul>";

		categories.forEach((category) => {
			html += `<li class="nav-list__item">`;
			html += `<details>`;
			html += `<summary>${category.name}</summary>`;
			html += "<ul>";

			const categorySubcategories = subcategories.filter((subcat) => subcat.category === category.id);
			categorySubcategories.forEach((subcategory) => {
				html += `<li class="nav-list__item">`;
				html += `<details>`;
				html += `<summary>${subcategory.name}</summary>`;
				html += "<ul>";

				const subcategorySnippets = snippets.filter((snippet) => snippet.subcategory === subcategory.id);
				subcategorySnippets.forEach((snippet) => {
					html += `<li class="nav-list__item">${snippet.label}</li>`;
				});

				html += "</ul>";
				html += `</details>`;
				html += "</li>";
			});

			html += "</ul>";
			html += `</details>`;
			html += "</li>";
		});

		html += "</ul>";

		return html;
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		const snippetsHtml = this._getSnippetsHtml();
		console.log(snippetsHtml);

		// CSS file to handle styling
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "resources", "style.css"));
		const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css"));

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Snippets</title>
				<link href="${codiconsUri}" rel="stylesheet" />
				<link href="${styleUri}" rel="stylesheet">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource};">
			</head>
			<body>
			<main class="main">
			<p data-requires="norepo"><i class="codicon codicon-question"></i>Features which need a repository are currently unavailable</p>
			<div class="nav-list">
						<h2>Snippets</h2>
			${snippetsHtml}
			</main>
			</div>
			</body>
			</html>`;
	}
}
