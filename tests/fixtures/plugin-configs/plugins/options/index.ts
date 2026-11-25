import { type Command } from "../../../../../src/kernel/CommandContracts.js";
import { type PluginDefinition } from "../../../../../src/kernel/PluginContracts.js";

const plugin: PluginDefinition = {
  name: "options-fixture",
  contributes: {
    commands: ["option-value"],
  },
  activate(context) {
    const reply = String(context.options.reply);
    const command: Command = {
      name: "option-value",
      help: {
        section: "Plugin commands",
        sectionOrder: 50,
        line: "option-value",
        order: 40,
      },
      execute: () => reply,
    };
    context.registerCommand(command);
  },
};

export default plugin;
