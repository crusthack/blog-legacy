// /about/page.tsx
import BlogPost from "@/components/BlogPost";
import type { Metadata } from "next";
import { getPostData } from "@/lib/posts";
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
 
export async function generateMetadata(): Promise<Metadata> {
    const post = getPostData("", 'about')
    return {
        title: post?.title ?? "소개",
        description: post?.description ?? "소개 페이지",
    };
}
 
export default async function AboutPage() {
    const postData = getPostData("", 'about')
    if (postData === null) {
        return <div>존재하지 않는 포스트입니다.</div>;
    }
 
    return (
        <div className="grid grid-cols-[1fr_1000px_1fr] gap-8 w-full">
 
            {/* 왼쪽 사이드 컨텐츠 */}
            <div className="flex justify-end">
              <LeftSidebar />
            </div>
 
            {/* 가운데 컨텐츠 */}
            <div className="w-full mx-auto">
                <BlogPost post={postData}/>
            </div>
 
            {/* 오른쪽 사이드 컨텐츠 */}
            <div className="flex justify-start">
              <RightSidebar />
            </div>
 
        </div>
 
    );
}