// /components/MdxImage.tsx
import { isLocalDev, repoName } from "@/lib/config";
import Image from "next/image";
import { ImgHTMLAttributes } from "react";
 
const resolveImagePath = (category: string, slug: string, value: string | undefined): string => {
    const v = String(value);
 
    // 웹 이미지 주소는 그대로
    if (
        v.startsWith("http://") ||
        v.startsWith("https://")
    ) {
        return v;
    }
    const baseurl = isLocalDev ? '' : `/${repoName}`;
    return `${baseurl}/images/${encodeURIComponent(category)}/${encodeURIComponent(slug)}/${v}`;
};
 
interface MdxImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    category: string;
    slug: string;
    isSlide?: boolean;
    totalWeight?: number;
}
 
export const MdxImage = ({ category, slug, isSlide = false, totalWeight = 0, ...props }: MdxImageProps) => {
    const {
        src,
        alt,
        width,
        height,
        ...rest
    } = props;
 
    const resolvedSrc = resolveImagePath(category, slug, src as string);

    // 슬라이드 가중치에 따른 동적 높이 계산 (이미지용)
    // 가중치 0일 때 65vh, 가중치 10일 때 30vh 정도
    const dynamicMaxHeight = isSlide 
        ? `${Math.max(20, 60 - (totalWeight * 5))}vh`
        : '45vh'; // 일반 포스트 뷰 기본값
 
    return (
        <span 
            className="relative block w-full aspect-[16/9] my-4 print:max-h-none print:h-auto"
            style={{ maxHeight: dynamicMaxHeight }}
        >
            <Image
                unoptimized
                src={resolvedSrc}
                alt={alt ?? ""}
                fill
                priority
                loading="eager"
                className="object-contain print:relative print:h-auto"
                {...rest}
            />
        </span>
    );
};
 