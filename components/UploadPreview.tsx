'use client';

import type { ComponentProps, DragEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote';

import CodeBlock from '@/components/CodeBlock';
import SlideContent from '@/components/SlideContent';
import CipherPlayground from '@/components/mdxComponents/CipherPlayground';
import FancyShowcase from '@/components/mdxComponents/FancyShowcase';
import JavaScriptPlayground from '@/components/mdxComponents/JavaScriptPlayground';
import PythonPlayground from '@/components/mdxComponents/PythonPlayground';
import SeminarInfo from '@/components/mdxComponents/SeminarInfo';
import type { TocItem } from '@/lib/parseToc';

type ViewMode = 'post' | 'slide';
type AssetMap = Record<string, string>;

interface PreviewMeta {
  category: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  titleSlide: boolean;
  manualSlides: boolean;
}

interface PreviewSlide {
  content: string;
  h1: string;
  h2: string;
  h3: string;
  level: number;
  nextTitle: string;
  totalWeight: number;
  complexCount: number;
  remainingWeight: number;
  elements: {
    type: 'simple' | 'complex' | 'html' | 'image' | 'code' | 'math' | 'table';
    content: string;
    lines: number;
    weight: number;
  }[];
  mdx: MDXRemoteSerializeResult;
}

interface PreviewResponse {
  post: MDXRemoteSerializeResult;
  slides: PreviewSlide[];
  toc: TocItem[];
  meta: PreviewMeta;
}

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function isRemotePath(value: string) {
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
}

function normalizeAssetKey(value: string) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function UploadImage({
  assets,
  isSlide = false,
  weight = 5,
  ...props
}: ComponentProps<'img'> & {
  assets: AssetMap;
  isSlide?: boolean;
  weight?: number;
}) {
  const rawSrc = String(props.src ?? '');
  const normalizedSrc = normalizeAssetKey(rawSrc);
  const fileName = normalizedSrc.split('/').pop() ?? normalizedSrc;
  const resolvedSrc = isRemotePath(rawSrc)
    ? rawSrc
    : assets[normalizedSrc] ?? assets[fileName] ?? rawSrc;
  const dynamicMaxHeight = isSlide ? `${-20 + 80 * weight}px` : '45vh';

  return (
    <span
      className="mdx-image-frame relative block w-full aspect-[16/9] my-4"
      style={{ maxHeight: dynamicMaxHeight }}
    >
      <img
        {...props}
        src={resolvedSrc}
        alt={props.alt ?? ''}
        className={joinClassNames('h-full w-full object-contain', props.className)}
      />
    </span>
  );
}

function createUploadMdxComponents({
  assets,
  isSlide = false,
  allocatedWeight = 0,
}: {
  assets: AssetMap;
  isSlide?: boolean;
  allocatedWeight?: number;
}) {
  const common = {
    CipherPlayground,
    FancyShowcase,
    JavaScriptPlayground,
    PythonPlayground,
    SeminarInfo,
  };

  if (isSlide) {
    return {
      h1: (props: ComponentProps<'h1'>) => (
        <h1 className="!text-7xl md:text-9xl mb-8 tracking-tighter border-b-4 pb-4 inline-block" {...props} />
      ),
      h2: (props: ComponentProps<'h2'>) => <h2 className="!text-7xl ml-10" {...props} />,
      h3: (props: ComponentProps<'h3'>) => <h3 className="!text-5xl ml-10" {...props} />,
      h4: (props: ComponentProps<'h4'>) => <h4 className="!text-5xl ml-10" {...props} />,
      h5: (props: ComponentProps<'h5'>) => <h5 className="!text-4xl ml-10 !mb-7" {...props} />,
      pre: (props: ComponentProps<'pre'>) => (
        <CodeBlock {...props} isSlide={true} weight={allocatedWeight} />
      ),
      img: (props: ComponentProps<'img'>) => (
        <UploadImage assets={assets} isSlide={true} weight={allocatedWeight} {...props} />
      ),
      ul: ({ className, ...props }: ComponentProps<'ul'>) => (
        <ul className={joinClassNames('!list-disc space-y-10 ml-8 my-6 text-xl md:text-4xl [&_ul]:!list-disc', className)} {...props} />
      ),
      ol: ({ className, ...props }: ComponentProps<'ol'>) => (
        <ol className={joinClassNames('!list-decimal space-y-10 ml-8 my-6 text-xl md:text-4xl [&_ol]:!list-decimal', className)} {...props} />
      ),
      p: (props: ComponentProps<'p'>) => <p className="text-xl md:text-5xl leading-relaxed mb-6" {...props} />,
      table: ({ className, ...props }: ComponentProps<'table'>) => (
        <div className="mdx-table-frame my-6 max-w-full overflow-auto">
          <table className={joinClassNames('w-full min-w-full table-auto border-collapse border border-gray-200', className)} {...props} />
        </div>
      ),
      th: ({ className, ...props }: ComponentProps<'th'>) => (
        <th className={joinClassNames('break-words border border-gray-200 px-3 py-2 align-top', className)} {...props} />
      ),
      td: ({ className, ...props }: ComponentProps<'td'>) => (
        <td className={joinClassNames('break-words border border-gray-200 px-3 py-2 align-top', className)} {...props} />
      ),
      ...common,
    };
  }

  return {
    pre: (props: ComponentProps<'pre'>) => <CodeBlock {...props} />,
    img: (props: ComponentProps<'img'>) => <UploadImage assets={assets} {...props} />,
    ul: ({ className, ...props }: ComponentProps<'ul'>) => (
      <ul className={joinClassNames('!list-disc space-y-2 ml-6 my-4 [&_ul]:!list-disc', className)} {...props} />
    ),
    ol: ({ className, ...props }: ComponentProps<'ol'>) => (
      <ol className={joinClassNames('!list-decimal space-y-2 ml-6 my-4 [&_ol]:!list-decimal', className)} {...props} />
    ),
    a: (props: ComponentProps<'a'>) => <a {...props} />,
    ...common,
  };
}

function createTitleSlide(meta: PreviewMeta, nextTitle: string): PreviewSlide & { renderedContent: ReactNode } {
  return {
    content: '',
    h1: meta.title,
    h2: '',
    h3: '',
    level: 1,
    nextTitle,
    totalWeight: 0,
    complexCount: 0,
    remainingWeight: 0,
    elements: [],
    mdx: { compiledSource: '', frontmatter: {}, scope: {} },
    renderedContent: (
      <div className="flex flex-col items-center justify-center text-center space-y-8 py-20 relative min-h-[60vh]">
        <div className="space-y-4">
          <h1 className="slide-title-heading text-6xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tighter">
            {meta.title}
          </h1>
        </div>
        {meta.description && (
          <p className="slide-title-text text-2xl md:text-3xl max-w-4xl mx-auto leading-relaxed whitespace-pre-line font-medium">
            {meta.description}
          </p>
        )}
        {meta.date && (
          <div className="slide-title-meta pt-12 font-bold text-lg tracking-widest">
            {meta.date}
          </div>
        )}
      </div>
    ),
  };
}

export default function UploadPreview() {
  const [source, setSource] = useState('');
  const [fileName, setFileName] = useState('');
  const [assets, setAssets] = useState<AssetMap>({});
  const [mode, setMode] = useState<ViewMode>('post');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!source.trim()) {
      setPreview(null);
      setError('');
      return;
    }

    const abortController = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsCompiling(true);
      setError('');

      try {
        const response = await fetch('/api/mdx-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, fileName }),
          signal: abortController.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error ?? 'MDX compile failed.');
        }

        setPreview(data);
      } catch (compileError) {
        if (abortController.signal.aborted) return;
        setPreview(null);
        setError(compileError instanceof Error ? compileError.message : 'MDX compile failed.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsCompiling(false);
        }
      }
    }, 250);

    return () => {
      abortController.abort();
      window.clearTimeout(timer);
    };
  }, [source, fileName]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const postComponents = useMemo(() => createUploadMdxComponents({ assets }), [assets]);

  const renderedSlides = useMemo(() => {
    if (!preview) return [];

    const bodySlides = preview.slides.map((slide) => {
      const allocatedWeight = slide.complexCount > 0
        ? Math.max(1, slide.remainingWeight / slide.complexCount)
        : 0;

      return {
        ...slide,
        renderedContent: (
          <MDXRemote
            {...slide.mdx}
            components={createUploadMdxComponents({
              assets,
              isSlide: true,
              allocatedWeight,
            })}
          />
        ),
      };
    });

    if (!preview.meta.titleSlide) return bodySlides;

    const nextTitle = bodySlides.length > 0
      ? bodySlides[0].h1 || bodySlides[0].h2 || bodySlides[0].h3
      : '';
    return [createTitleSlide(preview.meta, nextTitle), ...bodySlides];
  }, [assets, preview]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];

    const nextAssets: AssetMap = {};
    let mdFile: File | undefined;

    for (const file of Array.from(files)) {
      if (!mdFile && /\.(mdx|md)$/i.test(file.name)) {
        mdFile = file;
        continue;
      }

      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.push(url);
        nextAssets[file.name] = url;
      }
    }

    if (!mdFile) {
      setError('MD 또는 MDX 파일을 선택하세요.');
      return;
    }

    setFileName(mdFile.name);
    setSource(await mdFile.text());
    setAssets(nextAssets);
    setMode('post');
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  };

  if (mode === 'slide' && preview) {
    return (
      <SlideContent
        slides={renderedSlides}
        category={preview.meta.category}
        slug={preview.meta.slug}
        title={preview.meta.title}
        toc={preview.toc}
        returnHref="/upload"
        onLeave={() => setMode('post')}
      />
    );
  }

  return (
    <main
      className="blog-page min-h-[calc(100vh-4rem)] px-4 py-8"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <section
            className={`rounded-md border bg-white p-4 shadow-sm transition ${
              isDragging
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200'
            }`}
          >
            <h1 className="mb-3 text-xl font-bold text-gray-900">MDX 업로드</h1>
            <div
              className={`mb-4 flex min-h-28 items-center justify-center rounded-md border border-dashed px-4 py-6 text-center text-sm transition ${
                isDragging
                  ? 'border-blue-500 bg-white text-blue-700'
                  : 'border-gray-300 bg-gray-50 text-gray-500'
              }`}
            >
              <span>
                MD/MDX 파일을 여기에 끌어오거나 아래 파일 선택을 사용하세요.
                <br />
                이미지 파일을 함께 끌어오면 상대 이미지 경로 미리보기에 사용됩니다.
              </span>
            </div>
            <input
              type="file"
              accept=".md,.mdx,image/*"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-2 file:text-sm file:font-bold hover:file:bg-gray-100"
            />
            <div className="mt-4 flex rounded-md border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setMode('post')}
                className={`flex-1 rounded px-3 py-2 text-sm font-bold transition ${mode === 'post' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-white'}`}
              >
                포스트뷰
              </button>
              <button
                type="button"
                onClick={() => preview && setMode('slide')}
                disabled={!preview}
                className={`flex-1 rounded px-3 py-2 text-sm font-bold transition ${mode === 'slide' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40'}`}
              >
                슬라이드뷰
              </button>
            </div>
            {fileName && (
              <p className="mt-3 break-all text-sm font-mono text-gray-500">{fileName}</p>
            )}
            {isCompiling && (
              <p className="mt-3 text-sm font-bold text-blue-600">컴파일 중...</p>
            )}
            {error && (
              <p className="mt-3 whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </section>

          <section className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <label htmlFor="mdx-source" className="mb-2 block text-sm font-bold text-gray-800">
              원문
            </label>
            <textarea
              id="mdx-source"
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                if (!fileName) setFileName('draft.mdx');
              }}
              spellCheck={false}
              className="h-[52vh] w-full resize-y rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm leading-relaxed text-gray-900 outline-none focus:border-blue-500 focus:bg-white"
              placeholder="# 제목&#10;&#10;MD 또는 MDX 파일을 업로드하거나 여기에 붙여넣으세요."
            />
          </section>
        </aside>

        <section className="min-w-0">
          {preview ? (
            <article data-view="post" className="post-view w-full min-h-screen rounded-md p-4">
              <header className="mb-8">
                <h1 className="mb-2 text-3xl font-bold">{preview.meta.title}</h1>
                {preview.meta.date && <time className="text-gray-500">{preview.meta.date}</time>}
                {preview.meta.description && (
                  <p className="post-view-muted mt-3 max-w-prose text-lg leading-relaxed text-gray-600">
                    {preview.meta.description}
                  </p>
                )}
              </header>

              <div className="post-view-body">
                <div className="post-view-markdown rounded-md p-6">
                  <div className="content-markdown markdown-body">
                    <MDXRemote {...preview.post} components={postComponents} />
                  </div>
                </div>
              </div>
            </article>
          ) : (
            <div className="flex min-h-[60vh] items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-gray-500">
              MD/MDX 파일을 선택하면 미리보기가 표시됩니다.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
