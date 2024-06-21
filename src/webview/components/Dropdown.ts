type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category: string };

export default class Dropdown extends HTMLElement {
	label: string;
	name: string;
	dataCategories: Category[];
	dataSubcategories: Subcategory[];
	openedSnippet: { category: string; subcategory: string };

	constructor() {
		 super();
		 this.label = this.getAttribute("label") || "Category";
		 this.name = this.getAttribute("name") || "category";
		 this.dataCategories = JSON.parse(this.getAttribute("data-categories") || "[]");
		 this.dataSubcategories = JSON.parse(this.getAttribute("data-subcategories") || "[]");
		 this.openedSnippet = { category: '', subcategory: '' };

		 this.attachShadow({ mode: "open" });
	}

	connectedCallback() {
		 if (!this.shadowRoot) {
			  console.error('Shadow root is not available');
			  return;
		 }

		 this.shadowRoot.innerHTML = /*html*/ `
			  <style>
					/* Add your styles here */
			  </style>
			  <div>
					<label for="${this.name}">${this.label}</label>
					<select name="${this.name}" id="${this.name}">
						 <option value="">--Please choose an option--</option>
					</select>
					<select name="subcategory" id="subcategory">
						 <option value="">--Please choose an option--</option>
					</select>
			  </div>
		 `;

		 this.populateDropdowns();
	}

	static get observedAttributes() {
		 return ['data-categories', 'data-subcategories', 'opened-snippet'];
	}

	attributeChangedCallback(name: string, oldValue: any, newValue: any) {
		 if (name === 'data-categories' || name === 'data-subcategories') {
			  this[name] = JSON.parse(newValue);
			  this.populateDropdowns();
		 } else if (name === 'opened-snippet') {
			  this.openedSnippet = JSON.parse(newValue);
			  this.populateDropdowns();
		 }
	}

	populateDropdowns() {
		 const categoryDropdown = this.shadowRoot?.getElementById(this.name) as HTMLSelectElement;
		 const subcategoryDropdown = this.shadowRoot?.getElementById("subcategory") as HTMLSelectElement;

		 if (!categoryDropdown || !subcategoryDropdown) {
			  console.error('Dropdown elements are not available');
			  return;
		 }

		 categoryDropdown.innerHTML = "";
		 subcategoryDropdown.innerHTML = "";

		 this.dataCategories.forEach((category: Category) => {
			  const option = document.createElement("option") as HTMLOptionElement;
			  option.value = category.id;
			  option.textContent = this.capitalizeFirstLetter(category.name);
			  categoryDropdown.appendChild(option);
		 });

		 if (this.openedSnippet.category) {
			  categoryDropdown.value = this.openedSnippet.category;
		 }

		 this.filterAndPopulateSubcategories(this.openedSnippet.category);

		 categoryDropdown.addEventListener("change", (event) => {
			  const selectedCategoryId = (event.target as HTMLSelectElement).value;
			  this.filterAndPopulateSubcategories(selectedCategoryId);
			  this.dispatchEvent(new CustomEvent('category-change', { detail: selectedCategoryId }));
		 });
	}

	filterAndPopulateSubcategories(categoryId: string) {
		 const subcategoryDropdown = this.shadowRoot?.getElementById("subcategory") as HTMLSelectElement;

		 if (!subcategoryDropdown) {
			  console.error('Subcategory dropdown element is not available');
			  return;
		 }

		 subcategoryDropdown.innerHTML = "";

		 const filteredSubcategories = this.dataSubcategories.filter(
			  (subcategory: Subcategory) => subcategory.category === categoryId
		 );

		 filteredSubcategories.forEach((subcategory: Subcategory) => {
			  const option = document.createElement("option") as HTMLOptionElement;
			  option.value = subcategory.id;
			  option.textContent = this.capitalizeFirstLetter(subcategory.name);
			  subcategoryDropdown.appendChild(option);
		 });

		 if (this.openedSnippet.subcategory) {
			  subcategoryDropdown.value = this.openedSnippet.subcategory;
		 }

		 subcategoryDropdown.addEventListener("change", (event) => {
			  const selectedSubcategoryId = (event.target as HTMLSelectElement).value;
			  this.dispatchEvent(new CustomEvent('subcategory-change', { detail: selectedSubcategoryId }));
		 });
	}

	capitalizeFirstLetter(string: string) {
		 return string.charAt(0).toUpperCase() + string.slice(1);
	}
}
