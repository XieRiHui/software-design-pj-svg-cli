import { type CommandToken } from "./CommandLexer.js";
import { EditorError } from "../shared/EditorError.js";

export interface ParsedCommand {
  readonly name: string;
  readonly args: readonly string[];
  readonly containerId: string | null;
}

export class CommandParser {
  public parse(tokens: readonly CommandToken[]): ParsedCommand | null {
    const [head, ...rest] = tokens;
    if (head === undefined) {
      return null;
    }

    const commandTokens = [...rest];
    let containerId: string | null = null;

    if (head.value === "create") {
      const containerKeyword = commandTokens.at(-2);
      const containerToken = commandTokens.at(-1);

      if (
        containerKeyword?.value === "in" &&
        !containerKeyword.quoted &&
        containerToken !== undefined
      ) {
        containerId = containerToken.value;
        commandTokens.splice(-2, 2);
      } else if (
        containerToken?.value === "in" &&
        !containerToken.quoted
      ) {
        throw new EditorError(
          "create requires a container id after 'in'",
        );
      }
    }

    return {
      name: head.value,
      args: commandTokens.map((token) => token.value),
      containerId,
    };
  }
}
