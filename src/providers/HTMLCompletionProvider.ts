import {
  languages,
  TextDocument,
  Position,
  window,
  CompletionList,
  CompletionItemKind,
  SnippetString,
} from "vscode";
import { fetchMatchingSnippets } from "../pocketbase/pocketbase";

// Register a completion provider for HTML files
export const HTMLCompletionProvider = languages.registerCompletionItemProvider("html", {
  provideCompletionItems: async function (
    document: TextDocument,
    position: Position
  ): Promise<any> {
    const activeEditor = window.activeTextEditor;
    if (!activeEditor) return new CompletionList([], true);
    const { text } = activeEditor.document.lineAt(activeEditor.selection.active.line);

    try {
      const matchingSnippets = (await fetchMatchingSnippets(text.trim())) as any[];

      const completionItems = matchingSnippets.map((snippet: any) => {
        return {
          label: snippet.label,
          kind: CompletionItemKind.Snippet,
          documentation: snippet.description,
          insertText: new SnippetString(snippet.insertText),
        };
      });
      return new CompletionList(completionItems, true);
    } catch (error) {
      console.error("Error retrieving snippets:", error);
      return new CompletionList([], true);
    }
  },
});
