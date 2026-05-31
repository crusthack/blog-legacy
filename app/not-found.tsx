// /app/not-found.tsx
import { getPostData } from "@/lib/posts";
import BlogPost from "@/components/BlogPost";
import { TocItem, getTocFromMarkdown } from "@/lib/parseToc";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
 
export default function NotFound() {
    let postData = getPostData("", "404");
    let toc: TocItem[] = [];
 
    toc = getTocFromMarkdown(postData!.content);
 
    return (
        <div className="blog-page grid grid-cols-[1fr_1000px_1fr] gap-8 w-full">
            <div className="flex justify-end">
                <LeftSidebar />
            </div>
 
            {/* 중간 콘텐츠 */}
            <div className="w-full mx-auto">
                <BlogPost post={postData!}/>
            </div>
 
            {/* 오른쪽 TOC → 클라이언트 컴포넌트 */}
            <div className="flex justify-start">
                <RightSidebar />
            </div>
        </div>
    );
}
