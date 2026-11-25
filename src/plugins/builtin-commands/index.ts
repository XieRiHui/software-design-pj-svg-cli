import {
  type Command,
  type CommandExecutionContext,
  type CommandHelp,
  type CommandToken,
} from "../../kernel/CommandContracts.js";
import {
  type PluginActivationContext,
  type PluginDefinition,
} from "../../kernel/PluginContracts.js";
import { BuiltinCommandService } from "./BuiltinCommandService.js";

interface CommandDefinition {
  readonly name: string;
  readonly help: CommandHelp;
  readonly run: (
    service: BuiltinCommandService,
    args: readonly CommandToken[],
  ) => string;
}

const documentOrder = 10;
const shapeOrder = 20;
const displayOrder = 30;
const historyOrder = 40;

const definitions: readonly CommandDefinition[] = [
  command("init", "Document commands", documentOrder, 10, "init [w] [h]", "init"),
  command("read", "Document commands", documentOrder, 20, "read <file.svg>", "read"),
  command("save", "Document commands", documentOrder, 30, "save [file.svg]", "save"),
  command("canvas", "Document commands", documentOrder, 40, "canvas [w] [h]", "canvas"),
  command(
    "create",
    "Shape commands",
    shapeOrder,
    10,
    "create <type> <id> [params...] [in <containerId>]",
    "create",
  ),
  command("delete", "Shape commands", shapeOrder, 20, "delete <id>", "delete"),
  command("move", "Shape commands", shapeOrder, 30, "move <id> <dx> <dy>", "move"),
  command("scale", "Shape commands", shapeOrder, 40, "scale <id> <factor>", "scale"),
  command("set", "Shape commands", shapeOrder, 50, "set <id> <attr> <value>", "set"),
  command(
    "group",
    "Shape commands",
    shapeOrder,
    60,
    "group <newGid> <id1> <id2>...",
    "group",
  ),
  command("ungroup", "Shape commands", shapeOrder, 70, "ungroup <gid>", "ungroup"),
  command("addto", "Shape commands", shapeOrder, 80, "addto <gid> <id>", "addto"),
  command("front", "Shape commands", shapeOrder, 90, "front <id>", "front"),
  command("back", "Shape commands", shapeOrder, 100, "back <id>", "back"),
  command("tree", "Display commands", displayOrder, 10, "tree [id]", "tree"),
  command("show", "Display commands", displayOrder, 20, "show <id>", "show"),
  command("help", "Display commands", displayOrder, 30, "help", "help"),
  command("undo", "History commands", historyOrder, 10, "undo", "undo"),
  command("redo", "History commands", historyOrder, 20, "redo", "redo"),
];

export const builtinCommandsPlugin: PluginDefinition = {
  name: "@svgframe/plugin-builtin-commands",
  contributes: {
    commands: definitions.map((definition) => definition.name),
  },
  activate(context: PluginActivationContext): void {
    for (const definition of definitions) {
      context.registerCommand(new DeferredBuiltinCommand(definition));
    }
  },
};

export default builtinCommandsPlugin;

class DeferredBuiltinCommand implements Command {
  public constructor(private readonly definition: CommandDefinition) {}

  public get name(): string {
    return this.definition.name;
  }

  public get help(): CommandHelp {
    return this.definition.help;
  }

  public execute(
    args: readonly CommandToken[],
    context: CommandExecutionContext,
  ): string {
    return this.definition.run(
      new BuiltinCommandService(context),
      args,
    );
  }
}

function command<Method extends keyof BuiltinCommandService>(
  name: string,
  section: string,
  sectionOrder: number,
  order: number,
  line: string,
  method: Method,
): CommandDefinition {
  return {
    name,
    help: { section, sectionOrder, line, order },
    run: (service, args) => service[method](args),
  };
}
