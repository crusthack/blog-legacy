// lib/slides.ts
export interface Slide {
  content: string;
  h1: string;
  h2: string;
  h3: string;
  level: number;
  nextTitle: string;
  totalWeight: number;
}

/** 슬라이드 분할 가중치 설정 */
const MAX_LINES_PER_SLIDE = 10;  
const WEIGHT_CODE_BLOCK = 8;     
const WEIGHT_TABLE = 8;          // 테이블 전체 가중치
const WEIGHT_LIST_ITEM = 1.0;    
const WEIGHT_NORMAL_TEXT = 1.0;  
const WEIGHT_HEADER = 1.0;       
const WEIGHT_IMAGE = 10;         

export function splitContentIntoSlides(content: string): Slide[] {
  const lines = content.split('\n');
  
  interface Atom {
    lines: string[];
    weight: number;
    h1: string; h2: string; h3: string;
    isForce: boolean; 
  }

  const atoms: Atom[] = [];
  let currentH1 = '', currentH2 = '', currentH3 = '';
  let isInCodeBlock = false;
  let isInTable = false;
  let tempAccumulatedLines: string[] = [];

  // 1. 최소 단위(Atom) 추출
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 코드 블록 처리
    if (trimmed.startsWith('```')) {
      if (!isInCodeBlock) {
        isInCodeBlock = true;
        tempAccumulatedLines = [line];
      } else {
        tempAccumulatedLines.push(line);
        atoms.push({ lines: tempAccumulatedLines, weight: WEIGHT_CODE_BLOCK, h1: currentH1, h2: currentH2, h3: currentH3, isForce: false });
        isInCodeBlock = false;
      }
      continue;
    }
    if (isInCodeBlock) { tempAccumulatedLines.push(line); continue; }

    // HTML 테이블 처리
    if (trimmed.toLowerCase().startsWith('<table')) {
      isInTable = true;
      tempAccumulatedLines = [line];
      continue;
    }
    if (isInTable) {
      tempAccumulatedLines.push(line);
      if (trimmed.toLowerCase().includes('</table>')) {
        atoms.push({ lines: tempAccumulatedLines, weight: WEIGHT_TABLE, h1: currentH1, h2: currentH2, h3: currentH3, isForce: false });
        isInTable = false;
      }
      continue;
    }

    // 이미지 처리
    const imageMatch = trimmed.match(/!\[.*\]\(.*\)/);
    if (imageMatch) {
      atoms.push({ lines: [line], weight: WEIGHT_IMAGE, h1: currentH1, h2: currentH2, h3: currentH3, isForce: true });
      continue;
    }

    // 헤더 처리
    const headerMatch = trimmed.match(/^(#{1,7})\s+(.*)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      if (level === 1) { currentH1 = title; currentH2 = ''; currentH3 = ''; }
      else if (level === 2) { currentH2 = title; currentH3 = ''; }
      else if (level === 3) { currentH3 = title; }
      atoms.push({ lines: [line], weight: WEIGHT_HEADER, h1: currentH1, h2: currentH2, h3: currentH3, isForce: level <= 2 });
      continue;
    }

    if (trimmed === '') {
      if (atoms.length > 0) atoms[atoms.length - 1].lines.push(line);
      continue;
    }

    // 일반 텍스트 및 리스트 항목 처리
    const lineWeight = trimmed.match(/^([-*+]|\d+\.)\s+|<li[ >]/i) ? WEIGHT_LIST_ITEM : WEIGHT_NORMAL_TEXT;
    atoms.push({ lines: [line], weight: lineWeight, h1: currentH1, h2: currentH2, h3: currentH3, isForce: false });
  }

  // 2. Atom들을 섹션(헤더/이미지 기준)으로 묶기
  interface Section {
    atoms: Atom[];
    totalWeight: number;
    isForce: boolean;
  }
  const sections: Section[] = [];
  let currentSectionAtoms: Atom[] = [];
  let currentSectionWeight = 0;

  for (const atom of atoms) {
    const isNewSectionStart = atom.lines[0].trim().startsWith('#') || atom.weight === WEIGHT_IMAGE;
    if (isNewSectionStart && currentSectionAtoms.length > 0) {
      sections.push({ atoms: currentSectionAtoms, totalWeight: currentSectionWeight, isForce: currentSectionAtoms[0].isForce });
      currentSectionAtoms = [];
      currentSectionWeight = 0;
    }
    currentSectionAtoms.push(atom);
    currentSectionWeight += atom.weight;
  }
  if (currentSectionAtoms.length > 0) {
    sections.push({ atoms: currentSectionAtoms, totalWeight: currentSectionWeight, isForce: currentSectionAtoms[0].isForce });
  }

  // 3. 섹션 단위 패킹
  const slides: Slide[] = [];
  let currentSlideLines: string[] = [];
  let currentSlideWeight = 0;
  let slideH1 = '', slideH2 = '', slideH3 = '';

  const pushSlide = (weight: number) => {
    const slideContent = currentSlideLines.join('\n').trim();
    if (slideContent === '') return;
    slides.push({
      content: slideContent,
      h1: slideH1, h2: slideH2, h3: slideH3,
      level: slideH3 ? 3 : (slideH2 ? 2 : 1),
      nextTitle: '',
      totalWeight: weight
    });
    currentSlideLines = [];
    currentSlideWeight = 0;
    slideH1 = ''; slideH2 = ''; slideH3 = '';
  };

  for (const section of sections) {
    if (section.isForce && currentSlideLines.length > 0) pushSlide(currentSlideWeight);

    if (currentSlideWeight + section.totalWeight > MAX_LINES_PER_SLIDE && currentSlideLines.length > 0) {
      if (section.atoms[0].lines[0].trim().startsWith('#')) pushSlide(currentSlideWeight);
    }

    if (currentSlideWeight + section.totalWeight <= MAX_LINES_PER_SLIDE) {
      for (const a of section.atoms) {
        if (currentSlideLines.length === 0) { slideH1 = a.h1; slideH2 = a.h2; slideH3 = a.h3; }
        currentSlideLines.push(...a.lines);
      }
      currentSlideWeight += section.totalWeight;
    } 
    else if (section.totalWeight <= MAX_LINES_PER_SLIDE) {
      if (currentSlideLines.length > 0) pushSlide(currentSlideWeight);
      for (const a of section.atoms) {
        if (currentSlideLines.length === 0) { slideH1 = a.h1; slideH2 = a.h2; slideH3 = a.h3; }
        currentSlideLines.push(...a.lines);
      }
      currentSlideWeight = section.totalWeight;
    }
    else {
      for (const atom of section.atoms) {
        if (currentSlideWeight + atom.weight > MAX_LINES_PER_SLIDE && currentSlideLines.length > 0) pushSlide(currentSlideWeight);
        if (currentSlideLines.length === 0) { slideH1 = atom.h1; slideH2 = atom.h2; slideH3 = atom.h3; }
        currentSlideLines.push(...atom.lines);
        currentSlideWeight += atom.weight;
      }
    }
  }
  pushSlide(currentSlideWeight);

  for (let i = 0; i < slides.length - 1; i++) {
    const cur = slides[i].h3 || slides[i].h2 || slides[i].h1;
    for (let j = i + 1; j < slides.length; j++) {
      const nxt = slides[j].h3 || slides[j].h2 || slides[j].h1;
      if (nxt && nxt !== cur) { slides[i].nextTitle = nxt; break; }
    }
  }

  return slides;
}
