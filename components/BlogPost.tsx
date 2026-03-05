// components/BlogPost.tsx
'ues client'
import type { Post } from '@/lib/posts';
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkToc from 'remark-toc';
import rehypePrettyCode from "rehype-pretty-code";
import remarkMath from 'remark-math';
import CodeBlock from '@/components/CodeBlock';
import { MdxImage } from '@/components/MdxImage';
import { isLocalDev, repoName } from '@/lib/config';
import rehypeCodeTitles from 'rehype-code-titles';

 
const prettyOptions = {
    theme: "github-dark",
    keepBackground: true,
};
 
interface BlogPostProps {
    post: Post
}
 
function resolveLink(href: string): string {
    if (!href.startsWith('/')
    ) {
        return href;
    }
 
    const baseurl = isLocalDev ? `` : `/${repoName}`;
    return `${baseurl}${href}`;
}
 
export default function BlogPost({ post }: BlogPostProps) {
    return (
        <article className="w-full bg-gray-100 p-4 rounded-md min-h-screen">
 
            {/* 제목/날짜 */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
                <time className="text-gray-500">{post.date}</time>
 
                <p className="mt-3 text-lg text-gray-600 leading-relaxed max-w-prose">
                    {post.description}
                </p>
            </header>
 
 
            {/* 본문 전체 레이아웃 (flex + markdown-body) */}
            <div className="bg-gray-100">
                <div className="!bg-gray-100 p-6 rounded-md">
 
                    {/* markdown 본문 */}
                    <div className="markdown-body !bg-gray-100">
                        <MDXRemote
                            source={post.content}
                            components={{
                                pre: (props) => <CodeBlock {...props} />,
                                img: (props) => <MdxImage category={post.category} slug={post.slug} {...props} />,
                                ul: (props) => <ul className="list-disc space-y-2 ml-6 my-4" {...props} />,
                                ol: (props) => <ol className="list-decimal space-y-2 ml-6 my-4" {...props} />,
                                a: (props) => {
                                    const href = props.href || '';
                                    const url = resolveLink(href);
                                    return <a {...props} href={url} />;
                                }
                            }}
                            options={{
                                mdxOptions: {
                                    remarkPlugins: [remarkGfm, remarkToc, remarkMath],
                                    rehypePlugins: [rehypeCodeTitles, [rehypePrettyCode, prettyOptions], rehypeSlug, rehypeKatex],
                                },
                            }}
                        />
                    </div>
 
                </div>
            </div>
 
        </article>
    );
}