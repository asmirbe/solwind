import { authApiKey } from "../pocketbase/pocketbase";
import { ExtensionContext, commands, window, EventEmitter, Event } from "vscode";

export async function askForApiKey(context: ExtensionContext): Promise<Event<void>> {
	const apiKeyUpdatedEmitter = new EventEmitter<void>();

	context.subscriptions.push(
	  commands.registerCommand("solwind.setApiKey", async () => {
		 const input = await window.showInputBox({
			prompt: "Enter your PocketBase API Key",
			placeHolder: "API Key",
		 });
		 if (!input) {
			return;
		 }
		 try {
			const result = await authApiKey(input);
			if (!result || !result.items || result.items.length === 0) {
			  return window.showErrorMessage("Authentication failed. Please check your API Key.");
			}
			context.globalState.update('solwind.apiKey', input);
			window.showInformationMessage('API Key is valid. You are now authenticated.');
			apiKeyUpdatedEmitter.fire(); // Emit the event
		 } catch (error) {
			console.error("Authentication failed:", error);
			window.showErrorMessage("Authentication failed. Please check your API Key.");
		 }
	  })
	);

	return apiKeyUpdatedEmitter.event;
 }