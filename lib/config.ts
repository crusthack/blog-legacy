// /lib/config.ts
// 환경 설정 파일
export const isLocalDev = process.env.NODE_ENV === 'development'
export const repoName = "blog"

export interface MenuItem {
  categories: string[];     // category 모음
  label: string;        // 네비에 보일 이름
}
 
export const Menu: MenuItem[] = [
  {
    categories: ["ComputerScience", "Network", "Language", "Algorithm", "Web"],
    label: "문서",
  },
  {
    categories: ["UnrealEngine", "Unity", "Windows", "DirectX", ".Net"],
    label: "기술",
  },
  {
    categories: ["Journal"],
    label: "개발 일지",
  },
  {
    categories: ["Project"],
    label: "프로젝트",
  },
  {
    categories: ["Common"],
    label: "일반",
  },
  {
    categories: ["Review"],
    label: "리뷰",
  },
];  

export const excludeCategories: string[] = 
[
  "Temp",
]
 
// 유용한 사이트
export interface UsefulLink {
  name: string;
  url: string;
}
export const usefulLinks: UsefulLink[] = [
  { name: "Next.js 학습자료", url: "https://sangkon.com/practice-ts/" },
  { name: "C# 학습자료", url: "https://sangkon.com/practice-csharp/"},
  { name: ".Net Docs", url: "https://github.com/dotnet/docs"},
  { name: "Unity Docs", url: "https://docs.unity3d.com/Manual/"},
  { name: "Unreal Docs", url: "https://dev.epicgames.com/documentation/unreal-engine"},
  { name: "ASP.Net Docs", url: "https://learn.microsoft.com/en-us/aspnet/core/?view=aspnetcore-10.0"},
  { name: "cpp reference", url: "https://www.cppreference.com/"},
  { name: "LeetCode", url: "https://leetcode.com/"},
  { name: "Linux kernel", url: "https://github.com/torvalds/linux"},
  { name: "Rust Docs", url: "https://doc.rust-lang.org/"}
  // r, pb, ts, jvm, mcp, csharp
];