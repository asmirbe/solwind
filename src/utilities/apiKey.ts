import { CustomAuthStore } from "../pocketbase/pocketbase";
import { commands, window, EventEmitter } from "vscode";
import type { Event } from "vscode";
import { getGlobalContext } from "../context/globalContext";
import { setContext } from "./setContext";
export async function setApiKey(): Promise<Event<void>> {
	const context = getGlobalContext();
	const apiKeyUpdatedEmitter = new EventEmitter<void>();

	if (!context) {
		throw new Error("Global context is not available.");
	}

	const command = commands.registerCommand("solwind.setApiKey", async () => {
		const input = await window.showInputBox({
			prompt: "Enter your PocketBase API Key",
			placeHolder: "API Key",
		});
		if (!input) return;
		try {
			const authStore = new CustomAuthStore();
			await authStore.login(input);
			const token = authStore.getToken();
			const expiry = authStore.getExpiry(); // Get the expiry from the auth store

			if (token && expiry) {
				await context.globalState.update("solwind.apiKey", input);
				await context.globalState.update("solwind.apiToken", token);
				await context.globalState.update("solwind.apiTokenExpiry", expiry);
				window.showInformationMessage("API Key is valid. You are now authenticated.");
				apiKeyUpdatedEmitter.fire();
			} else {
				window.showErrorMessage("Authentication failed. Please check your API Key.");
			}
		} catch (error) {
			console.error("Authentication failed:", error);
			window.showErrorMessage("Authentication failed. Please check your API Key.");
		}
	});

	context.subscriptions.push(command);
	return apiKeyUpdatedEmitter.event;
}

export async function deleteApiKey(auth: CustomAuthStore): Promise<void> {
	try {
		auth.clear();
	} catch (error) {
		console.error("Failed to delete API key:", error);
	}
}
