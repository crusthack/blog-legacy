import SlideContent from "@/components/post/SlideContent";
import { getPostBackgroundStyle } from "@/lib/post/background";
import { isLocalDev, repoName } from "@/lib/config";
import { createSlideMdxComponents, mdxOptions } from "@/lib/post/mdx";
import { getPostHref } from "@/lib/post/postPaths";
import type { Post } from "@/lib/post/posts";
import { splitContentIntoManualSlides, splitContentIntoSlides } from "@/lib/post/slides";
import { preprocessGridSource } from "@/lib/remark/remarkGridBlock";
import type { TocItem } from "@/lib/post/parseToc";
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
      <div className="slide-title-layout relative flex min-h-[60vh] flex-col items-center justify-center space-y-10 py-20 text-center">
        <div className="space-y-4">
          <h1 className="slide-title-heading font-black leading-tight tracking-tighter">
            {post.title}
          </h1>
        </div>
        {post.description && (
          <p className="slide-title-text mx-auto max-w-5xl whitespace-pre-line font-medium leading-relaxed">
            {post.description}
          </p>
        )}
        {post.date && (
          <div className="slide-title-meta pt-10 font-bold tracking-widest">
            {post.date}
          </div>
        )}
        <div className="absolute bottom-0 left-0 text-left">
          <a
            href={postUrl}
            className="slide-title-link font-mono underline decoration-1 underline-offset-4 transition-colors"
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
            source={preprocessGridSource(slide.content)}
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
