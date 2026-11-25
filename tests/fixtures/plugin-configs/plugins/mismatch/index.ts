import { type Command } from "../../../../../src/kernel/CommandContracts.js";
import { type PluginDefinition } from "../../../../../src/kernel/PluginContracts.js";

const command: Command = {
  name: "actual",
  help: {
    section: "Plugin commands",
    sectionOrder: 50,
    line: "actual",
    order: 100,
  },
  execute: () => "actual",
};

const plugin: PluginDefinition = {
  name: "mismatch-fixture",
  contributes: {
    commands: ["actual"],
  },
  activate(context) {
    context.registerCommand(command);
  },
};

export default plugin;
