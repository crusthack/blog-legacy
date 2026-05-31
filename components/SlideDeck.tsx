import SlideContent from "@/components/SlideContent";
import { getPostBackgroundStyle } from "@/lib/background";
import { isLocalDev, repoName } from "@/lib/config";
import { createSlideMdxComponents, mdxOptions } from "@/lib/mdx";
import { getPostHref } from "@/lib/postPaths";
import type { Post } from "@/lib/posts";
import { splitContentIntoManualSlides, splitContentIntoSlides } from "@/lib/slides";
import type { TocItem } from "@/lib/parseToc";
import { MDXRemote } from "next-mdx-remote/rsc";

interface SlideDeckProps {
  post: Post;
  toc: TocItem[];
}

export default async function SlideDeck({ post, toc }: SlideDeckProps) {
  const { category, slug } = post;
  const bodySlides = post.manualSlides
    ? splitContentIntoManualSlides(post.content)
    : splitContentIntoSlides(post.content);
  const baseurl = isLocalDev ? "" : `https://crusthack.github.io/${repoName}`;
  const postUrl = `${baseurl}${getPostHref(category, slug)}`;
  const backgroundStyle = getPostBackgroundStyle({
    background: post.background,
    category,
    slug,
  });

  const titleSlide = {
    content: "",
    h1: post.title,
    h2: "",
    h3: "",
    level: 1,
    nextTitle: bodySlides.length > 0 ? (bodySlides[0].h1 || bodySlides[0].h2 || bodySlides[0].h3) : "",
    totalWeight: 0,
    complexCount: 0,
    remainingWeight: 0,
    elements: [],
    renderedContent: (
      <div className="flex flex-col items-center justify-center text-center space-y-8 py-20 relative min-h-[60vh]">
        <div className="space-y-4">
          <h1 className="slide-title-heading text-6xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tighter">
            {post.title}
          </h1>
        </div>
        {post.description && (
          <p className="slide-title-text text-2xl md:text-3xl max-w-4xl mx-auto leading-relaxed whitespace-pre-line font-medium">
            {post.description}
          </p>
        )}
        {post.date && (
          <div className="slide-title-meta pt-12 font-bold text-lg tracking-widest">
            {post.date}
          </div>
        )}
        <div className="absolute bottom-0 left-0 text-left">
          <a
            href={postUrl}
            className="text-3xl font-mono underline decoration-1 underline-offset-4 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            블로그 포스트: {postUrl}
          </a>
        </div>
      </div>
    ),
  };

  const slidesWithRenderedContent = await Promise.all(
    bodySlides.map(async (slide) => {
      const allocatedWeight = slide.complexCount > 0
        ? Math.max(1, slide.remainingWeight / slide.complexCount)
        : 0;

      return {
        ...slide,
        renderedContent: (
          <MDXRemote
            source={slide.content}
            components={createSlideMdxComponents({
              category,
              slug,
              allocatedWeight,
            })}
            options={mdxOptions}
          />
        ),
      };
    })
  );
  const finalSlides = post.titleSlide === false
    ? slidesWithRenderedContent
    : [titleSlide, ...slidesWithRenderedContent];

  return (
    <SlideContent
      slides={finalSlides}
      category={category}
      slug={slug}
      title={post.title}
      backgroundStyle={backgroundStyle}
      toc={toc}
    />
  );
}
