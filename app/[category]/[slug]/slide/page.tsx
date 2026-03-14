// app/[category]/[slug]/slide/page.tsx
import { getPostData, getAllPostData } from '@/lib/posts';
import { splitContentIntoSlides } from '@/lib/slides';
import SlideContent from '@/components/SlideContent';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkToc from 'remark-toc';
import rehypePrettyCode from "rehype-pretty-code";
import remarkMath from 'remark-math';
import CodeBlock from '@/components/CodeBlock';
import { MdxImage } from '@/components/MdxImage';
import rehypeCodeTitles from 'rehype-code-titles';
import { getTocFromMarkdown } from '@/lib/parseToc';
import { Metadata } from 'next';
import { isLocalDev, repoName } from '@/lib/config';

const prettyOptions = {
    theme: "github-dark",
    keepBackground: true,
};

export async function generateStaticParams() {
    const posts = getAllPostData();
    return posts.map((post) => ({
        category: post.category,
        slug: post.slug,
    }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
    const { category, slug } = await params;
    const post = getPostData(category, slug);
    
    return {
        title: post ? post.title : 'Slide',
        description: post?.description,
    };
}

export default async function SlidePage({ params }: { params: Promise<{ category: string, slug: string }> }) {
    const { category, slug } = await params;
    const postData = getPostData(category, slug);

    if (postData === null) {
        return notFound();
    }

    const toc = getTocFromMarkdown(postData.content);
    const bodySlides = splitContentIntoSlides(postData.content);
    
    const baseurl = isLocalDev ? '' : `https://crusthack.github.io/${repoName}`;
    const postUrl = `${baseurl}/${category}/${slug}`;

    const titleSlide = {
        content: '',
        h1: postData.title,
        h2: '',
        h3: '',
        level: 1,
        nextTitle: bodySlides.length > 0 ? (bodySlides[0].h1 || bodySlides[0].h2 || bodySlides[0].h3) : '',
        totalWeight: 0,
        renderedContent: (
            <div className="flex flex-col items-center justify-center text-center space-y-8 py-20 relative min-h-[60vh]">
                <div className="space-y-4">
                    <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-gray-900 leading-tight tracking-tighter">
                        {postData.title}
                    </h1>
                </div>
                {postData.description && (
                    <p className="text-2xl md:text-3xl text-gray-600 max-w-4xl mx-auto leading-relaxed whitespace-pre-line font-medium">
                        {postData.description}
                    </p>
                )}
                {postData.date && (
                    <div className="pt-12 text-gray-400 font-bold text-lg tracking-widest">
                        {postData.date}
                    </div>
                )}
                {/* 왼쪽 하단 포스트 URL 추가 */}
                <div className="absolute bottom-0 left-0 text-left">
                    <a 
                        href={postUrl} 
                        className="text-3xl font-mono text-blue-500 hover:text-blue-700 underline decoration-1 underline-offset-4 transition-colors"
                        target="_blank" 
                        rel="noopener noreferrer"
                    >
                        블로그 포스트: {postUrl}
                    </a>
                </div>
            </div>
        )
    };

    const slidesWithRenderedContent = await Promise.all(
        bodySlides.map(async (slide) => ({
            ...slide,
            renderedContent: (
                <MDXRemote
                    source={slide.content}
                    components={{
                        h1: (props) => <h1 className="text-7xl md:text-6xl text-[#204090] mb-8 tracking-tighter border-b-4 border-blue-500 pb-4 inline-block" {...props} />,
                        pre: (props) => <CodeBlock {...props} isSlide={true} totalWeight={slide.totalWeight} />,
                        img: (props) => <MdxImage category={category} slug={slug} {...props} />,
                        ul: (props) => <ul className="list-disc space-y-4 ml-8 my-6 text-xl md:text-2xl" {...props} />,
                        ol: (props) => <ol className="list-decimal space-y-4 ml-8 my-6 text-xl md:text-2xl" {...props} />,
                        p: (props) => <p className="text-xl md:text-2xl leading-relaxed mb-6" {...props} />,
                    }}
                    options={{
                        mdxOptions: {
                            remarkPlugins: [remarkGfm, remarkToc, remarkMath],
                            rehypePlugins: [rehypeCodeTitles, [rehypePrettyCode, prettyOptions], rehypeSlug, rehypeKatex],
                        },
                    }}
                />
            )
        }))
    );

    const finalSlides = [titleSlide, ...slidesWithRenderedContent];

    return (
        <SlideContent 
            slides={finalSlides} 
            category={category} 
            slug={slug} 
            title={postData.title}
            toc={toc}
        />
    );
}
