import { isLocalDev, repoName } from '@/lib/config';
import type { CSSProperties } from 'react';

export interface PostBackground {
  color?: string;
  image?: string;
}

export type PostBackgroundInput = string | PostBackground | undefined;

export function normalizePostBackground(value: unknown): PostBackground | undefined {
  if (!value) return undefined;

  if (typeof value === 'string') {
    return { color: value };
  }

  if (typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    const color = typeof raw.color === 'string' ? raw.color : undefined;
    const image = typeof raw.image === 'string' ? raw.image : undefined;

    if (color || image) {
      return { color, image };
    }
  }

  return undefined;
}

export function resolvePostBackgroundImage({
  category,
  slug,
  image,
}: {
  category: string;
  slug: string;
  image: string;
}) {
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/')) {
    return image;
  }

  const baseurl = isLocalDev ? '' : `/${repoName}`;
  return `${baseurl}/images/${encodeURIComponent(category)}/${encodeURIComponent(slug)}/${image}`;
}

export function getPostBackgroundStyle({
  background,
  category,
  slug,
}: {
  background?: PostBackground;
  category: string;
  slug: string;
}) {
  if (!background) return undefined;

  const style: CSSProperties = {};

  if (background.color) {
    style.backgroundColor = background.color;
  }

  if (background.image) {
    const imageUrl = resolvePostBackgroundImage({
      category,
      slug,
      image: background.image,
    });

    style.backgroundImage = `linear-gradient(rgba(255,255,255,0.86), rgba(255,255,255,0.86)), url("${imageUrl}")`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
    style.backgroundRepeat = 'no-repeat';
  }

  return style;
}
