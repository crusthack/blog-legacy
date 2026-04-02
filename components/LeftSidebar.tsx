// /components/LeftSidebar.tsx
import Link from "next/link";
import { getAllPostData } from "@/lib/posts";
import { specialCategories } from "@/lib/config";
 
export default function LeftSidebar() {
  const allPosts = getAllPostData();
  const recentPosts = allPosts.filter(p => !specialCategories.some(sc => sc.category === p.category)).slice(0, 4);
  const categories: string[] = Array.from(
    new Set(allPosts.map((post) => post.category).filter((cat): cat is string => Boolean(cat)))
  ).filter((c): c is string => !specialCategories.some(sc => sc.category === c)) .sort();
  const counts = allPosts.reduce<Record<string, number>>((acc, p) => {
    const cat = p.category ?? "";
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});
 
  return (
    <aside className="sticky top-20 space-y-2 mt-2 max-w-[150px] ml-auto w-full">
      <section>
        <h2 className="font-bold text-xl mb-3">최근 글 보기</h2>
        <ul className="space-y-1">
          {recentPosts.map((post) => (
            <li key={`${post.category}-${post.slug}`}>
              <Link
                href={`/${encodeURIComponent(post.category!)}/${encodeURIComponent(post.slug)}`}
                className="block hover:text-blue-600 truncate"
                title={post.title ?? post.slug}
              >
                {post.title ?? post.slug}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-bold text-xl mt-5 mb-3">카테고리 목록</h2>
        <ul className="space-y-1">
          {categories.map((cat) => (
            <li key={cat}>
              <Link
                href={`/${encodeURIComponent(cat)}`}
                className="flex items-center justify-between hover:text-blue-600 whitespace-normal break-words"
              >
                <span>{cat} ({counts[cat] ?? 0})</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}