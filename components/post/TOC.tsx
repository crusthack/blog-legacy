// /components/post/TOC.tsx
"use client";

import { TocItem } from "@/lib/post/parseToc";
import { useDynamicHeading } from "@/lib/post/dynamicHeading";

export default function TOC({ toc }: { toc: TocItem[] }) {
  const activeId = useDynamicHeading();
  const activeItem = toc.find(t => t.id === activeId) || null;

  // 1. active → root 까지의 경로 계산
  const activePath = new Set<string>();
  let cur = activeItem;

  while (cur) {
    activePath.add(cur.id);
    cur = cur.parentId
      ? toc.find(t => t.id === cur!.parentId) || null
      : null;
  }

  // 2. 렌더링 조건
  const shouldShow = (item: TocItem) => {
    // 모든 최상위 헤더는 항상 표시
    if (item.level === 1) return true;

    // active / parent / grandparent / ...
    if (activePath.has(item.id)) return true;

    // activePath에 속한 모든 노드의 자식들
    if (item.parentId && activePath.has(item.parentId)) return true;

    return false;
  };

  return (
    <aside className="post-toc sticky top-20 h-fit min-w-0 max-h-[80vh] overflow-auto">
      <h3 className="post-toc-title font-bold mb-4">목차</h3>

      <ul className="space-y-2">
        {toc.map(item => {
          if (!shouldShow(item)) return null;

          const isActive = item.id === activeId;

          return (
            <li
              key={item.id}
              style={{ paddingLeft: (item.level - 1) * 16 }}
            >
              <a
                href={`#${item.id}`}
                className={`post-toc-link text-sm hover:underline break-words block ${
                  isActive
                    ? "post-toc-link-active font-bold text-blue-500"
                    : "post-toc-link-idle text-gray-700"
                }`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
