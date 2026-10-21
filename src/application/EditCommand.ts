import { type CanvasDocument } from "../domain/CanvasDocument.js";
import { type Shape } from "../domain/Shape.js";
import { EditorError } from "../shared/EditorError.js";
import { type EditResult } from "./EditResult.js";

export abstract class EditCommand {
  public abstract execute(document: CanvasDocument): EditResult;

  protected requireShape(
    document: CanvasDocument,
    id: string,
  ): Shape {
    const shape = document.getShape(id);
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }

    return shape;
  }
}
