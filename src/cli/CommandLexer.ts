import { EditorError } from "../shared/EditorError.js";
import { type CommandToken } from "../kernel/CommandContracts.js";

export type { CommandToken } from "../kernel/CommandContracts.js";

export class CommandLexer {
  public tokenize(line: string): readonly CommandToken[] {
    if (line.trimStart().startsWith("#")) {
      return [];
    }

    const tokens: CommandToken[] = [];
    let value = "";
    let tokenStarted = false;
    let quoted = false;
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === undefined) {
        continue;
      }

      if (inQuotes) {
        if (character === "\\") {
          const nextCharacter = line[index + 1];
          if (nextCharacter === '"' || nextCharacter === "\\") {
            value += nextCharacter;
            index += 1;
          } else {
            value += character;
          }
          continue;
        }

        if (character === '"') {
          inQuotes = false;
          continue;
        }

        value += character;
        continue;
      }

      if (/\s/.test(character)) {
        if (tokenStarted) {
          tokens.push({ value, quoted });
          value = "";
          tokenStarted = false;
          quoted = false;
        }
        continue;
      }

      if (character === '"') {
        inQuotes = true;
        tokenStarted = true;
        quoted = true;
        continue;
      }

      value += character;
      tokenStarted = true;
    }

    if (inQuotes) {
      throw new EditorError("unterminated quoted argument");
    }

    if (tokenStarted) {
      tokens.push({ value, quoted });
    }

    return tokens;
  }
}
