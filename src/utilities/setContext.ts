import { commands } from "vscode";
export async function setContext(value: boolean) {
	await commands.executeCommand("setContext", "solwind.apiKeySet", value);
}
