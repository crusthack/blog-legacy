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
  if (titlePattern.test(meta)) {
    return meta;
  }

  return `${meta} title=${quoteMetaValue(filename)}`.trim();
}

function extractFilenameFromMeta(meta: string) {
  return (
    getMatchedValue(meta.match(titlePattern)) ??
    getMatchedValue(meta.match(filePattern)) ??
    getMatchedValue(meta.match(bracketFilePattern))
  );
}

export function remarkNormalizeCodeMeta() {
  return (tree: any) => {
    visit(tree, 'code', (node: any) => {
      const meta = typeof node.meta === 'string' ? node.meta : '';
      let filename = extractFilenameFromMeta(meta);

      if (typeof node.lang === 'string') {
        const separatorIndex = node.lang.indexOf(':');

        if (separatorIndex > 0) {
          filename ??= node.lang.slice(separatorIndex + 1);
          node.lang = node.lang.slice(0, separatorIndex);
        }
      }

      if (filename) {
        node.meta = appendTitleMeta(meta, filename);
      }
    });
  };
}

export function rehypeInjectTitle() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (
        node.tagName === 'figure' &&
        node.properties?.['data-rehype-pretty-code-figure'] !== undefined
      ) {
        const figcaption = node.children?.find(
          (child: any) => child.tagName === 'figcaption'
        );

        const pre = node.children?.find(
          (child: any) => child.tagName === 'pre'
        );

        const title = figcaption?.children?.[0]?.value;

        if (title && pre) {
          pre.properties = pre.properties || {};
          pre.properties['data-title'] = title;
        }
      }
    });
  };
}
