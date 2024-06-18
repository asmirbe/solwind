import {MarkdownString} from "vscode";

export function beautifyDocument(raw: string): MarkdownString {
   const escapedString = raw
      .replace(/\$\{\d\|(.*?),.*?\}/gm, "$1")
      .replace(/\$\{\d:?(.*?)\}/gm, "$1")
      .replace(/\$\d/gm, "")
      .replace(/\${TM_SELECTED_TEXT:.*?}/gm, "")  // Adjusted to remove any following text
      .replace(/\${TM_FILENAME_BASE}/gm, "");
   return new MarkdownString().appendCodeblock(escapedString, "html");
}
