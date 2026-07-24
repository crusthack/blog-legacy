'use client'

import { useState, useEffect, useMemo, useRef, ReactNode, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';
import { useRouter } from 'next/navigation';
import SlideDrawingCanvas, { type SlideDrawingCanvasHandle } from '@/components/post/SlideDrawingCanvas';
import SlideDrawingToolbar, {
  DRAWING_PRESET_COLORS,
  MAX_DRAWING_SIZE,
  MIN_DRAWING_SIZE,
  type DrawingTool,
} from '@/components/post/SlideDrawingToolbar';
import SlideTextMemo, {
  type SlideMemoPosition,
  type SlideMemoSize,
} from '@/components/post/SlideTextMemo';
import { isLocalDev } from '@/lib/config';
import { createClientSlideMdxComponents } from '@/components/post/slideMdxComponents.client';
import { mdxPlugins } from '@/lib/post/mdxPlugins';
import { getPostHref } from '@/lib/post/postPaths';
import type { ContentElement } from '@/lib/post/slides';
import { preprocessGridSource } from '@/lib/remark/remarkGridBlock';

type SlideTheme = 'system' | 'light' | 'dark';

interface SlideItem {
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
}

interface SlideContentProps {
  slides: SlideItem[];
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

interface TemporaryDrawingSlide {
  id: number;
  afterKey: string;
}

interface SlideMemo {
  id: number;
  text: string;
  position: SlideMemoPosition;
  size: SlideMemoSize;
  collapsed: boolean;
}

export default function SlideContent({ slides: sourceSlides, category, slug, title, backgroundStyle, toc, returnHref, onLeave }: SlideContentProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [temporaryDrawingSlides, setTemporaryDrawingSlides] = useState<TemporaryDrawingSlide[]>([]);
  const [printDrawings, setPrintDrawings] = useState<Record<string, string>>({});
  const [slideMemos, setSlideMemos] = useState<Record<string, SlideMemo[]>>({});
  const memoIdRef = useRef(0);
  const [editingSlideKey, setEditingSlideKey] = useState<string | null>(null);
  const [editedSources, setEditedSources] = useState<Record<string, string>>({});
  const [compiledSlides, setCompiledSlides] = useState<Record<string, MDXRemoteSerializeResult>>({});
  const [isCompilingSlide, setIsCompilingSlide] = useState(false);
  const [slideCompileError, setSlideCompileError] = useState('');
  const temporarySlideIdRef = useRef(0);
  const [isSlideIndexReady, setIsSlideIndexReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenChromeVisible, setIsFullscreenChromeVisible] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState<string>('');
  const [slideScale, setSlideScale] = useState(1);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('pen');
  const [penColor, setPenColor] = useState('#ef4444');
  const [penSize, setPenSize] = useState(4);
  const fullscreenChromeTimerRef = useRef<number | null>(null);
  const slideViewportRef = useRef<HTMLDivElement>(null);
  const slideContentRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<SlideDrawingCanvasHandle>(null);
  const router = useRouter();
  const slideStorageKey = `slide-progress:${category}/${slug}`;
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const slideThemeStorageKey = `slide-theme:${category}/${slug}`;
  const [slideTheme, setSlideTheme] = useState<SlideTheme>('system');
  const [isSlideThemeReady, setIsSlideThemeReady] = useState(false);
  const effectiveSlideTheme = slideTheme === 'system' ? undefined : slideTheme;
  const hasCustomBackground = Boolean(backgroundStyle);
  const themeLabel = slideTheme === 'system' ? 'Auto' : slideTheme === 'light' ? 'Light' : 'Dark';
  const slides = useMemo(() => {
    type DisplaySlide = SlideItem & { slideKey: string; isDrawingSlide: boolean };
    const temporaryByParent = new Map<string, TemporaryDrawingSlide[]>();

    for (const temporarySlide of temporaryDrawingSlides) {
      const children = temporaryByParent.get(temporarySlide.afterKey) ?? [];
      children.unshift(temporarySlide);
      temporaryByParent.set(temporarySlide.afterKey, children);
    }

    const result: DisplaySlide[] = [];
    const appendTemporaryChildren = (parentKey: string) => {
      for (const temporarySlide of temporaryByParent.get(parentKey) ?? []) {
        const slideKey = `drawing-${temporarySlide.id}`;
        result.push({
          slideKey,
          isDrawingSlide: true,
          content: '',
          h1: 'Drawing',
          h2: '',
          h3: '',
          level: 0,
          nextTitle: '',
          totalWeight: 0,
          complexCount: 0,
          remainingWeight: 0,
          elements: [],
          renderedContent: null,
        });
        appendTemporaryChildren(slideKey);
      }
    };

    sourceSlides.forEach((slide, index) => {
      const slideKey = `source-${index}`;
      result.push({ ...slide, slideKey, isDrawingSlide: false });
      appendTemporaryChildren(slideKey);
    });

    return result;
  }, [sourceSlides, temporaryDrawingSlides]);

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
    const params = new URLSearchParams(window.location.search);
    const isReset = params.has('reset');

    if (isReset) {
      localStorage.removeItem(slideStorageKey);
      params.delete('reset');
      const newSearch = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`
      );
      setIsSlideIndexReady(true);
      return;
    }

    const hashIndex = getHashSlideIndex();
    const storedIndex = getValidSlideIndex(localStorage.getItem(slideStorageKey));
    const restoredIndex = hashIndex ?? storedIndex;

    if (restoredIndex !== null) {
      setCurrentIdx(restoredIndex);
    }

    setIsSlideIndexReady(true);
  }, [slideStorageKey, sourceSlides.length]);

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

  const clearDrawing = () => {
    drawingCanvasRef.current?.clear();
  };

  const prepareDrawingsForPrint = () => {
    const drawings = drawingCanvasRef.current?.getDrawings() ?? {};
    flushSync(() => setPrintDrawings(drawings));
  };

  const printSlides = () => {
    prepareDrawingsForPrint();
    window.print();
  };

  useEffect(() => {
    window.addEventListener('beforeprint', prepareDrawingsForPrint);
    return () => window.removeEventListener('beforeprint', prepareDrawingsForPrint);
  });

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

      if (isDrawingMode && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        const currentColorIndex = DRAWING_PRESET_COLORS.indexOf(
          penColor as typeof DRAWING_PRESET_COLORS[number]
        );
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        const nextColorIndex = currentColorIndex === -1
          ? (direction === 1 ? 0 : DRAWING_PRESET_COLORS.length - 1)
          : (currentColorIndex + direction + DRAWING_PRESET_COLORS.length) % DRAWING_PRESET_COLORS.length;

        setPenColor(DRAWING_PRESET_COLORS[nextColorIndex]);
        setDrawingTool('pen');
        return;
      }

      if (isDrawingMode && e.key === ' ') {
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
        printSlides();
      } else if (e.key === 'd') {
        setIsDrawingMode(prev => !prev);
      } else if (isDrawingMode && ['1', '2', '3', '4'].includes(e.key)) {
        setPenColor(DRAWING_PRESET_COLORS[Number(e.key) - 1]);
        setDrawingTool('pen');
      } else if (e.key === 'ArrowUp' && isDrawingMode) {
        e.preventDefault();
        setPenSize(prev => Math.min(MAX_DRAWING_SIZE, prev + 2));
      } else if (e.key === 'ArrowDown' && isDrawingMode) {
        e.preventDefault();
        setPenSize(prev => Math.max(MIN_DRAWING_SIZE, prev - 2));
      } else if (e.key === 'e' && isDrawingMode) {
        setDrawingTool(prev => prev === 'eraser' ? 'pen' : 'eraser');
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
  }, [slides.length, category, slug, router, isTocOpen, currentIdx, slides, isDrawingMode, penColor]);

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
  }, [currentIdx, isFullscreen, isFullscreenChromeVisible, isTocOpen, editingSlideKey, compiledSlides]);

  const currentSlide = slides[currentIdx];
  const createTemporaryDrawingSlide = () => {
    const id = ++temporarySlideIdRef.current;
    setTemporaryDrawingSlides((current) => [
      ...current,
      { id, afterKey: currentSlide.slideKey },
    ]);
    setCurrentIdx((current) => current + 1);
    setIsDrawingMode(true);
  };
  const deleteCurrentTemporarySlide = () => {
    if (!currentSlide.isDrawingSlide) return;
    if (!window.confirm('현재 임시 필기 슬라이드를 삭제할까요?')) return;

    const deletedSlideKeys = new Set([currentSlide.slideKey]);
    setTemporaryDrawingSlides((current) => {
      let foundChild = true;
      while (foundChild) {
        foundChild = false;
        for (const temporarySlide of current) {
          const slideKey = `drawing-${temporarySlide.id}`;
          if (deletedSlideKeys.has(temporarySlide.afterKey) && !deletedSlideKeys.has(slideKey)) {
            deletedSlideKeys.add(slideKey);
            foundChild = true;
          }
        }
      }

      return current.filter((temporarySlide) => !deletedSlideKeys.has(`drawing-${temporarySlide.id}`));
    });
    setCurrentIdx((current) => Math.max(0, current - 1));
  };
  const addCurrentMemo = () => {
    const id = ++memoIdRef.current;
    setSlideMemos((current) => {
      const existingMemos = current[currentSlide.slideKey] ?? [];
      const offset = (existingMemos.length % 5) * 3;
      return {
        ...current,
        [currentSlide.slideKey]: [
          ...existingMemos,
          {
            id,
            text: '',
            position: { x: 50 + offset, y: 50 + offset },
            size: { width: 480, height: 180 },
            collapsed: false,
          },
        ],
      };
    });
  };
  const updateCurrentMemo = (memoId: number, value: string) => {
    setSlideMemos((current) => ({
      ...current,
      [currentSlide.slideKey]: (current[currentSlide.slideKey] ?? []).map((memo) =>
        memo.id === memoId ? { ...memo, text: value } : memo
      ),
    }));
  };
  const updateCurrentMemoPosition = (memoId: number, position: SlideMemoPosition) => {
    setSlideMemos((current) => ({
      ...current,
      [currentSlide.slideKey]: (current[currentSlide.slideKey] ?? []).map((memo) =>
        memo.id === memoId ? { ...memo, position } : memo
      ),
    }));
  };
  const updateCurrentMemoSize = (memoId: number, size: SlideMemoSize) => {
    setSlideMemos((current) => ({
      ...current,
      [currentSlide.slideKey]: (current[currentSlide.slideKey] ?? []).map((memo) =>
        memo.id === memoId ? { ...memo, size } : memo
      ),
    }));
  };
  const toggleCurrentMemoCollapsed = (memoId: number) => {
    setSlideMemos((current) => ({
      ...current,
      [currentSlide.slideKey]: (current[currentSlide.slideKey] ?? []).map((memo) =>
        memo.id === memoId ? { ...memo, collapsed: !memo.collapsed } : memo
      ),
    }));
  };
  const deleteCurrentMemo = (memoId: number) => {
    if (!window.confirm('현재 슬라이드의 텍스트 메모를 삭제할까요?')) return;
    setSlideMemos((current) => ({
      ...current,
      [currentSlide.slideKey]: (current[currentSlide.slideKey] ?? []).filter(
        (memo) => memo.id !== memoId
      ),
    }));
  };
  const toggleSlideEditing = async () => {
    const slideKey = currentSlide.slideKey;
    if (editingSlideKey !== slideKey) {
      setEditedSources((current) => (
        slideKey in current ? current : { ...current, [slideKey]: currentSlide.content }
      ));
      setSlideCompileError('');
      setEditingSlideKey(slideKey);
      return;
    }

    setIsCompilingSlide(true);
    setSlideCompileError('');
    try {
      const { serialize } = await import('next-mdx-remote/serialize');
      const compiled = await serialize(
        preprocessGridSource(editedSources[slideKey] ?? currentSlide.content),
        {
          mdxOptions: mdxPlugins,
          parseFrontmatter: false,
          blockJS: false,
          blockDangerousJS: true,
        }
      );
      setCompiledSlides((current) => ({ ...current, [slideKey]: compiled }));
      setEditingSlideKey(null);
    } catch (error) {
      setSlideCompileError(error instanceof Error ? error.message : 'MDX compile failed.');
    } finally {
      setIsCompilingSlide(false);
    }
  };
  const getSlideMdxComponents = (slide: SlideItem) => createClientSlideMdxComponents({
    category,
    slug,
    allocatedWeight: slide.complexCount > 0
      ? Math.max(1, slide.remainingWeight / slide.complexCount)
      : 0,
  });
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
        data-custom-background={hasCustomBackground ? 'true' : undefined}
        className={`slide-view fixed inset-0 z-50 flex flex-col overflow-hidden print:hidden ${isFullscreen && !isChromeVisible ? 'cursor-none' : ''}`}
        style={backgroundStyle}
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

        <SlideDrawingCanvas
          ref={drawingCanvasRef}
          enabled={isDrawingMode}
          tool={drawingTool}
          color={penColor}
          size={penSize}
          slideId={currentSlide.slideKey}
        />

        {/* 상단바 */}
        <div className={`slide-chrome relative z-[55] flex justify-between items-center p-4 border-b h-14 shrink-0 transition-all duration-300 ${isFullscreen
          ? `absolute top-0 left-0 right-0 z-[55] shadow-sm ${isChromeVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'}`
          : ''
          }`}>
          {/* 왼쪽: TOC 버튼 및 현재 시각 */}
          <div className="z-10 flex w-72 items-center gap-2">
            <button onClick={() => setIsTocOpen(prev => !prev)} className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors cursor-pointer text-gray-700" title="목차 (t)">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <button
              onClick={() => void toggleSlideEditing()}
              disabled={isCompilingSlide}
              className={`flex h-10 items-center gap-1 rounded-md border px-2 text-xs font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                editingSlideKey === currentSlide.slideKey
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
              }`}
              title={editingSlideKey === currentSlide.slideKey ? '수정 내용을 슬라이드로 렌더링' : '현재 슬라이드 Markdown 수정'}
            >
              {isCompilingSlide && editingSlideKey === currentSlide.slideKey
                ? 'Rendering...'
                : editingSlideKey === currentSlide.slideKey ? 'Render' : 'Edit'}
            </button>
            <div className="flex flex-1 items-center text-xl font-bold transition cursor-default">
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
            {currentSlide.isDrawingSlide && (
              <div className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold tracking-wider text-amber-700">
                TEMP NOTE
              </div>
            )}

            <button
              onClick={cycleSlideTheme}
              className="slide-theme-toggle h-10 rounded-md border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100"
              title="Slide theme"
            >
              {themeLabel}
            </button>

            {isDrawingMode && (
              <SlideDrawingToolbar
                tool={drawingTool}
                color={penColor}
                size={penSize}
                onToolChange={setDrawingTool}
                onColorChange={setPenColor}
                onSizeChange={setPenSize}
                onClear={clearDrawing}
                onCreateSlide={createTemporaryDrawingSlide}
                onDeleteSlide={currentSlide.isDrawingSlide ? deleteCurrentTemporarySlide : undefined}
              />
            )}

            <button
              onClick={addCurrentMemo}
              className="flex h-10 items-center gap-1 rounded-md border border-gray-300 bg-white px-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100"
              title="텍스트 메모 추가"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" />
                <path d="M8 9h8" />
                <path d="M8 13h6" />
              </svg>
              Memo
            </button>

            <button
              onClick={() => setIsDrawingMode(prev => !prev)}
              className={`slide-draw-toggle flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-gray-300 text-gray-700 transition-colors ${isDrawingMode ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-white hover:bg-gray-100'}`}
              data-active={isDrawingMode ? 'true' : 'false'}
              title={isDrawingMode ? '그리기 끄기 (d)' : '그리기 켜기 (d)'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>

            <button onClick={printSlides} className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors cursor-pointer text-gray-700" title="PDF 저장 / 프린트 (p)">
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
          {currentSlide.isDrawingSlide && (
            <div className="drawing-slide-background absolute inset-0" />
          )}
          {editingSlideKey === currentSlide.slideKey ? (
            <div className="absolute inset-6 z-[57] flex flex-col overflow-hidden rounded-xl border border-gray-300 bg-gray-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2 text-xs font-bold text-gray-300">
                <span>MARKDOWN SOURCE · SLIDE {currentIdx + 1}</span>
                <span>상단 Render 버튼을 누르면 적용됩니다.</span>
              </div>
              <textarea
                value={editedSources[currentSlide.slideKey] ?? currentSlide.content}
                onChange={(event) => setEditedSources((current) => ({
                  ...current,
                  [currentSlide.slideKey]: event.target.value,
                }))}
                className="min-h-0 flex-1 resize-none bg-gray-950 p-5 font-mono text-base leading-relaxed text-gray-100 outline-none"
                spellCheck={false}
                aria-label="현재 슬라이드 Markdown 원본"
              />
              {slideCompileError && (
                <div className="max-h-28 overflow-auto border-t border-red-800 bg-red-950 px-4 py-2 font-mono text-xs text-red-200">
                  {slideCompileError}
                </div>
              )}
            </div>
          ) : (
            <div
              ref={slideContentRef}
              className="slide-content content-markdown absolute left-1/2 top-1/2 w-[90vw] markdown-body !bg-transparent p-0"
              style={{
                transform: `translate(-50%, -50%) scale(${slideScale})`,
                transformOrigin: 'center center',
              }}
            >
              <div className="text-lg md:text-xl lg:text-2xl leading-relaxed w-full">
                {compiledSlides[currentSlide.slideKey] ? (
                  <MDXRemote
                    {...compiledSlides[currentSlide.slideKey]}
                    components={getSlideMdxComponents(currentSlide)}
                  />
                ) : currentSlide.renderedContent}
              </div>
            </div>
          )}
          {(slideMemos[currentSlide.slideKey] ?? []).map((memo) => (
            <SlideTextMemo
              key={memo.id}
              value={memo.text}
              onChange={(value) => updateCurrentMemo(memo.id, value)}
              onDelete={() => deleteCurrentMemo(memo.id)}
              position={memo.position}
              onPositionChange={(position) => updateCurrentMemoPosition(memo.id, position)}
              size={memo.size}
              onSizeChange={(size) => updateCurrentMemoSize(memo.id, size)}
              collapsed={memo.collapsed}
              onToggleCollapsed={() => toggleCurrentMemoCollapsed(memo.id)}
            />
          ))}
        </div>

        <div className={`slide-chrome grid min-h-[70px] shrink-0 grid-cols-3 items-center border-t p-4 transition-all duration-300 ${isFullscreen
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
        data-custom-background={hasCustomBackground ? 'true' : undefined}
        className="slide-view absolute top-0 left-0 w-full z-[9999] opacity-0 pointer-events-none h-0 overflow-hidden print:h-auto print:opacity-100 print:pointer-events-auto print:relative print:block"
        style={backgroundStyle}
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
                {compiledSlides[slide.slideKey] ? (
                  <MDXRemote
                    {...compiledSlides[slide.slideKey]}
                    components={getSlideMdxComponents(slide)}
                  />
                ) : slide.renderedContent}
              </div>
            </div>
            {printDrawings[slide.slideKey] && (
              <div
                className="pointer-events-none absolute inset-0 z-20 bg-[length:100%_100%] bg-no-repeat"
                style={{ backgroundImage: `url(${printDrawings[slide.slideKey]})` }}
                aria-hidden="true"
              />
            )}
            {(slideMemos[slide.slideKey] ?? []).filter((memo) => memo.text.trim()).map((memo) => (
              <div
                key={memo.id}
                className="slide-text-memo-print pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap rounded-xl border border-gray-300 bg-white p-5 text-xl leading-relaxed text-gray-900 shadow-lg"
                style={{
                  left: `${memo.position.x}%`,
                  top: `${memo.position.y}%`,
                  width: `${memo.size.width}px`,
                  minHeight: `${memo.size.height}px`,
                  maxWidth: '70%',
                }}
              >
                {memo.text}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
