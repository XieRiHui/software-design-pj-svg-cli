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
    const previousParent = document.getParent(this.shapeId);
    const previousParentId = previousParent?.id ?? null;
    document.moveShape(this.shapeId, this.groupId);
    const group = document.getShape(this.groupId);

    return {
      kind: "addto",
      typeName: shape.typeName,
      id: shape.id,
      groupId: this.groupId,
      previousParentId,
      ...(group === undefined ? {} : { groupTypeName: group.typeName }),
      ...(previousParent === undefined
        ? {}
        : { previousParentTypeName: previousParent.typeName }),
    };
  }
}
