// /lib/post/parseToc.ts
import { slug } from "github-slugger";

export interface TocItem {
  level: number;
  text: string;
  id: string;
  parentId: string | null;
  topLevelId: string | null;
}

function stripMarkdownCodeBlocks(content: string): string {
  const lines = content.split(/\r?\n/);
  const stripped: string[] = [];
  let fence: { marker: "`" | "~"; length: number } | null = null;

  for (const line of lines) {
    const fenceMatch = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/);

    if (fence) {
      if (
        fenceMatch &&
        fenceMatch[1][0] === fence.marker &&
        fenceMatch[1].length >= fence.length
      ) {
        fence = null;
      }
      stripped.push("");
      continue;
    }

    if (fenceMatch) {
      fence = {
        marker: fenceMatch[1][0] as "`" | "~",
        length: fenceMatch[1].length,
      };
      stripped.push("");
      continue;
    }

    stripped.push(/^(?: {4}|\t)/.test(line) ? "" : line);
  }

  return stripped.join("\n");
}

export function getTocFromMarkdown(content: string): TocItem[] {
  const toc: TocItem[] = [];
  const usedIds = new Map<string, number>();
  const markdownWithoutCode = stripMarkdownCodeBlocks(content);

  const headingRegex = /^(#{1,6})\s+(.*)$/gm;
  let match;

  const stack: TocItem[] = [];

  while ((match = headingRegex.exec(markdownWithoutCode)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();

    const baseId = slug(text);
    let id = baseId;

    if (usedIds.has(baseId)) {
      const count = usedIds.get(baseId)! + 1;
      usedIds.set(baseId, count);
      id = `${baseId}-${count}`;
    } else {
      usedIds.set(baseId, 0);
    }

    const item: TocItem = {
      level,
      text,
      id,
      parentId: null,
      topLevelId: null,
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length > 0) {
      item.parentId = stack[stack.length - 1].id;
      item.topLevelId = stack[0].id;
    } else {
      item.topLevelId = item.id;
    }

    stack.push(item);
    toc.push(item);
  }

  return toc;
}
