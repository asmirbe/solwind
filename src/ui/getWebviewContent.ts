import { Webview, Uri } from "vscode";
import { Snippet } from "../types/Snippet";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { escapeHtml } from "../utilities/escapeHtml";

export function getWebviewContent(webview: Webview, extensionUri: Uri, snippet: Snippet) {
  const webviewUri = getUri(webview, extensionUri, ["out", "webview.js"]);
  const styleUri = getUri(webview, extensionUri, ["out", "style.css"]);

  const nonce = getNonce();

  webview.onDidReceiveMessage((message) => {
    const command = message.command;
    switch (command) {
      case "requestSnippetData":
        webview.postMessage({
          command: "receiveDataInWebview",
          payload: JSON.stringify(snippet),
        });
        break;
    }
  });

  const safeLabel = escapeHtml(snippet.label);
  const safeInsertText = escapeHtml(snippet.insertText);

  return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
					<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none'; img-src ${webview.cspSource} https:; script-src ${webview.cspSource}; style-src ${webview.cspSource};"
/>
          <link rel="stylesheet" href="${styleUri}">
          <title>${safeLabel}</title>
      </head>
      <body id="webview-body">
        <header>
          <h1>${safeLabel}</h1>
          <div id="tags-container"></div>
        </header>
        <section id="notes-form">
          <vscode-text-field id="title" value="${safeLabel}" placeholder="Enter a name">Title</vscode-text-field>
          <vscode-text-area id="content" value="${safeInsertText}" placeholder="Write your heart out, Shakespeare!" resize="vertical" rows=15>Note</vscode-text-area>
          <vscode-button id="submit-button">Save</vscode-button>
        </section>
        <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
      </body>
    </html>
  `;
}
