import type { CSSProperties, ReactNode } from 'react';

interface GridItemProps {
  children?: ReactNode;
  span?: number | string;
}

export function GridItem({ children, span }: GridItemProps) {
  const s = Math.max(1, Number(span) || 1);
  const style: CSSProperties = s > 1 ? { gridColumn: `span ${s}` } : {};
  return (
    <div
      className="border border-transparent group-hover:border-gray-300 rounded-md p-3 overflow-hidden min-h-8 transition-colors [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
      style={style}
    >
      {children}
    </div>
  );
}

interface GridBlockProps {
  children?: ReactNode;
  cols?: number | string;
}

export default function GridBlock({ children, cols }: GridBlockProps) {
  const n = Math.max(1, Number(cols) || 1);
  return (
    <div
      className="my-4 w-full not-prose group"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: '0.75rem' }}
    >
      {children}
    </div>
  );
}
