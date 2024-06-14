import { window, ExtensionContext } from "vscode";
import { type SnippetsDataProvider } from "../providers/SnippetsDataProvider";
const PocketBase = require("pocketbase/cjs");
import { Category, Subcategory } from "../types/Category";
import { getGlobalContext } from "../context/globalContext";

export const pb = new PocketBase("https://pocketbase-hhnt-production.up.railway.app/", {
  requestTimeout: 30000,
});

export function fetchMatchingSnippets(term: string) {
  return new Promise((resolve, reject) => {
    const maxRetries = 3;
    let retryCount = 0;

    function makeRequest() {
      pb.collection("snippets")
        .getList(1, 20, {
          filter: pb.filter("label ~ {:query}", { query: term }),
        })
        .then((response: any) => {
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
            console.log(`Retrying request... (Attempt ${retryCount})`);
            setTimeout(makeRequest, 2000); // Retry after 2 seconds
          } else {
            reject(error);
          }
        });
    }

    makeRequest();
  });
}

export async function retrieveSnippets(SnippetsDataProvider: SnippetsDataProvider) {
  try {
    verifyApiKey();
    const [snippetsResponse, categoriesResponse, subcategoriesResponse] = await Promise.all([
      pb.collection("snippets").getList(1, 30, { expand: "category,subcategory" }),
      pb.collection("categories").getList(1, 100, { sort: "name" }),
      pb.collection("subcategories").getList(1, 100, { sort: "name", expand: "category" }),
    ]);

    const snippets: any[] = snippetsResponse.items || [];
    const categories: Category[] = categoriesResponse.items || [];
    const subcategories: Subcategory[] = subcategoriesResponse.items || [];

    SnippetsDataProvider.setSnippets(snippets, categories, subcategories);
  } catch (error) {
    console.error("Error fetching snippets and categories:", error);
    window.showErrorMessage("Failed to fetch snippets and categories from the database.");
  }
}

export async function createSubcategory(categoryId: string, name: string) {
  const subcategoryData = {
    category: categoryId,
    name: name,
  };

  await pb.collection("subcategories").create(subcategoryData);
}

export async function authApiKey(key: string) {
	try {
	  return await pb.collection("api_keys").getList(1, 1, {
		 filter: `apiKey = "${key}"`
	  });
	} catch (error) {
	  console.error("Error during API key authentication:", error);
	  throw error; // Re-throw the error to be handled by the caller
	}
 }
async function verifyApiKey() {
  const context = getGlobalContext()!;
  const apiKey = context.globalState.get("solwind.apiKey") || null;
  if (!apiKey) return window.showErrorMessage("API Key is not set. Please set your API Key first.");
  const authResult = await authApiKey(apiKey as string);
  if (!authResult || !authResult.items || authResult.items.length === 0) {
    window.showErrorMessage("Authentication failed. Please check your API Key.");
    return;
  }
}
