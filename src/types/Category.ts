export interface Category {
   id: string;
   name: string;
}

export interface Subcategory {
   id: string;
   name: string;
   category: string; // Assuming subcategories have a reference to a category
}
