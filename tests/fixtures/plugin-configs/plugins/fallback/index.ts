import { type Command } from "../../../../../src/kernel/CommandContracts.js";
import { type PluginDefinition } from "../../../../../src/kernel/PluginContracts.js";

const command: Command = {
  name: "fallback",
  help: {
    section: "Plugin commands",
    sectionOrder: 50,
    line: "fallback",
    order: 30,
  },
  execute: () => "fallback loaded",
};

const plugin: PluginDefinition = {
  name: "fallback-fixture",
  contributes: {
    commands: ["fallback"],
  },
  activate(context) {
    context.registerCommand(command);
  },
};

export default plugin;
