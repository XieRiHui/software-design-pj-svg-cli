import * as vscode from "vscode";

import { SvgDocumentSymbolProvider } from "./SvgDocumentSymbolProvider.js";
import { SvgFileDecorationProvider } from "./SvgFileDecorationProvider.js";
import { SvgOutlineHighlighter } from "./SvgOutlineHighlighter.js";

export function activate(context: vscode.ExtensionContext): void {
  const decorationProvider = new SvgFileDecorationProvider();
  const outlineHighlighter = new SvgOutlineHighlighter();
  const symbols = vscode.languages.registerDocumentSymbolProvider(
    { language: "svg", scheme: "file" },
    new SvgDocumentSymbolProvider(),
    { label: "SVG elements" },
  );
  const decorations = vscode.window.registerFileDecorationProvider(
    decorationProvider,
  );
  const watcher = vscode.workspace.createFileSystemWatcher("**/*.svg");
  const refresh = vscode.window.createOutputChannel("SVG file decorations");

  context.subscriptions.push(
    symbols,
    decorations,
    watcher,
    refresh,
    watcher.onDidCreate(() => {
      refresh.appendLine("SVG decoration refreshed");
    }),
    watcher.onDidChange(() => {
      refresh.appendLine("SVG decoration refreshed");
    }),
    watcher.onDidDelete(() => {
      refresh.appendLine("SVG decoration refreshed");
    }),
    outlineHighlighter,
  );
}

export function deactivate(): void {
  // VSCode disposes registrations through ExtensionContext subscriptions.
}
