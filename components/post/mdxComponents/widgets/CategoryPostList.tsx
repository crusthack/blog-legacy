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
      <section className="my-6 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        표시할 글이 없습니다.
      </section>
    );
  }
  return (
    <section className="my-8 overflow-hidden rounded-md border border-gray-200 bg-[#f6f8fa]">
      <div className="flex items-baseline justify-between gap-4 border-b border-gray-200 bg-white px-3">
        <h2 className="m-0 text-lg font-bold text-gray-800 leading-none">{title}</h2>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[15px] font-mono font-bold text-blue-500">
          카테고리: {getCategoryLabel(category)} &nbsp; 포스트 개수: {posts.length}
        </span>
      </div>

      <ul className="!px-0 list-none p-0 !m-0">
        {posts.map((post) => (
          <li
            key={`${post.category}-${post.slug}`}
            className="w-full group relative bg-white/60 transition hover:bg-white !py-0 !mt-1 !mb-0"
          >
            <Link
              href={getPostHref(post.category, post.slug)}
              className="block px-4 py-2 no-underline"
            >
              <span className="absolute left-0 top-0 h-full w-1 bg-transparent transition group-hover:bg-blue-500" />
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-bold text-gray-800 transition group-hover:text-blue-600">
                  {post.title}
                </span>
                {post.date && (
                  <time className="text-xs font-mono text-gray-400">
                    {post.date}
                  </time>
                )}
              </div>
              {showDescription && post.description && (
                <p className="mt-1 mb-0 line-clamp-2 text-sm leading-relaxed text-gray-500">
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
