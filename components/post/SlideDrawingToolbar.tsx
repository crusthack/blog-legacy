'use client';

export type DrawingTool = 'pen' | 'eraser';
export const MIN_DRAWING_SIZE = 2;
export const MAX_DRAWING_SIZE = 42;

interface SlideDrawingToolbarProps {
  tool: DrawingTool;
  color: string;
  size: number;
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onClear: () => void;
  onCreateSlide: () => void;
  onDeleteSlide?: () => void;
}

export const DRAWING_PRESET_COLORS = [
  '#000000',
  '#ffffff',
  '#ff0000',
  '#0000ff',
  '#00ff00',
  '#ffff00',
] as const;

export default function SlideDrawingToolbar({
  tool,
  color,
  size,
  onToolChange,
  onColorChange,
  onSizeChange,
  onClear,
  onCreateSlide,
  onDeleteSlide,
}: SlideDrawingToolbarProps) {
  const selectColor = (nextColor: string) => {
    onColorChange(nextColor);
    onToolChange('pen');
  };

  return (
    <div className="flex items-center gap-1 mr-1">
      {DRAWING_PRESET_COLORS.map((presetColor, index) => (
        <button
          key={presetColor}
          onClick={() => selectColor(presetColor)}
          className={`w-6 h-6 rounded-full border-2 transition-transform ${
            tool === 'pen' && color === presetColor
              ? 'border-gray-900 scale-110'
              : 'border-gray-300 shadow-sm'
          }`}
          style={{ backgroundColor: presetColor }}
          title={index < 4 ? `${index + 1}번 붓 색상` : '붓 색상'}
        />
      ))}
      <label
        className={`relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 bg-white ${
          tool === 'pen' && !DRAWING_PRESET_COLORS.includes(color as typeof DRAWING_PRESET_COLORS[number]) ? 'border-gray-900' : 'border-gray-300'
        }`}
        title="RGB 색상 선택"
      >
        <input
          type="color"
          value={color}
          onChange={(event) => selectColor(event.target.value)}
          className="absolute inset-[-8px] h-12 w-12 cursor-pointer border-0 p-0"
          aria-label="RGB 붓 색상 선택"
        />
      </label>
      <button
        onClick={() => onToolChange(tool === 'eraser' ? 'pen' : 'eraser')}
        className={`flex h-10 items-center gap-1 rounded-md border px-2 text-xs font-bold transition-colors ${
          tool === 'eraser'
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
        }`}
        title="부분 지우개 (e)"
        aria-pressed={tool === 'eraser'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 21-4-4 10.5-10.5a2.8 2.8 0 0 1 4 0 2.8 2.8 0 0 1 0 4L7 21Z" />
          <path d="m8.5 11.5 4 4" />
          <path d="M7 21h10" />
        </svg>
        Erase
      </button>
      <input
        type="range"
        min={MIN_DRAWING_SIZE}
        max={MAX_DRAWING_SIZE}
        value={size}
        onChange={(event) => onSizeChange(Number(event.target.value))}
        className="w-20"
        title="펜 굵기"
      />
      <button
        onClick={onClear}
        className="px-2 h-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors cursor-pointer text-xs font-bold text-gray-700"
        title="그림 지우기 (c)"
      >
        Clear
      </button>
      <button
        onClick={onCreateSlide}
        className="flex h-10 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100"
        title="현재 슬라이드 다음에 필기 슬라이드 추가"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        Note
      </button>
      {onDeleteSlide && (
        <button
          onClick={onDeleteSlide}
          className="flex h-10 items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"
          title="현재 임시 슬라이드 삭제"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
          </svg>
          Delete
        </button>
      )}
    </div>
  );
}
