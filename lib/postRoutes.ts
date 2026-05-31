import { decodePathSegments, encodePathSegments, getPostHref } from "@/lib/postPaths";
import type { Post } from "@/lib/posts";

export interface PostRoute {
  category: string;
  slug: string;
  isSlide: boolean;
}

export function getRouteFromSegments(segments: string[]): PostRoute | null {
  const isSlide = segments[segments.length - 1] === "slide";
  const postSegments = isSlide ? segments.slice(0, -1) : segments;
  if (postSegments.length < 2) return null;

  const slug = decodeURIComponent(postSegments[postSegments.length - 1])
    .replace(/\+/g, " ")
    .trim();
  const category = decodePathSegments(postSegments.slice(0, -1));

  return { category, slug, isSlide };
}

export function getCategoryFromSegments(segments: string[]) {
  return decodePathSegments(segments);
}

export function getStaticParamsFromPosts(posts: Array<Omit<Post, "content">>) {
  const postParams = posts.map((post) => ({
    segments: [...post.category.split("/").filter(Boolean), post.slug],
  }));
  const slideParams = posts.map((post) => ({
    segments: [...post.category.split("/").filter(Boolean), post.slug, "slide"],
  }));
  const categoryParams = Array.from(new Set(posts.map((post) => post.category)))
    .filter(Boolean)
    .map((category) => ({
      segments: category.split("/").filter(Boolean),
    }));

  return [...postParams, ...slideParams, ...categoryParams];
}

export function getCanonicalCategoryPath(category: string) {
  return encodePathSegments(category);
}

export function getCategoryIndexHref(category: string) {
  return getPostHref(category, "index");
}
