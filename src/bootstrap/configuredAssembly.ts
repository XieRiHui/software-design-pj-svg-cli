import {
  buildPluginApplication,
  createBasePluginHost,
  type PluginApplication,
} from "./ApplicationAssembler.js";
import { NodeDirectoryReader } from "../infrastructure/NodeDirectoryReader.js";
import { Editor } from "../application/Editor.js";
import { OutputFormatter } from "../cli/OutputFormatter.js";
import { loadPluginConfig } from "./PluginConfigLoader.js";

export interface ConfiguredAssemblyOptions {
  readonly editor?: Editor;
  readonly formatter?: OutputFormatter;
  readonly workingDirectory?: string;
}

export async function createConfiguredApplication(
  configFilePath: string,
  options: ConfiguredAssemblyOptions = {},
): Promise<PluginApplication> {
  const directories = new NodeDirectoryReader();
  const host = createBasePluginHost(directories);
  const startupMessages = await loadPluginConfig(configFilePath, host);

  return buildPluginApplication(host, {
    directories,
    startupMessages,
    ...(options.editor === undefined ? {} : { editor: options.editor }),
    ...(options.formatter === undefined
      ? {}
      : { formatter: options.formatter }),
    ...(options.workingDirectory === undefined
      ? {}
      : { workingDirectory: options.workingDirectory }),
  });
}
