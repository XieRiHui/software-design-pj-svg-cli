import { describe, expect, it } from "vitest";

import { CommandLexer } from "../../src/cli/CommandLexer.js";
import { CommandParser } from "../../src/cli/CommandParser.js";
import { EditorError } from "../../src/shared/EditorError.js";

describe("CommandParser", () => {
  const lexer = new CommandLexer();
  const parser = new CommandParser();

  it("returns null when a line contains no command", () => {
    expect(parser.parse(lexer.tokenize(""))).toBeNull();
    expect(parser.parse(lexer.tokenize("# comment"))).toBeNull();
  });

  it("extracts the create in-container clause", () => {
    expect(
      parser.parse(
        lexer.tokenize(
          'create text title 10 20 "Hello world" in node1',
        ),
      ),
    ).toEqual({
      name: "create",
      args: ["text", "title", "10", "20", "Hello world"],
      containerId: "node1",
    });
  });

  it("does not treat a quoted in value as a clause", () => {
    expect(
      parser.parse(
        lexer.tokenize('create text title 10 20 "in"'),
      ),
    ).toEqual({
      name: "create",
      args: ["text", "title", "10", "20", "in"],
      containerId: null,
    });
  });

  it("rejects an in clause without a container id", () => {
    expect(() =>
      parser.parse(lexer.tokenize("create rect box 0 0 10 10 in")),
    ).toThrow(EditorError);
  });
});
