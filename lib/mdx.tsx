import type { ComponentProps } from 'react';
import type { MDXRemoteProps } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';

import CipherPlayground from '@/components/mdxComponents/CipherPlayground';
import CodeBlock from '@/components/CodeBlock';
import CategoryPostLinks from '@/components/CategoryPostLinks';
import FancyShowcase from '@/components/mdxComponents/FancyShowcase';
import JavaScriptPlayground from '@/components/mdxComponents/JavaScriptPlayground';
import MdxHistoryViewer from '@/components/mdxComponents/MdxHistoryViewer';
import PythonPlayground from '@/components/mdxComponents/PythonPlayground';
import SeminarInfo from '@/components/mdxComponents/SeminarInfo';
import { MdxImage } from '@/components/MdxImage';
import { isLocalDev, repoName } from '@/lib/config';
import { rehypeInjectTitle, remarkNormalizeCodeMeta } from '@/lib/codeMeta';

type MdxComponents = Record<string, any>;

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

const prettyOptions = {
  theme: 'dark-plus',
  keepBackground: true,
  defaultLang: {
    block: 'tsx',
  },
  langAlias: {
    js: 'javascript',
    ts: 'typescript',
    cs: 'csharp',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
  },
};

export const mdxOptions: MDXRemoteProps['options'] = {
  mdxOptions: {
    remarkPlugins: [
      remarkGfm,
      remarkToc,
      remarkMath,
      remarkNormalizeCodeMeta,
    ],
    rehypePlugins: [
      rehypeSlug,
      rehypeKatex,
      [rehypePrettyCode, prettyOptions],
      rehypeInjectTitle,
    ],
  },
};

const interactiveMdxComponents = {
  CipherPlayground,
  FancyShowcase,
  JavaScriptPlayground,
  // MdxHistoryViewer,
  PythonPlayground,
  SeminarInfo,
};

function resolveLink(href: string): string {
  if (!href.startsWith('/')) {
    return href;
  }

  const baseurl = isLocalDev ? '' : `/${repoName}`;
  return `${baseurl}${href}`;
}

export function createPostMdxComponents({
  category,
  slug,
}: {
  category: string;
  slug: string;
}): MdxComponents {
  return {
    pre: (props: ComponentProps<'pre'>) => <CodeBlock {...props} />,
    img: (props: ComponentProps<'img'>) => (
      <MdxImage category={category} slug={slug} {...props} />
    ),
    ul: ({ className, ...props }: ComponentProps<'ul'>) => (
      <ul
        className={joinClassNames('!list-disc space-y-2 ml-6 my-4 [&_ul]:!list-disc', className)}
        {...props}
      />
    ),
    ol: ({ className, ...props }: ComponentProps<'ol'>) => (
      <ol
        className={joinClassNames('!list-decimal space-y-2 ml-6 my-4 [&_ol]:!list-decimal', className)}
        {...props}
      />
    ),
    a: (props: ComponentProps<'a'>) => {
      const href = props.href || '';
      const url = resolveLink(href);

      return <a {...props} href={url} />;
    },
    CategoryPostLinks: (props: any) => (
      <CategoryPostLinks category={category} currentSlug={slug} {...props} />
    ),
    ...interactiveMdxComponents,
  };
}

export function createSlideMdxComponents({
  category,
  slug,
  allocatedWeight,
}: {
  category: string;
  slug: string;
  allocatedWeight: number;
}): MdxComponents {
  return {
    h1: (props: ComponentProps<'h1'>) => (
      <h1
        className="!text-7xl md:text-9xl mb-8 tracking-tighter border-b-4 pb-4 inline-block"
        {...props}
      />
    ),
    h2: (props: ComponentProps<'h1'>) => (
      <h2
        className="!text-7xl ml-10"
        {...props}
      />
    ),
    h3: (props: ComponentProps<'h1'>) => (
      <h3
        className="!text-5xl ml-10"
        {...props}
      />
    ),
    h4: (props: ComponentProps<'h1'>) => (
      <h4
        className="!text-5xl ml-10"
        {...props}
      />
    ),
    h5: (props: ComponentProps<'h1'>) => (
      <h5
        className="!text-4xl ml-10 !mb-7"
        {...props}
      />
    ),
    pre: (props: ComponentProps<'pre'>) => (
      <CodeBlock {...props} isSlide={true} weight={allocatedWeight} />
    ),
    img: (props: ComponentProps<'img'>) => (
      <MdxImage
        category={category}
        slug={slug}
        isSlide={true}
        weight={allocatedWeight}
        {...props}
      />
    ),
    ul: ({ className, ...props }: ComponentProps<'ul'>) => (
      <ul
        className={joinClassNames('!list-disc space-y-10 ml-8 my-6 text-xl md:text-4xl [&_ul]:!list-disc', className)}
        {...props}
      />
    ),
    ol: ({ className, ...props }: ComponentProps<'ol'>) => (
      <ol
        className={joinClassNames('!list-decimal space-y-10 ml-8 my-6 text-xl md:text-4xl [&_ol]:!list-decimal', className)}
        {...props}
      />
    ),
    p: (props: ComponentProps<'p'>) => (
      <p className="text-xl md:text-5xl leading-relaxed mb-6" {...props} />
    ),
    table: ({ className, ...props }: ComponentProps<'table'>) => (
      <div className="mdx-table-frame my-6 max-w-full overflow-auto">
        <table
          className={joinClassNames(
            'w-full min-w-full table-auto border-collapse border border-gray-200',
            className
          )}
          {...props}
        />
      </div>
    ),
    th: ({ className, ...props }: ComponentProps<'th'>) => (
      <th
        className={joinClassNames('break-words border border-gray-200 px-3 py-2 align-top', className)}
        {...props}
      />
    ),
    td: ({ className, ...props }: ComponentProps<'td'>) => (
      <td
        className={joinClassNames('break-words border border-gray-200 px-3 py-2 align-top', className)}
        {...props}
      />
    ),
    CategoryPostLinks: (props: any) => (
      <CategoryPostLinks category={category} currentSlug={slug} {...props} />
    ),
    ...interactiveMdxComponents,
  };
}
