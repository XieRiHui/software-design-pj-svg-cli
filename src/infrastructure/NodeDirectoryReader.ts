import {
  readdirSync,
  type Dirent,
} from "node:fs";

import {
  type DirectoryEntry,
  type DirectoryReader,
} from "../kernel/CommandContracts.js";

export class NodeDirectoryReader implements DirectoryReader {
  public list(path: string): readonly DirectoryEntry[] {
    return readdirSync(path, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      kind: this.kindOf(entry),
    }));
  }

  private kindOf(
    entry: Dirent,
  ): DirectoryEntry["kind"] {
    if (entry.isDirectory()) {
      return "directory";
    }

    if (entry.isSymbolicLink()) {
      return "symlink";
    }

    if (entry.isFile()) {
      return "file";
    }

    return "other";
  }
}
