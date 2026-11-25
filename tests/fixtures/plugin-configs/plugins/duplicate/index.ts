import { type Command } from "../../../../../src/kernel/CommandContracts.js";
import { type PluginDefinition } from "../../../../../src/kernel/PluginContracts.js";

const command: Command = {
  name: "stats",
  help: {
    section: "Plugin commands",
    sectionOrder: 50,
    line: "duplicate-stats",
    order: 90,
  },
  execute: () => "duplicate",
};

const plugin: PluginDefinition = {
  name: "duplicate-fixture",
  contributes: {
    commands: ["stats"],
    decorators: ["must-rollback"],
  },
  activate(context) {
    context.registerCommand(command);
    context.registerTreeDecorator({
      name: "must-rollback",
      decorate: () => ["must-rollback"],
    });
  },
};

export default plugin;
