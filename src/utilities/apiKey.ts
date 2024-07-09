import { CustomAuthStore } from "../pocketbase/pocketbase";
import { commands, window, EventEmitter } from "vscode";
import type { Event } from "vscode";
import { getGlobalContext } from "../context/globalContext";

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

		const authStore = new CustomAuthStore();
		const success = await authStore.login(input);

		if (success) {
			window.showInformationMessage("API Key is valid. You are now authenticated.");
			apiKeyUpdatedEmitter.fire();
		} else {
			window.showErrorMessage("Authentication failed. Please check your API Key.");
		}
	});

	context.subscriptions.push(command);
	return apiKeyUpdatedEmitter.event;
}

export async function deleteApiKey(): Promise<void> {
	const authStore = new CustomAuthStore();
	await authStore.clear();
}