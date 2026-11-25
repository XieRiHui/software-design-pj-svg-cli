import { Editor } from "../application/Editor.js";
import { CommandRouter } from "../cli/CommandRouter.js";
import { OutputFormatter } from "../cli/OutputFormatter.js";
import {
  AttributeHandlerRegistry,
  CommandRegistry,
  ShapeProviderRegistry,
  TreeDecoratorRegistry,
} from "../kernel/Registries.js";
import {
  type AttributeHandlerCatalog,
  type CommandCatalog,
  type CommandExecutionContext,
  type DirectoryReader,
  type ShapeProviderCatalog,
} from "../kernel/CommandContracts.js";
import {
  type PluginDefinition,
  type PluginOptions,
} from "../kernel/PluginContracts.js";
import { NodeDirectoryReader } from "../infrastructure/NodeDirectoryReader.js";
import { SvgIoAdapter } from "../infrastructure/SvgIoAdapter.js";
import { SvgReader } from "../infrastructure/SvgReader.js";
import { PluginHost } from "./PluginHost.js";
import { builtinCommandsPlugin } from "../plugins/builtin-commands/index.js";
import { builtinShapesPlugin } from "../plugins/builtin-shapes/index.js";

export interface PluginApplication {
  readonly editor: Editor;
  readonly formatter: OutputFormatter;
  readonly router: CommandRouter;
  readonly shapes: ShapeProviderCatalog;
  readonly attributes: AttributeHandlerCatalog;
  readonly commands: CommandCatalog;
  readonly startupMessages: readonly string[];
  readonly installedPlugins: readonly string[];
}

export interface PluginApplicationOptions {
  readonly plugins?: readonly PluginDefinition[];
  readonly pluginOptions?: readonly PluginOptions[];
  readonly editor?: Editor;
  readonly formatter?: OutputFormatter;
  readonly workingDirectory?: string;
  readonly directories?: DirectoryReader;
}

export function createBasePluginHost(
  directories: DirectoryReader = new NodeDirectoryReader(),
): PluginHost {
  const host = new PluginHost(directories);
  const shapeResult = host.install(builtinShapesPlugin);
  const commandResult = host.install(builtinCommandsPlugin);
  if (!shapeResult.ok || !commandResult.ok) {
    throw new Error(
      `cannot install builtin plugins: ${
        !shapeResult.ok
          ? shapeResult.message
          : !commandResult.ok
            ? commandResult.message
            : ""
      }`,
    );
  }

  return host;
}

export function createPluginApplication(
  options: PluginApplicationOptions = {},
): PluginApplication {
  const directories = options.directories ?? new NodeDirectoryReader();
  const host = createBasePluginHost(directories);
  const startupMessages: string[] = [];
  const plugins = options.plugins ?? [];

  plugins.forEach((plugin, index) => {
    const result = host.install(
      plugin,
      options.pluginOptions?.[index] ?? {},
    );
    if (!result.ok) {
      startupMessages.push(`error: ${result.message}`);
    }
  });

  return buildPluginApplication(host, {
    directories,
    ...(options.editor === undefined ? {} : { editor: options.editor }),
    ...(options.formatter === undefined
      ? {}
      : { formatter: options.formatter }),
    ...(options.workingDirectory === undefined
      ? {}
      : { workingDirectory: options.workingDirectory }),
    startupMessages,
  });
}

export function buildPluginApplication(
  host: PluginHost,
  options: {
    readonly editor?: Editor;
    readonly formatter?: OutputFormatter;
    readonly workingDirectory?: string;
    readonly directories?: DirectoryReader;
    readonly startupMessages?: readonly string[];
  } = {},
): PluginApplication {
  const snapshot = host.snapshot();
  const shapes = new ShapeProviderRegistry();
  const commands = new CommandRegistry();
  const decorators = new TreeDecoratorRegistry();
  const attributes = new AttributeHandlerRegistry();

  for (const provider of snapshot.shapes) {
    shapes.register(provider);
  }
  for (const command of snapshot.commands) {
    commands.register(command);
  }
  for (const decorator of snapshot.decorators) {
    decorators.register(decorator);
  }
  for (const handler of snapshot.attributes) {
    attributes.register(handler);
  }

  const editor = options.editor ?? new Editor();
  const formatter = options.formatter ?? new OutputFormatter();
  const directories = options.directories ?? new NodeDirectoryReader();
  const context: CommandExecutionContext = {
    editor,
    formatter,
    shapes,
    attributes,
    commands,
    treeDecorators: decorators.all(),
    directories,
    workingDirectory: options.workingDirectory ?? process.cwd(),
    svg: new SvgIoAdapter(new SvgReader(shapes)),
  };

  return {
    editor,
    formatter,
    router: new CommandRouter(commands, context),
    shapes,
    attributes,
    commands,
    startupMessages: [...(options.startupMessages ?? [])],
    installedPlugins: host.installedPlugins(),
  };
}
