#!/usr/bin/env node

import { Cli } from "./Cli.js";
import { CommandExecutor } from "./CommandExecutor.js";
import { createPluginApplication } from "../bootstrap/ApplicationAssembler.js";
import { createCodeAssembledApplication } from "../bootstrap/codeAssembly.js";
import { createConfiguredApplication } from "../bootstrap/configuredAssembly.js";

interface StartupOptions {
  readonly configPath: string | undefined;
  readonly builtinsOnly: boolean;
}

const options = parseArguments(process.argv.slice(2));
const application = options.configPath === undefined
  ? options.builtinsOnly
    ? createPluginApplication()
    : createCodeAssembledApplication()
  : await createConfiguredApplication(options.configPath);
const executor = new CommandExecutor(
  application.editor,
  application.formatter,
  application.router,
);

await new Cli({
  executor,
  startupMessages: application.startupMessages,
}).start();

function parseArguments(args: readonly string[]): StartupOptions {
  let configPath: string | undefined;
  let builtinsOnly = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--builtins-only") {
      builtinsOnly = true;
      continue;
    }

    if (argument === "--config") {
      configPath = args[index + 1];
      if (configPath === undefined) {
        throw new Error("usage: --config requires a file path");
      }
      index += 1;
      continue;
    }

    throw new Error(`unknown argument: ${argument ?? ""}`);
  }

  if (configPath !== undefined && builtinsOnly) {
    throw new Error("--config and --builtins-only cannot be combined");
  }

  return { configPath, builtinsOnly };
}
