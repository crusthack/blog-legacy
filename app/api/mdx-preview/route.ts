import { NextRequest, NextResponse } from 'next/server';
import matter from 'gray-matter';
import { serialize } from 'next-mdx-remote/serialize';

import { mdxOptions } from '@/lib/mdx';
import { getTocFromMarkdown } from '@/lib/parseToc';
import { splitContentIntoManualSlides, splitContentIntoSlides } from '@/lib/slides';

export const dynamic = 'force-dynamic';

const MAX_SOURCE_LENGTH = 500_000;

function getFirstHeading(content: string) {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

async function compileSource(source: string) {
  return serialize(source, {
    mdxOptions: mdxOptions?.mdxOptions,
    parseFrontmatter: false,
    blockJS: false,
    blockDangerousJS: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const source = typeof body?.source === 'string' ? body.source : '';
    const fileName = typeof body?.fileName === 'string' ? body.fileName : 'uploaded.mdx';

    if (!source.trim()) {
      return NextResponse.json({ error: 'MD/MDX content is empty.' }, { status: 400 });
    }

    if (source.length > MAX_SOURCE_LENGTH) {
      return NextResponse.json(
        { error: `MD/MDX content is too large. Limit is ${MAX_SOURCE_LENGTH} characters.` },
        { status: 413 }
      );
    }

    const parsed = matter(source);
    const content = parsed.content;
    const frontmatter = parsed.data;
    const slug = fileName.replace(/\.(mdx|md)$/i, '') || 'uploaded';
    const title = String(frontmatter.title ?? getFirstHeading(content) ?? slug);
    const description = String(frontmatter.description ?? '');
    const date = String(frontmatter.date ?? '');
    const manualSlides = frontmatter.manualSlides === true;
    const titleSlide = frontmatter.titleSlide !== false;
    const bodySlides = manualSlides
      ? splitContentIntoManualSlides(content)
      : splitContentIntoSlides(content);

    const [post, slides] = await Promise.all([
      compileSource(content),
      Promise.all(
        bodySlides.map(async (slide) => ({
          ...slide,
          mdx: await compileSource(slide.content),
        }))
      ),
    ]);

    return NextResponse.json({
      post,
      slides,
      toc: getTocFromMarkdown(content),
      meta: {
        category: 'upload',
        slug,
        title,
        description,
        date,
        titleSlide,
        manualSlides,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compile MDX.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
