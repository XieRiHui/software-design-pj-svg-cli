const HELP_TEXT = [
  "Document commands:",
  "  init [w] [h]",
  "  read <file.svg>",
  "  save [file.svg]",
  "  canvas [w] [h]",
  "",
  "Shape commands:",
  "  create <type> <id> [params...] [in <containerId>]",
  "  delete <id>",
  "  move <id> <dx> <dy>",
  "  scale <id> <factor>",
  "  set <id> <attr> <value>",
  "  group <newGid> <id1> <id2>...",
  "  ungroup <gid>",
  "  addto <gid> <id>",
  "  front <id>",
  "  back <id>",
  "",
  "Display commands:",
  "  tree [id]",
  "  show <id>",
  "  help",
  "",
  "History commands:",
  "  undo",
  "  redo",
].join("\n");

export class OutputFormatter {
  public canvasCreated(width: number, height: number): string {
    return `canvas ${width}x${height} created`;
  }

  public help(): string {
    return HELP_TEXT;
  }

  public error(message: string): string {
    return `error: ${message}`;
  }
}
