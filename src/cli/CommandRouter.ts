import {
  type CommandCatalog,
  type CommandExecutionContext,
  type ParsedCommand,
} from "../kernel/CommandContracts.js";
import { EditorError } from "../shared/EditorError.js";

export class CommandRouter {
  public constructor(
    private readonly commands: CommandCatalog,
    private readonly context: CommandExecutionContext,
  ) {}

  public execute(command: ParsedCommand): string {
    const implementation = this.commands.get(command.name);
    if (implementation === undefined) {
      throw new EditorError(`unknown command: ${command.name}`);
    }

    return implementation.execute(command.args, this.context);
  }
}
