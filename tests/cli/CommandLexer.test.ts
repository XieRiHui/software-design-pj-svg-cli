import { describe, expect, it } from "vitest";

import { CommandLexer } from "../../src/cli/CommandLexer.js";
import { EditorError } from "../../src/shared/EditorError.js";

describe("CommandLexer", () => {
  const lexer = new CommandLexer();

  it("ignores empty lines and comment lines", () => {
    expect(lexer.tokenize("")).toEqual([]);
    expect(lexer.tokenize("   ")).toEqual([]);
    expect(lexer.tokenize("  # a script comment")).toEqual([]);
  });

  it("keeps double-quoted arguments together", () => {
    expect(
      lexer.tokenize('set title text "My Diagram"'),
    ).toEqual([
      { value: "set", quoted: false },
      { value: "title", quoted: false },
      { value: "text", quoted: false },
      { value: "My Diagram", quoted: true },
    ]);
  });

  it("keeps a hash argument that is not at the start of a line", () => {
    expect(
      lexer.tokenize("create rect box 0 0 10 10 #ffffff"),
    ).toContainEqual({ value: "#ffffff", quoted: false });
  });

  it("supports escaped quotes and backslashes", () => {
    expect(lexer.tokenize('set title text "say \\"hi\\" \\\\"')).toEqual([
      { value: "set", quoted: false },
      { value: "title", quoted: false },
      { value: "text", quoted: false },
      { value: 'say "hi" \\', quoted: true },
    ]);
  });

  it("rejects an unterminated quoted argument", () => {
    expect(() => lexer.tokenize('set title text "unfinished')).toThrow(
      EditorError,
    );
    expect(() => lexer.tokenize('set title text "unfinished')).toThrow(
      "unterminated quoted argument",
    );
  });
});
