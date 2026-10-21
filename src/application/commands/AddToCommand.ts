import { EditCommand } from "../EditCommand.js";
import { type EditResult } from "../EditResult.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";

export class AddToCommand extends EditCommand {
  public constructor(
    private readonly groupId: string,
    private readonly shapeId: string,
  ) {
    super();
  }

  public override execute(document: CanvasDocument): EditResult {
    const shape = this.requireShape(document, this.shapeId);
    const previousParentId = document.getParent(this.shapeId)?.id ?? null;
    document.moveShape(this.shapeId, this.groupId);

    return {
      kind: "addto",
      typeName: shape.typeName,
      id: shape.id,
      groupId: this.groupId,
      previousParentId,
    };
  }
}
