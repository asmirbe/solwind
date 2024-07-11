import {window} from "vscode";

export async function promptForCategory(categories: any[]): Promise<string | undefined> {
   const categoryNames = categories.map((category) => category.name);
   return await window.showQuickPick(categoryNames, {
      placeHolder: "Select a category",
   });
}

export async function promptForSubcategory(subcategories: any[], parentId: number): Promise<string | undefined> {
	const filteredSubcategories = subcategories.filter(subcat => subcat.parent_id === parentId);
	const subcategoryNames = filteredSubcategories.map(subcat => subcat.name);
	return window.showQuickPick(subcategoryNames, { placeHolder: 'Select a subcategory' });
}

export const renamePrompt = async ({
   message,
   error = "An error occurred",
   value,
}: {
   message: string;
   error?: string;
   value: string|undefined;
}) => {
   const result = await window.showInputBox({
      prompt: message,
      value: value,
      validateInput: (value: any) => {
         if (!value) {
            return error;
         }
         return null;
      },
   });

   return result;
};
