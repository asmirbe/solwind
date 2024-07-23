import { CustomAuthStore } from "../pocketbase/pocketbase";

export async function deleteApiKey(auth: CustomAuthStore): Promise<void> {
	try {
		auth.clear();
	} catch (error) {
		console.error("Failed to delete API key:", error);
	}
}
