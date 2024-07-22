import { CustomAuthStore } from "../pocketbase/pocketbase";
import { commands, window, EventEmitter } from "vscode";
import type { Event } from "vscode";
import { getGlobalContext } from "../context/globalContext";
import { showMessageWithTimeout, showErrorMessageWithTimeout } from '../utilities/errorMessage';

export async function setApiKey(): Promise<Event<void>> {
	const context = getGlobalContext();
	const apiKeyUpdatedEmitter = new EventEmitter<void>();

	if (!context) {
		throw new Error("Global context is not available.");
	}

	const command = commands.registerCommand("solwind.setApiKey", async () => {
		const input = await window.showInputBox({
			prompt: "Enter your API Key",
			placeHolder: "API Key",
		});
		if (!input) return;
		try {
			const authStore = new CustomAuthStore();
			const login = await authStore.login(input);

			if (login) {
				await context.globalState.update("solwind.apiKey", input);
				showMessageWithTimeout("API Key is valid. You are now authenticated.");
				apiKeyUpdatedEmitter.fire();
			} else {
				showErrorMessageWithTimeout("Authentication failed. Please check your API Key.");
			}
		} catch (error) {
			console.error("Authentication failed:", error);
			showErrorMessageWithTimeout("Authentication failed. Please check your API Key.");
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
