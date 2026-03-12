// /components/Navigation.tsx
"use client";

import { Post } from "@/lib/posts";
import { specialCategories } from "@/lib/config";
import Link from "next/link";
import { useState } from "react";

interface NaviProps {
  posts: Omit<Post, "content">[];
}

export default function Navi({ posts }: NaviProps) {
  const [openMenu, setOpenMenu] = useState<Record<string, boolean>>({});

  const open = (key: string) =>
    setOpenMenu(prev => ({ ...prev, [key]: true }));

  const close = (key: string) =>
    setOpenMenu(prev => ({ ...prev, [key]: false }));

  const specialKeys = specialCategories.map(sc => sc.category);

  const categories = Array.from(
    new Set(posts.map(post => post.category))
  )
    .filter(
      (category): category is string =>
        Boolean(category) && !specialKeys.includes(category)
    )
    .sort((a, b) => {
      const latestA = Math.max(
        ...posts
          .filter(p => p.category === a)
          .map(p => new Date(p.date).getTime())
      );

      const latestB = Math.max(
        ...posts
          .filter(p => p.category === b)
          .map(p => new Date(p.date).getTime())
      );

      return latestB - latestA;
    });

  const firstCategory = categories[0] ?? "";

  const postsBySpecial = new Map(
    specialCategories.map(sc => [
      sc.category,
      posts.filter(p => p.category === sc.category),
    ])
  );

  return (
    <nav className="relative w-full h-16 bg-transparent grid grid-cols-[1fr_1000px_1fr]">
      <div />

      {/* 가운데 네비 */}
      <div className="flex w-full items-center justify-between">
        {/* 좌측 */}
        <div className="flex items-center justify-start px-6 gap-10">
          <Link href="/" className="flex w-full text-xl items-center font-bold hover:opacity-70 transition">
            <img
              src="https://avatars.githubusercontent.com/u/161662653?v=4"
              alt="avatar"
              className="w-12 h-12 rounded-full"
            />
            <p>Main</p>
          </Link>
          <Link href="https://crusthack.github.io/catbattle/" target="_blank" className="whitespace-nowrap flex w-full text-xl items-center font-bold hover:opacity-70 transition">
            냥코DB
          </Link>
        </div>

        {/* 우측 */}
        <div className="flex items-center justify-end px-6 gap-2">
          <Link
            href="/about"
            className="px-3 py-2 hover:bg-gray-200 rounded transition"
          >
            소개
          </Link>

          {/* 문서 드롭다운 */}
          <div
            className="relative"
            onPointerEnter={() => open("docs")}
            onPointerLeave={() => close("docs")}
          >
            <Link
              href={`/${encodeURIComponent(firstCategory)}`}
              className="px-3 py-2 hover:bg-gray-200 rounded transition"
            >
              문서
            </Link>

            {openMenu["docs"] && (
              <div className="absolute left-0 min-w-[12rem] bg-white shadow-lg rounded-md border p-2 z-50">
                {categories.sort((a,b)=> b < a ? 1 : -1).map(cat => (
                  <Link
                    key={cat}
                    href={`/${encodeURIComponent(cat)}`}
                    className="block px-3 py-2 hover:bg-gray-100 rounded"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 스페셜 카테고리 (config 기반) */}
          {specialCategories.filter(sc=>sc.label).map(sc => {
            const items = postsBySpecial.get(sc.category) ?? [];

            return (
              <div
                key={sc.category}
                className="relative"
                onPointerEnter={() => open(sc.category)}
                onPointerLeave={() => close(sc.category)}
              >
                <Link
                  href={`/${sc.category}`}
                  className="px-3 py-2 hover:bg-gray-200 rounded transition"
                >
                  {sc.label}
                </Link>

                {openMenu[sc.category] && (
                  <div className="absolute left-0 min-w-[12rem] bg-white shadow-lg rounded-md border p-2 z-50">
                    {items.map(post => (
                      <Link
                        key={post.slug}
                        href={`/${encodeURIComponent(post.category)}/${encodeURIComponent(post.slug)}`}
                        className="block px-3 py-2 hover:bg-gray-100 rounded"
                      >
                        {post.slug}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div />
    </nav>
  );
}
