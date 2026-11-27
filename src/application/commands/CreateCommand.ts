import { EditCommand } from "../EditCommand.js";
import { type EditResult } from "../EditResult.js";
import { type CanvasDocument } from "../../domain/CanvasDocument.js";
import { type ShapeProviderCatalog } from "../../kernel/CommandContracts.js";
import { EditorError } from "../../shared/EditorError.js";

export class CreateCommand extends EditCommand {
  public constructor(
    private readonly shapeType: string,
    private readonly shapeId: string,
    private readonly parameters: readonly string[],
    private readonly containerId: string | null,
    private readonly shapes: ShapeProviderCatalog,
  ) {
    super();
  }

  public override execute(document: CanvasDocument): EditResult {
    const provider = this.shapes.getForCreate(this.shapeType);
    if (provider === undefined) {
      throw new EditorError(
        `unknown shape type: ${this.shapeType} (is the plugin loaded?)`,
      );
    }

    const shape = provider.create(this.shapeId, this.parameters);

    document.addShape(
      shape,
      this.containerId ?? undefined,
    );
    const container = document.getParent(shape.id);
    const details = shape.getCreationDetails();

    return {
      kind: "create",
      typeName: shape.typeName,
      id: shape.id,
      containerId: this.containerId,
      ...(container === undefined
        ? {}
        : { containerTypeName: container.typeName }),
      ...(details === undefined ? {} : { details }),
    };
  }
}
