// /components/Navigation.tsx
"use client";

import type { Post } from "@/lib/post/posts";
import { getCategoryHref, getCategoryLabel, getPostHref } from "@/lib/post/postPaths";
import { Menu } from "@/lib/config";
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

  return (
    <nav className="site-nav relative grid h-16 w-full grid-cols-[1fr_1000px_1fr] border-b border-gray-200 bg-gray-50 transition-colors dark:border-gray-800 dark:bg-[#292929]">
      <div />

      {/* 가운데 네비 */}
      <div className="grid w-full grid-cols-2 items-center">
        {/* 좌측 */}
        <div className="flex items-center justify-start gap-4 px-6">
          <Link href="/" className="flex items-center text-xl font-bold hover:opacity-70 whitespace-nowrap mr-1">
            <img
              src="https://avatars.githubusercontent.com/u/161662653?v=4"
              alt="avatar"
              className="w-auto h-12 rounded-full mr-2"
            />
            Main
          </Link>
          <Link href="/upload" className="flex items-center text-l font-bold hover:opacity-70 transition whitespace-nowrap">
            MDX
          </Link>
          <Link href="/game" className="flex items-center text-l font-bold hover:opacity-70 transition whitespace-nowrap">
            웹게임
          </Link>
          <Link href="https://crusthack.github.io/catbattle/" target="_blank" className="flex items-center text-l font-bold hover:opacity-70 transition whitespace-nowrap">
            냥코DB
          </Link>
          <Link href="https://crusthack.github.io/UnityProject/" target="_blank" className="flex items-center text-l font-bold hover:opacity-70 transition whitespace-nowrap">
            유니티 프로젝트
          </Link>
        </div>

        {/* 우측 */}
        <div className="flex items-center justify-end gap-.5 px-6">
          <Link
            href="/about"
            className="site-nav-link px-3 py-2 hover:bg-gray-200 rounded transition whitespace-nowrap"
          >
            개발자 소개
          </Link>

          {/* 메뉴 (config 기반) */}
          {Menu.filter(sc => sc.label).map(item => {
            const isSpecial = item.categories.length > 1;
            return (
              <div
                key={item.label}
                className="relative"
                onPointerEnter={() => open(item.label)}
                onPointerLeave={() => close(item.label)}
              >
                <Link
                  href={getCategoryHref(item.categories[0])}
                  className="site-nav-link block px-2 py-2 hover:bg-gray-200 rounded transition whitespace-nowrap"
                >
                  {item.label}
                </Link>

                {openMenu[item.label] && (
                  <div className="site-nav-dropdown absolute left-0 min-w-[12rem] bg-white shadow-lg rounded-md border p-2 z-50">
                    {
                      isSpecial ?
                        item.categories.map(ct => {
                          return (
                            <Link
                              key={ct}
                              href={getCategoryHref(ct)}
                              className="site-nav-dropdown-link block px-3 py-2 hover:bg-gray-100 rounded whitespace-nowrap"
                            >
                              {getCategoryLabel(ct)}
                            </Link>
                          )
                        })
                        :
                        posts
                          .filter(post => post.category === item.categories[0])
                          .sort((a, b) => {
                            if (a.slug === "index") return -1;
                            if (b.slug === "index") return 1;
                            return new Date(b.date).getTime() - new Date(a.date).getTime()
                          })
                          .map(post => (
                            <Link
                              key={post.slug}
                              href={getPostHref(post.category, post.slug)}
                              className="site-nav-dropdown-link block px-3 py-2 hover:bg-gray-100 rounded whitespace-nowrap"
                            >
                              {post.title}
                            </Link>
                          ))
                    }
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
