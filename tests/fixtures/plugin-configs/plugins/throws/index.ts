import { type PluginDefinition } from "../../../../../src/kernel/PluginContracts.js";

const plugin: PluginDefinition = {
  name: "throws-fixture",
  contributes: {},
  activate() {
    throw new Error("synthetic failure");
  },
};

export default plugin;
