import { type CanvasDocument } from "../domain/CanvasDocument.js";
import { EditorError } from "../shared/EditorError.js";
import { type EditResult } from "./EditResult.js";

export interface HistoryEntry {
  readonly before: CanvasDocument;
  readonly after: CanvasDocument;
  readonly result: EditResult;
}

export class History {
  private readonly undoStack: HistoryEntry[] = [];
  private readonly redoStack: HistoryEntry[] = [];
  private enabled = false;

  public record(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    this.redoStack.length = 0;
    this.enabled = true;
  }

  public takeUndo(): HistoryEntry {
    this.assertAvailable();
    const entry = this.undoStack.pop();
    if (entry === undefined) {
      throw new EditorError("nothing to undo");
    }

    this.redoStack.push(entry);
    return entry;
  }

  public takeRedo(): HistoryEntry {
    this.assertAvailable();
    const entry = this.redoStack.pop();
    if (entry === undefined) {
      throw new EditorError("nothing to redo");
    }

    this.undoStack.push(entry);
    return entry;
  }

  public reset(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.enabled = false;
  }

  public disable(): void {
    this.enabled = false;
  }

  private assertAvailable(): void {
    if (!this.enabled) {
      throw new EditorError("undo not allowed after io command");
    }
  }
}
