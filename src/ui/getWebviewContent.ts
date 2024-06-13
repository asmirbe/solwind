import { Webview, Uri } from "vscode";
import { Snippet } from "../types/Snippet";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { escapeHtml } from "../utilities/escapeHtml";
import { Category, Subcategory } from "../types/Category";

export function getWebviewContent(webview: Webview, extensionUri: Uri, snippet: Snippet, categories: Category[], subcategories: Subcategory[]) {
  const webviewUri = getUri(webview, extensionUri, ["out", "webview.js"]);
  const styleUri = getUri(webview, extensionUri, ["out", "style.css"]);

  const nonce = getNonce();
  console.log(webview.cspSource);
  console.log(nonce);

  webview.onDidReceiveMessage((message) => {
    const command = message.command;
    switch (command) {
      case "requestSnippetData":
        webview.postMessage({
          command: "receiveDataInWebview",
          payload: JSON.stringify(snippet),
          categories: JSON.stringify(categories),
          subcategories: JSON.stringify(subcategories),
        });
        break;
    }
  });

  const safeInsertText = escapeHtml(snippet.insertText);

  return /*html*/ `
    <!DOCTYPE html>
    <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
					<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" href="${styleUri}">
          <title>${snippet.name}</title>
      </head>
      <body id="webview-body">
        <header>
          <h1>${snippet.name}</h1>
          <div id="tags-container"></div>
        </header>
        <section id="notes-form">
          <vscode-text-field id="title" value="${snippet.name}" placeholder="Enter a name">Title</vscode-text-field>
          <vscode-text-field id="title" value="${snippet.label}" placeholder="Enter a label">Label</vscode-text-field>
          <vscode-text-area id="content" value="${safeInsertText}" placeholder="Write your heart out, Shakespeare!" resize="vertical" rows=15>Note</vscode-text-area>
          <vscode-dropdown id="category">
          	<vscode-option value=""></vscode-option>
          </vscode-dropdown>
          <vscode-dropdown id="subcategory">
        		<vscode-option value=""></vscode-option>
          </vscode-dropdown>
          <vscode-button id="submit-button">Save</vscode-button>
        </section>
        <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
      </body>
    </html>
  `;
}
