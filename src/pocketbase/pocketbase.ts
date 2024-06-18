import {window, commands} from "vscode";
import type SnippetsDataProvider from "../providers/SnippetsDataProvider"; // Adjust the import path accordingly
const PocketBase = require("pocketbase/cjs");
import {Category, Subcategory} from "../types/Category";
import {getGlobalContext} from "../context/globalContext";

export const pb = new PocketBase("https://pocketbase-hhnt-production.up.railway.app/", {
   requestTimeout: 30000,
});

export class CustomAuthStore {
   private token: string | null = null;
   private expiry: number | null = null;

   constructor() {
      this.token = this.getToken();
      this.expiry = this.getExpiry();
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

   public clear() {
      this.token = null;
      this.expiry = null;
      const context = getGlobalContext();
      if (context) {
         context.globalState.update("solwind.apiToken", undefined);
         context.globalState.update("solwind.apiTokenExpiry", undefined);
         context.globalState.update("solwind.apiKey", undefined);

         // Update the context key
         commands.executeCommand("setContext", "solwind.apiKeySet", false);
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

   async refresh() {
      if (this.isValid()) return;

      try {
         const result = await pb.collection("users").authRefresh();
         const newExpiry = Date.now() + 63072000; // Adjust duration as needed
         const updateExpiry = await pb
            .collection("users")
            .update(result.record.id, {expiry: newExpiry});
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
            .update(result.record.id, {expiry: newExpiry});
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

   return {url, options: options};
};

export function fetchMatchingSnippets(term: string) {
   return new Promise((resolve, reject) => {
      const maxRetries = 3;
      let retryCount = 0;

      function makeRequest() {
         pb.collection("snippets")
            .getList(1, 20, {
               filter: pb.filter("label ~ {:query}", {query: term}),
               requestKey: null, // Disable auto cancellation for this request
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
            .getList(1, 30, {expand: "category,subcategory", requestKey: null}),
         pb.collection("categories").getList(1, 100, {sort: "name", requestKey: null}),
         pb
            .collection("subcategories")
            .getList(1, 100, {sort: "name", expand: "category", requestKey: null}),
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

   await pb.collection("subcategories").create(subcategoryData);
}
