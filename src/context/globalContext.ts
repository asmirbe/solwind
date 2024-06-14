import { ExtensionContext } from "vscode";

let globalContext: ExtensionContext | null = null;

export function setGlobalContext(context: ExtensionContext) {
  globalContext = context;
}

export function getGlobalContext(): ExtensionContext | null {
  return globalContext;
}
