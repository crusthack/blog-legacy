import BlogPost from '@/components/BlogPost';
import CategorySidebar from '@/components/CategorySidebar';
import SlideDeck from '@/components/SlideDeck';
import TOC from '@/components/TOC';
import { getTocFromMarkdown } from '@/lib/parseToc';
import {
  getAllPostData,
  getPostData,
} from '@/lib/posts';
import {
  getCanonicalCategoryPath,
  getCategoryFromSegments,
  getCategoryIndexHref,
  getRouteFromSegments,
  getStaticParamsFromPosts,
} from '@/lib/postRoutes';
import { getPostHref } from '@/lib/postPaths';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

export async function generateStaticParams() {
  const posts = getAllPostData();
  return getStaticParamsFromPosts(posts);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}): Promise<Metadata> {
  const { segments } = await params;
  const route = getRouteFromSegments(segments);
  const post = route ? getPostData(route.category, route.slug) : null;
  const fallbackPost = post ?? getPostData('', '404');

  return {
    title: route?.isSlide && post ? post.title : fallbackPost?.title,
    description: fallbackPost?.description,
  };
}

export default async function Post({ params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params;
  const route = getRouteFromSegments(segments);
  const postData = route ? getPostData(route.category, route.slug) : null;

  if (!postData) {
    const category = getCategoryFromSegments(segments);
    const indexPost = getPostData(category, 'index');
    if (indexPost) {
      redirect(getCategoryIndexHref(category));
    }

    const posts = getAllPostData()
      .filter((post) => post.category === category)
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    if (posts.length > 0) {
      redirect(getPostHref(category, posts[0].slug));
    }

    const encodedCategory = getCanonicalCategoryPath(category);
    if (encodedCategory !== category) {
      redirect(`/${encodedCategory}`);
    }

    return notFound();
  }

  const toc = getTocFromMarkdown(postData.content);

  if (route?.isSlide) {
    return <SlideDeck post={postData} toc={toc} />;
  }

  return (
    <div className="blog-page grid grid-cols-[1fr_1000px_1fr] gap-8 w-full">
      <div className="flex justify-end min-w-0">
        <CategorySidebar currentCategory={postData.category} />
      </div>

      <div className="w-full mx-auto Markdown-body min-w-0">
        <BlogPost post={postData} showSlideButton={true} />
      </div>

      <div className="flex justify-start min-w-0">
        <TOC toc={toc} />
      </div>
    </div>
  );
}
