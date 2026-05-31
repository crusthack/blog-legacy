// /app/page.tsx
import { getPostData } from '@/lib/posts'
import BlogPost from '@/components/BlogPost'
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import { notFound } from 'next/navigation';
 
// MDX plugins are provided via shared options
 
export default async function Post() {
    const postData = getPostData("", 'index')
    if (postData === null) {
        return notFound();
    }
 
    return (
        <div className="blog-page grid grid-cols-[1fr_1000px_1fr] gap-8 w-full">
 
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
