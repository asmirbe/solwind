import { window } from "vscode";
export const editSnippetPrompt = async ({
  message,
  error = "An error occurred",
  value,
}: {
  message: string;
  error?: string;
  value: string;
}) => {
  const result = await window.showInputBox({
    prompt: message,
    value: value,
    validateInput: (value: any) => {
      if (!value) {
        return error;
      }
      return null;
    },
  });

  return result;
};