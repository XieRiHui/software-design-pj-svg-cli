import { EditCommand } from "../EditCommand.js";
import { type EditResult } from "../EditResult.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";
import { ShapeFactory } from "../../domain/ShapeFactory.js";

export class CreateCommand extends EditCommand {
  public constructor(
    private readonly shapeType: string,
    private readonly shapeId: string,
    private readonly parameters: readonly string[],
    private readonly containerId: string | null,
    private readonly factory = new ShapeFactory(),
  ) {
    super();
  }

  public override execute(document: CanvasDocument): EditResult {
    const shape = this.factory.create(
      this.shapeType,
      this.shapeId,
      this.parameters,
    );

    document.addShape(
      shape,
      this.containerId ?? undefined,
    );

    return {
      kind: "create",
      typeName: shape.typeName,
      id: shape.id,
      containerId: this.containerId,
    };
  }
}
