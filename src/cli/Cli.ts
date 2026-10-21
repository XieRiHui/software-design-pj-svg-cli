export interface CliOutput {
  write(text: string): unknown;
}

export class Cli {
  public constructor(
    private readonly output: CliOutput = process.stdout,
  ) {}

  public start(): void {
    this.output.write("svg-editor 0.1 — type 'help' for commands\n");
  }
}
