import { CompositeShape } from "../../domain/CompositeShape.js";
import { type Shape } from "../../domain/Shape.js";
import {
  type Command,
  type CommandExecutionContext,
  type CommandHelp,
  type CommandToken,
} from "../../kernel/CommandContracts.js";
import {
  type PluginActivationContext,
  type PluginDefinition,
} from "../../kernel/PluginContracts.js";
import { EditorError } from "../../shared/EditorError.js";

class StatsCommand implements Command {
  public readonly name = "stats";
  public readonly help: CommandHelp = {
    section: "Plugin commands",
    sectionOrder: 50,
    line: "stats",
    order: 10,
  };

  public execute(
    args: readonly CommandToken[],
    context: CommandExecutionContext,
  ): string {
    if (args.length !== 0) {
      throw new EditorError("usage: stats");
    }

    const document = context.editor.document;
    if (document === undefined) {
      throw new EditorError(
        "no document. use 'init' or 'read' first",
      );
    }

    const counts = new Map<string, number>();
    let containers = 0;
    let total = 0;

    const visit = (shape: Shape): void => {
      if (shape instanceof CompositeShape) {
        containers += 1;
        for (const child of shape.children) {
          visit(child);
        }
        return;
      }

      total += 1;
      counts.set(shape.typeName, (counts.get(shape.typeName) ?? 0) + 1);
    };

    for (const shape of document.rootShapes) {
      visit(shape);
    }

    const items = [...counts.entries()].map(
      ([type, count]) => `${type}: ${count}`,
    );
    const summary = `total ${total}, containers ${containers}`;
    return items.length === 0
      ? `(${summary})`
      : `${items.join("  ")}  (${summary})`;
  }
}

export const commandStatsPlugin: PluginDefinition = {
  name: "@svgframe/plugin-command-stats",
  contributes: {
    commands: ["stats"],
  },
  activate(context: PluginActivationContext): void {
    context.registerCommand(new StatsCommand());
  },
};

export default commandStatsPlugin;
