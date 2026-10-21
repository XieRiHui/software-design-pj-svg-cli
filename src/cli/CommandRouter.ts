import { type Editor } from "../application/Editor.js";
import { EditorError } from "../shared/EditorError.js";
import { type ParsedCommand } from "./CommandParser.js";
import { OutputFormatter } from "./OutputFormatter.js";

const KNOWN_COMMANDS = new Set([
  "init",
  "read",
  "save",
  "canvas",
  "create",
  "delete",
  "move",
  "scale",
  "set",
  "group",
  "ungroup",
  "addto",
  "front",
  "back",
  "tree",
  "show",
  "help",
  "undo",
  "redo",
]);

export class CommandRouter {
  public constructor(
    private readonly editor: Editor,
    private readonly formatter: OutputFormatter,
  ) {}

  public execute(command: ParsedCommand): string {
    switch (command.name) {
      case "help":
        return this.showHelp(command);
      case "init":
        return this.initializeDocument(command);
      default:
        return this.rejectUnavailableCommand(command);
    }
  }

  private showHelp(command: ParsedCommand): string {
    if (command.args.length > 0) {
      throw new EditorError("usage: help");
    }

    return this.formatter.help();
  }

  private initializeDocument(command: ParsedCommand): string {
    if (command.args.length === 0) {
      const canvasSize = this.editor.initialize();
      return this.formatter.canvasCreated(
        canvasSize.width,
        canvasSize.height,
      );
    }

    if (command.args.length !== 2) {
      throw new EditorError("usage: init [w] [h]");
    }

    const width = this.parseDimension(command.args[0]);
    const height = this.parseDimension(command.args[1]);
    const canvasSize = this.editor.initialize(width, height);

    return this.formatter.canvasCreated(
      canvasSize.width,
      canvasSize.height,
    );
  }

  private parseDimension(value: string | undefined): number {
    const dimension = Number(value);
    if (value === undefined || !Number.isFinite(dimension)) {
      throw new EditorError("invalid canvas size");
    }

    return dimension;
  }

  private rejectUnavailableCommand(command: ParsedCommand): string {
    if (!KNOWN_COMMANDS.has(command.name)) {
      throw new EditorError(`unknown command: ${command.name}`);
    }

    if (!this.editor.hasDocument) {
      throw new EditorError(
        "no document. use 'init' or 'read' first",
      );
    }

    throw new EditorError(`command not implemented: ${command.name}`);
  }
}
