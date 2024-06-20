import { Webview, Uri } from "vscode";
import { Snippet } from "../types/Snippet";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { Category, Subcategory } from "../types/Category";
import { codeToHtml, getHighlighter } from 'shiki';
import { componentPreview } from "../utilities/componentPreview";
import { getTailwindConfig } from "../pocketbase/pocketbase";

async function renderCodeToHtml(code: string) {
	const highlighter = await getHighlighter({
		themes: ['aurora-x'],
		langs: ['javascript', 'html'], // Include both languages
	});
	return highlighter.codeToHtml(code, {
		theme: 'aurora-x',
		lang: 'html',
	});
}

const getGeneratedPageURL = (html: string, config: any) => {
	const baseHtml = componentPreview(html, config);
	return `data:text/html;charset=utf-8,${encodeURIComponent(baseHtml)}`;
};

export async function getWebviewContent(
	webview: Webview,
	extensionUri: Uri,
	snippet: Snippet,
	categories: Category[],
	subcategories: Subcategory[]
) {
	const tailwindConfig = await getTailwindConfig();

	const webviewUri = getUri(webview, extensionUri, ["out", "main.js"]);
	const styleUri = getUri(webview, extensionUri, ["out", "main.css"]);
	const nonce = getNonce();

	const highlightedCodeHtml = await renderCodeToHtml(snippet.insertText); // Assuming snippet.insertText is your code
	const previewHtml = getGeneratedPageURL(snippet.insertText, tailwindConfig);  // This now returns URI encoded HTML



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

	return /*html*/ `<!DOCTYPE html>
<html>
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<link rel="stylesheet" href="${styleUri}" />
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
				<p>
					<small>
						The label is the trigger :
						<span class="tag">${snippet.label}</span>
						this will run the completion.
					</small>
				</p>
			</div>
			<vscode-text-area id="documentation" value="${snippet.description}" placeholder="Write your documentation here" resize="none" rows="2">Documentation</vscode-text-area>
			<div id="code">
				<label>Code</label>
				${highlightedCodeHtml}
				</div>
			<div>
			<label>Preview</label>
			<iframe id="preview" src="${previewHtml}" sandbox="allow-scripts allow-same-origin">
			</iframe>
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
			<div class="inline-container">
				<vscode-button id="submit-button">Save</vscode-button>
				<vscode-button id="cancel-button" appearance="secondary">Cancel</vscode-button>
			</div>
		</section>
		<script type="module" nonce="${nonce}" src="${webviewUri}"></script>
	</body>
</html>`;
}
