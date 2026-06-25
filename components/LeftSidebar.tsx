// /components/LeftSidebar.tsx
import Link from "next/link";
import { getAllPostData } from "@/lib/post/posts";
import { getCategoryHref, getCategoryLabel, getPostHref } from "@/lib/post/postPaths";
import { excludeCategories, Menu } from "@/lib/config";
 
export default function LeftSidebar() {
  const allPosts = getAllPostData();
  const recentPosts = allPosts.filter(post=> (post.category !== "Common") && (post.category !== "Temp")).slice(0, 4);
  const categories: string[] = Array.from(
    new Set(allPosts.map((post) => post.category).filter((cat): cat is string => Boolean(cat)))
  ).filter(ct => !excludeCategories.some(item => item===ct)).sort((a, b) => getCategoryLabel(a).localeCompare(getCategoryLabel(b)));
  
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
                href={getPostHref(post.category!, post.slug)}
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
                href={getCategoryHref(cat)}
                className="flex items-center justify-between hover:text-blue-600 whitespace-normal break-words"
              >
                <span>{getCategoryLabel(cat)} ({counts[cat] ?? 0})</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
