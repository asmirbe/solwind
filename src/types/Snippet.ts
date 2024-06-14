import { Category, Subcategory } from './Category';

export type Snippet = {
	id: string;
	name: string;
	label: string;
	description: string;
	insertText: string;
	category: string;
	subcategory: string;
}

export type Snippets = {
	snippets: Snippet[];
	categories: Category[];
	subcategories: Subcategory[];
}



