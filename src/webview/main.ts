import {
  provideVSCodeDesignSystem,
  Button,
  TextArea,
  TextField,
  Dropdown,
  vsCodeButton,
  vsCodeTextArea,
  vsCodeTextField,
  vsCodeDropdown,
  vsCodeOption
} from "@vscode/webview-ui-toolkit";
import { Snippet } from "../types/Snippet";
import { Category, Subcategory } from "../types/Category";
import { capitalizeFirstLetter, formatLabel } from "../utilities/stringUtils";

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeTextArea(),
  vsCodeTextField(),
  vsCodeDropdown(),
  vsCodeOption()
);

const vscode = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  setVSCodeMessageListener();
  vscode.postMessage({ command: "requestSnippetData" });

  const saveButton = document.getElementById("submit-button") as Button;
  saveButton.addEventListener("click", () => saveSnippet());
}

let openedSnippet: Snippet = {
	id: "",
	name: "",
	label: "",
	documentation: "",
	insertText: "",
	category: "",
	subcategory: ""
};
let dataCategories: Category[] = [];
let dataSubcategories: Subcategory[] = [];

function setVSCodeMessageListener() {
  window.addEventListener("message", (event) => {
    const command = event.data.command;

    switch (command) {
      case "receiveDataInWebview": {
				const { snippet, categories, subcategories } = JSON.parse(event.data.payload);
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

  categoryDropdown.innerHTML = '';
  subcategoryDropdown.innerHTML = '';

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
  subcategoryDropdown.innerHTML = '';

  const filteredSubcategories = dataSubcategories.filter((subcategory: Subcategory) => subcategory.category === categoryId);

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

function saveSnippet() {
  const nameInput = document.getElementById("name") as TextField;
  const labelInput = document.getElementById("label") as TextField;
  const insertText = document.getElementById("insertText") as TextArea;
  const documentation = document.getElementById("documentation") as TextArea;
  const categoryInput = document.getElementById("category") as HTMLSelectElement;
  const subcategoryInput = document.getElementById("subcategory") as HTMLSelectElement;

  const dataToUpdate = {
    id: openedSnippet.id,
    name: nameInput?.value,
    label: formatLabel(labelInput?.value),
		documentation: documentation?.value,
    insertText: insertText?.value,
    category: categoryInput?.value,
    subcategory: subcategoryInput?.value
  };

	console.log(dataToUpdate);

  vscode.postMessage({ command: "updateSnippet", snippet: dataToUpdate });
}
