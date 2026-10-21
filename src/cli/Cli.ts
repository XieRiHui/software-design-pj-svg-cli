import { createInterface } from "node:readline";
import { type Readable } from "node:stream";

import { CommandExecutor } from "./CommandExecutor.js";

const STARTUP_BANNER =
  "svg-editor 0.1 — type 'help' for commands\n";
const PROMPT = "svg> ";

export interface CliOutput {
  write(text: string): unknown;
}

export interface CliOptions {
  readonly executor?: CommandExecutor;
  readonly input?: Readable;
  readonly output?: CliOutput;
}

export class Cli {
  private readonly executor: CommandExecutor;
  private readonly input: Readable;
  private readonly output: CliOutput;

  public constructor(options: CliOptions = {}) {
    this.executor = options.executor ?? new CommandExecutor();
    this.input = options.input ?? process.stdin;
    this.output = options.output ?? process.stdout;
  }

  public async start(): Promise<void> {
    this.output.write(STARTUP_BANNER);

    const lines = createInterface({
      input: this.input,
      crlfDelay: Infinity,
      terminal: false,
    });

    try {
      this.output.write(PROMPT);
      for await (const line of lines) {
        const result = this.executor.execute(line);
        if (result !== null) {
          this.output.write(`${result}\n`);
        }
        this.output.write(PROMPT);
      }
    } finally {
      lines.close();
    }
  }
}
