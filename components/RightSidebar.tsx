// /components/RightSidebar.tsx
import Link from "next/link";
import { getAllPostData as getAllPostsData } from "@/lib/posts";
import { usefulLinks } from "@/lib/config";
 
export default function RightSidebar() {
  const allPosts = getAllPostsData();
  const recentProjectPosts = allPosts
    .filter((p) => p.category === "Project")
    .slice(0, 5);
 
  return (
    <aside className="sticky top-20 space-y-2 mt-2">
      <section>
        <h2 className="font-bold text-xl mb-3">최근 프로젝트</h2>
        <ul className="space-y-1">
          {recentProjectPosts.map((post) => (
            <li key={`project-${post.slug}`}>
              <Link
                href={`/${encodeURIComponent(post.category!)}/${encodeURIComponent(post.slug)}`}
                className="block hover:text-blue-600"
              >
                {post.title ?? post.slug}
              </Link>
            </li>
          ))}
          {recentProjectPosts.length === 0 && (
            <li className="text-sm text-gray-500">프로젝트 글이 없습니다.</li>
          )}
        </ul>
      </section>
 
      <section>
        <h2 className="font-bold text-xl mt-5 mb-3">유용한 사이트</h2>
        <ul className="space-y-1">
          {usefulLinks.map((l) => (
            <li key={l.url}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-blue-600 mt-2"
              >
                {l.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}