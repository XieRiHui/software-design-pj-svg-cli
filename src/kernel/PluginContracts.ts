import {
  type Command,
  type DirectoryReader,
} from "./CommandContracts.js";
import { type CanvasDocument } from "../domain/CanvasDocument.js";
import { type Shape } from "../domain/Shape.js";

export interface PluginContributions {
  readonly shapes?: readonly string[];
  readonly commands?: readonly string[];
  readonly decorators?: readonly string[];
  readonly attributes?: readonly string[];
}

export type PluginOptions = Readonly<Record<string, unknown>>;

export interface ShapeProvider {
  readonly name: string;
  readonly typeName: string;
  readonly restorePriority: number;

  canRestore(
    elementName: string,
    attributes: ReadonlyMap<string, string>,
  ): boolean;

  create(id: string, args: readonly string[]): Shape;

  restore(
    id: string,
    attributes: ReadonlyMap<string, string>,
    textContent: string,
  ): Shape;

  finalizeRestored?(shape: Shape): void;
}

export interface TreeDecorationContext {
  readonly document: CanvasDocument;
  readonly shape: Shape | undefined;
  readonly isRoot: boolean;
  readonly savedDocument: CanvasDocument | undefined;
  readonly saveSequence: number;
}

export interface TreeDecorator {
  readonly name: string;
  decorate(context: TreeDecorationContext): readonly string[];
}

export interface AttributeApplyContext {
  readonly document: CanvasDocument;
  readonly shape: Shape;
  readonly attribute: string;
  readonly value: string;
}

export interface AttributeHandlerResult {
  readonly message: string;
  readonly undoMessage?: string;
  readonly redoMessage?: string;
}

export interface AttributeHandler {
  readonly name: string;

  handles(shape: Shape, attribute: string): boolean;

  apply(
    context: AttributeApplyContext,
  ): AttributeHandlerResult | void;
}

export interface PluginActivationContext {
  readonly options: PluginOptions;
  readonly directories: DirectoryReader;

  registerShape(provider: ShapeProvider): void;
  registerCommand(command: Command): void;
  registerTreeDecorator(decorator: TreeDecorator): void;
  registerAttributeHandler(handler: AttributeHandler): void;
}

export interface PluginDefinition {
  readonly name: string;
  readonly contributes: PluginContributions;
  activate(context: PluginActivationContext): void;
}

export interface PluginRegistrationSnapshot {
  readonly shapes: readonly ShapeProvider[];
  readonly commands: readonly Command[];
  readonly decorators: readonly TreeDecorator[];
  readonly attributes: readonly AttributeHandler[];
}
