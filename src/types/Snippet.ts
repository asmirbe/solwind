import { Category, Subcategory } from './Category';

export type Snippet = {
	id: string;
	label: string;
	documentation: string;
	insertText: string;
	tooltip: string;
	category: string;
	subcategory: string;
}

export type Snippets = {
	snippets: Snippet[];
	categories: Category[];
	subcategories: Subcategory[];
}



