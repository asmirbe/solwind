import { Webview, Uri } from "vscode";
import { Snippet } from "../types/Snippet";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { Category, Subcategory } from "../types/Category";
import { componentPreview } from "../utilities/componentPreview";
import { escapeHtml } from "../utilities/escapeHtml";

const getGeneratedPageURL = (html: string, config: any) => {
	const baseHtml = componentPreview(html, config);
	return `data:text/html;charset=utf-8,${encodeURIComponent(baseHtml)}`;
};

export async function getWebviewContent(
	webview: Webview,
	extensionUri: Uri,
	snippet: Snippet,
	categories: Category[],
	subcategories: Subcategory[],
	tailwindConfig?: any,
) {

	const webviewUri = getUri(webview, extensionUri, ["out", "main.js"]);
	const styleUri = getUri(webview, extensionUri, ["out", "style.css"]);
	const nonce = getNonce();

	let code = snippet.insertText;
	if (typeof code !== 'string') {
		code = '';
		console.error('Expected a string for snippet.insertText, but got', typeof snippet.insertText);
	}

	const previewHtml = getGeneratedPageURL(code, tailwindConfig);

	webview.onDidReceiveMessage((message) => {
		const command = message.command;
		switch (command) {
			case "requestSnippetData":
				webview.postMessage({
					command: "receiveDataInWebview",
					payload: JSON.stringify({
						snippet: snippet,
						categories: categories,
						subcategories: subcategories,
					}),
				});
				break;
		}
	});

	return /*html*/ `
	<!DOCTYPE html>
<html>
    <head>
         <meta charset="UTF-8" />
         <meta name="viewport" content="width=device-width, initial-scale=1.0" />
         <link rel="stylesheet" href="${styleUri}" />
         <title>${snippet.name || 'Snippet code'}</title>
    </head>
    <body id="webview-body">
         <section id="snippets-form">
            <div class="grid--2">
                      <vscode-text-field id="name" value="${snippet.name || ''}" placeholder="Enter a name">Component name</vscode-text-field>
              <div class="field">
                    <vscode-text-field id="label" value="${snippet.label || ''}" placeholder="Enter a label">Tab trigger</vscode-text-field>
              </div>
            </div>
              <vscode-text-area id="description" value="${snippet.description || ''}" placeholder="Write your documentation here" resize="none" rows="2">Description</vscode-text-area>
              <code-preview code="${escapeHtml(code)}"></code-preview>
              <component-preview src="${previewHtml}"></component-preview>
              </div>
              <div class="grid--2">
                    <div class="dropdown-container">
                         <label for="category">Category</label>
                         <vscode-dropdown id="category" position="above"></vscode-dropdown>
                    </div>
                    <div class="dropdown-container">
                         <label for="subcategory">Subcategory</label>
                         <vscode-dropdown id="subcategory" position="above"></vscode-dropdown>
                    </div>
              </div>
				  </section>
              <div id="nav">
				  		<div class="content">
							<span>${snippet.name || ''}</span>
							<div class="inline-container">
									<vscode-button id="submit-button">Save</vscode-button>
									<vscode-button id="cancel-button" appearance="secondary">Cancel</vscode-button>
							</div>
						</div>
				  </div>
         <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
    </body>
</html>
`;
}
