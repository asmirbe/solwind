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
import { Category, Subcategory } from "../types/Category";

// In order to use the Webview UI Toolkit web components they
// must be registered with the browser (i.e. webview) using the
// syntax below.
provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeTextArea(),
  vsCodeTextField(),
  vsCodeDropdown(),
  vsCodeOption()
);

// Get access to the VS Code API from within the webview context
const vscode = acquireVsCodeApi();

// Just like a regular webpage we need to wait for the webview
// DOM to load before we can reference any of the HTML elements
// or toolkit components
window.addEventListener("load", main);

function main() {
  setVSCodeMessageListener();
  vscode.postMessage({ command: "requestSnippetData" });

  // To get improved type annotations/IntelliSense the associated class for
  // a given toolkit component can be imported and used to type cast a reference
  // to the element (i.e. the `as Button` syntax)
  const saveButton = document.getElementById("submit-button") as Button;
  saveButton.addEventListener("click", () => saveNote());
}

// Stores the currently opened note info so we know the ID when we update it on save
let openedSnippet;
let categories: Category[] = [];
let subcategories: Subcategory[] = [];

function setVSCodeMessageListener() {
  window.addEventListener("message", (event) => {
    const command = event.data.command;
    const snippetData = JSON.parse(event.data.payload);

    categories = JSON.parse(event.data.categories) as Category[];
    subcategories = JSON.parse(event.data.subcategories) as Subcategory[];

    switch (command) {
      case "receiveDataInWebview":
        openedSnippet = snippetData;
        populateDropdowns();
        break;
    }
  });
}

function populateDropdowns() {
  const categoryDropdown = document.getElementById("category") as HTMLSelectElement;
  const subcategoryDropdown = document.getElementById("subcategory") as HTMLSelectElement;

  // Clear existing options
  categoryDropdown.innerHTML = '';
  subcategoryDropdown.innerHTML = '';

  // Populate category dropdown
  categories.forEach((category: Category) => {
    const option = document.createElement("option") as HTMLOptionElement;
    option.value = category.id;
    option.textContent = category.name;
    categoryDropdown.appendChild(option);
  });

  // Populate subcategory dropdown
  subcategories.forEach((subcategory: Subcategory) => {
    const option = document.createElement("option") as HTMLOptionElement;
    option.value = subcategory.id;
    option.textContent = subcategory.name;
    subcategoryDropdown.appendChild(option);
  });

  // Set selected category and subcategory
  if (openedSnippet.category) {
    categoryDropdown.value = openedSnippet.category;
  }

  if (openedSnippet.subcategory) {
    subcategoryDropdown.value = openedSnippet.subcategory;
  }
}

function saveNote() {
  const titleInput = document.getElementById("title") as TextField;
  const noteInput = document.getElementById("content") as TextArea;
  const categoryInput = document.getElementById("category") as HTMLSelectElement;
  const subcategoryInput = document.getElementById("subcategory") as HTMLSelectElement;

  const titleInputValue = titleInput?.value;
  const noteInputValue = noteInput?.value;
  const categoryInputValue = categoryInput?.value;
  const subcategoryInputValue = subcategoryInput?.value;

  const noteToUpdate = {
    id: openedSnippet.id,
    title: titleInputValue,
    content: noteInputValue,
    category: categoryInputValue,
    subcategory: subcategoryInputValue,
  };

  vscode.postMessage({ command: "updateSnippet", note: noteToUpdate });
}
