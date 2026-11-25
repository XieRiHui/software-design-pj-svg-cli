import { type CanvasDocument } from "../../domain/CanvasDocument.js";
import { type Shape } from "../../domain/Shape.js";
import {
  type PluginActivationContext,
  type PluginDefinition,
  type TreeDecorationContext,
  type TreeDecorator,
} from "../../kernel/PluginContracts.js";

export const treeStarPlugin: PluginDefinition = {
  name: "@svgframe/plugin-tree-star",
  contributes: {
    decorators: ["modified-star"],
  },
  activate(context: PluginActivationContext): void {
    context.registerTreeDecorator(new ModifiedStarDecorator());
  },
};

class ModifiedStarDecorator implements TreeDecorator {
  public readonly name = "modified-star";
  private observedSaveSequence = -1;
  private cleanDocument: CanvasDocument | undefined;

  public decorate(context: TreeDecorationContext): readonly string[] {
    if (context.saveSequence !== this.observedSaveSequence) {
      this.observedSaveSequence = context.saveSequence;
      this.cleanDocument = context.savedDocument;
    }

    if (this.cleanDocument === undefined) {
      return ["*"];
    }

    if (context.isRoot) {
      return documentMatches(context.document, this.cleanDocument)
        ? []
        : ["*"];
    }

    const shape = context.shape;
    if (shape === undefined) {
      return [];
    }
    const savedShape = this.cleanDocument.getShape(shape.id);
    if (savedShape === undefined) {
      return ["*"];
    }

    return shapeSignature(shape) === shapeSignature(savedShape)
      ? []
      : ["*"];
  }
}

function documentMatches(
  current: CanvasDocument,
  clean: CanvasDocument,
): boolean {
  if (
    current.width !== clean.width ||
    current.height !== clean.height
  ) {
    return false;
  }

  const currentRoots = current.rootShapes;
  const cleanRoots = clean.rootShapes;
  return (
    currentRoots.length === cleanRoots.length &&
    currentRoots.every(
      (shape, index) =>
        shapeSignature(shape) === shapeSignature(cleanRoots[index] as Shape),
    )
  );
}

function shapeSignature(shape: Shape): string {
  return JSON.stringify({
    type: shape.typeName,
    id: shape.id,
    attributes: shape.getShowAttributes(),
    serialization: shape.getSerializationAttributes(),
    children: shape.children.map((child) => shapeSignature(child)),
  });
}

export default treeStarPlugin;
