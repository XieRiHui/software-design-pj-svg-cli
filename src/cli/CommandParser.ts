import {
  type CommandToken,
  type ParsedCommand,
} from "../kernel/CommandContracts.js";

export type { ParsedCommand } from "../kernel/CommandContracts.js";

export class CommandParser {
  public parse(tokens: readonly CommandToken[]): ParsedCommand | null {
    const [head, ...rest] = tokens;
    if (head === undefined) {
      return null;
    }

    return {
      name: head.value,
      args: rest,
    };
  }
}
