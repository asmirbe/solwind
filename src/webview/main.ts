// Import necessary types and components
import { Snippet } from "../types/Snippet";
import { Category, Subcategory } from "../types/Category";
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

import { capitalizeFirstLetter, formatLabel } from "../utilities/stringUtils";
import CodeIcon from "./components/CodeIcon";
import CodePreview from "./components/CodePreview";
import ComponentPreview from "./components/ComponentPreview";

// Define CodeIcon first
customElements.define('code-icon', CodeIcon);

// Then define other components
customElements.define('code-preview', CodePreview);
customElements.define('component-preview', ComponentPreview);

const vscode = acquireVsCodeApi();

class SnippetStore {
  openedSnippet: Snippet;
  dataCategories: Category[];
  dataSubcategories: Subcategory[];
  isSaving: boolean;

  constructor() {
    this.openedSnippet = {
      id: "",
      name: "",
      label: "",
      description: "",
      insertText: "",
      category: "",
      subcategory: "",
    };
    this.dataCategories = [];
    this.dataSubcategories = [];
    this.isSaving = false;
    this.initEventListeners();
  }

  initEventListeners() {
    window.addEventListener("message", this.handleMessage.bind(this));

    const saveButton = document.getElementById("submit-button") as Button;
    saveButton.addEventListener("click", () => this.saveSnippet());

    const cancelButton = document.getElementById("cancel-button") as Button;
    cancelButton.addEventListener("click", () => {
      if (!this.isSaving) {
        vscode.postMessage({ command: "cancel" });
      }
    });
  }

  handleMessage(event: MessageEvent) {
    const command = event.data.command;

    if (command === "receiveDataInWebview") {
      const { snippet, categories, subcategories } = JSON.parse(event.data.payload);
      this.openedSnippet = snippet;
      this.dataCategories = categories;
      this.dataSubcategories = subcategories;
      this.populateDropdowns();
    }
  }

  populateDropdowns() {
    const categoryDropdown = document.getElementById("category") as HTMLSelectElement;
    const subcategoryDropdown = document.getElementById("subcategory") as HTMLSelectElement;

    categoryDropdown.innerHTML = "";
    subcategoryDropdown.innerHTML = "";

    this.dataCategories.forEach((category: Category) => {
      const option = document.createElement("option") as HTMLOptionElement;
      option.value = category.id;
      option.textContent = capitalizeFirstLetter(category.name);
      categoryDropdown.appendChild(option);
    });

    if (this.openedSnippet.category) {
      categoryDropdown.value = this.openedSnippet.category;
    }

    this.filterAndPopulateSubcategories(this.openedSnippet.category);

    categoryDropdown.addEventListener("change", (event) => {
      const selectedCategoryId = (event.target as HTMLSelectElement).value;
      this.filterAndPopulateSubcategories(selectedCategoryId);
    });
  }

  filterAndPopulateSubcategories(categoryId: string) {
    const subcategoryDropdown = document.getElementById("subcategory") as HTMLSelectElement;
    subcategoryDropdown.innerHTML = "";

    const filteredSubcategories = this.dataSubcategories.filter(
      (subcategory: Subcategory) => subcategory.category === categoryId
    );

    if (filteredSubcategories.length === 0) {
      const option = document.createElement("option") as HTMLOptionElement;
      option.value = "";
      option.textContent = "No subcategories";
      subcategoryDropdown.appendChild(option);
    } else {
      filteredSubcategories.forEach((subcategory: Subcategory) => {
        const option = document.createElement("option") as HTMLOptionElement;
        option.value = subcategory.id;
        option.textContent = capitalizeFirstLetter(subcategory.name);
        subcategoryDropdown.appendChild(option);
      });

      if (this.openedSnippet.subcategory) {
        subcategoryDropdown.value = this.openedSnippet.subcategory;
      }
    }
  }

  async saveSnippet() {
    if (this.isSaving) return;

    const nameInput = document.getElementById("name") as TextField;
    const labelInput = document.getElementById("label") as TextField;
    const description = document.getElementById("description") as TextArea;
    const categoryInput = document.getElementById("category") as HTMLSelectElement;
    const subcategoryInput = document.getElementById("subcategory") as HTMLSelectElement;

    const dataToUpdate = {
      id: this.openedSnippet.id,
      name: nameInput?.value,
      insertText: this.openedSnippet.insertText,
      label: formatLabel(labelInput?.value),
      description: description?.value || '',
      category: categoryInput?.value,
      subcategory: subcategoryInput?.value,
    };

    this.isSaving = true;
    await vscode.postMessage({ command: "updateSnippet", snippet: dataToUpdate });
    this.isSaving = false;
  }
}

// Declare the SnippetStore instance globally
let snippetStore: SnippetStore;

function main() {
  vscode.postMessage({ command: "requestSnippetData" });
  snippetStore = new SnippetStore(); // Initialize the SnippetStore instance
}

window.addEventListener("load", main);
