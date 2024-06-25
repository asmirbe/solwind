import { CustomAuthStore } from "../pocketbase/pocketbase";
import { commands, window, EventEmitter } from "vscode";
import type { Event } from "vscode";
import { getGlobalContext } from "../context/globalContext";

export async function setApiKey(): Promise<Event<void>> {
	const context = getGlobalContext();
	const apiKeyUpdatedEmitter = new EventEmitter<void>();

	const command = commands.registerCommand("solwind.setApiKey", async () => {
		const input = await window.showInputBox({
			prompt: "Enter your PocketBase API Key",
			placeHolder: "API Key",
		});
		if (!input) {
			return;
		}
		try {
			const authStore = new CustomAuthStore();
			await authStore.login(input);
			const token = authStore.getToken();
			const expiry = authStore.getExpiry(); // Get the expiry from the auth store

			if (token && expiry) {
				context!.globalState.update("solwind.apiKey", input);
				context!.globalState.update("solwind.apiToken", token);
				context!.globalState.update("solwind.apiTokenExpiry", expiry);
				window.showInformationMessage("API Key is valid. You are now authenticated.");
				apiKeyUpdatedEmitter.fire();

				// Update the context key
				commands.executeCommand("setContext", "solwind.apiKeySet", true);
			} else {
				window.showErrorMessage("Authentication failed. Please check your API Key.");
			}
		} catch (error) {
			console.error("Authentication failed:", error);
			window.showErrorMessage("Authentication failed. Please check your API Key.");
		}
	});

	context!.subscriptions.push(command);
	return apiKeyUpdatedEmitter.event;
}

export async function deleteApiKey(auth: CustomAuthStore): Promise<void> {
	try {
		auth.clear();
	} catch (error) {
		console.error("Failed to delete API key:", error);
	}
}
