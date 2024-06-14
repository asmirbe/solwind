import {  ExtensionContext, commands, window } from "vscode";

export async function askForApiKey(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand("solwind.setApiKey", async () => {
			const input = await window.showInputBox({
				prompt: "Enter your PocketBase API Key",
				placeHolder: "API Key",
			});
			context.globalState.update("solwind.apiKey", input);
			return;
		})
	);
}