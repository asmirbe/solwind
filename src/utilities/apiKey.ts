import { CustomAuthStore } from "../pocketbase/pocketbase";
import { commands, window, EventEmitter, ExtensionContext } from "vscode";
import type { Event } from "vscode";
import { getGlobalContext } from "../context/globalContext";
import { showMessageWithTimeout, showErrorMessageWithTimeout } from '../utilities/errorMessage';

export async function deleteApiKey(auth: CustomAuthStore): Promise<void> {
	try {
		auth.clear();
	} catch (error) {
		console.error("Failed to delete API key:", error);
	}
}
