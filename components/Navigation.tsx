// /components/Navigation.tsx
"use client";

import { getPostsByCategory, Post } from "@/lib/posts";
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
    <nav className="relative w-full h-16 bg-transparent grid grid-cols-[1fr_1000px_1fr]">
      <div />

      {/* 가운데 네비 */}
      <div className="flex w-full items-center justify-between">
        {/* 좌측 */}
        <div className="flex items-center justify-start px-6 gap-3">
          <Link href="/" className="flex w-full text-xl items-center font-bold hover:opacity-70 mr-6">
            <img
              src="https://avatars.githubusercontent.com/u/161662653?v=4"
              alt="avatar"
              className="w-max h-12 rounded-full"
              />
            Main
          </Link>
          <Link href="https://crusthack.github.io/catbattle/" target="_blank" className="whitespace-nowrap flex w-full text-xl items-center font-bold hover:opacity-70 transition">
            냥코DB
          </Link>
          <Link href="/game" className="flex w-full text-xl items-center font-bold hover:opacity-70 transition">
            공룡게임
          </Link>
        </div>

        {/* 우측 */}
        <div className="flex items-center justify-end px-6 gap-2">
          <Link
            href="/about"
            className="px-3 py-2 hover:bg-gray-200 rounded transition"
          >
            개발자 소개
          </Link>

          {/* 메뉴 (config 기반) */}
          {Menu.filter(sc=>sc.label).map(item => {
            const isSpecial = item.categories.length > 1;
            return (
              <div
                key={item.label}
                className="relative"
                onPointerEnter={() => open(item.label)}
                onPointerLeave={() => close(item.label)}
              >
                <Link
                  href={`/${item.categories[0]}`}
                  className="px-2 py-2 hover:bg-gray-200 rounded transition"
                >
                  {item.label}
                </Link>

                {openMenu[item.label] && (
                  <div className="absolute left-0 min-w-[12rem] bg-white shadow-lg rounded-md border p-2 z-50">
                    {
                      isSpecial ?
                        item.categories.map(ct =>{
                          return (
                          <Link
                            key={ct}
                            href={`/${encodeURIComponent(ct)}`}
                            className="block px-3 py-2 hover:bg-gray-100 rounded"
                          >
                            {ct}
                          </Link>
                        )})
                      :
                      posts
                        .filter(post => post.category === item.categories[0])
                        .sort((a, b) => {
                          if(a.slug === "index") return -1;
                          if(b.slug === "index") return 1;
                          return new Date(b.date).getTime() - new Date(a.date).getTime()
                        })
                        .map(post => (
                          <Link
                            key={post.slug}
                            href={`/${post.category}/${encodeURIComponent(post.slug)}`}
                            className="block px-3 py-2 hover:bg-gray-100 rounded"
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
