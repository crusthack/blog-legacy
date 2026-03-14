// lib/slides.ts

export type ElementType = 'simple' | 'complex' | 'html';

export interface ContentElement {
  type: ElementType;
  content: string;
  lines: number;
  weight: number;
}

export interface Slide {
  content: string;      // 전체 마크다운
  elements: ContentElement[]; // 분해된 원소들
  h1: string;
  h2: string;
  h3: string;
  level: number;
  nextTitle: string;
  totalWeight: number;  // 현재 슬라이드의 총 가중치 합 (Simple + HTML)
  complexWeight: number; // 복합 원소들에 의해 계산된 가중치 (코드, 테이블 행 수)
  remainingWeight: number; // 동적 높이 계산을 위한 남은 가중치 (10 - totalWeight)
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
  const slides: Slide[] = [];
  
  let currentH1 = '', currentH2 = '', currentH3 = '';
  let currentSlideElements: ContentElement[] = [];
  let currentSlideWeight = 0;
  let currentSlideComplexWeight = 0;
  
  let isInCodeBlock = false;
  let isInMathBlock = false;
  let isInTable = false;
  let isInHtmlBlock = false;
  let currentBlockLines: string[] = [];

  const pushSlide = () => {
    const combinedContent = currentSlideElements.map(e => e.content).join('\n').trim();
    if (combinedContent === '') {
        currentSlideElements = [];
        currentSlideWeight = 0;
        currentSlideComplexWeight = 0;
        return;
    }

    slides.push({
      content: combinedContent,
      elements: [...currentSlideElements],
      h1: currentH1,
      h2: currentH2,
      h3: currentH3,
      level: currentH3 ? 3 : (currentH2 ? 2 : 1),
      nextTitle: '',
      totalWeight: currentSlideWeight,
      complexWeight: currentSlideComplexWeight,
      remainingWeight: Math.max(0, MAX_WEIGHT_PER_SLIDE - currentSlideWeight)
    });
    currentSlideElements = [];
    currentSlideWeight = 0;
    currentSlideComplexWeight = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. 헤더 체크 (슬라이드 강제 분할점 및 가중치 1)
    const headerMatch = line.match(/^(#{1,7})\s+(.*)/);
    if (headerMatch) {
      if (currentSlideElements.length > 0) pushSlide();
      
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      if (level === 1) { currentH1 = title; currentH2 = ''; currentH3 = ''; }
      else if (level === 2) { currentH2 = title; currentH3 = ''; }
      else if (level >= 3) { currentH3 = title; }
      
      currentSlideElements.push({ type: 'simple', content: line, lines: 1, weight: WEIGHT_SIMPLE });
      currentSlideWeight += WEIGHT_SIMPLE;
      continue;
    }

    // 2. 가중치 체크 및 자동 분할
    if (currentSlideWeight >= MAX_WEIGHT_PER_SLIDE && currentSlideElements.length > 0) {
        pushSlide();
    }

    // 3. 복합 문법 - 코드 블록
    if (trimmed.startsWith('```')) {
      if (!isInCodeBlock) {
        isInCodeBlock = true;
        currentBlockLines = [line];
      } else {
        currentBlockLines.push(line);
        const blockContent = currentBlockLines.join('\n');
        const internalWeight = calculateComplexInternalWeight('code', blockContent);
        currentSlideElements.push({ type: 'complex', content: blockContent, lines: currentBlockLines.length, weight: 0 });
        currentSlideComplexWeight += internalWeight;
        isInCodeBlock = false;
        currentBlockLines = [];
      }
      continue;
    }
    if (isInCodeBlock) { currentBlockLines.push(line); continue; }

    // 4. 복합 문법 - 블록 수식 ($$)
    if (trimmed.startsWith('$$')) {
      if (!isInMathBlock) {
        isInMathBlock = true;
        currentBlockLines = [line];
      } else {
        currentBlockLines.push(line);
        currentSlideElements.push({ type: 'complex', content: currentBlockLines.join('\n'), lines: currentBlockLines.length, weight: 0 });
        currentSlideComplexWeight += 2; // 블록 수식은 기본적으로 2줄 정도의 공간
        isInMathBlock = false;
        currentBlockLines = [];
      }
      continue;
    }
    if (isInMathBlock) { currentBlockLines.push(line); continue; }

    // 5. 복합 문법 - 이미지 (가중치 0)
    if (trimmed.match(/!\[.*\]\(.*\)/)) {
      currentSlideElements.push({ type: 'complex', content: line, lines: 1, weight: 0 });
      currentSlideComplexWeight += 5; // 이미지는 5줄 정도의 공간 차지로 간주
      continue;
    }

    // 6. 복합 문법 - 마크다운 표
    if (trimmed.startsWith('|')) {
      if (!isInTable) {
        isInTable = true;
        currentBlockLines = [line];
      } else {
        currentBlockLines.push(line);
      }
      if (i + 1 === lines.length || !lines[i+1].trim().startsWith('|')) {
        const blockContent = currentBlockLines.join('\n');
        const internalWeight = calculateComplexInternalWeight('table', blockContent);
        currentSlideElements.push({ type: 'complex', content: blockContent, lines: currentBlockLines.length, weight: 0 });
        currentSlideComplexWeight += internalWeight;
        isInTable = false;
        currentBlockLines = [];
      }
      continue;
    }

    // 7. Plain HTML (가중치 9)
    if (trimmed.toLowerCase().startsWith('<table') || trimmed.toLowerCase().startsWith('<div')) {
        isInHtmlBlock = true;
        currentBlockLines = [line];
        if (trimmed.toLowerCase().includes('</table>') || trimmed.toLowerCase().includes('</div>')) {
            if (currentSlideWeight + WEIGHT_HTML > MAX_WEIGHT_PER_SLIDE && currentSlideElements.length > 0) pushSlide();
            const blockContent = line;
            const internalWeight = calculateComplexInternalWeight('html', blockContent);
            currentSlideElements.push({ type: 'html', content: blockContent, lines: 1, weight: WEIGHT_HTML });
            currentSlideWeight += WEIGHT_HTML;
            currentSlideComplexWeight += internalWeight;
            isInHtmlBlock = false;
            currentBlockLines = [];
        }
        continue;
    }
    if (isInHtmlBlock) {
        currentBlockLines.push(line);
        if (trimmed.toLowerCase().includes('</table>') || trimmed.toLowerCase().includes('</div>')) {
            if (currentSlideWeight + WEIGHT_HTML > MAX_WEIGHT_PER_SLIDE && currentSlideElements.length > 0) pushSlide();
            const blockContent = currentBlockLines.join('\n');
            const internalWeight = calculateComplexInternalWeight('html', blockContent);
            currentSlideElements.push({ type: 'html', content: blockContent, lines: currentBlockLines.length, weight: WEIGHT_HTML });
            currentSlideWeight += WEIGHT_HTML;
            currentSlideComplexWeight += internalWeight;
            isInHtmlBlock = false;
            currentBlockLines = [];
        }
        continue;
    }

    // 8. 기본 문법 (가중치 1, 단 빈 줄은 0)
    const lineWeight = trimmed === '' ? 0 : WEIGHT_SIMPLE;
    if (currentSlideWeight + lineWeight > MAX_WEIGHT_PER_SLIDE && currentSlideElements.length > 0) pushSlide();
    currentSlideElements.push({ type: 'simple', content: line, lines: 1, weight: lineWeight });
    currentSlideWeight += lineWeight;
  }

  pushSlide();

  // 차기 제목 계산
  for (let i = 0; i < slides.length - 1; i++) {
    const cur = slides[i].h3 || slides[i].h2 || slides[i].h1;
    for (let j = i + 1; j < slides.length; j++) {
      const nxt = slides[j].h3 || slides[j].h2 || slides[j].h1;
      if (nxt && nxt !== cur) { 
        slides[i].nextTitle = nxt; 
        break; 
      }
    }
  }

  return slides;
}
