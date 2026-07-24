'use client';

import { useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

export interface SlideMemoPosition {
  x: number;
  y: number;
}

export function getMemoWidthCh(value: string) {
  const longestLineLength = Math.max(0, ...value.split(/\r?\n/).map((line) => Array.from(line).length));
  return Math.min(70, Math.max(32, longestLineLength + 6));
}

interface SlideTextMemoProps {
  value: string;
  onChange: (value: string) => void;
  onDelete: () => void;
  position: SlideMemoPosition;
  onPositionChange: (position: SlideMemoPosition) => void;
}

export default function SlideTextMemo({
  value,
  onChange,
  onDelete,
  position,
  onPositionChange,
}: SlideTextMemoProps) {
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const widthCh = getMemoWidthCh(value);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const maxHeight = Math.max(160, window.innerHeight * 0.45);
    const nextHeight = Math.min(maxHeight, Math.max(96, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value, widthCh]);

  const startDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;

    const box = event.currentTarget.parentElement;
    const container = box?.offsetParent as HTMLElement | null;
    if (!box || !container) return;

    const boxRect = box.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - (boxRect.left + boxRect.width / 2),
      y: event.clientY - (boxRect.top + boxRect.height / 2),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragOffsetRef.current) return;

    const container = event.currentTarget.parentElement?.offsetParent as HTMLElement | null;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - dragOffsetRef.current.x - rect.left) / rect.width) * 100;
    const y = ((event.clientY - dragOffsetRef.current.y - rect.top) / rect.height) * 100;
    onPositionChange({
      x: Math.min(90, Math.max(10, x)),
      y: Math.min(85, Math.max(15, y)),
    });
  };

  const stopDragging = () => {
    dragOffsetRef.current = null;
  };

  return (
    <div
      className="slide-text-memo absolute z-[56] max-w-[70vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-300 bg-white shadow-2xl"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `min(${widthCh}ch, 70vw)`,
      }}
    >
      <div
        className="flex h-9 cursor-move touch-none select-none items-center justify-between border-b border-gray-200 px-2"
        onPointerDown={startDragging}
        onPointerMove={drag}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        title="드래그하여 메모 이동"
      >
        <span className="text-xs font-bold tracking-wide text-gray-500">SLIDE MEMO</span>
        <div className="flex items-center">
          <button
            onClick={onDelete}
            className="rounded px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
            title="메모 삭제"
          >
            Delete
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={1}
        className="slide-text-memo-input block w-full resize-none rounded-b-xl bg-transparent p-3 text-xl leading-relaxed text-gray-900 outline-none"
        placeholder="이 슬라이드에 메모를 입력하세요..."
        aria-label="슬라이드 메모"
      />
    </div>
  );
}
