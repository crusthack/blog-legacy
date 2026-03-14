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
  totalWeight: number;
  remainingWeight: number;
}

/** 슬라이드 분할 규칙 설정 */
const MAX_WEIGHT_PER_SLIDE = 10;
const WEIGHT_SIMPLE = 1;
const WEIGHT_HTML = 9;

/** 복합 원소 내부 가중치 상수 */
const WEIGHT_CODE_LINE = 0.5;
const WEIGHT_TABLE_ROW = 1.0;
const WEIGHT_MATH_BLOCK = 2.0;
const WEIGHT_IMAGE = 5.0;

/** 복합 원소의 내부 가중치 계산 (정보 제공용) */
function calculateComplexInternalWeight(type: string, content: string): number {
    const lines = content.split('\n');
    if (content.trim().startsWith('```')) {
        const codeLines = Math.max(0, lines.length - 2);
        return codeLines * WEIGHT_CODE_LINE;
    }
    if (content.trim().startsWith('|')) {
        const rows = Math.max(0, lines.length - 1);
        return rows * WEIGHT_TABLE_ROW;
    }
    if (content.trim().toLowerCase().startsWith('<table')) {
        const trCount = (content.match(/<tr/gi) || []).length;
        return trCount * WEIGHT_TABLE_ROW;
    }
    return 1;
}

