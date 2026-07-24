'use client';

import {
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react';

export interface SlideMemoPosition {
  x: number;
  y: number;
}

export interface SlideMemoSize {
  width: number;
  height: number;
}

interface SlideTextMemoProps {
  value: string;
  onChange: (value: string) => void;
  onDelete: () => void;
  position: SlideMemoPosition;
  onPositionChange: (position: SlideMemoPosition) => void;
  size: SlideMemoSize;
  onSizeChange: (size: SlideMemoSize) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function SlideTextMemo({
  value,
  onChange,
  onDelete,
  position,
  onPositionChange,
  size,
  onSizeChange,
  collapsed,
  onToggleCollapsed,
}: SlideTextMemoProps) {
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{
    clientX: number;
    clientY: number;
    width: number;
    height: number;
    left: number;
    top: number;
  } | null>(null);

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
    const collapsedCenterOffset = collapsed ? (size.height - 36) / 2 : 0;
    const y = (
      (event.clientY - dragOffsetRef.current.y + collapsedCenterOffset - rect.top) /
      rect.height
    ) * 100;
    onPositionChange({
      x: Math.min(90, Math.max(10, x)),
      y: Math.min(85, Math.max(15, y)),
    });
  };

  const stopDragging = () => {
    dragOffsetRef.current = null;
  };

  const startResizing = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.parentElement;
    if (!box) return;

    const rect = box.getBoundingClientRect();
    resizeStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const resize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = resizeStartRef.current;
    const box = event.currentTarget.parentElement;
    const container = box?.offsetParent as HTMLElement | null;
    if (!start || !container) return;

    const containerRect = container.getBoundingClientRect();
    const maxWidth = Math.max(280, containerRect.right - start.left);
    const maxHeight = Math.max(120, containerRect.bottom - start.top);
    const width = Math.min(maxWidth, Math.max(280, start.width + event.clientX - start.clientX));
    const height = Math.min(maxHeight, Math.max(120, start.height + event.clientY - start.clientY));

    onSizeChange({ width, height });
    onPositionChange({
      x: ((start.left + width / 2 - containerRect.left) / containerRect.width) * 100,
      y: ((start.top + height / 2 - containerRect.top) / containerRect.height) * 100,
    });
  };

  const stopResizing = () => {
    resizeStartRef.current = null;
  };

  return (
    <div
      className="slide-text-memo absolute z-[56] flex flex-col rounded-xl border border-gray-300 bg-white shadow-2xl"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${size.width}px`,
        height: collapsed ? '36px' : `${size.height}px`,
        transform: `translate(-50%, -${size.height / 2}px)`,
      }}
    >
      <div
        className={`flex h-9 shrink-0 cursor-move touch-none select-none items-center justify-between px-2 ${
          collapsed ? '' : 'border-b border-gray-200'
        }`}
        onPointerDown={startDragging}
        onPointerMove={drag}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        title="드래그하여 메모 이동"
      >
        <span className="text-xs font-bold tracking-wide text-gray-500">SLIDE MEMO</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onToggleCollapsed}
            className="flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            title={collapsed ? '메모 펼치기' : '메모 접기'}
            aria-label={collapsed ? '메모 펼치기' : '메모 접기'}
            aria-expanded={!collapsed}
          >
            <span aria-hidden="true">{collapsed ? '□' : '−'}</span>
          </button>
          <button
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-md text-xl leading-none text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            title="메모 삭제"
            aria-label="메모 삭제"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
      {!collapsed && (
        <>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={1}
            className="slide-text-memo-input block min-h-0 w-full flex-1 resize-none rounded-b-xl bg-transparent p-3 text-xl leading-relaxed text-gray-900 outline-none"
            placeholder="이 슬라이드에 메모를 입력하세요..."
            aria-label="슬라이드 메모"
          />
          <div
            className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none"
            onPointerDown={startResizing}
            onPointerMove={resize}
            onPointerUp={stopResizing}
            onPointerCancel={stopResizing}
            title="드래그하여 메모 크기 조절"
            aria-label="메모 크기 조절"
          >
            <span className="absolute bottom-1 right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-gray-400" />
          </div>
        </>
      )}
    </div>
  );
}
