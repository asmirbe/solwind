# Snippet Manager Extension

The Snippet Manager Extension for Visual Studio Code allows you to create, manage, and use code snippets efficiently. Integrating with PocketBase, it provides a robust solution for handling snippets, categories, and templates.

## Features

### 1. Add Snippets
Create new snippets from selected text in the editor and save them to PocketBase with associated categories and subcategories.
- **Command**: `extension.addSnippetFromSelection`
- **Usage**: Select the desired text, right-click, and choose "Add Snippet from Selection."

### 2. Edit Snippets
Edit existing snippets, including their labels, documentation, and insert text.
- **Command**: `extension.editSnippet`
- **Usage**: Right-click on a snippet in the Snippets Tree View and choose "Edit Snippet."

### 3. Delete Snippets
Delete snippets from PocketBase.
- **Command**: `extension.deleteSnippet`
- **Usage**: Right-click on a snippet in the Snippets Tree View and choose "Delete Snippet."

### 4. Generate Files from Templates
Generate files from predefined templates stored in PocketBase.
- **Command**: `extension.generateFromTemplate`
- **Usage**: Right-click on a folder in the Explorer and choose "Generate from Template."

### 5. Snippet Insertion in HTML
Provide snippet completions in HTML files based on the current line of text.
- **Command**: Auto-completion in HTML files.
- **Usage**: Start typing in an HTML file to see snippet suggestions.

### 6. Refresh Snippets
Manually refresh the snippets from PocketBase to ensure the latest data is loaded.
- **Command**: `extension.refreshSnippets`
- **Usage**: Use the command palette (Ctrl+Shift+P) and search for "Refresh Snippets."

### 7. User Authentication
Log in and log out using PocketBase authentication to manage snippets securely.
- **Commands**:
  - `extension.login`
  - `extension.logout`
- **Usage**: Use the command palette (Ctrl+Shift+P) and search for "Login" or "Logout."

## How to Use

1. **Install the Extension**: Download and install the Snippet Manager Extension from the VS Code Marketplace.
2. **Login**: Use the command palette to log in with your PocketBase credentials.
3. **Create Snippets**: Select text in your editor, right-click, and choose "Add Snippet from Selection."
4. **Manage Snippets**: Use the Snippets Tree View to edit or delete snippets.
5. **Generate Files**: Right-click on a folder in the Explorer to generate files from templates.
6. **Use Snippets**: Start typing in an HTML file to see snippet suggestions and auto-completions.

## Requirements

- Visual Studio Code
- PocketBase for storing snippets, categories, and templates

## Extension Commands

- `extension.addSnippetFromSelection`: Add a snippet from selected text.
- `extension.editSnippet`: Edit an existing snippet.
- `extension.deleteSnippet`: Delete a snippet.
- `extension.generateFromTemplate`: Generate files from a template.
- `extension.refreshSnippets`: Refresh snippets from PocketBase.
- `extension.login`: Log in to PocketBase.
- `extension.logout`: Log out from PocketBase.

## Contributing

Feel free to contribute to this extension by submitting issues or pull requests in the [GitHub repository](#).

## License

This project is licensed under the MIT License.