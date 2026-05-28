// components/BlogPost.tsx
import type { Post } from '@/lib/posts';
import { MDXRemote } from 'next-mdx-remote/rsc';

import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';
import remarkMath from 'remark-math';

import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypePrettyCode from 'rehype-pretty-code';

import { visit } from 'unist-util-visit';

import CodeBlock from '@/components/CodeBlock';
import { MdxImage } from '@/components/MdxImage';
import { isLocalDev, repoName } from '@/lib/config';
import Link from 'next/link';

import LeftSidebar from '@/components/LeftSidebar';

function remarkNormalizeCodeMeta() {
  return (tree: any) => {
    visit(tree, 'code', (node: any) => {
      if (typeof node.lang === 'string' && node.lang.includes(':')) {
        const [lang, filename] = node.lang.split(':');

        node.lang = lang;
        node.meta = `${node.meta || ''} title="${filename}"`.trim();
      }
    });
  };
}

function rehypeInjectTitle() {
  return (tree: any) => {
    visit(tree, "element", (node: any) => {
      if (
        node.tagName === "figure" &&
        node.properties?.["data-rehype-pretty-code-figure"] !== undefined
      ) {
        const figcaption = node.children?.find(
          (child: any) => child.tagName === "figcaption"
        );

        const pre = node.children?.find(
          (child: any) => child.tagName === "pre"
        );

        const title = figcaption?.children?.[0]?.value;

        if (title && pre) {
          pre.properties = pre.properties || {};
          pre.properties["data-title"] = title;
        }
      }
    });
  };
}

const prettyOptions = {
  theme: 'github-dark',
  keepBackground: true,

  defaultLang: {
    block: 'tsx',
    // inline: 'inline',
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

interface BlogPostProps {
  post: Post;
  showSlideButton?: boolean;
}

function resolveLink(href: string): string {
  if (!href.startsWith('/')) {
    return href;
  }

  const baseurl = isLocalDev ? '' : `/${repoName}`;
  return `${baseurl}${href}`;
}

export default function BlogPost({
  post,
  showSlideButton = false,
}: BlogPostProps) {
  const slideUrl = `/${post.category}/${post.slug}/slide`;

  return (
    <article className="w-full bg-gray-100 p-4 rounded-md min-h-screen relative">
      {showSlideButton && (
        <div className="absolute top-4 right-4 z-10">
          <Link
            href={slideUrl}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#f6f8fa] hover:bg-[#eff2f5] text-[#24292f] border border-[#d0d7de] rounded-md font-medium text-sm shadow-sm transition-all active:bg-[#ebf0f4] active:shadow-inner"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-70"
            >
              <rect width="18" height="14" x="3" y="3" rx="2" />
              <path d="M7 21h10" />
              <path d="M12 17v4" />
            </svg>
            슬라이드로 보기
          </Link>
        </div>
      )}

      <header className="mb-8 pr-32">
        <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
        <time className="text-gray-500">{post.date}</time>

        <p className="mt-3 text-lg text-gray-600 leading-relaxed max-w-prose">
          {post.description}
        </p>
      </header>

      <div className="bg-gray-100">
        <div className="!bg-gray-100 p-6 rounded-md">
          <div className="markdown-body !bg-gray-100">
            <MDXRemote
              source={post.content}
              components={{
                pre: (props) => <CodeBlock {...props} />,
                img: (props) => (
                  <MdxImage
                    category={post.category}
                    slug={post.slug}
                    {...props}
                  />
                ),
                ul: (props) => (
                  <ul className="list-disc space-y-2 ml-6 my-4" {...props} />
                ),
                ol: (props) => (
                  <ol
                    className="list-decimal space-y-2 ml-6 my-4"
                    {...props}
                  />
                ),
                a: (props) => {
                  const href = props.href || '';
                  const url = resolveLink(href);

                  return <a {...props} href={url} />;
                },
              }}
              options={{
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
                    rehypeInjectTitle
                  ],
                },
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}