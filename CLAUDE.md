# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 정적 빌드
npm run start    # 빌드 결과 서빙
npm run lint     # ESLint
```

## 프로젝트 개요

Next.js App Router 기반의 MDX 블로그. `/posts` 디렉토리에 있는 `.mdx` 파일을 읽어 정적 페이지를 생성한다.  
GitHub Pages(`crusthack.github.io/blog`)에 배포된다.

---

## 포스트 시스템 (`lib/post/posts.ts`)

### 파일-URL 대응 구조

```
posts/{Category}/{slug}.mdx  →  /{Category}/{slug}
posts/index.mdx              →  /           (홈)
posts/about.mdx              →  /about      (소개)
```

- **category**: `/posts` 기준 상대 경로 (예: `Theory/Algorithm`)
- **slug**: 파일명에서 확장자 제거 (예: `dataStructure`)
- `index.mdx`는 해당 카테고리 디렉토리의 인덱스 페이지
- 빈 파일 또는 frontmatter만 있는 파일은 무시됨
- 캐시는 개발 중 요청마다 재로드, 프로덕션에서는 최초 1회만 로드

### Post frontmatter 필드

```yaml
---
title: '포스트 제목'
date: '2025-01-01'
description: '설명'
titleSlide: true        # false면 슬라이드 타이틀 슬라이드 생략 (기본 true)
manualSlides: false     # true면 --- 구분자 기반 수동 분할 (기본 false = 자동 분할)
background:             # 슬라이드 배경 (string이면 color, object면 {color?, image?})
  color: '#f0f0f0'
  image: 'bg.png'       # public/images/{category}/{slug}/bg.png 에서 resolve
---
```

### 카테고리 설정 (`lib/config.ts`)

- `Menu` 배열: 네비게이션에 표시할 카테고리 그룹 정의
- `excludeCategories`: `Temp` 등 네비에서 제외할 카테고리
- `repoName`: GitHub Pages 배포 시 base URL(`/blog`)로 사용

---

## MDX 렌더링 파이프라인 (`lib/post/mdx.tsx`, `lib/post/mdxPlugins.ts`)

`next-mdx-remote/rsc`의 `<MDXRemote>`로 렌더링. 플러그인 설정은 `lib/post/mdxPlugins.ts`에 단일 소스로 정의되고, 서버 렌더링(`mdx.tsx`)과 클라이언트 미리보기(`UploadPreview.tsx`) 양쪽에서 동일한 `mdxPlugins`를 import한다.

### remark/rehype 플러그인 스택

```
remarkGfm                → GitHub Flavored Markdown (테이블, 취소선 등)
remarkToc                → ## Contents 헤딩에 자동 TOC 삽입
remarkMath               → $...$ / $$...$$ 수식 구문 파싱
remarkNormalizeCodeMeta  → 코드블록 메타에서 파일명 추출 (lang:filename 또는 file="..." 형식)
remarkGridBlock          → ![/]! 블록을 GridBlock/GridItem MDX JSX 노드로 변환
  ↓
rehypeSlug               → 헤딩에 id 부여 (TOC 링크 앵커)
rehypeKatex              → 수식 → HTML 변환
rehypePrettyCode         → 코드 하이라이팅 (theme: dark-plus, Shiki 기반)
rehypeInjectTitle        → rehype-pretty-code의 <figcaption> 제목을 <pre data-title>에도 주입
```

커스텀 플러그인 위치: `lib/remark/` (remark 플러그인), `lib/rehype/` (rehype 플러그인)

### 코드블록 파일명 표기 방법 (MDX 작성 시)

```
```ts:파일명.ts       ← lang:filename 형식
```ts title="파일명"  ← title 속성 형식
```ts file="파일명"   ← file/filename 속성 형식
```ts [파일명]        ← 대괄호 형식
```

### MDX 커스텀 컴포넌트

**포스트 뷰** (`createPostMdxComponents`):

| 컴포넌트 | 역할 |
|---|---|
| `pre` → `<CodeBlock>` | 코드블록 복사 버튼, 파일명 헤더 |
| `img` → `<MdxImage>` | 상대 경로 이미지를 `/public/images/{category}/{slug}/` 기준으로 resolve |
| `ul`, `ol` | list-disc/decimal 스타일 강제 적용 |
| `a` | 로컬 링크에 base URL(`/blog`) 자동 prefix |
| `<CategoryPostList>` | 현재 카테고리의 다른 포스트 목록 렌더링 |
| `<CipherPlayground>` | 인터랙티브 암호화 실습 |
| `<JavaScriptPlayground>` | 브라우저 내 JS 실행 |
| `<PythonPlayground>` | Pyodide 기반 Python 실행 |
| `<FancyShowcase>` | 쇼케이스 UI |
| `<SeminarInfo>` | 세미나 정보 카드 |

**슬라이드 뷰** (`createSlideMdxComponents`): 포스트와 동일 컴포넌트셋에 추가로 `h1~h5`, `p`, `table/th/td`를 슬라이드용 대형 폰트 스타일로 오버라이드. `<CodeBlock isSlide={true} weight={allocatedWeight}>`, `<MdxImage isSlide={true} weight={allocatedWeight}>`로 가중치를 전달해 슬라이드 내 크기를 동적으로 조정한다.

---

## 슬라이드 시스템 (`lib/post/slides.ts`)

### 자동 분할 모드 (`splitContentIntoSlides`) — 기본값

MDX 원문을 4단계로 분할:

1. **Element 분류**: 각 줄을 타입별 `ContentElement`로 변환

   | 타입 | 가중치 | 조건 |
   |---|---|---|
   | `simple` | 1 (빈줄 0) | 일반 텍스트 |
   | `code` | 2 | ` ``` ` 블록 |
   | `math` | 1.5 | `$$` 블록 |
   | `image` | 5 | `![...](...)` |
   | `table` | max(1, ceil(행수×0.5)) | `|` 시작 줄 |
   | `html` | 9 | `<태그>` 블록 |

