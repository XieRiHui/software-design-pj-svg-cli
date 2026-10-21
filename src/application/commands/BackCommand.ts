import { EditCommand } from "../EditCommand.js";
import { type EditResult } from "../EditResult.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";

export class BackCommand extends EditCommand {
  public constructor(private readonly shapeId: string) {
    super();
  }

  public override execute(document: CanvasDocument): EditResult {
    const shape = this.requireShape(document, this.shapeId);
    document.moveToBack(this.shapeId);

    return {
      kind: "reorder",
      typeName: shape.typeName,
      id: shape.id,
      position: "back",
    };
  }
}
