import { visit } from 'unist-util-visit';

const quotedValuePattern = String.raw`"([^"]+)"|'([^']+)'|([^\s]+)`;
const titlePattern = new RegExp(String.raw`(?:^|\s)title=${quotedValuePattern}`);
const filePattern = new RegExp(String.raw`(?:^|\s)(?:filename|file)=${quotedValuePattern}`);
const bracketFilePattern = /^\s*\[([^\]]+)\]/;

function getMatchedValue(match: RegExpMatchArray | null) {
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function quoteMetaValue(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function appendTitleMeta(meta: string, filename: string) {
  if (titlePattern.test(meta)) return meta;
  return `${meta} title=${quoteMetaValue(filename)}`.trim();
}

function extractFilenameFromMeta(meta: string) {
  return (
    getMatchedValue(meta.match(titlePattern)) ??
    getMatchedValue(meta.match(filePattern)) ??
    getMatchedValue(meta.match(bracketFilePattern))
  );
}

/** 코드블록 메타에서 파일명을 추출해 title 속성으로 정규화한다.
 *  지원 형식: lang:filename | title="..." | file="..." | [filename]
 */
export function remarkNormalizeCodeMeta() {
  return (tree: any) => {
    visit(tree, 'code', (node: any) => {
      const meta = typeof node.meta === 'string' ? node.meta : '';
      let filename = extractFilenameFromMeta(meta);

      if (typeof node.lang === 'string') {
        const sep = node.lang.indexOf(':');
        if (sep > 0) {
          filename ??= node.lang.slice(sep + 1);
          node.lang = node.lang.slice(0, sep);
        }
      }

      if (filename) {
        node.meta = appendTitleMeta(meta, filename);
      }
    });
  };
}
