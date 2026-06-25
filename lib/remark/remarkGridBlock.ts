import type { Root } from 'mdast';

// ---------------------------------------------------------------------------
// String-level preprocessing (runs before markdown parsing)
// Converts ***lang...*** fences inside [...] blocks to ```lang...```
// Wraps [, ], |, , in blank lines so remark sees them as standalone paragraphs
// ---------------------------------------------------------------------------

export function preprocessGridSource(source: string): string {
  const lines = source.split('\n');
  const result: string[] = [];
  let gridDepth = 0;
  let inStarBlock = false;
  let inCodeFence = false;

  const ensureBlankBefore = () => {
    if (result.length > 0 && result[result.length - 1].trim() !== '') result.push('');
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inStarBlock && trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      result.push(line);
      continue;
    }
    if (inCodeFence) { result.push(line); continue; }

    if (!inStarBlock && trimmed === '![') {
      ensureBlankBefore();
      result.push(line);
      result.push('');
      gridDepth++;
      continue;
    }
    if (!inStarBlock && trimmed === ']!' && gridDepth > 0) {
      ensureBlankBefore();
      result.push(line);
      result.push('');
      gridDepth--;
      continue;
    }

    if (gridDepth > 0 && !inStarBlock) {
      if (trimmed.startsWith('***') && trimmed.length > 3 && !trimmed.slice(3).trim().endsWith('**')) {
        result.push('```' + trimmed.slice(3).trim());
        inStarBlock = true;
        continue;
      }
      // Standalone | and , must be their own paragraph for remark to see them as separators
      if (trimmed === '|' || trimmed === ',') {
        ensureBlankBefore();
        result.push(line);
        result.push('');
        continue;
      }
    }

    if (inStarBlock && trimmed === '***') {
      result.push('```');
      inStarBlock = false;
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isParaWithText(node: any, text: string): boolean {
  return (
    node.type === 'paragraph' &&
    node.children?.length === 1 &&
    node.children[0].type === 'text' &&
    node.children[0].value.trim() === text
  );
}

function splitBy<T>(arr: T[], pred: (item: T) => boolean): T[][] {
  const groups: T[][] = [[]];
  for (const item of arr) {
    if (pred(item)) groups.push([]);
    else groups[groups.length - 1].push(item);
  }
  return groups;
}

function trimEmptyNodes(nodes: any[]): any[] {
  const isBlank = (n: any) =>
    n.type === 'paragraph' &&
    n.children?.length === 1 &&
    n.children[0].type === 'text' &&
    n.children[0].value.trim() === '';
  let s = 0, e = nodes.length;
  while (s < e && isBlank(nodes[s])) s++;
  while (e > s && isBlank(nodes[e - 1])) e--;
  return nodes.slice(s, e);
}

/** listItem의 마지막 text 노드에서 끝 쉼표를 제거한다. */
function stripTrailingComma(blocks: any[]): any[] {
  if (!blocks.length) return blocks;
  const last = blocks[blocks.length - 1];
  if (last.type !== 'paragraph' || !last.children?.length) return blocks;
  const lastInline = last.children[last.children.length - 1];
  if (lastInline?.type !== 'text') return blocks;
  const stripped = lastInline.value.replace(/\s*,\s*$/, '');
  if (stripped === lastInline.value) return blocks;
  const newInline = { ...lastInline, value: stripped };
  const newLast = {
    ...last,
    children: [...last.children.slice(0, -1), ...(newInline.value ? [newInline] : [])],
  };
  return [...blocks.slice(0, -1), newLast];
}

/** paragraph의 inline children을 ' | ' 기준으로 분리한다. 분리되지 않으면 null 반환. */
function splitInlineByPipe(children: any[]): any[][] | null {
  const groups: any[][] = [[]];
  let hasSplit = false;
  for (const child of children) {
    if (child.type === 'text') {
      const parts = child.value.split(' | ');
      if (parts.length > 1) hasSplit = true;
      if (parts[0].trim()) groups[groups.length - 1].push({ ...child, value: parts[0] });
      for (let k = 1; k < parts.length; k++) {
        groups.push([]);
        if (parts[k].trim()) groups[groups.length - 1].push({ ...child, value: parts[k] });
      }
    } else {
      groups[groups.length - 1].push(child);
    }
  }
  const filtered = groups.filter(g => g.length > 0);
  return hasSplit && filtered.length >= 2 ? filtered : null;
}

/** paragraph의 inline children을 최상위 쉼표 기준으로 분리한다. */
function splitInlineByComma(children: any[]): any[][] {
  const groups: any[][] = [[]];
  for (const child of children) {
    if (child.type === 'text') {
      const parts = child.value.split(',');
      const firstVal = parts[0].trim();
      if (firstVal) groups[groups.length - 1].push({ ...child, value: firstVal });
      for (let k = 1; k < parts.length; k++) {
        groups.push([]);
        const val = parts[k].trim();
        if (val) groups[groups.length - 1].push({ ...child, value: val });
      }
    } else {
      groups[groups.length - 1].push(child);
    }
  }
  return groups.filter(g => g.length > 0);
}

// ---------------------------------------------------------------------------
// AST node constructors
// ---------------------------------------------------------------------------

function makeAttr(name: string, value: string | number): any {
  return { type: 'mdxJsxAttribute', name, value: String(value) };
}

function makeGridItem(children: any[], span = 1): any {
  const attrs = span > 1 ? [makeAttr('span', span)] : [];
  return { type: 'mdxJsxFlowElement', name: 'GridItem', attributes: attrs, children };
}

function makeGridBlock(children: any[], cols: number): any {
  return {
    type: 'mdxJsxFlowElement',
    name: 'GridBlock',
    attributes: [makeAttr('cols', cols)],
    children,
  };
}

// ---------------------------------------------------------------------------
// Cell content processor (2D 모드용)
// ---------------------------------------------------------------------------

type CellData = { nodes: any[]; span: number };

/**
 * 셀 영역 노드를 처리해 CellData 배열로 변환한다.
 * - 단일 항목 리스트 → 내용 꺼내기 (불릿 제거)
 * - 단일 paragraph → ' | ' 로 분리 우선, 그 다음 쉼표로 분리
 * - 그 외 → 셀 하나
 */
function processCellContent(nodes: any[]): CellData[] {
  if (nodes.length === 1 && nodes[0].type === 'list' && nodes[0].children.length === 1) {
    return [{ nodes: stripTrailingComma(nodes[0].children[0].children), span: 1 }];
  }
  if (nodes.length === 1 && nodes[0].type === 'paragraph') {
    const pipeGroups = splitInlineByPipe(nodes[0].children);
    if (pipeGroups) {
      return pipeGroups.map(g => ({ nodes: [{ type: 'paragraph', children: g }], span: 1 }));
    }
    const commaGroups = splitInlineByComma(nodes[0].children);
    if (commaGroups.length > 1) {
      return commaGroups.map(g => ({ nodes: [{ type: 'paragraph', children: g }], span: 1 }));
    }
  }
  return [{ nodes, span: 1 }];
}

// ---------------------------------------------------------------------------
// Grid builders
// ---------------------------------------------------------------------------

/**
 * 명시적 구분자(standalone | / , 또는 인라인 ' | ')가 있을 때: 2D 그리드
 *
 * 구분자 우선순위:
 *   , (standalone paragraph)  → 행 구분
 *   | (standalone paragraph)  → 열 구분
 *   ' | ' (paragraph 인라인)  → processCellContent 내에서 열 구분
 *
 * 단독 셀 행(1개 셀)은 전체 너비(colspan = cols)로 자동 확장된다.
 */
function build2dGrid(inner: any[]): any {
  const rowGroups = splitBy(inner, n => isParaWithText(n, ','));

  const allRows: CellData[][] = [];

  for (const rowNodes of rowGroups) {
    if (rowNodes.every(n => trimEmptyNodes([n]).length === 0)) continue;

    const rawCells = splitBy(rowNodes, n => isParaWithText(n, '|'));
    const cells: CellData[] = [];

    for (const cellNodes of rawCells) {
      const content = trimEmptyNodes(cellNodes);
      if (content.length === 0) {
        // 빈 셀 → 이전 셀 colspan 증가 (명시적 span 지정)
        if (cells.length > 0) cells[cells.length - 1].span++;
      } else {
        for (const cell of processCellContent(content)) cells.push(cell);
      }
    }

    if (cells.length > 0) allRows.push(cells);
  }

  const cols = allRows.length > 0
    ? Math.max(...allRows.map(row => row.reduce((s, c) => s + c.span, 0)))
    : 1;

  // 단독 셀 행은 전체 너비로 자동 확장 (trailing | | 없이도 full-width)
  for (const row of allRows) {
    if (row.length === 1 && row[0].span < cols) {
      row[0].span = cols;
    }
  }

  const items = allRows.flatMap(row => row.map(cell => makeGridItem(cell.nodes, cell.span)));
  return makeGridBlock(items, cols);
}

/**
 * 구분자 없을 때: 구버전 호환 — 각 블록이 하나의 셀이 되는 단일 행 그리드
 *   - list → 항목별 셀 (- item, 문법)
 *   - paragraph → 쉼표 분리 셀
 *   - 그 외 → 셀 하나
 */
function buildFlatGrid(inner: any[]): any {
  const items: any[] = [];
  for (const node of inner) {
    if (node.type === 'list') {
      for (const listItem of node.children) {
        items.push(makeGridItem(stripTrailingComma(listItem.children)));
      }
    } else if (node.type === 'paragraph') {
      for (const group of splitInlineByComma(node.children)) {
        items.push(makeGridItem([{ type: 'paragraph', children: group }]));
      }
    } else {
      items.push(makeGridItem([node]));
    }
  }
  return makeGridBlock(items, items.length || 1);
}

/** inner 노드에 2D 구분자가 있으면 build2dGrid, 없으면 buildFlatGrid */
function buildGridBlock(inner: any[]): any {
  const has2d = inner.some(n => {
    if (isParaWithText(n, '|') || isParaWithText(n, ',')) return true;
    // 인라인 ' | ' 도 2D 모드 트리거
    if (n.type === 'paragraph') {
      return n.children?.some((c: any) => c.type === 'text' && c.value.includes(' | '));
    }
    return false;
  });
  return has2d ? build2dGrid(inner) : buildFlatGrid(inner);
}

// ---------------------------------------------------------------------------
// Tree traversal
// ---------------------------------------------------------------------------

function processChildren(children: any[]): void {
  let i = 0;
  while (i < children.length) {
    if (isParaWithText(children[i], '![')) {
      let j = i + 1;
      while (j < children.length && !isParaWithText(children[j], ']!')) j++;
      if (j < children.length) {
        const inner = children.slice(i + 1, j);
        const block = buildGridBlock(inner);
        children.splice(i, j - i + 1, block);
        continue;
      }
    }
    if (children[i]?.children) processChildren(children[i].children);
    i++;
  }
}

/**
 * `![` / `]!` 단독 라인으로 감싸인 영역을 GridBlock / GridItem MDX JSX 노드로 변환한다.
 * preprocessGridSource()를 source에 먼저 적용해야 *** 코드블럭이 동작한다.
 *
 * ## 지원 문법
 *
 * ### 인라인 열 구분 (컴팩트)
 * ```
 * ![
 * hello | world | !!
 * ]!
 * ```
 *
 * ### 행 × 열 그리드
 * ```
 * ![
 * A | B | C
 * ,
 * 전체 너비 콘텐츠       ← 자동 colspan
 * ,
 * ***python
 * print('code')
 * ***
 * ]!
 * ```
 *
 * ### 블록 콘텐츠 포함 (standalone | 사용)
 * ```
 * ![
 * 텍스트 셀
 * |
 * ***python
 * code
 * ***
 * |
 * 다른 셀
 * ]!
 * ```
 *
 * ### 구버전 호환 (comma / - item, 문법)
 * ```
 * ![
 * - hello,
 * - world,
 * ]!
 * ```
 */
export function remarkGridBlock() {
  return (tree: Root) => {
    processChildren(tree.children as any[]);
  };
}
