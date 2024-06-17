import {
   languages,
   TextDocument,
   Position,
   window,
   MarkdownString,
   CompletionList,
   CompletionItemKind,
   SnippetString,
} from "vscode";
import { fetchMatchingSnippets } from "../pocketbase/pocketbase";

// Register a completion provider for HTML files
const HTMLCompletionProvider = languages.registerCompletionItemProvider(
   "html",
   {
      provideCompletionItems: async function (
         document: TextDocument,
         position: Position
      ): Promise<any> {
         const activeEditor = window.activeTextEditor;
         if (!activeEditor) return new CompletionList([], true);
         const { text } = activeEditor.document.lineAt(activeEditor.selection.active.line);

			// To be seen if necessary
         //  if (!text.includes("tw")) {
         //     return undefined;
         //  }
         try {
            const matchingSnippets = (await fetchMatchingSnippets(text.trim())) as any[];

            const completionItems = matchingSnippets.map((snippet: any) => {
               return {
                  label: snippet.label,
                  kind: CompletionItemKind.Snippet,
                  detail: snippet.name,
                  insertText: new SnippetString(snippet.insertText),
                  documentation: beautifyDocument(snippet.insertText),
               };
            });
            return new CompletionList(completionItems, true);
         } catch (error) {
            //  console.error("Error retrieving snippets:", error);
            return new CompletionList([], true);
         }
      },
   },
   "tw-"
);

function beautifyDocument(raw: string): MarkdownString {
   const escapedString = raw
      .replace(/\$\{\d\|(.*?),.*?\}/gm, "$1")
      .replace(/\$\{\d:?(.*?)\}/gm, "$1")
      .replace(/\$\d/gm, "")
      .replace(/\${TM_SELECTED_TEXT:}/gm, "")
      .replace(/\${TM_FILENAME_BASE}/gm, "");
   return new MarkdownString().appendCodeblock(escapedString, "java");
}

export default HTMLCompletionProvider;
