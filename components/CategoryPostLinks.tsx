import Link from 'next/link';
import { getPostsByCategory } from '@/lib/posts';

interface CategoryPostLinksProps {
  category: string;
  currentSlug?: string;
  excludeIndex?: boolean;
  showDescription?: boolean;
  title?: string;
  limit?: number;
}

export default function CategoryPostLinks({
  category,
  currentSlug,
  excludeIndex = true,
  showDescription = true,
  title = '카테고리 글 목록',
  limit,
}: CategoryPostLinksProps) {
  const posts = getPostsByCategory(category)
    .filter((post) => !excludeIndex || post.slug !== 'index')
    .filter((post) => post.slug !== currentSlug)
    .slice(0, limit ?? undefined);

  if (posts.length === 0) {
    return (
      <section className="my-6 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        표시할 글이 없습니다.
      </section>
    );
  }

  return (
    <section className="my-8 overflow-hidden rounded-md border border-gray-200 bg-[#f6f8fa]">
      <div className="flex items-baseline justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3">
        <h2 className="m-0 text-lg font-bold text-gray-800">{title}</h2>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-mono font-bold text-gray-500">
          {category} · {posts.length}
        </span>
      </div>

      <ul className="m-0 list-none divide-y divide-gray-200 p-0">
        {posts.map((post) => (
          <li
            key={`${post.category}-${post.slug}`}
            className="group relative bg-white/60 transition hover:bg-white"
          >
            <Link
              href={`/${encodeURIComponent(post.category)}/${encodeURIComponent(post.slug)}`}
              className="block px-4 py-3 pl-5 no-underline"
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
