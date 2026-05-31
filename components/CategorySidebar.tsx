// /components/CategorySidebar.tsx
import Link from "next/link";
import { getPostsByCategory } from "@/lib/posts";
import { getCategoryLabel, getPostHref } from "@/lib/postPaths";
 
export default function CategorySidebar({ currentCategory }: { currentCategory: string }) {
  const posts = getPostsByCategory(currentCategory);
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.slug === 'index') return -1;
    if (b.slug === 'index') return 1;
    return a.title.localeCompare(b.title); 
  });
 
  return (
    <aside className="sticky top-20 space-y-2 mt-2 max-w-[200px] w-full">
      <h2 className="font-bold text-xl mb-3 capitalize break-words">{getCategoryLabel(currentCategory)}</h2>  
      <ul className="space-y-1">
        {sortedPosts.map(post => (
          <li key={post.slug}>
            <Link
              href={getPostHref(currentCategory, post.slug)}
              className="block hover:text-blue-600 whitespace-normal break-words"
            >
              {post.title ?? post.slug}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
