import { type Editor } from "../application/Editor.js";
import { AddToCommand } from "../application/commands/AddToCommand.js";
import { BackCommand } from "../application/commands/BackCommand.js";
import { CreateCommand } from "../application/commands/CreateCommand.js";
import { DeleteCommand } from "../application/commands/DeleteCommand.js";
import { FrontCommand } from "../application/commands/FrontCommand.js";
import { GroupCommand } from "../application/commands/GroupCommand.js";
import { MoveCommand } from "../application/commands/MoveCommand.js";
import { ScaleCommand } from "../application/commands/ScaleCommand.js";
import { SetCommand } from "../application/commands/SetCommand.js";
import { UngroupCommand } from "../application/commands/UngroupCommand.js";
import { type CanvasDocument } from "../domain/CanvasDocument.js";
import { SvgReader } from "../infrastructure/SvgReader.js";
import { SvgWriter } from "../infrastructure/SvgWriter.js";
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
    private readonly svgReader = new SvgReader(),
    private readonly svgWriter = new SvgWriter(),
  ) {}

  public execute(command: ParsedCommand): string {
    switch (command.name) {
      case "help":
        return this.showHelp(command);
      case "init":
        return this.initializeDocument(command);
      case "read":
        return this.readDocument(command);
      case "save":
        return this.saveDocument(command);
      case "create":
        return this.createShape(command);
      case "delete":
        return this.deleteShape(command);
      case "move":
        return this.moveShape(command);
      case "scale":
        return this.scaleShape(command);
      case "set":
        return this.setAttribute(command);
      case "group":
        return this.groupShapes(command);
      case "ungroup":
        return this.ungroupShape(command);
      case "addto":
        return this.addToGroup(command);
      case "front":
        return this.reorderShape(command, "front");
      case "back":
        return this.reorderShape(command, "back");
      case "tree":
        return this.showTree(command);
      case "show":
        return this.showShape(command);
      case "undo":
        return this.undo(command);
      case "redo":
        return this.redo(command);
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

  private readDocument(command: ParsedCommand): string {
    this.requireArgumentCount(command, 1, "read <file.svg>");
    const filePath = command.args[0];
    if (filePath === undefined) {
      throw new EditorError("usage: read <file.svg>");
    }

    const result = this.svgReader.read(filePath);
    this.editor.openDocument(result.document, filePath);
    return this.formatter.readCompleted(
      filePath,
      result.document.elementCount,
      result.warnings,
    );
  }

  private saveDocument(command: ParsedCommand): string {
    const document = this.requireDocument();
    if (command.args.length > 1) {
      throw new EditorError("usage: save [file.svg]");
    }

    const filePath = command.args[0] ?? this.editor.filePath;
    if (filePath === undefined) {
      throw new EditorError("no file path for save");
    }

    this.svgWriter.write(document, filePath);
    this.editor.markSaved(filePath);
    return this.formatter.savedTo(
      filePath,
      document.elementCount,
    );
  }

  private createShape(command: ParsedCommand): string {
    this.requireDocument();
    if (command.args.length < 2) {
      throw new EditorError(
        "usage: create <type> <id> [params...] [in <containerId>]",
      );
    }

    const [shapeType, shapeId, ...parameters] = command.args;
    if (shapeType === undefined || shapeId === undefined) {
      throw new EditorError(
        "usage: create <type> <id> [params...] [in <containerId>]",
      );
    }

    const result = this.editor.execute(
      new CreateCommand(
        shapeType,
        shapeId,
        parameters,
        command.containerId,
      ),
    );

    return this.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  private deleteShape(command: ParsedCommand): string {
    this.requireDocument();
    this.requireArgumentCount(command, 1, "delete <id>");
    const id = command.args[0];
    if (id === undefined) {
      throw new EditorError("usage: delete <id>");
    }

    const result = this.editor.execute(new DeleteCommand(id));
    return this.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  private moveShape(command: ParsedCommand): string {
    this.requireDocument();
    this.requireArgumentCount(
      command,
      3,
      "move <id> <dx> <dy>",
    );
    const id = command.args[0];
    if (id === undefined) {
      throw new EditorError("usage: move <id> <dx> <dy>");
    }

    const dx = this.parseFiniteNumber(command.args[1], "dx");
    const dy = this.parseFiniteNumber(command.args[2], "dy");
    const result = this.editor.execute(
      new MoveCommand(id, dx, dy),
    );

    return this.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  private scaleShape(command: ParsedCommand): string {
    this.requireDocument();
    this.requireArgumentCount(
      command,
      2,
      "scale <id> <factor>",
    );
    const id = command.args[0];
    if (id === undefined) {
      throw new EditorError("usage: scale <id> <factor>");
    }

    const factor = Number(command.args[1]);
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new EditorError("scale factor must be positive");
    }

    const result = this.editor.execute(
      new ScaleCommand(id, factor),
    );

    return this.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  private setAttribute(command: ParsedCommand): string {
    this.requireDocument();
    this.requireArgumentCount(
      command,
      3,
      "set <id> <attr> <value>",
    );
    const id = command.args[0];
    const attribute = command.args[1];
    const value = command.args[2];
    if (
      id === undefined ||
      attribute === undefined ||
      value === undefined
    ) {
      throw new EditorError("usage: set <id> <attr> <value>");
    }

    const result = this.editor.execute(
      new SetCommand(id, attribute, value),
    );

    return this.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  private groupShapes(command: ParsedCommand): string {
    this.requireDocument();
    if (command.args.length < 2) {
      throw new EditorError(
        "usage: group <newGid> <id1> <id2>...",
      );
    }

    const groupId = command.args[0];
    if (groupId === undefined) {
      throw new EditorError(
        "usage: group <newGid> <id1> <id2>...",
      );
    }

    const result = this.editor.execute(
      new GroupCommand(groupId, command.args.slice(1)),
    );

    return this.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  private ungroupShape(command: ParsedCommand): string {
    this.requireDocument();
    this.requireArgumentCount(command, 1, "ungroup <gid>");
    const groupId = command.args[0];
    if (groupId === undefined) {
      throw new EditorError("usage: ungroup <gid>");
    }

    const result = this.editor.execute(
      new UngroupCommand(groupId),
    );

    return this.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  private addToGroup(command: ParsedCommand): string {
    this.requireDocument();
    this.requireArgumentCount(command, 2, "addto <gid> <id>");
    const groupId = command.args[0];
    const shapeId = command.args[1];
    if (groupId === undefined || shapeId === undefined) {
      throw new EditorError("usage: addto <gid> <id>");
    }

    const result = this.editor.execute(
      new AddToCommand(groupId, shapeId),
    );

    return this.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  private reorderShape(
    command: ParsedCommand,
    position: "front" | "back",
  ): string {
    this.requireDocument();
    this.requireArgumentCount(
      command,
      1,
      `${position} <id>`,
    );
    const shapeId = command.args[0];
    if (shapeId === undefined) {
      throw new EditorError(`usage: ${position} <id>`);
    }

    const editCommand = position === "front"
      ? new FrontCommand(shapeId)
      : new BackCommand(shapeId);
    const result = this.editor.execute(editCommand);

    return this.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  private showTree(command: ParsedCommand): string {
    const document = this.requireDocument();
    if (command.args.length > 1) {
      throw new EditorError("usage: tree [id]");
    }

    return this.formatter.tree(document, command.args[0]);
  }

  private showShape(command: ParsedCommand): string {
    const document = this.requireDocument();
    this.requireArgumentCount(command, 1, "show <id>");
    const id = command.args[0];
    if (id === undefined) {
      throw new EditorError("usage: show <id>");
    }

    return this.formatter.show(document, id);
  }

  private undo(command: ParsedCommand): string {
    this.requireDocument();
    this.requireNoArguments(command, "undo");
    const result = this.editor.undo();
    return this.formatter.editResult(
      result,
      this.requireDocument(),
      "undo",
    );
  }

  private redo(command: ParsedCommand): string {
    this.requireDocument();
    this.requireNoArguments(command, "redo");
    const result = this.editor.redo();
    return this.formatter.editResult(
      result,
      this.requireDocument(),
      "redo",
    );
  }

  private requireDocument(): CanvasDocument {
    const document = this.editor.document;
    if (document === undefined) {
      throw new EditorError(
        "no document. use 'init' or 'read' first",
      );
    }

    return document;
  }

  private requireArgumentCount(
    command: ParsedCommand,
    count: number,
    usage: string,
  ): void {
    if (command.args.length !== count) {
      throw new EditorError(`usage: ${usage}`);
    }
  }

  private requireNoArguments(
    command: ParsedCommand,
    usage: string,
  ): void {
    if (command.args.length !== 0) {
      throw new EditorError(`usage: ${usage}`);
    }
  }

  private parseFiniteNumber(
    value: string | undefined,
    attribute: string,
  ): number {
    const parsed = Number(value);
    if (
      value === undefined ||
      value.trim().length === 0 ||
      !Number.isFinite(parsed)
    ) {
      throw new EditorError(
        `invalid value for attribute: ${attribute}`,
      );
    }

    return parsed;
  }

  private rejectUnavailableCommand(command: ParsedCommand): string {
    if (!KNOWN_COMMANDS.has(command.name)) {
      throw new EditorError(`unknown command: ${command.name}`);
    }

    this.requireDocument();

    throw new EditorError(`command not implemented: ${command.name}`);
  }
}
