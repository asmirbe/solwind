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

		const saveButton = document.getElementById("submit-button") as HTMLButtonElement;
		saveButton.addEventListener("click", () => this.saveSnippet());

		const cancelButton = document.getElementById("cancel-button") as HTMLButtonElement;
		cancelButton.addEventListener("click", () => {
			if (!this.isSaving) {
				vscode.postMessage({ command: "cancel" });
			}
		});
	}

	handleMessage(event: MessageEvent) {
		const command = event.data.command;

		if (command === "receiveDataInWebview") {
			const { snippet, categories } = JSON.parse(event.data.payload);
			this.openedSnippet = snippet;
			this.dataCategories = categories;
			this.openedSnippet.category = snippet.category_id;
			this.openedSnippet.subcategory = snippet.parent_id;

			this.populateDropdown();
		}
	}

	populateDropdown() {
		// Find the dropdown element in the DOM
		const dropdown = document.getElementById("categorySubcategory") as HTMLSelectElement;

		// Clear existing options
		dropdown.innerHTML = '';

		// Iterate over categories to create grouped options
		this.dataCategories.forEach(category => {
			// Create an optgroup element for each category
			const group = document.createElement('optgroup');
			group.label = category.name;

			// Create an option element for each subcategory under the current category
			category.children.forEach(subcategory => {
				const option = document.createElement('option');
				option.value = `subcategory:${subcategory.id}`;
				option.text = subcategory.name;
				group.appendChild(option);
			});

			// Add the optgroup to the dropdown
			dropdown.appendChild(group);
		});

		// Add an event listener to handle changes
		dropdown.addEventListener('change', (event) => {
			const value = (event.target as HTMLSelectElement).value;
			const [type, id] = value.split(':');

			if (type === 'subcategory') {
				// Find the parent category of the subcategory
				const parentCategory = this.dataCategories.find(category =>
					category.children.some(sub => sub.id === parseInt(id))
				);

				this.openedSnippet.category = parentCategory ? parentCategory.id.toString() : '';
				this.openedSnippet.subcategory = id;
			}

			console.log('Updated Category:', this.openedSnippet.category);
			console.log('Updated Subcategory:', this.openedSnippet.subcategory);
		});
	}



	async saveSnippet() {
		if (this.isSaving) return;

		const nameInput = document.getElementById("name") as HTMLInputElement;
		const labelInput = document.getElementById("label") as HTMLInputElement;
		const description = document.getElementById("description") as HTMLTextAreaElement;
		const categorySubcategoryInput = document.getElementById("categorySubcategory") as HTMLSelectElement;

		const [type, id] = categorySubcategoryInput.value.split(':');

		const dataToUpdate = {
			id: this.openedSnippet.id,
			name: nameInput?.value,
			insertText: this.openedSnippet.insertText,
			label: formatLabel(labelInput?.value),
			description: description?.value || '',
			category: type === 'category' ? id : this.openedSnippet.category,
			subcategory: type === 'subcategory' ? id : '',
		};

		this.isSaving = true;
		vscode.postMessage({ command: "updateSnippet", snippet: dataToUpdate });
		this.isSaving = false;
	}
}

function main() {
	vscode.postMessage({ command: "requestSnippetData" });
	new SnippetStore(); // Initialize the SnippetStore instance
}

window.addEventListener("load", main);