export interface Category {
	children: any;
   id: string;
   name: string;
}

export interface Subcategory {
   id: string;
   name: string;
   category: string; // Assuming subcategories have a reference to a category
}

export interface DataCategories {
	categories: any[];
	subcategories: any[];
}