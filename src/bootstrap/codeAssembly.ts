import {
  createPluginApplication,
  type PluginApplication,
  type PluginApplicationOptions,
} from "./ApplicationAssembler.js";
import { commandDirPlugin } from "../plugins/command-dir/index.js";
import { commandStatsPlugin } from "../plugins/command-stats/index.js";
import { shapeBoxPlugin } from "../plugins/shape-box/index.js";
import { type PluginDefinition } from "../kernel/PluginContracts.js";

export const CODE_PLUGINS: readonly PluginDefinition[] = [
  commandStatsPlugin,
  commandDirPlugin,
  shapeBoxPlugin,
];

export function createCodeAssembledApplication(
  options: Omit<PluginApplicationOptions, "plugins" | "pluginOptions"> = {},
): PluginApplication {
  return createPluginApplication({
    ...options,
    plugins: CODE_PLUGINS,
  });
}
