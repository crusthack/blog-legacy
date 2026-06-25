// /app/not-found.tsx
import { getPostData } from "@/lib/post/posts";
import BlogPost from "@/components/post/BlogPost";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
 
export default function NotFound() {
    const postData = getPostData("", "404");
 
    return (
        <div className="blog-page grid grid-cols-[1fr_1000px_1fr] gap-8 w-full">
            <div className="flex justify-end">
                <LeftSidebar />
            </div>
 
            {/* 중간 콘텐츠 */}
            <div className="w-full mx-auto">
                {postData ? (
                    <BlogPost post={postData}/>
                ) : (
                    <main className="w-full min-h-screen p-8">
                        <h1 className="text-3xl font-bold mb-4">페이지를 찾을 수 없습니다</h1>
                        <p>요청하신 문서가 존재하지 않습니다.</p>
                    </main>
                )}
            </div>
 
            {/* 오른쪽 TOC → 클라이언트 컴포넌트 */}
            <div className="flex justify-start">
                <RightSidebar />
            </div>
        </div>
    );
}
