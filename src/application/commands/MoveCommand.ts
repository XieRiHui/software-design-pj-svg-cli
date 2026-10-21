import { EditCommand } from "../EditCommand.js";
import { type EditResult } from "../EditResult.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";

export class MoveCommand extends EditCommand {
  public constructor(
    private readonly shapeId: string,
    private readonly dx: number,
    private readonly dy: number,
  ) {
    super();
  }

  public override execute(document: CanvasDocument): EditResult {
    const shape = this.requireShape(document, this.shapeId);
    shape.move(this.dx, this.dy);

    return {
      kind: "move",
      typeName: shape.typeName,
      id: shape.id,
      dx: this.dx,
      dy: this.dy,
    };
  }
}
