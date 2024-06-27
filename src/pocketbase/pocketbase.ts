import { window, commands, extensions } from "vscode";
import type SnippetsDataProvider from "../providers/SnippetsDataProvider"; // Adjust the import path accordingly
const PocketBase = require("pocketbase/cjs");
import { Category, Subcategory } from "../types/Category";
import { getGlobalContext } from "../context/globalContext";
import { setContext } from "../utilities/setContext";

export const pb = new PocketBase("https://solwind.up.railway.app/", {
	requestTimeout: 30000,
});

export class CustomAuthStore {
	private token: string | null = null;
	private expiry: number | null = null;
	private data: any = null;

	constructor() {
		this.token = this.getToken();
		this.expiry = this.getExpiry();
		this.data = this.getData();
	}

	save(token: string, expiry: number) {
		this.token = token;
		this.expiry = expiry;
		const context = getGlobalContext();
		if (context) {
			context.globalState.update("solwind.apiToken", token);
			context.globalState.update("solwind.apiTokenExpiry", expiry);
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
		// Get actual extension version
		const currentExtensionVersion = extensions.getExtension("asmirbe.solwind")?.packageJSON.version;
		const nextExtensionVersion = await pb
			.collection("version")
			.getOne("yr0aiacmjhc5jz0", { fields: "version" });
		const newVer = currentExtensionVersion !== nextExtensionVersion.version;
		return { newVer, nextExtensionVersion };
	}

	public async clear() {
		this.token = null;
		this.expiry = null;
		const context = getGlobalContext();
		if (context) {
			context.globalState.update("solwind.apiToken", undefined);
			context.globalState.update("solwind.apiTokenExpiry", undefined);
			context.globalState.update("solwind.apiKey", undefined);

			// Update the context key
			await setContext(false);
			// Finally, reload the window
			const reload = window.showInformationMessage(
				"API Key has been deleted. You are now unauthenticated.",
				"Yes",
				"No"
			);
			if (!reload) return;
			commands.executeCommand("workbench.action.reloadWindow");
		}
	}

	isValid() {
		if (!this.token || !this.expiry) return false;
		return Date.now() < this.expiry;
	}

	getApiKey() {
		const context = getGlobalContext();
		if (context) {
			return context.globalState.get<string>("solwind.apiKey") ?? null;
		}
		return null;
	}

	getToken() {
		const context = getGlobalContext();
		if (context) {
			return context.globalState.get<string>("solwind.apiToken") ?? null;
		}
		return null;
	}

	getExpiry() {
		const context = getGlobalContext();
		if (context) {
			return context.globalState.get<number>("solwind.apiTokenExpiry") ?? null;
		}
		return null;
	}

	getData() {
		const context = getGlobalContext();
		if (context) {
			return context.globalState.get("solwind.userData") ?? null;
		}
	}

	async refresh() {
		if (this.isValid()) return;

		try {
			const result = await pb.collection("users").authRefresh();
			const newExpiry = Date.now() + 63072000; // Adjust duration as needed
			const updateExpiry = await pb
				.collection("users")
				.update(result.record.id, { expiry: newExpiry });
			this.save(result.token, updateExpiry.expiry);
		} catch (error) {
			console.error("Token refresh failed:", error);
			this.clear();
		}
	}

	async login(apiKey: string) {
		try {
			const result = await pb.collection("users").authWithPassword("admin", apiKey);
			const newExpiry = Date.now() + 63072000; // You may need to adjust this based on actual response
			const updateExpiry = await pb
				.collection("users")
				.update(result.record.id, { expiry: newExpiry });
			this.save(result.token, updateExpiry.expiry);
		} catch (error) {
			console.error("Login failed:", error);
			this.clear();
		}
	}
}

pb.authStore = new CustomAuthStore();

pb.beforeSend = function (url: any, options: any) {
	const token = pb.authStore.getToken();
	if (token && !options.headers["Authorization"]) {
		options.headers["Authorization"] = token;
	}

	return { url, options: options };
};

async function validateCategoryAndSubcategory(categoryId: string, subcategoryId: string) {
	// Fetch the subcategory to get its associated category
	const subcategory = await pb.collection('subcategories').getOne(subcategoryId);
	if (!subcategory || subcategory.category !== categoryId) {
		throw new Error('Invalid subcategory for the given category');
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

export async function retrieveSnippets(
	snippetsDataProvider: SnippetsDataProvider,
	message?: string
): Promise<void> {
	try {
		await pb.authStore.refresh(); // Refresh the token before making the request

		const [snippetsResponse, categoriesResponse, subcategoriesResponse] = await Promise.all([
			pb
				.collection("snippets")
				.getList(1, 30, { expand: "category,subcategory", requestKey: null }),
			pb.collection("categories").getList(1, 100, { sort: "name", requestKey: null }),
			pb
				.collection("subcategories")
				.getList(1, 100, { sort: "name", expand: "category", requestKey: null }),
		]);

		const snippets: any[] = snippetsResponse.items || [];
		const categories: Category[] = categoriesResponse.items || [];
		const subcategories: Subcategory[] = subcategoriesResponse.items || [];

		snippetsDataProvider.setSnippets(snippets, categories, subcategories);
	} catch (error) {
		console.error("Error fetching snippets and categories:", error);
		window.showErrorMessage("Failed to fetch snippets and categories from the database.");
	} finally {
		if (message) {
			window.showInformationMessage(message);
		}
	}
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