2. **섹션 묶기**: 헤딩(`#`)을 기준으로 섹션 분리. h1/h2/h3 컨텍스트(curH1~curH3)를 유지하면서 슬라이드에 전달

3. **섹션 병합**: h5~h7 수준의 경량 섹션을 `MAX_WEIGHT_PER_SLIDE(10)` 내에서 병합

4. **슬라이드 분할**: 가중치 합이 10 초과 시 새 슬라이드로 분리. 코드/이미지(`complex`) 요소의 가중치는 `(10 - 나머지 요소 합) / complex개수`로 재분배하여 각 슬라이드의 총 가중치가 10이 되도록 정규화 → 이 값이 `allocatedWeight`로 컴포넌트에 전달됨

### 수동 분할 모드 (`splitContentIntoManualSlides`) — `manualSlides: true`

`---` 구분자로 슬라이드를 직접 분리 (코드블록/수식 블록 내의 `---`는 무시).  
각 슬라이드 내 Element 분석 및 complex 가중치 재분배 로직은 동일하게 적용됨.

### SlideDeck 렌더링 흐름 (`components/post/SlideDeck.tsx`, `components/post/SlideContent.tsx`)

```
Post.content
  → splitContentIntoSlides / splitContentIntoManualSlides
  → slides[]
  → 각 slide마다 <MDXRemote source={slide.content} components={createSlideMdxComponents({allocatedWeight})} />
  → titleSlide(합성 JSX) + renderedContent[] → <SlideContent>
```

- `post.titleSlide !== false`이면 제목/설명/날짜/포스트 URL을 담은 타이틀 슬라이드가 앞에 삽입됨
- `post.background`의 이미지 경로: `public/images/{category}/{slug}/{image}` (상대경로 기준)

---

## URL 및 라우팅 (`app/[...segments]/page.tsx`)

단일 catch-all 라우트가 포스트/슬라이드/카테고리를 모두 처리:

- `/Theory/Algorithm/sort` → 포스트 뷰
- `/Theory/Algorithm/sort/slide` → 슬라이드 뷰 (마지막 segment가 `"slide"`이면 판단)
- `/Theory/Algorithm` → `index.mdx` 리다이렉트 또는 최신 포스트 리다이렉트

이미지 경로: `public/images/{category}/{slug}/{filename}` (로컬 개발/배포 모두 동일 구조).

`isLocalDev`(`NODE_ENV === 'development'`)가 false면 내부 링크 및 이미지 경로에 `/blog` prefix 자동 추가.

---

## 그리드 블록 문법 (`lib/remark/remarkGridBlock.ts`)

MDX 작성 시 열/행 구조의 그리드를 표시하는 커스텀 문법. `![` ~ `]!` 로 블록을 감싼다.

**문법 예시:**

```
![
셀A | 셀B | 셀C          ← 인라인 열 구분 (` | `)
,                         ← 행 구분자
***python                 ← 코드 셀 (자동 colspan)
print('hello')
***
]!
```

| 방식 | 예시 | 설명 |
|---|---|---|
| 인라인 열 구분 | `텍스트1 \| **굵게**` | ` \| ` (공백 포함)으로 열 분리 |
| 행 구분자 | `,` 단독 라인 | 다음 행 시작 |
| 리스트 항목 | `- 항목,` | 항목 하나 = 셀 하나 (구버전 호환) |
| `***` 코드 블록 | `***lang` / `***` | code 셀 하나, 내부 쉼표/파이프 안전 |

- 단일 셀 행은 자동으로 전체 열 colspan 적용
- 슬라이드 가중치: 열 수 × 3
- 마우스 hover 시 각 셀 테두리 표시 (Tailwind `group`/`group-hover` 패턴)

**구현 2단계:**
1. **`preprocessGridSource(source)`** — MDXRemote 전달 전 문자열 단계에서 `![`/`]!`/`|`/`,` 주변에 빈 줄 삽입, `***lang...***` → ` ```lang...``` ` 변환
2. **`remarkGridBlock`** — remark AST 플러그인. `![`/`]!` paragraph 쌍 탐지 → `GridBlock`/`GridItem` MDX JSX 노드로 변환

**컴포넌트:** `components/post/mdxComponents/GridBlock.tsx` → `GridBlock`(CSS grid 컨테이너, `cols` prop), `GridItem`(셀, `span` prop으로 colspan)

---

## TOC (`lib/post/parseToc.ts`, `components/post/TOC.tsx`)

`getTocFromMarkdown(content)`으로 마크다운에서 `h1~h6`를 파싱. `rehype-slug`와 동일한 `github-slugger`로 id를 생성하므로 앵커 링크가 정확히 일치한다. 중복 헤딩은 `-1`, `-2` suffix로 구분.
