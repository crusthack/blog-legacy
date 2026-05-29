// /lib/posts.ts
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { normalizePostBackground, type PostBackground } from '@/lib/background'
 
const postsDirectory = path.join(process.cwd(), 'content/posts')
const postFilePattern = /\.(mdx|md)$/i
 
export interface Post {
  category: string
  slug: string
  title: string
  date: string
  description: string
  titleSlide?: boolean
  manualSlides?: boolean
  background?: PostBackground
 
  content: string
}
 
function walkDir(dir: string, fileList: string[] = []) {
  const parent = path.dirname(dir);
  const targetName = path.basename(dir);
 
  const realEntries = fs.readdirSync(parent, { withFileTypes: true });
  const realMatch = realEntries.find(
    (entry) => entry.isDirectory() && entry.name === targetName
  );
 
  const realDir = realMatch ? path.join(parent, realMatch.name) : dir;
 
  const files = fs.readdirSync(realDir);
 
  files.forEach((file) => {
    const fullPath = path.join(realDir, file);
 
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (postFilePattern.test(file)) {
      fileList.push(fullPath);
    }
  });
 
  return fileList;
}
 
const cachedPostsData: Map<string, Post[]> = new Map();
let isCacheLoaded = false;

function getDateTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
 
function loadPosts(): void {
  if (isCacheLoaded) return;
  if (!fs.existsSync(postsDirectory)) return;
  cachedPostsData.clear();
 
  const filePaths = walkDir(postsDirectory);
 
  for (const fullPath of filePaths) {
    const fileContents = fs.readFileSync(fullPath, "utf8");
    if (fileContents.trim().length === 0) {
      continue;
    }

    const { data, content } = matter(fileContents);
    if (content.trim().length === 0) {
      continue;
    }
 
    const slug = path.basename(fullPath).replace(postFilePattern, "");
    const category = path.basename(path.dirname(fullPath)) === "posts" ?
      "" : path.basename(path.dirname(fullPath));
 
    const post: Post = {
      category,
      slug,
      title: data.title ?? slug,
      date: data.date ?? "",
      description: data.description ?? "",
      titleSlide: data.titleSlide !== false,
      manualSlides: data.manualSlides === true,
      background: normalizePostBackground(data.background),
      content: content
    };
 
    if (!cachedPostsData.has(category)) {
      cachedPostsData.set(category, []);
    }
 
    cachedPostsData.get(category)!.push(post);
  }
 
  // 각 카테고리별로 날짜 내림차순 정렬
  for (const [category, posts] of cachedPostsData) {
    posts.sort(
      (a, b) =>
        getDateTime(b.date) - getDateTime(a.date)
    );
  }
 
  isCacheLoaded = process.env.NODE_ENV === 'production';
}
 
export function getAllPostData(): Omit<Post, "content">[] {
  if(!isCacheLoaded) {
    loadPosts();
  }
 
  const allPostsData = Array.from(cachedPostsData.values()).flat().map((post) => {
    const slug = post.slug;
    const category = post.category; // 바로 상위 폴더 이름
    
    if(category === "") return; // posts 폴더 직속 파일 무시
    
    return {
      category: category, // 상위 폴더명을 카테고리로 사용
      slug,               // 파일명
      title: post.title,  // 포스트 제목
      date: post.date,    // 작성일
      description: post.description, // 포스트 설명
    };
  }).filter(Boolean) as Omit<Post, "content">[];
 
  return allPostsData.sort((a, b) => getDateTime(b.date) - getDateTime(a.date));
}
 
// 카테고리 기반 글 메타데이터 불러오기
export function getPostsByCategory(category: string): Omit<Post, "content">[] {
  if(!isCacheLoaded) {
    loadPosts();
  }
 
  const postsInCategory = cachedPostsData.get(category);
  if (!postsInCategory) {
    return [];
  }
 
  return postsInCategory;
}
 
// 파일명 기반으로 content/{slug}.mdx 파일 가져오기
export function getPostData(category: string, slug: string): Post | null {
  if(!isCacheLoaded) {
    loadPosts();
  }
  const postsInCategory = cachedPostsData.get(category);
  if (!postsInCategory) {
    return null;
  }
  const post = postsInCategory.find((post) => post.slug === slug);
  if (!post) {
    return null;
  }
 
  return post;
}
