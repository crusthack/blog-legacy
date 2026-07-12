// Post background normalization and rendering helpers.
import { isLocalDev, repoName } from '@/lib/config';
import type { CSSProperties } from 'react';

export type PostBackgroundStyle = CSSProperties & {
  '--slide-custom-background-color'?: string;
  '--slide-custom-background-color-light'?: string;
  '--slide-custom-background-color-dark'?: string;
  '--slide-custom-background-image'?: string;
};

export interface PostBackground {
  color?: string;
  colorLight?: string;
  colorDark?: string;
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
    const colorValue = raw.color;
    const color = typeof colorValue === 'string' ? colorValue : undefined;
    const colorModes = colorValue && typeof colorValue === 'object'
      ? colorValue as Record<string, unknown>
      : undefined;
    const colorLight = typeof colorModes?.light === 'string'
      ? colorModes.light
      : undefined;
    const colorDark = typeof colorModes?.dark === 'string'
      ? colorModes.dark
      : undefined;
    const image = typeof raw.image === 'string' ? raw.image : undefined;

    if (color || colorLight || colorDark || image) {
      return { color, colorLight, colorDark, image };
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
  const encodedCategory = category
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${baseurl}/images/${encodedCategory}/${encodeURIComponent(slug)}/${image}`;
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

  const style: PostBackgroundStyle = {};

  if (background.color) {
    style['--slide-custom-background-color'] = background.color;
  }

  if (background.colorLight) {
    style['--slide-custom-background-color-light'] = background.colorLight;
  }

  if (background.colorDark) {
    style['--slide-custom-background-color-dark'] = background.colorDark;
  }

  if (background.image) {
    const imageUrl = resolvePostBackgroundImage({
      category,
      slug,
      image: background.image,
    });

    style['--slide-custom-background-image'] =
      `linear-gradient(rgba(255,255,255,0.86), rgba(255,255,255,0.86)), url("${imageUrl}")`;
  }

  return style;
}
