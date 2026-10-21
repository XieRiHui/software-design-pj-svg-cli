import { EditorError } from "../shared/EditorError.js";

export interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

const DEFAULT_CANVAS_SIZE: CanvasSize = Object.freeze({
  width: 800,
  height: 600,
});

export class Editor {
  private currentCanvas: CanvasSize | undefined;

  public initialize(
    width = DEFAULT_CANVAS_SIZE.width,
    height = DEFAULT_CANVAS_SIZE.height,
  ): CanvasSize {
    this.assertValidSize(width, height);
    this.currentCanvas = Object.freeze({ width, height });
    return this.currentCanvas;
  }

  public get hasDocument(): boolean {
    return this.currentCanvas !== undefined;
  }

  public get canvasSize(): CanvasSize | undefined {
    return this.currentCanvas;
  }

  private assertValidSize(width: number, height: number): void {
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new EditorError("invalid canvas size");
    }
  }
}
