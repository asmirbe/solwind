import { WebviewPanel, window } from "vscode";
import { getGlobalContext } from "../context/globalContext";
import { getWebviewContent } from "../ui/getWebviewContent";
import { CustomAuthStore } from "../pocketbase/pocketbase";
import axios from "axios";

export async function loadWebviewContent(panel: WebviewPanel, id: string, authStore: CustomAuthStore, refresh: () => Promise<void>) {
	const context = getGlobalContext();
	try {
		const response = await axios.get(`snippets/${id}`);
		const categoriesReponse = await axios.get('categories');
		const snippet = response.data;
		const { categories } = categoriesReponse.data;

		const webviewContent = await getWebviewContent(
			panel.webview,
			context!.extensionUri,
			snippet,
			categories,
			authStore.getData()
		);

		panel.webview.html = webviewContent;

		const messageHandler = async (message: any) => {
			const command = message.command;
			const snippet = message.snippet;

			switch (command) {
				case "updateSnippet":
					if (!snippet.id) break;
					try {
						if(!snippet.category || !snippet.subcategory) return window.showErrorMessage("Please select a category and subcategory.");
						await axios.put(`snippets/${snippet.id}`, snippet);
						refresh();
						// if (panel) {
						// 	panel.title = snippet.name;
						// 	panel.webview.html = await getWebviewContent(
						// 		panel.webview,
						// 		context!.extensionUri,
						// 		snippet,
						// 		categories,
						// 		authStore.getData()
						// 	);
						// }
						window.showInformationMessage("Snippet updated successfully!");
					} catch (error) {
						console.error("Failed to update snippet:", error);
					}
					break;
				case "cancel":
					panel.dispose();
					break;
			}
		};

		panel.webview.onDidReceiveMessage(messageHandler);

		panel.onDidDispose(() => { });
	} catch (error) {
		console.error("Failed to load webview content:", error);
	}
}
