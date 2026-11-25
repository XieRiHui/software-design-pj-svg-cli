import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

const sourceRoot = join(process.cwd(), "src", "plugins");
const targetRoot = join(process.cwd(), "dist", "plugins");

copyManifests(sourceRoot);

function copyManifests(directory) {
  for (const entry of readdirSync(directory)) {
    const sourcePath = join(directory, entry);
    if (statSync(sourcePath).isDirectory()) {
      copyManifests(sourcePath);
      continue;
    }

    if (entry !== "package.json") {
      continue;
    }

    const relative = sourcePath.slice(sourceRoot.length + 1);
    const targetPath = join(targetRoot, relative);
    mkdirSync(join(targetPath, ".."), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }
}
