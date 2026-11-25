import {
  type CommandExecutionContext,
  type CommandToken,
} from "../../kernel/CommandContracts.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";
import { AddToCommand } from "../../application/commands/AddToCommand.js";
import { BackCommand } from "../../application/commands/BackCommand.js";
import { CreateCommand } from "../../application/commands/CreateCommand.js";
import { DeleteCommand } from "../../application/commands/DeleteCommand.js";
import { FrontCommand } from "../../application/commands/FrontCommand.js";
import { GroupCommand } from "../../application/commands/GroupCommand.js";
import { MoveCommand } from "../../application/commands/MoveCommand.js";
import { ScaleCommand } from "../../application/commands/ScaleCommand.js";
import { SetCommand } from "../../application/commands/SetCommand.js";
import { UngroupCommand } from "../../application/commands/UngroupCommand.js";
import { EditorError } from "../../shared/EditorError.js";

export class BuiltinCommandService {
  public constructor(
    private readonly context: CommandExecutionContext,
  ) {}

  public help(args: readonly CommandToken[]): string {
    this.requireNoArguments(args, "help");
    return this.context.formatter.help(this.context.commands.all());
  }

  public init(args: readonly CommandToken[]): string {
    const values = this.values(args);
    if (values.length === 0) {
      const canvasSize = this.context.editor.initialize();
      return this.context.formatter.canvasCreated(
        canvasSize.width,
        canvasSize.height,
      );
    }

    if (values.length !== 2) {
      throw new EditorError("usage: init [w] [h]");
    }

    const width = this.parseDimension(values[0]);
    const height = this.parseDimension(values[1]);
    const canvasSize = this.context.editor.initialize(width, height);
    return this.context.formatter.canvasCreated(
      canvasSize.width,
      canvasSize.height,
    );
  }

  public read(args: readonly CommandToken[]): string {
    this.requireArgumentCount(args, 1, "read <file.svg>");
    const filePath = this.valueAt(args, 0);
    const result = this.context.svg.read(filePath);
    this.context.editor.openDocument(result.document, filePath);
    return this.context.formatter.readCompleted(
      filePath,
      result.document.elementCount,
      result.warnings,
    );
  }

  public save(args: readonly CommandToken[]): string {
    const document = this.requireDocument();
    if (args.length > 1) {
      throw new EditorError("usage: save [file.svg]");
    }

    const filePath = args[0]?.value ?? this.context.editor.filePath;
    if (filePath === undefined) {
      throw new EditorError("no file path for save");
    }

    this.context.svg.write(document, filePath);
    this.context.editor.markSaved(filePath);
    return this.context.formatter.savedTo(
      filePath,
      document.elementCount,
    );
  }

  public canvas(args: readonly CommandToken[]): string {
    const document = this.requireDocument();
    const values = this.values(args);
    if (values.length === 0) {
      return this.context.formatter.canvasInfo(
        document.width,
        document.height,
      );
    }

    if (values.length !== 2) {
      throw new EditorError("usage: canvas [w] [h]");
    }

    const width = this.parseDimension(values[0]);
    const height = this.parseDimension(values[1]);
    const canvasSize = this.context.editor.resizeCanvas(width, height);
    return this.context.formatter.canvasResized(
      canvasSize.width,
      canvasSize.height,
    );
  }

