//  /app/[category]/[slug]/page.tsx`
import { getPostData, getAllPostData } from '@/lib/posts'
import BlogPost from '@/components/BlogPost';
import { notFound } from 'next/navigation';
import { getTocFromMarkdown } from '@/lib/parseToc';
import TOC from '@/components/TOC';
import CategorySidebar from '@/components/CategorySidebar';
import { Metadata } from 'next';
 
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
    const decodedCategory =
        typeof category === "string"
            ? decodeURIComponent(category).replace(/\+/g, " ").trim()
            : category;
 
    let post = getPostData(decodedCategory, slug);
    if (post === null) {
        if (!post) {
            post = getPostData("", "404");
        }
    }
 
    return {
        title: post!.title,
        description: post!.description,
    };
}
 
export default async function Post({ params }: { params: Promise<{ category: string, slug: string }> }) {
    const { category, slug } = await params
 
    const postData = getPostData(category, slug);
    if (postData === null) {
        return notFound();
    }
    const toc = getTocFromMarkdown(postData.content);
    return (
        <div className="blog-page grid grid-cols-[1fr_1000px_1fr] gap-8 w-full">
            <div className="flex justify-end min-w-0">
                <CategorySidebar currentCategory={category} />
            </div>
 
            {/* 중앙 콘텐츠 */}
            <div className="w-full mx-auto Markdown-body min-w-0">
                <BlogPost post={postData} showSlideButton={true} />
            </div>
 
            <div className="flex justify-start min-w-0">
                <TOC toc={toc} />
            </div>
        </div>
    )
}
