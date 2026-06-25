// /lib/post/parseToc.ts
import { slug } from "github-slugger";
 
export interface TocItem {
  level: number;
  text: string;
  id: string;
  parentId: string | null;
  topLevelId: string | null;
}
 
export function getTocFromMarkdown(content: string): TocItem[] {
  const toc: TocItem[] = [];
  const usedIds = new Map<string, number>(); // 중복 slug 카운트 저장
 
  const headingRegex = /^(#{1,6})\s+(.*)$/gm;
  let match;
 
  const stack: TocItem[] = [];
 
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
 
    let baseId = slug(text);
    let id = baseId;
 
    // 중복 검사 후 직접 -1, -2, -3 부여
    if (usedIds.has(baseId)) {
      const count = usedIds.get(baseId)! + 1;
      usedIds.set(baseId, count);
      id = `${baseId}-${count}`;
    } else {
      usedIds.set(baseId, 0); // 첫 번째 등장
    }
 
    const item: TocItem = {
      level,
      text,
      id,
      parentId: null,
      topLevelId: null,
    };
 
    // 스택 정리
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
