import {window} from "vscode";

export async function promptForCategory(categories: any[]): Promise<string | undefined> {
   const categoryNames = categories.map((category) => category.name);
   return await window.showQuickPick(categoryNames, {
      placeHolder: "Select a category",
   });
}

export async function promptForSubcategory(
   subcategories: any[],
   categoryId: string
): Promise<string | undefined> {
   const subcategoryNames = subcategories
      .filter((subcat) => subcat.category === categoryId)
      .map((subcat) => subcat.name);
   return await window.showQuickPick(subcategoryNames, {
      placeHolder: "Select a subcategory",
   });
}

export const renamePrompt = async ({
   message,
   error = "An error occurred",
   value,
}: {
   message: string;
   error?: string;
   value: string;
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
