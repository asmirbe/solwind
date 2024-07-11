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
	snippet: any,
	categories: any[],
	tailwindConfig?: any,
) {

	const webviewUri = getUri(webview, extensionUri, ["out", "main.js"]);
	const styleUri = getUri(webview, extensionUri, ["out", "style.css"]);
	const nonce = getNonce();

	let code = String(snippet.insert_text || '<!-- Code here -->');
	if (code === 'undefined' || code === 'null') {
		code = '';
		console.warn(`snippet.insert_text was ${snippet.insert_text}, converted to an empty string`);
	}

	const previewHtml = getGeneratedPageURL(code, tailwindConfig);

	webview.onDidReceiveMessage((message) => {
		const command = message.command;
		switch (command) {
			case "requestSnippetData":
				webview.postMessage({
					command: "receiveDataInWebview",
					payload: JSON.stringify({
						snippet,
						categories
					}),
				});
				break;
		}
	});

	return /*html*/ `<!DOCTYPE html>
<html>
    <head>
         <meta charset="UTF-8" />
         <meta name="viewport" content="width=device-width, initial-scale=1.0" />
         <link rel="stylesheet" href="${styleUri}" />
         <title>${snippet.name}</title>
    </head>
    <body id="webview-body">
         <section id="snippets-form">
				<header><h1>${snippet.name}</h1><p class="grey">${snippet.description || "Pas de description."}</p></header>
            <div class="grid--2">
                      <vscode-text-field id="name" value="${snippet.name
		}" placeholder="Enter a name">Name</vscode-text-field>
              <div class="field">
                    <vscode-text-field id="label" value="${snippet.label
		}" placeholder="Enter a label">Tab trigger</vscode-text-field>
              </div>
            </div>
              <vscode-text-area id="description" value="${snippet.description || ""
		}" placeholder="Write your documentation here" resize="none" rows="2">Documentation</vscode-text-area>
              <code-preview code="${escapeHtml(code)}"></code-preview>
              <component-preview src="${previewHtml}"></component-preview>
              </div>
				  <div class="dropdown-container">
						<label for="category">Category</label>
						<div class="relative">
						<select class="control" id="categorySubcategory" position="above"></select>
						<div class="chevron"><code-icon icon="chevron-down"></code-icon></div>
						</div>
				  </div>
				  </section>
				  </div>
              <div id="nav">
				  		<div class="content">
						<span>${snippet.name}</span>
						<div class="inline-container">
								<vscode-button id="submit-button">Save</vscode-button>
								<vscode-button id="cancel-button" appearance="secondary">Cancel</vscode-button>
						</div>
						</div>
         <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
    </body>
</html>`;
}
