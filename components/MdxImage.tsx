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
    weight?: number;
}
 
export const MdxImage = ({ 
    category, 
    slug, 
    isSlide = false, 
    weight = 5,
    ...props 
}: MdxImageProps) => {
    const {
        src,
        alt,
        width,
        height,
        ...rest
    } = props;
 
    const resolvedSrc = resolveImagePath(category, slug, src as string);

    // 슬라이드 가중치에 따른 동적 높이 계산 (이미지용)
    // 전달받은 weight를 기반으로 높이 결정
    const dynamicMaxHeight = isSlide 
        ? `${-20 + 80 * weight}px`
        : '45vh'; // 일반 포스트 뷰 기본값

 
    return (
        <span 
            className="mdx-image-frame relative block w-full aspect-[16/9] my-4"
            style={{ maxHeight: dynamicMaxHeight }}
        >
            <Image
                unoptimized
                src={resolvedSrc}
                alt={alt ?? ""}
                fill
                priority
                loading="eager"
                className="object-contain"
                {...rest}
            />
        </span>
    );
};
 
