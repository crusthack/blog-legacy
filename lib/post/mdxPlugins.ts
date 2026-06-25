import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';
import { remarkNormalizeCodeMeta } from '@/lib/remark/remarkNormalizeCodeMeta';
import { remarkGridBlock } from '@/lib/remark/remarkGridBlock';
import { rehypeInjectTitle } from '@/lib/rehype/rehypeInjectTitle';

export const prettyCodeOptions = {
  theme: 'dark-plus',
  keepBackground: true,
  defaultLang: { block: 'tsx' },
  langAlias: {
    js: 'javascript',
    ts: 'typescript',
    cs: 'csharp',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
  },
};

export const mdxPlugins: { remarkPlugins: any[]; rehypePlugins: any[] } = {
  remarkPlugins: [
    remarkGfm,
    remarkToc,
    remarkMath,
    remarkNormalizeCodeMeta,
    remarkGridBlock,
  ],
  rehypePlugins: [
    rehypeSlug,
    rehypeKatex,
    [rehypePrettyCode, prettyCodeOptions],
    rehypeInjectTitle,
  ],
};
