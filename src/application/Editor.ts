import {
  CanvasDocument,
  type CanvasSize,
} from "../domain/CanvasDocument.js";

const DEFAULT_CANVAS_SIZE: CanvasSize = Object.freeze({
  width: 800,
  height: 600,
});

export class Editor {
  private currentDocument: CanvasDocument | undefined;

  public initialize(
    width = DEFAULT_CANVAS_SIZE.width,
    height = DEFAULT_CANVAS_SIZE.height,
  ): CanvasSize {
    const document = new CanvasDocument(width, height);
    this.currentDocument = document;
    return document.canvasSize;
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
}
