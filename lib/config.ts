// /lib/config.ts
// 환경 설정 파일
export const isLocalDev = process.env.NODE_ENV === 'development'
export const repoName = "blog"

export interface SpecialCategoryConfig {
  category: string;          // category 이름 (posts.category와 동일)
  label: string;        // 네비에 보일 이름
}
 
export const specialCategories: SpecialCategoryConfig[] = [
  {
    category: "Project",
    label: "프로젝트",
  },
  {
    category: "Common",
    label: "일반",
  },
  {
    category: "Secret",
    label: "",
  },
  {
    category: "Temp",
    label: "",
  }
];  
 
// 유용한 사이트
export interface UsefulLink {
  name: string;
  url: string;
}
export const usefulLinks: UsefulLink[] = [
  { name: "Next.js 학습자료", url: "https://sangkon.com/practice-ts/" },
  { name: "C# 학습자료", url: "https://sangkon.com/practice-csharp/"}
  // r, pb, ts, jvm, mcp, csharp
];