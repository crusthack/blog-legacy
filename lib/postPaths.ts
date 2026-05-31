export function encodePathSegments(value: string) {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function decodePathSegments(value: string | string[]) {
  const segments = Array.isArray(value) ? value : value.split("/");
  return segments
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment).replace(/\+/g, " ").trim())
    .join("/");
}

export function getCategoryHref(category: string) {
  const encodedCategory = encodePathSegments(category);
  return encodedCategory ? `/${encodedCategory}` : "/";
}

export function getCategoryLabel(category: string) {
  const lastSegment = category.split("/").filter(Boolean).at(-1);
  return lastSegment ?? category;
}

export function getPostHref(category: string, slug: string) {
  const encodedCategory = encodePathSegments(category);
  const encodedSlug = encodeURIComponent(slug);
  return encodedCategory ? `/${encodedCategory}/${encodedSlug}` : `/${encodedSlug}`;
}

export function getPostSlideHref(category: string, slug: string) {
  return `${getPostHref(category, slug)}/slide`;
}
