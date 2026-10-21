import { EditCommand } from "../EditCommand.js";
import { type EditResult } from "../EditResult.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";

export class SetCommand extends EditCommand {
  public constructor(
    private readonly shapeId: string,
    private readonly attribute: string,
    private readonly value: string,
  ) {
    super();
  }

  public override execute(document: CanvasDocument): EditResult {
    const shape = this.requireShape(document, this.shapeId);
    shape.setAttribute(this.attribute, this.value);

    return {
      kind: "set",
      typeName: shape.typeName,
      id: shape.id,
      attribute: this.attribute,
      value: this.value,
    };
  }
}
