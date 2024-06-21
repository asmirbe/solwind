// Types
import {Snippet} from "../types/Snippet";
import {Category, Subcategory} from "../types/Category";
import { pb } from "../pocketbase/pocketbase";
import {
   provideVSCodeDesignSystem,
   Button,
   TextArea,
   TextField,
   vsCodeButton,
   vsCodeTextArea,
   vsCodeTextField,
   vsCodeDropdown,
   vsCodeOption,
} from "@vscode/webview-ui-toolkit";
provideVSCodeDesignSystem().register(
   vsCodeButton(),
   vsCodeTextArea(),
   vsCodeTextField(),
   vsCodeDropdown(),
   vsCodeOption()
);

// Utilities
import {capitalizeFirstLetter, formatLabel} from "../utilities/stringUtils";

// Custom components
import CodeIcon from "./components/CodeIcon";
import ComponentPreview from "./components/ComponentPreview";
import CodePreview from "./components/CodePreview";

customElements.define('code-icon', CodeIcon);
customElements.define('component-preview', ComponentPreview);
customElements.define('code-preview', CodePreview);

const vscode = acquireVsCodeApi();
let isSaving = false;
window.addEventListener("load", main);

function main() {
   setVSCodeMessageListener();
   vscode.postMessage({command: "requestSnippetData"});

   const saveButton = document.getElementById("submit-button") as Button;
   saveButton.addEventListener("click", () => saveSnippet());

   const cancelButton = document.getElementById("cancel-button") as Button;
   cancelButton.addEventListener("click", () => {
		if (!isSaving) {
		  vscode.postMessage({ command: "cancel" });
		}
	 });


}

let openedSnippet: Snippet = {
   id: "",
   name: "",
   label: "",
   description: "",
   insertText: "",
   category: "",
   subcategory: "",
};
let dataCategories: Category[] = [];
let dataSubcategories: Subcategory[] = [];

function setVSCodeMessageListener() {
	window.addEventListener("message", (event) => {
	  const command = event.data.command;

	  switch (command) {
		 case "receiveDataInWebview": {
			const { snippet, categories, subcategories } = JSON.parse(
			  event.data.payload
			);
			openedSnippet = snippet;
			dataCategories = categories;
			dataSubcategories = subcategories;
			populateDropdowns();
			break;
		 }
	  }
	});
 }
function populateDropdowns() {
   const categoryDropdown = document.getElementById("category") as HTMLSelectElement;
   const subcategoryDropdown = document.getElementById("subcategory") as HTMLSelectElement;

   categoryDropdown.innerHTML = "";
   subcategoryDropdown.innerHTML = "";

   dataCategories.forEach((category: Category) => {
      const option = document.createElement("option") as HTMLOptionElement;
      option.value = category.id;
      option.textContent = capitalizeFirstLetter(category.name);
      categoryDropdown.appendChild(option);
   });

   // Set the initially selected category and filter subcategories accordingly
   if (openedSnippet.category) {
      categoryDropdown.value = openedSnippet.category;
   }

   filterAndPopulateSubcategories(openedSnippet.category);

   categoryDropdown.addEventListener("change", (event) => {
      const selectedCategoryId = (event.target as HTMLSelectElement).value;
      filterAndPopulateSubcategories(selectedCategoryId);
   });
}

function filterAndPopulateSubcategories(categoryId: string) {
   const subcategoryDropdown = document.getElementById("subcategory") as HTMLSelectElement;
   subcategoryDropdown.innerHTML = "";

   const filteredSubcategories = dataSubcategories.filter(
      (subcategory: Subcategory) => subcategory.category === categoryId
   );

   filteredSubcategories.forEach((subcategory: Subcategory) => {
      const option = document.createElement("option") as HTMLOptionElement;
      option.value = subcategory.id;
      option.textContent = capitalizeFirstLetter(subcategory.name);
      subcategoryDropdown.appendChild(option);
   });

   if (openedSnippet.subcategory) {
      subcategoryDropdown.value = openedSnippet.subcategory;
   }
}

async function saveSnippet() {
	if (isSaving) return; // Prevent multiple saves

	const nameInput = document.getElementById("name") as TextField;
	const labelInput = document.getElementById("label") as TextField;
	const description = document.getElementById("description") as TextArea;
	const categoryInput = document.getElementById("category") as HTMLSelectElement;
	const subcategoryInput = document.getElementById("subcategory") as HTMLSelectElement;

	const dataToUpdate = {
		 id: openedSnippet.id,
		 name: nameInput?.value,
		 insertText: openedSnippet.insertText,
		 label: formatLabel(labelInput?.value),
		 description: description?.value || '',
		 category: categoryInput?.value,
		 subcategory: subcategoryInput?.value,
	};

	isSaving = true;
	await vscode.postMessage({ command: "updateSnippet", snippet: dataToUpdate });
	isSaving = false;
}
