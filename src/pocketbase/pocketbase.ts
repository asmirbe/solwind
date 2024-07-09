import { window, commands, extensions } from "vscode";
import type SnippetsDataProvider from "../providers/SnippetsDataProvider"; // Adjust the import path accordingly
const PocketBase = require("pocketbase/cjs");
import { Category, Subcategory } from "../types/Category";
import { getGlobalContext } from "../context/globalContext";
import { setContext } from "../utilities/setContext";
import axios from "axios";

export const pb = new PocketBase("https://solwind.up.railway.app/", {
	requestTimeout: 30000,
});

export class CustomAuthStore {
	private token: string | null = null;

	constructor() {
		this.token = this.getToken();
	}

	save(token: string) {
		this.token = token;
		const context = getGlobalContext();
		if (context) {
			context.globalState.update("solwind.apiToken", token);
		}
	}

	async setData() {
		const context = getGlobalContext();
		if (context) {
			const config = await getTailwindConfig();
			context.globalState.update("solwind.userData", config);
		}
	}

	async getVersion() {
		const currentExtensionVersion = extensions.getExtension("asmirbe.solwind")?.packageJSON.version;
		try {
			const response = await axios.get('http://localhost:3000/api/version');
			const nextExtensionVersion = response.data.version;
			const newVer = currentExtensionVersion !== nextExtensionVersion;
			return { newVer, nextExtensionVersion };
		} catch (error) {
			console.error("Failed to fetch version:", error);
			return { newVer: false, nextExtensionVersion: currentExtensionVersion };
		}
	}

	public async clear() {
		this.token = null;
		const context = getGlobalContext();
		if (context) {
			await context.globalState.update("solwind.apiToken", undefined);
			await context.globalState.update("solwind.apiKey", undefined);
			await setContext(false);

			const choice = await window.showInformationMessage(
				"API Key has been deleted. You are now unauthenticated. Reload window?",
				"Yes",
				"No"
			);
			if (choice === "Yes") {
				commands.executeCommand("workbench.action.reloadWindow");
			}
		}
	}

	getToken() {
		const context = getGlobalContext();
		return context?.globalState.get<string>("solwind.apiToken") ?? null;
	}

	getData() {
		const context = getGlobalContext();
		return context?.globalState.get("solwind.userData") ?? null;
	}

	async login(apiKey: string) {
		try {
			const response = await axios.post('http://localhost:3000/api/validate-api-key', null, {
				headers: { Authorization: `Bearer ${apiKey}` }
			});
			console.log("Login response:", response.data);
			if (response.data && response.data.valid) {
				this.save(apiKey);
				return true;
			}
			return false;
		} catch (error) {
			console.error("Login failed:", error);
			return false;
		}
	}

	async validateToken(): Promise<boolean> {
		const token = this.getToken();
		if (!token) return false;

		try {
			const response = await axios.post('http://localhost:3000/api/validate-api-key', null, {
				headers: { Authorization: `Bearer ${token}` }
			});
			return response.data.valid === true;
		} catch (error) {
			console.error("Token validation failed:", error);
			return false;
		}
	}
}

export function fetchMatchingSnippets(term: string) {
	return new Promise((resolve, reject) => {
		const maxRetries = 3;
		let retryCount = 0;

		function makeRequest() {
			pb.collection("snippets")
				.getList(1, 20, {
					filter: pb.filter("label ~ {:query}", { query: term }),
					requestKey: null, // Disable auto cancellation for this request
				})
				.then(async (response: any) => {
					const snippets = response.items || [];
					const matchingSnippets = snippets.filter(
						(obj: any) => obj && obj.label && obj.label.includes(term)
					);
					if (matchingSnippets.length > 0) {
						resolve(matchingSnippets);
					} else {
						reject(term);
					}
				})
				.catch((error: any) => {
					if (retryCount < maxRetries) {
						retryCount++;
						setTimeout(makeRequest, 2000); // Retry after 2 seconds
					} else {
						reject(error);
					}
				});
		}

		makeRequest();
	});
}

export async function createSubcategory(categoryId: string, name: string) {
	const subcategoryData = {
		category: categoryId,
		name: name,
	};
	if (!categoryId || !name) {
		window.showErrorMessage("Please provide a category ID and a name.");
		return;
	}
	try {
		await pb.collection("subcategories").create(subcategoryData);
	} catch (error) {
		console.error("Error creating subcategory:", error);
		window.showErrorMessage("Failed to create subcategory.");
	}
}

export async function getTailwindConfig() {
	try {
		const tailwindConfig = await pb.collection("config").getOne("oi4d8p2kxxrse9d");
		return tailwindConfig.value;
	} catch (error) {
		console.error("Error fetching tailwind config:", error);
		return {};
	}
}