// components/SlideContent.tsx
'use client'

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { isLocalDev } from '@/lib/config';

interface ContentElement {
  type: 'simple' | 'complex' | 'html';
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
    elements: ContentElement[];
    renderedContent: ReactNode;
  }[];
  category: string;
  slug: string;
  title: string;
  toc: {
    level: number;
    text: string;
    id: string;
  }[];
}

export default function SlideContent({ slides, category, slug, title, toc }: SlideContentProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState<string>('');
  const router = useRouter();

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        alert(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
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
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
      } else if (e.key === 'Escape') {
        if (isTocOpen) {
          setIsTocOpen(false);
        } else if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          router.push(`/${category}/${slug}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, category, slug, router, isTocOpen, currentIdx, slides]);

  const currentSlide = slides[currentIdx];
  const currentFocusHeader = currentSlide.h3 || currentSlide.h2 || currentSlide.h1 || title;

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
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden text-gray-900 print:hidden">
      
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
              <button onClick={() => setIsTocOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-2">
                {hierarchicalToc.map((h1, i) => (
                  <li key={i} className="flex flex-col">
                    <div className="flex items-stretch group">
                      <button onClick={() => toggleSection(h1.text)} className="p-1 hover:bg-gray-100 rounded transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-200 ${openSections[h1.text] ? 'rotate-90' : '' }`}><path d="m9 18 6-6-6-6"/></svg>
                      </button>
                      <button onClick={() => jumpToSlide(h1.text)} className={`flex-1 text-left px-2 py-2 rounded-md text-sm font-bold transition-colors ${currentFocusHeader === h1.text ? 'bg-blue-50 text-blue-600' : 'text-gray-800 hover:bg-gray-100'}`}>{h1.text}</button>
                    </div>
                    {openSections[h1.text] && h1.children.length > 0 && (
                      <ul className="mt-1 ml-6 space-y-1 border-l border-gray-100">
                        {h1.children.map((child: any, ci: number) => (
                          <li key={ci}>
                            <button onClick={() => jumpToSlide(child.text)} className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${currentFocusHeader === child.text ? 'text-blue-500 font-bold' : 'text-gray-800 hover:bg-gray-50'} ${child.level === 3 ? 'pl-6' : 'pl-3'}`}>{child.text}</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* 상단바 */}
      <div className="relative flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200 h-14 shrink-0">
        {/* 왼쪽: TOC 버튼 및 현재 시각 */}
        <div className="z-10 flex items-center gap-4 w-60">
          <button onClick={() => setIsTocOpen(prev => !prev)} className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors cursor-pointer text-gray-700" title="목차 (t)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
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
                <div className="font-bold border-b pb-1 mb-2 text-gray-700 flex justify-between">
                  <span>가중치 세부 정보 (Dev)</span>
                  <span className="text-blue-500">Total: {currentSlide.totalWeight}</span>
                </div>
                <ul className="space-y-2">
                  {currentSlide.elements && currentSlide.elements.length > 0 ? (
                    currentSlide.elements.map((el, i) => (
                      <li key={i} className="flex flex-col border-b border-gray-50 pb-1 last:border-0">
                        <div className="flex justify-between font-mono items-center mb-0.5">
                          <span className={`px-1 rounded ${
                            el.type === 'complex' ? 'bg-purple-100 text-purple-600' : 
                            (el.type === 'html' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600')
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
          
          <button onClick={() => window.print()} className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors cursor-pointer text-gray-700" title="PDF 저장 / 프린트 (p)">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
          </button>

          <button onClick={toggleFullscreen} className="flex items-center justify-center w-10 h-10 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-colors cursor-pointer text-gray-700" title={isFullscreen ? '창 모드 (f)' : '전체 화면 (f)'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isFullscreen ? <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/> : <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>}
            </svg>
          </button>

          <button onClick={() => router.push(`/${category}/${slug}`)} className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors cursor-pointer text-gray-700" title="포스트로 돌아가기 (ESC)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-[85vw] flex-1 flex flex-col justify-center markdown-body !bg-transparent py-8">
           <div className="text-lg md:text-xl lg:text-2xl leading-relaxed w-full">
            {currentSlide.renderedContent}
           </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 grid grid-cols-3 items-center shrink-0 min-h-[70px]">
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
    <div className="absolute top-0 left-0 w-full bg-white z-[9999] opacity-0 pointer-events-none h-0 overflow-hidden print:h-auto print:opacity-100 print:pointer-events-auto print:relative print:block">
      {slides.map((slide, idx, filteredArray) => (
          <div 
            key={idx} 
            className="print-slide"
            style={{ 
              pageBreakAfter: idx === filteredArray.length - 1 ? 'auto' : 'always',
              breakAfter: idx === filteredArray.length - 1 ? 'auto' : 'page',
            }}
          >
            <div className="markdown-body !bg-transparent w-full">
              <div className="text-3xl leading-relaxed w-full">
                {slide.renderedContent}
              </div>
            </div>
          </div>
      ))}
    </div>
    </>
  );
}
