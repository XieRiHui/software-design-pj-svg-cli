export interface SourcePosition {
  readonly line: number;
  readonly character: number;
}

export interface SourceRange {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

export interface SvgOutlineNode {
  readonly tagName: string;
  readonly id: string | undefined;
  readonly range: SourceRange;
  readonly selectionRange: SourceRange;
  readonly children: SvgOutlineNode[];
}

interface MutableOutlineNode {
  readonly tagName: string;
  readonly id: string | undefined;
  readonly startOffset: number;
  readonly nameStartOffset: number;
  readonly nameEndOffset: number;
  readonly startTagEndOffset: number;
  endOffset: number;
  readonly children: MutableOutlineNode[];
}

interface ParsedStartTag {
  readonly tagName: string;
  readonly id: string | undefined;
  readonly nameStartOffset: number;
  readonly nameEndOffset: number;
  readonly endOffset: number;
  readonly selfClosing: boolean;
}

interface LineIndex {
  positionAt(offset: number): SourcePosition;
}

export function parseSvgOutline(source: string): readonly SvgOutlineNode[] {
  try {
    return parseSvgRoots(source).map((node) => freezeNode(node, source));
  } catch {
    return [];
  }
}

export function findOutlineNodeAtPosition(
  nodes: readonly SvgOutlineNode[],
  position: SourcePosition,
): SvgOutlineNode | undefined {
  for (const node of nodes) {
    if (positionsEqual(node.selectionRange.start, position)) {
      return node;
    }

    const child = findOutlineNodeAtPosition(node.children, position);
    if (child !== undefined) {
      return child;
    }
  }

  return undefined;
}

function parseSvgRoots(source: string): readonly MutableOutlineNode[] {
  const roots: MutableOutlineNode[] = [];
  const stack: MutableOutlineNode[] = [];
  let offset = 0;

  while (offset < source.length) {
    const opening = source.indexOf("<", offset);
    if (opening === -1) {
      break;
    }

    if (source.startsWith("<!--", opening)) {
      offset = skipDelimited(source, opening, "-->");
      continue;
    }

    if (source.startsWith("<![CDATA[", opening)) {
      offset = skipDelimited(source, opening, "]]>");
      continue;
    }

    if (source.startsWith("<?", opening)) {
      offset = skipDelimited(source, opening, "?>");
      continue;
    }

    if (source.startsWith("<!", opening)) {
      offset = skipDeclaration(source, opening);
      continue;
    }

    const tagEnd = findTagEnd(source, opening);
    const rawTag = source.slice(opening + 1, tagEnd);
    const trimmed = rawTag.trimStart();

    if (trimmed.startsWith("/")) {
      const tagName = trimmed.slice(1).trim();
      if (!isTagName(tagName)) {
        throw new Error("invalid closing tag");
      }

      const current = stack.pop();
      if (current === undefined || current.tagName !== tagName) {
        throw new Error("mismatched closing tag");
      }
      current.endOffset = tagEnd + 1;
      offset = tagEnd + 1;
      continue;
    }

    const parsed = parseStartTag(source, opening, tagEnd);
    const node: MutableOutlineNode = {
      tagName: parsed.tagName,
      id: parsed.id,
      startOffset: opening,
      nameStartOffset: parsed.nameStartOffset,
      nameEndOffset: parsed.nameEndOffset,
      startTagEndOffset: parsed.endOffset,
      endOffset: parsed.endOffset,
      children: [],
    };

    const parent = stack.at(-1);
    if (parent === undefined) {
      roots.push(node);
    } else {
      parent.children.push(node);
    }

    if (!parsed.selfClosing) {
      stack.push(node);
    }
    offset = parsed.endOffset;
  }

  if (stack.length > 0) {
    throw new Error("incomplete XML");
  }

  return roots;
}

function parseStartTag(
  source: string,
  opening: number,
  tagEnd: number,
): ParsedStartTag {
  let cursor = opening + 1;
  while (cursor < tagEnd && isWhitespace(source[cursor])) {
    cursor += 1;
  }

  const nameStartOffset = cursor;
  while (cursor < tagEnd && isNameCharacter(source[cursor])) {
    cursor += 1;
  }
  const nameEndOffset = cursor;
  const tagName = source.slice(nameStartOffset, nameEndOffset);
  if (!isTagName(tagName)) {
    throw new Error("invalid start tag");
  }

  const rawAttributes = source.slice(nameEndOffset, tagEnd);
  return {
    tagName,
    id: readIdAttribute(rawAttributes),
    nameStartOffset,
    nameEndOffset,
    endOffset: tagEnd + 1,
    selfClosing: /\/\s*$/.test(rawAttributes),
  };
}

function findTagEnd(source: string, opening: number): number {
  let quote: "\"" | "'" | undefined;

  for (let cursor = opening + 1; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (quote !== undefined) {
      if (character === quote) {
        quote = undefined;
      }
      continue;
    }

    if (character === "\"" || character === "'") {
      quote = character;
      continue;
    }

    if (character === ">") {
      return cursor;
    }
  }

  throw new Error("unterminated tag");
}

function skipDelimited(
  source: string,
  start: number,
  delimiter: string,
): number {
  const end = source.indexOf(delimiter, start + 2);
  if (end === -1) {
    throw new Error(`unterminated ${delimiter}`);
  }

  return end + delimiter.length;
}

function skipDeclaration(source: string, opening: number): number {
  let bracketDepth = 0;
  let quote: "\"" | "'" | undefined;

  for (let cursor = opening + 2; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (quote !== undefined) {
      if (character === quote) {
        quote = undefined;
      }
      continue;
    }

    if (character === "\"" || character === "'") {
      quote = character;
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      continue;
    }

    if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (character === ">" && bracketDepth === 0) {
      return cursor + 1;
    }
  }

  throw new Error("unterminated declaration");
}

function readIdAttribute(attributes: string): string | undefined {
  const match = /(?:^|\s)id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i
    .exec(attributes);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  return value === undefined || value.length === 0 ? undefined : value;
}

function freezeNode(
  node: MutableOutlineNode,
  source: string,
): SvgOutlineNode {
  const lines = createLineIndex(source);
  return {
    tagName: node.tagName,
    id: node.id,
    range: {
      start: lines.positionAt(node.startOffset),
      end: lines.positionAt(node.endOffset),
    },
    selectionRange: {
      start: lines.positionAt(node.nameStartOffset),
      end: lines.positionAt(node.nameEndOffset),
    },
    children: node.children.map((child) => freezeNode(child, source)),
  };
}

function createLineIndex(source: string): LineIndex {
  const lineStarts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      lineStarts.push(index + 1);
    }
  }

  return {
    positionAt(offset: number): SourcePosition {
      let low = 0;
      let high = lineStarts.length - 1;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const lineStart = lineStarts[middle] ?? 0;
        const nextLineStart = lineStarts[middle + 1] ?? Number.POSITIVE_INFINITY;
        if (offset < lineStart) {
          high = middle - 1;
        } else if (offset >= nextLineStart) {
          low = middle + 1;
        } else {
          return {
            line: middle,
            character: offset - lineStart,
          };
        }
      }

      const lastLine = Math.max(0, lineStarts.length - 1);
      return {
        line: lastLine,
        character: offset - (lineStarts[lastLine] ?? 0),
      };
    },
  };
}

function isWhitespace(character: string | undefined): boolean {
  return character !== undefined && /\s/.test(character);
}

function isNameCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9:_-]/.test(character);
}

function isTagName(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9:_.-]*$/.test(value);
}

function positionsEqual(
  left: SourcePosition,
  right: SourcePosition,
): boolean {
  return left.line === right.line && left.character === right.character;
}
