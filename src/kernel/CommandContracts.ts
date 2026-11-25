import {
  type EditCommand,
  type EditDirection,
  type EditResult,
} from "./EditContracts.js";
import {
  type AttributeHandler,
  type ShapeProvider,
  type TreeDecorator,
} from "./PluginContracts.js";
import { type CanvasDocument } from "../domain/CanvasDocument.js";
import { type Shape } from "../domain/Shape.js";

export interface CommandToken {
  readonly value: string;
  readonly quoted: boolean;
}

export interface ParsedCommand {
  readonly name: string;
  readonly args: readonly CommandToken[];
}

export interface CommandHelp {
  readonly section: string;
  readonly sectionOrder: number;
  readonly line: string;
  readonly order: number;
}

export interface Command {
  readonly name: string;
  readonly help: CommandHelp;

  execute(
    args: readonly CommandToken[],
    context: CommandExecutionContext,
  ): string;
}

export interface DirectoryEntry {
  readonly name: string;
  readonly kind: "directory" | "file" | "symlink" | "other";
}

export interface DirectoryReader {
  list(path: string): readonly DirectoryEntry[];
}

export interface SvgReadResult {
  readonly document: CanvasDocument;
  readonly warnings: readonly string[];
}

export interface SvgIoPort {
  read(filePath: string): SvgReadResult;
  write(document: CanvasDocument, filePath: string): void;
}

export interface EditorPort {
  readonly hasDocument: boolean;
  readonly canvasSize:
    | { readonly width: number; readonly height: number }
    | undefined;
  readonly document: CanvasDocument | undefined;
  readonly filePath: string | undefined;
  readonly savedDocument: CanvasDocument | undefined;
  readonly saveSequence: number;

  initialize(width?: number, height?: number): {
    readonly width: number;
    readonly height: number;
  };
  openDocument(document: CanvasDocument, filePath: string): void;
  markSaved(filePath: string): void;
  resizeCanvas(width: number, height: number): {
    readonly width: number;
    readonly height: number;
  };
  execute(command: EditCommand): EditResult;
  undo(): EditResult;
  redo(): EditResult;
}

export interface ShapeProviderCatalog {
  getForCreate(typeName: string): ShapeProvider | undefined;
  getForRestore(
    elementName: string,
    attributes: ReadonlyMap<string, string>,
  ): ShapeProvider | undefined;
  all(): readonly ShapeProvider[];
}

export interface AttributeHandlerCatalog {
  findApplicable(shape: Shape, attribute: string): readonly AttributeHandler[];
  all(): readonly AttributeHandler[];
}

export interface CommandCatalog {
  get(name: string): Command | undefined;
  all(): readonly Command[];
}

export interface CommandOutput {
  canvasCreated(width: number, height: number): string;
  canvasInfo(width: number, height: number): string;
  canvasResized(width: number, height: number): string;
  readCompleted(
    filePath: string,
    elementCount: number,
    warnings: readonly string[],
  ): string;
  savedTo(filePath: string, elementCount: number): string;
  help(commands: readonly Command[]): string;
  editResult(
    result: EditResult,
    document: CanvasDocument,
    direction: EditDirection,
  ): string;
  tree(
    document: CanvasDocument,
    decorators: readonly TreeDecorator[],
    rootId?: string,
    savedDocument?: CanvasDocument,
    saveSequence?: number,
  ): string;
  show(document: CanvasDocument, id: string): string;
  error(message: string): string;
}

export interface CommandExecutionContext {
  readonly editor: EditorPort;
  readonly formatter: CommandOutput;
  readonly svg: SvgIoPort;
  readonly shapes: ShapeProviderCatalog;
  readonly attributes: AttributeHandlerCatalog;
  readonly commands: CommandCatalog;
  readonly treeDecorators: readonly TreeDecorator[];
  readonly directories: DirectoryReader;
  readonly workingDirectory: string;
}
