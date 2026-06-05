// components/SlideContent.tsx
'use client'

import { useState, useEffect, useRef, ReactNode, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import { isLocalDev } from '@/lib/config';
import { getPostHref } from '@/lib/postPaths';

type SlideTheme = 'system' | 'light' | 'dark';

interface ContentElement {
  type: 'simple' | 'complex' | 'html' | 'image' | 'code' | 'math' | 'table';
  content: string;
  lines: number;
  weight: number;
}

interface SlideContentProps {
  slides: {
    content: string;
    h1: string;
    h2: string;
    h3: string;
    level: number;
    nextTitle: string;
    totalWeight: number;
    complexCount: number;
    remainingWeight: number;
    elements: ContentElement[];
    renderedContent: ReactNode;
  }[];
  category: string;
  slug: string;
  title: string;
  backgroundStyle?: CSSProperties;
  toc: {
    level: number;
    text: string;
    id: string;
  }[];
  returnHref?: string;
  onLeave?: () => void;
}

export default function SlideContent({ slides, category, slug, title, backgroundStyle, toc, returnHref, onLeave }: SlideContentProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSlideIndexReady, setIsSlideIndexReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenChromeVisible, setIsFullscreenChromeVisible] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState<string>('');
  const [slideScale, setSlideScale] = useState(1);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [penColor, setPenColor] = useState('#ef4444');
  const [penSize, setPenSize] = useState(4);
  const fullscreenChromeTimerRef = useRef<number | null>(null);
  const slideViewportRef = useRef<HTMLDivElement>(null);
  const slideContentRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const router = useRouter();
  const slideStorageKey = `slide-progress:${category}/${slug}`;
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const slideThemeStorageKey = `slide-theme:${category}/${slug}`;
  const [slideTheme, setSlideTheme] = useState<SlideTheme>('system');
  const [isSlideThemeReady, setIsSlideThemeReady] = useState(false);
  const effectiveSlideTheme = slideTheme === 'system' ? undefined : slideTheme;
  const themedBackgroundStyle = slideTheme === 'system' ? backgroundStyle : undefined;
  const themeLabel = slideTheme === 'system' ? 'Auto' : slideTheme === 'light' ? 'Light' : 'Dark';

  const cycleSlideTheme = () => {
    setSlideTheme((current) => (
      current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system'
    ));
  };

  const getValidSlideIndex = (value: string | null) => {
    if (value === null) return null;

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;

    const index = parsed - 1;
    if (index < 0 || index >= slides.length) return null;

    return index;
  };

  const getHashSlideIndex = () => {
    const match = window.location.hash.match(/^#slide-(\d+)$/);
    return getValidSlideIndex(match?.[1] ?? null);
  };

  const clearSlideHash = () => {
    if (!window.location.hash.match(/^#slide-\d+$/)) return;

    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`
    );
  };

  // 현재 시각 업데이트 로직
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ko-KR', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hashIndex = getHashSlideIndex();
    const storedIndex = getValidSlideIndex(localStorage.getItem(slideStorageKey));
    const restoredIndex = hashIndex ?? storedIndex;

    if (restoredIndex !== null) {
      setCurrentIdx(restoredIndex);
    }

    setIsSlideIndexReady(true);
  }, [slideStorageKey, slides.length]);

  useEffect(() => {
    if (!isSlideIndexReady) return;

    localStorage.setItem(slideStorageKey, String(currentIdx + 1));

    const nextHash = `#slide-${currentIdx + 1}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}${nextHash}`
      );
    }
  }, [currentIdx, isSlideIndexReady, slideStorageKey]);

  useEffect(() => {
    const storedTheme = localStorage.getItem(slideThemeStorageKey);
    if (storedTheme === 'system' || storedTheme === 'light' || storedTheme === 'dark') {
      setSlideTheme(storedTheme);
    }
    setIsSlideThemeReady(true);
  }, [slideThemeStorageKey]);

  useEffect(() => {
    if (!isSlideThemeReady) return;
    localStorage.setItem(slideThemeStorageKey, slideTheme);
  }, [isSlideThemeReady, slideTheme, slideThemeStorageKey]);

  useEffect(() => {
    const handleHashChange = () => {
      const hashIndex = getHashSlideIndex();
      if (hashIndex !== null) {
        setCurrentIdx(hashIndex);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [slides.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        alert(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const leaveSlideView = () => {
    const shouldLeave = window.confirm('슬라이드 뷰를 종료하고 포스트로 돌아갈까요?');
    if (shouldLeave) {
      clearSlideHash();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }

      if (onLeave) {
        onLeave();
        return;
      }

      router.push(returnHref ?? getPostHref(category, slug));
    }
  };

  const jumpToSlide = (text: string) => {
    const idx = slides.findIndex(s =>
      s.h3 === text || s.h2 === text || s.h1 === text || s.content.includes(text)
    );
    if (idx !== -1) {
      setCurrentIdx(idx);
    }
  };

  const toggleSection = (text: string) => {
    setOpenSections(prev => ({
      ...prev,
      [text]: !prev[text]
    }));
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nextIsFullscreen = !!document.fullscreenElement;
      setIsFullscreen(nextIsFullscreen);
      setIsFullscreenChromeVisible(false);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      if (fullscreenChromeTimerRef.current !== null) {
        window.clearTimeout(fullscreenChromeTimerRef.current);
      }
    };
  }, []);

  const revealFullscreenChrome = () => {
    if (!isFullscreen) return;

    setIsFullscreenChromeVisible(true);

    if (fullscreenChromeTimerRef.current !== null) {
      window.clearTimeout(fullscreenChromeTimerRef.current);
    }

    fullscreenChromeTimerRef.current = window.setTimeout(() => {
      setIsFullscreenChromeVisible(false);
      fullscreenChromeTimerRef.current = null;
    }, 1800);
  };

  const resizeDrawingCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const clearDrawing = () => {
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getCanvasPoint = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasPoint(e);
  };

  const draw = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !isDrawingRef.current || !lastPointRef.current) return;

    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const nextPoint = getCanvasPoint(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(nextPoint.x, nextPoint.y);
    ctx.stroke();

    lastPointRef.current = nextPoint;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  useEffect(() => {
    resizeDrawingCanvas();

    window.addEventListener('resize', resizeDrawingCanvas);
    return () => window.removeEventListener('resize', resizeDrawingCanvas);
  }, []);

  useEffect(() => {
    clearDrawing();
    stopDrawing();
  }, [currentIdx]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;

      const tagName = target.tagName.toLowerCase();
      return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target.isContentEditable ||
        !!target.closest('[contenteditable="true"]')
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        return;
      }

      if (isDrawingMode && (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowLeft')) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentIdx((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Home') {
        setCurrentIdx(0);
      } else if (e.key === 'End') {
        setCurrentIdx(slides.length - 1);
      } else if (e.key === 'k') {
        const nextIdx = slides.findIndex((s, i) => i > currentIdx && s.content.trim().startsWith('# '));
        if (nextIdx !== -1) setCurrentIdx(nextIdx);
      } else if (e.key === 'j') {
        let prevIdx = -1;
        for (let i = currentIdx - 1; i >= 0; i--) {
          if (slides[i].content.trim().startsWith('# ')) {
            prevIdx = i;
            break;
          }
        }
        if (prevIdx !== -1) setCurrentIdx(prevIdx);
      } else if (e.key === 'f') {
        toggleFullscreen();
      } else if (e.key === 't') {
        setIsTocOpen(prev => !prev);
      } else if (e.key === 'p') {
        window.print();
      } else if (e.key === 'd') {
        setIsDrawingMode(prev => !prev);
      } else if (e.key === 'c' && isDrawingMode) {
        clearDrawing();
      } else if (e.key === 'Escape') {
        if (isTocOpen) {
          setIsTocOpen(false);
        } else if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          leaveSlideView();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, category, slug, router, isTocOpen, currentIdx, slides, isDrawingMode]);

  useEffect(() => {
    const viewport = slideViewportRef.current;
    const content = slideContentRef.current;
    if (!viewport || !content) return;

    const updateSlideScale = () => {
      const viewportWidth = viewport.clientWidth;
      const viewportHeight = viewport.clientHeight;
      const contentWidth = content.scrollWidth;
      const contentHeight = content.scrollHeight;

      if (!viewportWidth || !viewportHeight || !contentWidth || !contentHeight) {
        setSlideScale(1);
        return;
      }

      const viewportPadding = 0.96;
      const nextScale = Math.min(
        1,
        (viewportWidth * viewportPadding) / contentWidth,
        (viewportHeight * viewportPadding) / contentHeight
      );

      setSlideScale(Number(nextScale.toFixed(4)));
    };

    updateSlideScale();

    const resizeObserver = new ResizeObserver(updateSlideScale);
    resizeObserver.observe(viewport);
    resizeObserver.observe(content);
    window.addEventListener('resize', updateSlideScale);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSlideScale);
    };
  }, [currentIdx, isFullscreen, isFullscreenChromeVisible, isTocOpen]);

  const currentSlide = slides[currentIdx];
  const currentFocusHeader = currentSlide.h3 || currentSlide.h2 || currentSlide.h1 || title;
  const isChromeVisible = !isFullscreen || isFullscreenChromeVisible || isTocOpen || isDrawingMode;

  const hierarchicalToc = toc.reduce((acc: any[], item) => {
    if (item.level === 1) {
      acc.push({ ...item, children: [] });
    } else if (acc.length > 0) {
      acc[acc.length - 1].children.push(item);
    }
    return acc;
  }, []);

  return (
    <>
      <div
        data-view="slide"
        data-slide-theme={effectiveSlideTheme}
        className={`slide-view fixed inset-0 z-50 flex flex-col overflow-hidden print:hidden ${isFullscreen && !isChromeVisible ? 'cursor-none' : ''}`}
        style={themedBackgroundStyle}
        onMouseMove={revealFullscreenChrome}
      >

        {/* TOC 사이드바 */}
        {isTocOpen && (
          <>
            <div
              className="absolute inset-0 bg-black/20 z-[60] backdrop-blur-sm"
              onClick={() => setIsTocOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-80 bg-white z-[70] shadow-2xl border-r border-gray-200 flex flex-col animate-in slide-in-from-left duration-300">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">목차</h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsHelpOpen((prev) => !prev)}
                    className={`rounded-md px-2 py-1 text-xs font-bold transition-colors mr-3 ${isHelpOpen
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      }`}
                  >
                    HELP
                  </button>

                  <button
                    onClick={() => setIsTocOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {isHelpOpen ? (
                  <div>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                      슬라이드 도움말
                    </h4>

                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs text-gray-600">
                      <dt className="font-mono font-bold text-gray-800">← / →</dt>
                      <dd>이전/다음 슬라이드</dd>

                      <dt className="font-mono font-bold text-gray-800">Space</dt>
                      <dd>다음 슬라이드</dd>

                      <dt className="font-mono font-bold text-gray-800">Home / End</dt>
                      <dd>처음/마지막 슬라이드</dd>

                      <dt className="font-mono font-bold text-gray-800">j / k</dt>
                      <dd>이전/다음 큰 제목</dd>

                      <dt className="font-mono font-bold text-gray-800">f</dt>
                      <dd>전체화면 전환</dd>

                      <dt className="font-mono font-bold text-gray-800">t</dt>
                      <dd>목차 열기/닫기</dd>

                      <dt className="font-mono font-bold text-gray-800">d</dt>
                      <dd>그리기 모드 켜기/끄기</dd>

                      <dt className="font-mono font-bold text-gray-800">c</dt>
                      <dd>그림 지우기</dd>

                      <dt className="font-mono font-bold text-gray-800">p</dt>
                      <dd>프린트/PDF 저장</dd>

                      <dt className="font-mono font-bold text-gray-800">Esc</dt>
                      <dd>목차 닫기, 전체화면 종료, 포스트로 돌아가기</dd>
                    </dl>

                    <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
                      입력창에 포커스가 있을 때는 슬라이드 단축키가 동작하지 않습니다.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {hierarchicalToc.map((h1, i) => (
                      <li key={i} className="flex flex-col">
                        <div className="flex items-stretch group">
                          <button
                            onClick={() => toggleSection(h1.text)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className={`transition-transform duration-200 ${openSections[h1.text] ? "rotate-90" : ""
                                }`}
                            >
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          </button>

                          <button
                            onClick={() => jumpToSlide(h1.text)}
                            className={`flex-1 text-left px-2 py-2 rounded-md text-sm font-bold transition-colors ${currentFocusHeader === h1.text
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-800 hover:bg-gray-100"
                              }`}
                          >
                            {h1.text}
                          </button>
                        </div>

                        {openSections[h1.text] && h1.children.length > 0 && (
                          <ul className="mt-1 ml-6 space-y-1 border-l border-gray-100">
                            {h1.children.map((child: any, ci: number) => (
                              <li key={ci}>
                                <button
                                  onClick={() => jumpToSlide(child.text)}
                                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${currentFocusHeader === child.text
                                      ? "text-blue-500 font-bold"
                                      : "text-gray-800 hover:bg-gray-50"
                                    } ${child.level === 3 ? "pl-6" : "pl-3"}`}
                                >
                                  {child.text}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        {/* 상단바 */}
        <canvas
          ref={drawingCanvasRef}
          className={`absolute inset-0 z-[54] h-full w-full touch-none print:hidden ${isDrawingMode ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
            }`}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
        />

        <div className={`relative z-[55] flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200 h-14 shrink-0 transition-all duration-300 ${isFullscreen
          ? `absolute top-0 left-0 right-0 z-[55] shadow-sm ${isChromeVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'}`
          : ''
          }`}>
          {/* 왼쪽: TOC 버튼 및 현재 시각 */}
          <div className="z-10 flex items-center gap-4 w-60">
            <button onClick={() => setIsTocOpen(prev => !prev)} className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors cursor-pointer text-gray-700" title="목차 (t)">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div className="flex w-full text-xl items-center font-bold transition cursor-default">
              <div className="text-sm font-mono font-medium text-gray-500">
                {currentTime}
              </div>
            </div>
          </div>

          {/* 중앙: 현재 포커스 헤더 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-80">
            <h1 className="text-m font-bold text-gray-700 text-center w-full italic">
              {currentFocusHeader}
            </h1>
          </div>


          {/* 오른쪽: 인덱스 및 제어 버튼 */}
          <div className="flex items-center gap-2 z-10">
            {isLocalDev && (
              <div className="group relative">
                <div className="text-xs font-mono font-bold text-blue-500 mr-2 bg-blue-50 px-2 py-1 rounded border border-blue-200 cursor-help" title="Slide Weight (Dev Only)">
                  W: {currentSlide.totalWeight}
                </div>
                <div className="absolute right-0 top-full mt-0.5 w-72 bg-white border border-gray-200 shadow-xl rounded-md p-3 text-[10px] hidden group-hover:block z-[100] max-h-96 overflow-y-auto">
                  <div className="font-bold border-b pb-1 mb-2 text-gray-700 flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span>가중치 세부 정보 (Dev)</span>
                      <span className="text-blue-500">Total: {currentSlide.totalWeight}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400">
                      <span>Remaining (for Complex): {currentSlide.remainingWeight}</span>
                      <span>Complex: {currentSlide.complexCount}</span>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {currentSlide.elements && currentSlide.elements.length > 0 ? (
                      currentSlide.elements.map((el, i) => (
                        <li key={i} className="flex flex-col border-b border-gray-50 pb-1 last:border-0">
                          <div className="flex justify-between font-mono items-center mb-0.5">
                            <span className={`px-1 rounded ${['code', 'math', 'table'].includes(el.type) ? 'bg-purple-100 text-purple-600' :
                              (el.type === 'image' ? 'bg-green-100 text-green-600' :
                                (el.type === 'html' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'))
                              }`}>
                              [{el.type}]
                            </span>
                            <span className="font-bold">w:{el.weight}</span>
                          </div>
                          <div className="text-gray-500 break-all line-clamp-2 italic leading-tight">
                            {el.content.trim() || '(empty line)'}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-400 italic">No elements found</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
            <div className="text-sm font-medium text-gray-500 mr-2">{currentIdx + 1} / {slides.length}</div>

            <button
              onClick={cycleSlideTheme}
              className="slide-theme-toggle h-10 rounded-md border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100"
              title="Slide theme"
            >
              {themeLabel}
            </button>

            {isDrawingMode && (
              <div className="flex items-center gap-1 mr-1">
                {['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#111827'].map(color => (
                  <button
                    key={color}
                    onClick={() => setPenColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${penColor === color ? 'border-gray-900 scale-110' : 'border-white shadow-sm'}`}
                    style={{ backgroundColor: color }}
                    title="펜 색상"
                  />
                ))}
                <input
                  type="range"
                  min="2"
                  max="14"
                  value={penSize}
                  onChange={(e) => setPenSize(Number(e.target.value))}
                  className="w-20"
                  title="펜 굵기"
                />
                <button onClick={clearDrawing} className="px-2 h-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors cursor-pointer text-xs font-bold text-gray-700" title="그림 지우기 (c)">
                  Clear
                </button>
              </div>
            )}

            <button onClick={() => setIsDrawingMode(prev => !prev)} className={`flex items-center justify-center w-10 h-10 border border-gray-300 rounded-md transition-colors cursor-pointer text-gray-700 ${isDrawingMode ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' : 'bg-white hover:bg-gray-100'}`} title={isDrawingMode ? '그리기 끄기 (d)' : '그리기 켜기 (d)'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>

            <button onClick={() => window.print()} className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors cursor-pointer text-gray-700" title="PDF 저장 / 프린트 (p)">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></svg>
            </button>

            <button onClick={toggleFullscreen} className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors cursor-pointer text-gray-700" title={isFullscreen ? '창 모드 (f)' : '전체 화면 (f)'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isFullscreen ? <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /> : <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />}
              </svg>
            </button>

            <button onClick={leaveSlideView} className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors cursor-pointer text-gray-700" title="포스트로 돌아가기 (ESC)">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div ref={slideViewportRef} className="relative flex-1 min-h-0 overflow-hidden">
          <div
            ref={slideContentRef}
            className="slide-content content-markdown absolute left-1/2 top-1/2 w-[90vw] markdown-body !bg-transparent p-0"
            style={{
              transform: `translate(-50%, -50%) scale(${slideScale})`,
              transformOrigin: 'center center',
            }}
          >
            <div className="text-lg md:text-xl lg:text-2xl leading-relaxed w-full">
              {currentSlide.renderedContent}
            </div>
          </div>
        </div>

        <div className={`p-4 bg-gray-50 border-t border-gray-200 grid grid-cols-3 items-center shrink-0 min-h-[70px] transition-all duration-300 ${isFullscreen
          ? `absolute bottom-0 left-0 right-0 z-[55] shadow-sm ${isChromeVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'}`
          : ''
          }`}>
          <div className="text-left flex flex-col gap-0.5">
            <div className="text-[10px] text-gray-400 font-bold truncate uppercase tracking-wider">{title}</div>
            <div className="text-sm font-bold text-gray-600 truncate">{currentSlide.h1 || ''}</div>
          </div>
          <div className="text-center px-4">
            <div className="text-sm font-bold text-gray-700 truncate">{currentSlide.h2 || ''}</div>
          </div>
          <div className="text-right">
            {currentSlide.nextTitle && (
              <>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">NEXT</div>
                <div className="text-sm font-bold text-gray-400 italic truncate">{currentSlide.nextTitle}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 프린트용 전체 슬라이드 뷰 */}
      <div
        data-view="slide"
        data-slide-theme={effectiveSlideTheme}
        className="slide-view absolute top-0 left-0 w-full z-[9999] opacity-0 pointer-events-none h-0 overflow-hidden print:h-auto print:opacity-100 print:pointer-events-auto print:relative print:block"
        style={themedBackgroundStyle}
      >
        {slides.map((slide, idx, filteredArray) => (
          <div
            key={idx}
            className="print-slide"
            style={{
              pageBreakAfter: idx === filteredArray.length - 1 ? 'auto' : 'always',
              breakAfter: idx === filteredArray.length - 1 ? 'auto' : 'page',
            }}
          >
            <div className="slide-content content-markdown markdown-body !bg-transparent w-full">
              <div className="text-lg md:text-xl lg:text-2xl leading-relaxed w-full">
                {slide.renderedContent}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
