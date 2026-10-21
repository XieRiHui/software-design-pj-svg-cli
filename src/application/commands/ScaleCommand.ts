import { EditCommand } from "../EditCommand.js";
import { type EditResult } from "../EditResult.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";

export class ScaleCommand extends EditCommand {
  public constructor(
    private readonly shapeId: string,
    private readonly factor: number,
  ) {
    super();
  }

  public override execute(document: CanvasDocument): EditResult {
    const shape = this.requireShape(document, this.shapeId);
    shape.scale(this.factor);

    return {
      kind: "scale",
      typeName: shape.typeName,
      id: shape.id,
      factor: this.factor,
    };
  }
}
