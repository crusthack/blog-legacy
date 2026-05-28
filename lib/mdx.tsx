import type { ComponentProps } from 'react';
import type { MDXRemoteProps } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';

import CipherPlayground from '@/components/CipherPlayground';
import CodeBlock from '@/components/CodeBlock';
import CategoryPostLinks from '@/components/CategoryPostLinks';
import FancyShowcase from '@/components/FancyShowcase';
import { MdxImage } from '@/components/MdxImage';
import { isLocalDev, repoName } from '@/lib/config';
import { rehypeInjectTitle, remarkNormalizeCodeMeta } from '@/lib/codeMeta';

type MdxComponents = Record<string, any>;

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
    ul: (props: ComponentProps<'ul'>) => (
      <ul className="list-disc space-y-2 ml-6 my-4" {...props} />
    ),
    ol: (props: ComponentProps<'ol'>) => (
      <ol className="list-decimal space-y-2 ml-6 my-4" {...props} />
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
        className="text-7xl md:text-6xl text-[#204090] mb-8 tracking-tighter border-b-4 border-blue-500 pb-4 inline-block"
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
    ul: (props: ComponentProps<'ul'>) => (
      <ul className="list-disc space-y-4 ml-8 my-6 text-xl md:text-2xl" {...props} />
    ),
    ol: (props: ComponentProps<'ol'>) => (
      <ol className="list-decimal space-y-4 ml-8 my-6 text-xl md:text-2xl" {...props} />
    ),
    p: (props: ComponentProps<'p'>) => (
      <p className="text-xl md:text-2xl leading-relaxed mb-6" {...props} />
    ),
    table: (props: ComponentProps<'table'>) => (
      <div className="my-6 overflow-hidden">
        <table className="min-w-full border-collapse border border-gray-200" {...props} />
      </div>
    ),
    CategoryPostLinks: (props: any) => (
      <CategoryPostLinks category={category} currentSlug={slug} {...props} />
    ),
    ...interactiveMdxComponents,
  };
}
