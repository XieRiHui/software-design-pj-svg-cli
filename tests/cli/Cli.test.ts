import { Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import { Cli } from "../../src/cli/Cli.js";

describe("Cli", () => {
  it("reads lines, writes command results, and requests each line", async () => {
    const writes: string[] = [];
    const cli = new Cli({
      input: Readable.from(["init 12 34\ntree\n"]),
      output: {
        write: (text) => {
          writes.push(text);
        },
      },
    });

    await cli.start();

    expect(writes.join("")).toBe(
      [
        "svg-editor 0.1 — type 'help' for commands",
        "svg> canvas 12x34 created",
        "svg> error: command not implemented: tree",
        "svg> ",
      ].join("\n"),
    );
  });
});
