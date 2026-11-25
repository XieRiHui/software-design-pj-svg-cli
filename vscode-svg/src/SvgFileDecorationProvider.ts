import * as vscode from "vscode";

export class SvgFileDecorationProvider
implements vscode.FileDecorationProvider {
  public provideFileDecoration(
    uri: vscode.Uri,
  ): vscode.FileDecoration | undefined {
    if (!uri.path.toLowerCase().endsWith(".svg")) {
      return undefined;
    }

    return {
      badge: "[]",
      tooltip: "SVG file",
      color: new vscode.ThemeColor("charts.blue"),
    };
  }
}
