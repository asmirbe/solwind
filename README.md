# Solwind Snippets VSCode Extension

The Solwind Snippets extension for Visual Studio Code enhances your coding experience by providing features for managing code snippets, categories, and subcategories. It includes commands for creating, renaming, and deleting snippets, categories, and subcategories, as well as generating templates and providing autocompletion for HTML files.

## Features

### Snippet Management

- **Create Snippet from Selection**: Create a new snippet from the selected code in the active editor.
- **Delete Snippet**: Delete an existing snippet.
- **Show Snippet Detail View**: Render a webview to display detailed information about a selected snippet.
- **Refresh Snippets**: Refresh the snippets list to reflect the latest changes.

### Category Management

- **Add Category**: Add a new category.
- **Rename Category**: Rename an existing category.
- **Delete Category**: Delete an existing category.

### Subcategory Management

- **Add Subcategory**: Add a new subcategory under a specified category.
- **Rename Subcategory**: Rename an existing subcategory.
- **Delete Subcategory**: Delete an existing subcategory.

### Template Management

- **Generate Template**: Generate an HTML template file in the specified folder.

### Autocompletion

- **HTML Snippet Autocompletion**: Provide completion items for HTML files based on matching snippets.

## Usage

### Commands

- `solwind.addSnippetFromSelection`: Create a new snippet from the selected code in the active editor.
- `solwind.deleteSnippet`: Delete an existing snippet.
- `solwind.showSnippetDetailView`: Show the detail view of a selected snippet.
- `solwind.refreshSnippets`: Refresh the snippets list.
- `solwind.addCategory`: Add a new category.
- `solwind.renameCategory`: Rename an existing category.
- `solwind.deleteCategory`: Delete an existing category.
- `solwind.addSubcategory`: Add a new subcategory under a specified category.
- `solwind.renameSubcategory`: Rename an existing subcategory.
- `solwind.deleteSubcategory`: Delete an existing subcategory.
- `solwind.generateFromTemplate`: Generate an HTML template file in the specified folder.

### Installation

1. Clone the repository or download the source code.
2. Open the source code folder in Visual Studio Code.
3. Run `npm install` to install the dependencies.
4. Press `F5` to launch the extension in a new VSCode window.

### Contribution

Feel free to open issues or submit pull requests for any improvements or bug fixes.

## Development

### Prerequisites

- Node.js
- Visual Studio Code

### Setup

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Open the project in Visual Studio Code.
4. Press `F5` to start debugging the extension.

## License

This project is licensed under the MIT License.

---

## Code Structure

### Files and Directories

- `src/extension.ts`: Main entry point for the extension.
- `src/pocketbase/pocketbase.ts`: Handles interactions with PocketBase.
- `src/providers/SnippetsDataProvider.ts`: Provides data for the snippets tree view.
- `src/utilities/baseHTML.ts`: Contains base HTML template.
- `src/utilities/prompts.ts`: Utility functions for user prompts.
- `src/utilities/stringUtils.ts`: Utility functions for string formatting.

## Acknowledgements

This extension is powered by PocketBase and built with the support of the Visual Studio Code extension API.

