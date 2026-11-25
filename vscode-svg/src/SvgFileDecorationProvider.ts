import * as vscode from "vscode";

import {
  isSvgDecorationCandidate,
  shouldDecorateSvg,
} from "./svgFileDecorationPolicy.js";

export class SvgFileDecorationProvider
implements vscode.FileDecorationProvider {
  private readonly changeEmitter =
    new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  public readonly onDidChangeFileDecorations = this.changeEmitter.event;

  public async provideFileDecoration(
    uri: vscode.Uri,
  ): Promise<vscode.FileDecoration | undefined> {
    if (!isSvgDecorationCandidate(uri.path)) {
      return undefined;
    }

    let isDirectory = false;
    try {
      const metadata = await vscode.workspace.fs.stat(uri);
      isDirectory = (metadata.type & vscode.FileType.Directory) !== 0;
    } catch {
      return undefined;
    }

    if (!shouldDecorateSvg(uri.path, isDirectory)) {
      return undefined;
    }

    return {
      badge: "[]",
      tooltip: "SVG file",
      color: new vscode.ThemeColor("charts.blue"),
    };
  }

  public refresh(): void {
    this.changeEmitter.fire(undefined);
  }

  public dispose(): void {
    this.changeEmitter.dispose();
  }
}
