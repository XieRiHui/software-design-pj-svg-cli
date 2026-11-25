import {
  CanvasDocument,
  type CanvasSize,
} from "../domain/CanvasDocument.js";
import { EditorError } from "../shared/EditorError.js";
import { type EditCommand } from "./EditCommand.js";
import { type EditResult } from "./EditResult.js";
import { History } from "./History.js";
import { type EditorPort } from "../kernel/CommandContracts.js";

const DEFAULT_CANVAS_SIZE: CanvasSize = Object.freeze({
  width: 800,
  height: 600,
});

export class Editor implements EditorPort {
  private currentDocument: CanvasDocument | undefined;
  private currentFilePath: string | undefined;
  private cleanDocument: CanvasDocument | undefined;
  private currentSaveSequence = 0;
  private readonly history = new History();

  public initialize(
    width = DEFAULT_CANVAS_SIZE.width,
    height = DEFAULT_CANVAS_SIZE.height,
  ): CanvasSize {
    const document = new CanvasDocument(width, height);
    this.currentDocument = document;
    this.currentFilePath = undefined;
    this.cleanDocument = undefined;
    this.currentSaveSequence += 1;
    this.history.reset();
    return document.canvasSize;
  }

  public openDocument(
    document: CanvasDocument,
    filePath: string,
  ): void {
    this.currentDocument = document;
    this.currentFilePath = filePath;
    this.cleanDocument = document.clone();
    this.currentSaveSequence += 1;
    this.history.reset();
  }

  public markSaved(filePath: string): void {
    this.requireDocument();
    this.currentFilePath = filePath;
    this.cleanDocument = this.requireDocument().clone();
    this.currentSaveSequence += 1;
    this.history.disable();
  }

  public resizeCanvas(width: number, height: number): CanvasSize {
    const document = this.requireDocument();
    const canvasSize = document.resize(width, height);
    this.history.reset();
    return canvasSize;
  }

  public execute(command: EditCommand): EditResult {
    const document = this.requireDocument();
    const before = document.clone();

    try {
      const result = command.execute(document);
      const after = document.clone();
      this.history.record({ before, after, result });
      return result;
    } catch (error) {
      this.currentDocument = before;
      throw error;
    }
  }

  public undo(): EditResult {
    this.requireDocument();
    const entry = this.history.takeUndo();
    this.currentDocument = entry.before.clone();
    return entry.result;
  }

  public redo(): EditResult {
    this.requireDocument();
    const entry = this.history.takeRedo();
    this.currentDocument = entry.after.clone();
    return entry.result;
  }

  public get hasDocument(): boolean {
    return this.currentDocument !== undefined;
  }

  public get canvasSize(): CanvasSize | undefined {
    return this.currentDocument?.canvasSize;
  }

  public get document(): CanvasDocument | undefined {
    return this.currentDocument;
  }

  public get filePath(): string | undefined {
    return this.currentFilePath;
  }

  public get savedDocument(): CanvasDocument | undefined {
    return this.cleanDocument?.clone();
  }

  public get saveSequence(): number {
    return this.currentSaveSequence;
  }

  private requireDocument(): CanvasDocument {
    if (this.currentDocument === undefined) {
      throw new EditorError(
        "no document. use 'init' or 'read' first",
      );
    }

    return this.currentDocument;
  }
}
