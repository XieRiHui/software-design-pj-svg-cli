import { describe, expect, it } from "vitest";

import { CommandLexer } from "../../src/cli/CommandLexer.js";
import { CommandParser } from "../../src/cli/CommandParser.js";

describe("CommandParser", () => {
  const lexer = new CommandLexer();
  const parser = new CommandParser();

  it("returns null when a line contains no command", () => {
    expect(parser.parse(lexer.tokenize(""))).toBeNull();
    expect(parser.parse(lexer.tokenize("# comment"))).toBeNull();
  });

  it("returns tokens without interpreting plugin-specific syntax", () => {
    expect(
      parser.parse(
        lexer.tokenize(
          'create text title 10 20 "Hello world" in node1',
        ),
      ),
    ).toEqual({
      name: "create",
      args: [
        { value: "text", quoted: false },
        { value: "title", quoted: false },
        { value: "10", quoted: false },
        { value: "20", quoted: false },
        { value: "Hello world", quoted: true },
        { value: "in", quoted: false },
        { value: "node1", quoted: false },
      ],
    });
  });

  it("does not treat a quoted in value as a clause", () => {
    expect(
      parser.parse(
        lexer.tokenize('create text title 10 20 "in"'),
      ),
    ).toEqual({
      name: "create",
      args: [
        { value: "text", quoted: false },
        { value: "title", quoted: false },
        { value: "10", quoted: false },
        { value: "20", quoted: false },
        { value: "in", quoted: true },
      ],
    });
  });

  it("leaves an incomplete plugin clause for the command to validate", () => {
    expect(
      parser.parse(lexer.tokenize("create rect box 0 0 10 10 in"))?.args
        .at(-1),
    ).toEqual({ value: "in", quoted: false });
  });
});
