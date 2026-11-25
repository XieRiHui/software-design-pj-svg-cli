import {
  type PluginActivationContext,
  type PluginDefinition,
  type TreeDecorator,
} from "../../kernel/PluginContracts.js";

class BoxTypeLabelDecorator implements TreeDecorator {
  public readonly name = "box-type-label";

  public decorate(context: Parameters<TreeDecorator["decorate"]>[0]) {
    return context.shape?.typeName === "box" ? ["(box)"] : [];
  }
}

export const treeBoxLabelPlugin: PluginDefinition = {
  name: "@svgframe/plugin-tree-box-label",
  contributes: {
    decorators: ["box-type-label"],
  },
  activate(context: PluginActivationContext): void {
    context.registerTreeDecorator(new BoxTypeLabelDecorator());
  },
};

export default treeBoxLabelPlugin;
