// Post-aware MDX component.
import Link from 'next/link';
import { getPostsByCategory } from '@/lib/post/posts';
import { getCategoryLabel, getPostHref } from '@/lib/post/postPaths';

interface CategoryPostListProps {
  category: string;
  currentSlug?: string;
  excludeIndex?: boolean;
  showDescription?: boolean;
  title?: string;
  limit?: number;
}

export default function CategoryPostList({
  category,
  currentSlug,
  excludeIndex = true,
  showDescription = true,
  title = '카테고리 글 목록',
  limit,
}: CategoryPostListProps) {
  const posts = getPostsByCategory(category)
    .filter((post) => !excludeIndex || post.slug !== 'index')
    .filter((post) => post.slug !== currentSlug)
    .slice(0, limit ?? undefined)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (posts.length === 0) {
    return (
      <section className="category-post-list-empty my-6 rounded-md border border-dashed px-4 py-3 text-sm">
        표시할 글이 없습니다.
      </section>
    );
  }
  return (
    <section className="category-post-list my-8 overflow-hidden rounded-md border">
      <div className="category-post-list-header flex items-baseline justify-between gap-4 border-b px-3">
        <h2 className="category-post-list-heading m-0 text-lg font-bold leading-none">{title}</h2>
        <span className="category-post-list-badge shrink-0 rounded-full px-2.5 py-1 text-[15px] font-mono font-bold">
          카테고리: {getCategoryLabel(category)} &nbsp; 포스트 개수: {posts.length}
        </span>
      </div>

      <ul className="!px-0 list-none p-0 !m-0">
        {posts.map((post) => (
          <li
            key={`${post.category}-${post.slug}`}
            className="category-post-list-item group relative w-full transition !py-0 !mt-1 !mb-0"
          >
            <Link
              href={getPostHref(post.category, post.slug)}
              className="category-post-list-link block px-4 py-2 no-underline"
            >
              <span className="category-post-list-accent absolute left-0 top-0 h-full w-1 bg-transparent transition" />
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="category-post-list-title font-bold transition">
                  {post.title}
                </span>
                {post.date && (
                  <time className="category-post-list-date text-xs font-mono">
                    {post.date}
                  </time>
                )}
              </div>
              {showDescription && post.description && (
                <p className="category-post-list-description mt-1 mb-0 line-clamp-2 text-sm leading-relaxed">
                  {post.description}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