export function splitContentIntoSlides(content: string): Slide[] {
  const lines = content.trim().split('\n');
  
  // 1. 모든 라인을 ContentElement로 먼저 변환
  const allElements: ContentElement[] = [];
  let isInCodeBlock = false, isInMathBlock = false, isInTable = false, isInHtmlBlock = false;
  let currentBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (!isInCodeBlock) { isInCodeBlock = true; currentBlockLines = [line]; }
      else {
        currentBlockLines.push(line);
        allElements.push({ type: 'complex', content: currentBlockLines.join('\n'), lines: currentBlockLines.length, weight: 0 });
        isInCodeBlock = false; currentBlockLines = [];
      }
      continue;
    }
    if (isInCodeBlock) { currentBlockLines.push(line); continue; }

    if (trimmed.startsWith('$$')) {
      if (!isInMathBlock) { isInMathBlock = true; currentBlockLines = [line]; }
      else {
        currentBlockLines.push(line);
        allElements.push({ type: 'complex', content: currentBlockLines.join('\n'), lines: currentBlockLines.length, weight: 0 });
        isInMathBlock = false; currentBlockLines = [];
      }
      continue;
    }
    if (isInMathBlock) { currentBlockLines.push(line); continue; }

    if (trimmed.match(/!\[.*\]\(.*\)/)) {
      allElements.push({ type: 'complex', content: line, lines: 1, weight: 0 });
      continue;
    }

    if (trimmed.startsWith('|')) {
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

    if (trimmed.toLowerCase().startsWith('<table') || trimmed.toLowerCase().startsWith('<div')) {
        isInHtmlBlock = true; currentBlockLines = [line];
        if (trimmed.toLowerCase().includes('</table>') || trimmed.toLowerCase().includes('</div>')) {
            allElements.push({ type: 'html', content: line, lines: 1, weight: WEIGHT_HTML });
            isInHtmlBlock = false; currentBlockLines = [];
        }
        continue;
    }
    if (isInHtmlBlock) {
        currentBlockLines.push(line);
        if (trimmed.toLowerCase().includes('</table>') || trimmed.toLowerCase().includes('</div>')) {
            allElements.push({ type: 'html', content: currentBlockLines.join('\n'), lines: currentBlockLines.length, weight: WEIGHT_HTML });
            isInHtmlBlock = false; currentBlockLines = [];
        }
        continue;
    }

    const w = trimmed === '' ? 0 : WEIGHT_SIMPLE;
    allElements.push({ type: 'simple', content: line, lines: 1, weight: w });
  }

  // 2. Element들을 섹션(헤더 기준)으로 묶기
  interface Section {
    headerLevel: number;
    elements: ContentElement[];
    totalWeight: number;
    hasComplex: boolean;
    h1: string; h2: string; h3: string;
  }
  const sections: Section[] = [];
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

      if (currentSection) sections.push(currentSection);
      currentSection = { headerLevel: level, elements: [el], totalWeight: el.weight, hasComplex: false, h1: curH1, h2: curH2, h3: curH3 };
      continue;
    }

    if (!currentSection) {
        currentSection = { headerLevel: 99, elements: [], totalWeight: 0, hasComplex: false, h1: '', h2: '', h3: '' };
    }
    currentSection.elements.push(el);
    currentSection.totalWeight += el.weight;
    if (el.type === 'complex') currentSection.hasComplex = true;
  }
  if (currentSection) sections.push(currentSection);

  // 3. 섹션들을 슬라이드에 배치 (병합 로직 적용)
  const slides: Slide[] = [];
  let currentSlideElements: ContentElement[] = [];
  let currentSlideWeight = 0;
  let hasComplexInCurrentSlide = false;
  let isHighLevelSlide = false;
  let slideH1 = '', slideH2 = '', slideH3 = '';

  const pushSlide = () => {
    const combined = currentSlideElements.map(e => e.content).join('\n').trim();
    if (combined === '') { 
        currentSlideElements = []; currentSlideWeight = 0; 
        hasComplexInCurrentSlide = false; isHighLevelSlide = false; 
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
    hasComplexInCurrentSlide = false;
    isHighLevelSlide = false;
  };

  for (const sec of sections) {
    const isH1toH4 = sec.headerLevel <= 4;
    
    // 무조건 슬라이드 분할 조건
    // 1. h1~h4 헤더인 경우
    // 2. 현재 슬라이드가 h1~h4로 시작된 경우 (후속 h5~h7 병합 방지)
    // 3. 현재 슬라이드에 이미 복합 원소가 있는데 새 섹션에도 복합 원소가 있는 경우
    // 4. 일반 가중치 합이 10을 넘는 경우
    const shouldForceNewSlide = isH1toH4 || isHighLevelSlide || 
                                (hasComplexInCurrentSlide && sec.hasComplex) ||
                                (currentSlideWeight + sec.totalWeight > MAX_WEIGHT_PER_SLIDE);

    if (shouldForceNewSlide && currentSlideElements.length > 0) {
        pushSlide();
    }

    // 섹션이 너무 커서 쪼개야 하는 경우 (단일 섹션 가중치 > 10 또는 복합 원소가 여러 개일 가능성)
    if (sec.totalWeight > MAX_WEIGHT_PER_SLIDE || sec.elements.filter(e => e.type === 'complex').length > 1) {
        if (currentSlideElements.length > 0) pushSlide();
        slideH1 = sec.h1; slideH2 = sec.h2; slideH3 = sec.h3;
        for (const el of sec.elements) {
            if (el.type === 'complex') {
                // 복합 원소는 무조건 독립된 슬라이드 (앞뒤로 자름)
                if (currentSlideElements.length > 0) pushSlide();
                slideH1 = sec.h1; slideH2 = sec.h2; slideH3 = sec.h3;
                currentSlideElements.push(el);
                pushSlide();
            } else {
                if (currentSlideWeight + el.weight > MAX_WEIGHT_PER_SLIDE && currentSlideElements.length > 0) {
                    pushSlide();
                }
                if (currentSlideElements.length === 0) { slideH1 = sec.h1; slideH2 = sec.h2; slideH3 = sec.h3; }
                currentSlideElements.push(el);
                currentSlideWeight += el.weight;
            }
        }
        if (currentSlideElements.length > 0) pushSlide();
    } 
    // 섹션을 통째로 넣거나 병합하는 경우
    else {
        if (currentSlideElements.length === 0) {
            slideH1 = sec.h1; slideH2 = sec.h2; slideH3 = sec.h3;
            isHighLevelSlide = isH1toH4;
        }
        currentSlideElements.push(...sec.elements);
        currentSlideWeight += sec.totalWeight;
        if (sec.hasComplex) hasComplexInCurrentSlide = true;
        
        // 만약 방금 추가한 섹션에 복합 원소가 포함되어 있었다면, 
        // "한 슬라이드 당 복합 원소 하나" 규칙을 위해 즉시 슬라이드 마감
        if (sec.hasComplex) {
            pushSlide();
        }
    }
  }
  pushSlide();

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
