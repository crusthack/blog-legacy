// lib/slides.ts

export type ElementType = 'simple' | 'complex' | 'html';

export interface ContentElement {
  type: ElementType;
  content: string;
  lines: number;
  weight: number;
}

export interface Slide {
  content: string;
  elements: ContentElement[];
  h1: string;
  h2: string;
  h3: string;
  level: number;
  nextTitle: string;
  totalWeight: number; // 일반 텍스트 및 HTML의 총 가중치
  remainingWeight: number; // 10 - totalWeight
}

/** 슬라이드 분할 규칙 설정 */
const MAX_WEIGHT_PER_SLIDE = 10;
const WEIGHT_SIMPLE = 1;
const WEIGHT_HTML = 9;

export function splitContentIntoSlides(content: string): Slide[] {
  const lines = content.trim().split('\n');
  
  // 1. 모든 라인을 ContentElement로 먼저 변환 (복합 원소 가중치는 무조건 0)
  const allElements: ContentElement[] = [];
  let isInCodeBlock = false, isInMathBlock = false, isInTable = false, isInHtmlBlock = false;
  let htmlDepth = 0;
  let currentBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 코드블럭
    if (line.startsWith('```')) {
      if (!isInCodeBlock) { isInCodeBlock = true; currentBlockLines = [line]; }
      else {
        currentBlockLines.push(line);
        allElements.push({ type: 'complex', content: currentBlockLines.join('\n'), lines: currentBlockLines.length, weight: 0 });
        isInCodeBlock = false; currentBlockLines = [];
      }
      continue;
    }
    if (isInCodeBlock) { currentBlockLines.push(line); continue; }
    // 수식
    if (line.startsWith('$$')) {
      if (!isInMathBlock) { isInMathBlock = true; currentBlockLines = [line]; }
      else {
        currentBlockLines.push(line);
        allElements.push({ type: 'complex', content: currentBlockLines.join('\n'), lines: currentBlockLines.length, weight: 0 });
        isInMathBlock = false; currentBlockLines = [];
      }
      continue;
    }
    if (isInMathBlock) { currentBlockLines.push(line); continue; }
    // 사진 링크 
    if (line.match(/!\[.*\]\(.*\)/)) {
      allElements.push({ type: 'complex', content: line, lines: 1, weight: 0 });
      continue;
    }
    // 테이블
    if (line.startsWith('|')) {
      if (!isInTable) { isInTable = true; currentBlockLines = [line]; }
      else {
        currentBlockLines.push(line);
      }
      if (i + 1 === lines.length || !lines[i+1].trim().startsWith('|')) {
        allElements.push({ type: 'complex', content: currentBlockLines.join('\n'), lines: currentBlockLines.length, weight: 0 });
        isInTable = false; currentBlockLines = [];
      }
      continue;
    }
    // plain html element
    if (isInHtmlBlock || line.trim().startsWith('<')) {
      isInHtmlBlock = true;
      currentBlockLines.push(line);
      for (let c of line) {
        if (c === '<') htmlDepth++;
        else if (c === '>') htmlDepth--;
      }
      
      // 태그가 닫혔거나 파일 끝일 때
      if (htmlDepth <= 0 || i + 1 === lines.length) {
        const htmlContent = currentBlockLines.join('\n');
        if (allElements.length > 0 && allElements[allElements.length - 1].type === 'simple') {
          const last = allElements[allElements.length - 1];
          last.content += '\n' + htmlContent;
          last.weight += WEIGHT_HTML;
          last.lines += currentBlockLines.length;
        } else {
          allElements.push({ type: 'html', content: htmlContent, lines: currentBlockLines.length, weight: WEIGHT_HTML });
        }
        isInHtmlBlock = false;
        currentBlockLines = [];
        htmlDepth = 0;
      }
      continue;
    }

    const w = line.trim() === '' ? 0 : WEIGHT_SIMPLE;
    allElements.push({ type: 'simple', content: line, lines: 1, weight: w });
  }

  // 2. Element들을 섹션(헤더 기준)으로 묶기
  interface Section {
    headerLevel: number;
    elements: ContentElement[];
    totalWeight: number;
    h1: string; h2: string; h3: string;
    hasComplex: boolean;
  }
  const initialSections: Section[] = [];
  let currentSection: Section | null = null;
  let curH1 = '', curH2 = '', curH3 = '';

  for (const el of allElements) {
    const headerMatch = el.content.match(/^(#{1,7})\s+(.*)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      if (level === 1) { curH1 = title; curH2 = ''; curH3 = ''; }
      else if (level === 2) { curH2 = title; curH3 = ''; }
      else if (level >= 3) { curH3 = title; }

      if (currentSection) initialSections.push(currentSection);
      currentSection = { 
        headerLevel: level, 
        elements: [el], 
        totalWeight: el.weight, 
        h1: curH1, h2: curH2, h3: curH3,
        hasComplex: el.type === 'complex'
      };
      continue;
    }
    if (!currentSection) {
        currentSection = { headerLevel: 99, elements: [], totalWeight: 0, h1: '', h2: '', h3: '', hasComplex: false };
    }
    currentSection.elements.push(el);
    currentSection.totalWeight += el.weight;
    if (el.type === 'complex') currentSection.hasComplex = true;
  }
  if (currentSection) initialSections.push(currentSection);

  // 3. 섹션 병합 (헤드 레벨 7 -> 6 -> 5 순서로 다단계 병합 시도)
  let mergedSections = initialSections;

  for (let level = 7; level >= 5; level--) {
    const nextPassSections: Section[] = [];
    for (const sec of mergedSections) {
      if (nextPassSections.length > 0) {
        const last = nextPassSections[nextPassSections.length - 1];
        // 병합 조건: 현재 섹션 레벨이 대상 레벨(level)이고, 가중치 합이 제한 내일 때
        const canMerge = sec.headerLevel === level && 
                         (last.totalWeight + sec.totalWeight <= MAX_WEIGHT_PER_SLIDE);
        
        if (canMerge) {
          last.elements.push(...sec.elements);
          last.totalWeight += sec.totalWeight;
          last.hasComplex = last.hasComplex || sec.hasComplex;
          continue;
        }
      }
      nextPassSections.push(sec);
    }
    mergedSections = nextPassSections;
  }

  // 4. 섹션을 슬라이드로 최종 분할 (가중치 기준)
  const slides: Slide[] = [];
  
  for (const sec of mergedSections) {
    let currentSlideElements: ContentElement[] = [];
    let currentSlideWeight = 0;
    const slideH1 = sec.h1, slideH2 = sec.h2, slideH3 = sec.h3;

    const pushSlide = () => {
      const combined = currentSlideElements.map(e => e.content).join('\n').trim();
      if (combined === '') { 
          currentSlideElements = []; currentSlideWeight = 0; 
          return; 
      }
      slides.push({
        content: combined,
        elements: [...currentSlideElements],
        h1: slideH1, h2: slideH2, h3: slideH3,
        level: slideH3 ? 3 : (slideH2 ? 2 : 1),
        nextTitle: '',
        totalWeight: currentSlideWeight,
        remainingWeight: Math.max(0, MAX_WEIGHT_PER_SLIDE - currentSlideWeight)
      });
      currentSlideElements = [];
      currentSlideWeight = 0;
    };

    for (const el of sec.elements) {
      if (currentSlideWeight + el.weight > MAX_WEIGHT_PER_SLIDE && currentSlideElements.length > 0) {
        pushSlide();
      }
      currentSlideElements.push(el);
      currentSlideWeight += el.weight;
    }
    if (currentSlideElements.length > 0) pushSlide();
  }

  // 차기 제목 계산
  for (let i = 0; i < slides.length - 1; i++) {
    const cur = slides[i].h3 || slides[i].h2 || slides[i].h1;
    for (let j = i + 1; j < slides.length; j++) {
      const nxt = slides[j].h3 || slides[j].h2 || slides[j].h1;
      if (nxt && nxt !== cur) { slides[i].nextTitle = nxt; break; }
    }
  }

  return slides;
}
