import { EditCommand } from "../EditCommand.js";
import { type EditResult } from "../EditResult.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";

export class DeleteCommand extends EditCommand {
  public constructor(private readonly shapeId: string) {
    super();
  }

  public override execute(document: CanvasDocument): EditResult {
    const shape = this.requireShape(document, this.shapeId);
    const parent = document.getParent(this.shapeId);
    const parentId = parent?.id ?? null;
    document.removeShape(this.shapeId);

    return {
      kind: "delete",
      typeName: shape.typeName,
      id: shape.id,
      parentId,
      ...(parent === undefined
        ? {}
        : { parentTypeName: parent.typeName }),
    };
  }
}
