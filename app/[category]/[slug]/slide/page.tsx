// app/[category]/[slug]/slide/page.tsx
import { getPostData, getAllPostData } from '@/lib/posts';
import { splitContentIntoSlides } from '@/lib/slides';
import SlideContent from '@/components/SlideContent';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getTocFromMarkdown } from '@/lib/parseToc';
import { Metadata } from 'next';
import { isLocalDev, repoName } from '@/lib/config';
import { createSlideMdxComponents, mdxOptions } from '@/lib/mdx';
import { getPostBackgroundStyle } from '@/lib/background';

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
    const postUrl = `https://crusthack.github.io/${repoName}/${category}/${slug}`;
    const backgroundStyle = getPostBackgroundStyle({
        background: postData.background,
        category,
        slug,
    });

    const titleSlide = {
        content: '',
        h1: postData.title,
        h2: '',
        h3: '',
        level: 1,
        nextTitle: bodySlides.length > 0 ? (bodySlides[0].h1 || bodySlides[0].h2 || bodySlides[0].h3) : '',
        totalWeight: 0,
        complexCount: 0,
        remainingWeight: 0,
        elements: [],
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
        bodySlides.map(async (slide) => {
            const allocatedWeight = slide.complexCount > 0 ? slide.remainingWeight / slide.complexCount : 0;

            return {
                ...slide,
                renderedContent: (
                    <MDXRemote
                        source={slide.content}
                        components={createSlideMdxComponents({
                            category,
                            slug,
                            allocatedWeight,
                        })}
                        options={mdxOptions}
                    />
                )
            };
        })
    );

    const finalSlides = postData.titleSlide === false
        ? slidesWithRenderedContent
        : [titleSlide, ...slidesWithRenderedContent];

    return (
        <SlideContent
            slides={finalSlides}
            category={category}
            slug={slug}
            title={postData.title}
            backgroundStyle={backgroundStyle}
            toc={toc}
        />
    );
}