  public create(args: readonly CommandToken[]): string {
    this.requireDocument();
    const parsed = this.parseCreateArguments(args);

    const result = this.context.editor.execute(
      new CreateCommand(
        parsed.shapeType,
        parsed.shapeId,
        parsed.parameters,
        parsed.containerId,
        this.context.shapes,
      ),
    );

    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  public delete(args: readonly CommandToken[]): string {
    this.requireDocument();
    this.requireArgumentCount(args, 1, "delete <id>");
    const id = this.valueAt(args, 0);
    const result = this.context.editor.execute(new DeleteCommand(id));
    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  public move(args: readonly CommandToken[]): string {
    this.requireDocument();
    this.requireArgumentCount(args, 3, "move <id> <dx> <dy>");
    const id = this.valueAt(args, 0);
    const dx = this.parseFiniteNumber(this.valueAt(args, 1), "dx");
    const dy = this.parseFiniteNumber(this.valueAt(args, 2), "dy");
    const result = this.context.editor.execute(
      new MoveCommand(id, dx, dy),
    );
    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  public scale(args: readonly CommandToken[]): string {
    this.requireDocument();
    this.requireArgumentCount(args, 2, "scale <id> <factor>");
    const id = this.valueAt(args, 0);
    const factor = Number(this.valueAt(args, 1));
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new EditorError("scale factor must be positive");
    }

    const result = this.context.editor.execute(
      new ScaleCommand(id, factor),
    );
    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  public set(args: readonly CommandToken[]): string {
    this.requireDocument();
    this.requireArgumentCount(args, 3, "set <id> <attr> <value>");
    const id = this.valueAt(args, 0);
    const attribute = this.valueAt(args, 1);
    const value = this.valueAt(args, 2);
    const result = this.context.editor.execute(
      new SetCommand(
        id,
        attribute,
        value,
        this.context.attributes,
      ),
    );
    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  public group(args: readonly CommandToken[]): string {
    this.requireDocument();
    const values = this.values(args);
    if (values.length < 2) {
      throw new EditorError(
        "usage: group <newGid> <id1> <id2>...",
      );
    }

    const groupId = values[0];
    if (groupId === undefined) {
      throw new EditorError(
        "usage: group <newGid> <id1> <id2>...",
      );
    }

    const result = this.context.editor.execute(
      new GroupCommand(groupId, values.slice(1)),
    );
    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  public ungroup(args: readonly CommandToken[]): string {
    this.requireDocument();
    this.requireArgumentCount(args, 1, "ungroup <gid>");
    const groupId = this.valueAt(args, 0);
    const result = this.context.editor.execute(
      new UngroupCommand(groupId),
    );
    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  public addto(args: readonly CommandToken[]): string {
    this.requireDocument();
    this.requireArgumentCount(args, 2, "addto <gid> <id>");
    const groupId = this.valueAt(args, 0);
    const shapeId = this.valueAt(args, 1);
    const result = this.context.editor.execute(
      new AddToCommand(groupId, shapeId),
    );
    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  public front(args: readonly CommandToken[]): string {
    this.requireDocument();
    this.requireArgumentCount(args, 1, "front <id>");
    const shapeId = this.valueAt(args, 0);
    const result = this.context.editor.execute(
      new FrontCommand(shapeId),
    );
    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  public back(args: readonly CommandToken[]): string {
    this.requireDocument();
    this.requireArgumentCount(args, 1, "back <id>");
    const shapeId = this.valueAt(args, 0);
    const result = this.context.editor.execute(
      new BackCommand(shapeId),
    );
    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "execute",
    );
  }

  public tree(args: readonly CommandToken[]): string {
    const document = this.requireDocument();
    if (args.length > 1) {
      throw new EditorError("usage: tree [id]");
    }

    return this.context.formatter.tree(
      document,
      this.context.treeDecorators,
      args[0]?.value,
      this.context.editor.savedDocument,
      this.context.editor.saveSequence,
    );
  }

  public show(args: readonly CommandToken[]): string {
    const document = this.requireDocument();
    this.requireArgumentCount(args, 1, "show <id>");
    return this.context.formatter.show(
      document,
      this.valueAt(args, 0),
    );
  }

  public undo(args: readonly CommandToken[]): string {
    this.requireDocument();
    this.requireNoArguments(args, "undo");
    const result = this.context.editor.undo();
    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "undo",
    );
  }

  public redo(args: readonly CommandToken[]): string {
    this.requireDocument();
    this.requireNoArguments(args, "redo");
    const result = this.context.editor.redo();
    return this.context.formatter.editResult(
      result,
      this.requireDocument(),
      "redo",
    );
  }

  private parseCreateArguments(args: readonly CommandToken[]): {
    readonly shapeType: string;
    readonly shapeId: string;
    readonly parameters: readonly string[];
    readonly containerId: string | null;
  } {
    const remaining = [...args];
    let containerId: string | null = null;
    const containerKeyword = remaining.at(-2);
    const containerToken = remaining.at(-1);

    if (
      containerKeyword?.value === "in" &&
      !containerKeyword.quoted &&
      containerToken !== undefined
    ) {
      containerId = containerToken.value;
      remaining.splice(-2, 2);
    } else if (
      containerToken?.value === "in" &&
      !containerToken.quoted
    ) {
      throw new EditorError(
        "create requires a container id after 'in'",
      );
    }

    if (remaining.length < 2) {
      throw new EditorError(
        "usage: create <type> <id> [params...] [in <containerId>]",
      );
    }

    const shapeType = remaining[0]?.value;
    const shapeId = remaining[1]?.value;
    if (shapeType === undefined || shapeId === undefined) {
      throw new EditorError(
        "usage: create <type> <id> [params...] [in <containerId>]",
      );
    }

    return {
      shapeType,
      shapeId,
      parameters: remaining.slice(2).map((token) => token.value),
      containerId,
    };
  }

  private requireDocument(): CanvasDocument {
    const document = this.context.editor.document;
    if (document === undefined) {
      throw new EditorError(
        "no document. use 'init' or 'read' first",
      );
    }

    return document;
  }

  private requireArgumentCount(
    args: readonly CommandToken[],
    count: number,
    usage: string,
  ): void {
    if (args.length !== count) {
      throw new EditorError(`usage: ${usage}`);
    }
  }

  private requireNoArguments(
    args: readonly CommandToken[],
    usage: string,
  ): void {
    if (args.length !== 0) {
      throw new EditorError(`usage: ${usage}`);
    }
  }

  private valueAt(
    args: readonly CommandToken[],
    index: number,
  ): string {
    const value = args[index]?.value;
    if (value === undefined) {
      throw new EditorError("missing command argument");
    }

    return value;
  }

  private values(args: readonly CommandToken[]): readonly string[] {
    return args.map((token) => token.value);
  }

  private parseDimension(value: string | undefined): number {
    const dimension = Number(value);
    if (value === undefined || !Number.isFinite(dimension)) {
      throw new EditorError("invalid canvas size");
    }

    return dimension;
  }

  private parseFiniteNumber(
    value: string,
    attribute: string,
  ): number {
    const parsed = Number(value);
    if (value.trim().length === 0 || !Number.isFinite(parsed)) {
      throw new EditorError(
        `invalid value for attribute: ${attribute}`,
      );
    }

    return parsed;
  }
}
