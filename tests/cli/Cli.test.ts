import { describe, expect, it } from "vitest";

import { Cli } from "../../src/cli/Cli.js";

describe("Cli", () => {
  it("writes the startup banner", () => {
    const output: string[] = [];

    new Cli({
      write: (text) => {
        output.push(text);
      },
    }).start();

    expect(output).toEqual([
      "svg-editor 0.1 — type 'help' for commands\n",
    ]);
  });
});
