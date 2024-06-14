import { Webview, Uri } from "vscode";
import { Snippet } from "../types/Snippet";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { escapeHtml } from "../utilities/escapeHtml";
import { Category, Subcategory } from "../types/Category";

export function getWebviewContent(webview: Webview, extensionUri: Uri, snippet: Snippet, categories: Category[], subcategories: Subcategory[]) {
  const webviewUri = getUri(webview, extensionUri, ["out", "main.js"]);
  const styleUri = getUri(webview, extensionUri, ["out", "main.css"]);
  const nonce = getNonce();

  const safeInsertText = escapeHtml(snippet.insertText);

	webview.onDidReceiveMessage((message) => {
    const command = message.command;
    switch (command) {
      case "requestSnippetData":
        webview.postMessage({
          command: "receiveDataInWebview",
          payload: JSON.stringify({
						snippet: snippet,
						categories: categories,
						subcategories: subcategories
					}),
        });
        break;
    }
  });

  return /*html*/ `
    <!DOCTYPE html>
    <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="${styleUri}">
          <title>${snippet.name}</title>
      </head>
      <body id="webview-body">
        <header>
          <h1>Editing ${snippet.name}</h1>
        </header>
        <section id="snippets-form">
          <vscode-text-field id="name" value="${snippet.name}" placeholder="Enter a name">Name</vscode-text-field>
          <div class="field">
						<vscode-text-field id="label" value="${snippet.label}" placeholder="Enter a label">Label</vscode-text-field>
						<p><small>The label is the trigger : <span class="tag">${snippet.label}</span> this will run the completion.</small></p>
					</div>
          <vscode-text-area id="documentation" value="${snippet.description}" placeholder="Write your documentation here" resize="none" rows=2>Documentation</vscode-text-area>
          <vscode-text-area id="insertText" readonly value="${safeInsertText}" placeholder="Provide your code here" resize="none" rows=10>Snippet code</vscode-text-area>
					<div class="grid--2">
						<div class="dropdown-container">
							<label for="category">Category</label>
							<vscode-dropdown id="category" position="below"></vscode-dropdown>
						</div>
						<div class="dropdown-container">
							<label for="subcategory">Subcategory</label>
							<vscode-dropdown id="subcategory" position="below"></vscode-dropdown>
						</div>
					</div>
          <div class="inline-container">
					<vscode-button id="submit-button">Save</vscode-button>
          <vscode-button id="delete-button" appearance="secondary">Delete</vscode-button>
					</div>
        </section>
        <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
      </body>
    </html>
  `;
}
