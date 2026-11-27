import {
  createPluginApplication,
  type PluginApplication,
  type PluginApplicationOptions,
} from "./ApplicationAssembler.js";
import { commandDirPlugin } from "../plugins/command-dir/index.js";
import { commandStatsPlugin } from "../plugins/command-stats/index.js";
import { shapeArrowPlugin } from "../plugins/shape-arrow/index.js";
import { shapeBoxPlugin } from "../plugins/shape-box/index.js";
import { treeBoxLabelPlugin } from "../plugins/tree-box-label/index.js";
import { treeStarPlugin } from "../plugins/tree-star/index.js";
import { type PluginDefinition } from "../kernel/PluginContracts.js";

export const CODE_PLUGINS: readonly PluginDefinition[] = [
  commandStatsPlugin,
  commandDirPlugin,
  shapeBoxPlugin,
  shapeArrowPlugin,
  treeBoxLabelPlugin,
  treeStarPlugin,
];

export function createCodeAssembledApplication(
  options: Omit<PluginApplicationOptions, "plugins" | "pluginOptions"> = {},
): PluginApplication {
  return createPluginApplication({
    ...options,
    plugins: CODE_PLUGINS,
  });
}
