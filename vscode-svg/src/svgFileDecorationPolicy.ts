export function isSvgDecorationCandidate(path: string): boolean {
  return path.toLowerCase().endsWith(".svg");
}

export function shouldDecorateSvg(
  path: string,
  isDirectory: boolean,
): boolean {
  return !isDirectory && isSvgDecorationCandidate(path);
}
