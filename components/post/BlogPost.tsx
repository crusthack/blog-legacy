// components/post/BlogPost.tsx
import type { Post } from '@/lib/post/posts';
import { getPostSlideHref } from '@/lib/post/postPaths';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { createPostMdxComponents, mdxOptions } from '@/lib/post/mdx';
import { preprocessGridSource } from '@/lib/remark/remarkGridBlock';
import Link from 'next/link';

interface BlogPostProps {
  post: Post;
  showSlideButton?: boolean;
}

export default function BlogPost({
  post,
  showSlideButton = false,
}: BlogPostProps) {
  const slideUrl = `${getPostSlideHref(post.category, post.slug)}?reset=1`;
  const mdxComponents = createPostMdxComponents({
    category: post.category,
    slug: post.slug,
  });

  return (
    <article data-view="post" className="post-view w-full p-4 rounded-md min-h-screen relative">
      {showSlideButton && (
        <div className="absolute top-4 right-4 z-10">
          <Link
            href={slideUrl}
            className="post-slide-link flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-lg font-extrabold shadow-sm transition-all active:translate-y-px active:shadow-inner"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
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

        <p className="post-view-muted mt-3 text-lg text-gray-600 leading-relaxed max-w-prose">
          {post.description}
        </p>
      </header>

      <div className="post-view-body">
        <div className="post-view-markdown p-6 rounded-md">
          <div className="content-markdown markdown-body">
            <MDXRemote
              source={preprocessGridSource(post.content)}
              components={mdxComponents}
              options={mdxOptions}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
