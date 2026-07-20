// Post background normalization and rendering helpers.
import { isLocalDev, repoName } from '@/lib/config';
import type { CSSProperties } from 'react';

export type PostBackgroundStyle = CSSProperties & {
  '--slide-custom-background-color'?: string;
  '--slide-custom-background-color-light'?: string;
  '--slide-custom-background-color-dark'?: string;
  '--slide-custom-background-image-light'?: string;
  '--slide-custom-background-image-dark'?: string;
};

export interface PostBackground {
  color: string | null;
  colorLight: string | null;
  colorDark: string | null;
  image: string | null;
}

export type PostBackgroundInput = string | PostBackground | null | undefined;

const emptyPostBackground = (): PostBackground => ({
  color: null,
  colorLight: null,
  colorDark: null,
  image: null,
});

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function normalizePostBackground(value: unknown): PostBackground {
  if (!value) return emptyPostBackground();

  if (typeof value === 'string') {
    return { ...emptyPostBackground(), color: nonEmptyString(value) };
  }

  if (typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    const colorValue = raw.color;
    const color = nonEmptyString(colorValue);
    const colorModes = colorValue && typeof colorValue === 'object'
      ? colorValue as Record<string, unknown>
      : undefined;
    const colorLight = nonEmptyString(colorModes?.light);
    const colorDark = nonEmptyString(colorModes?.dark);
    const image = nonEmptyString(raw.image);

    return { color, colorLight, colorDark, image };
  }

  return emptyPostBackground();
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

    style['--slide-custom-background-image-light'] =
      `linear-gradient(rgba(255,255,255,0.86), rgba(255,255,255,0.86)), url("${imageUrl}")`;
    style['--slide-custom-background-image-dark'] =
      `linear-gradient(rgba(0,0,0,0.78), rgba(0,0,0,0.78)), url("${imageUrl}")`;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}
