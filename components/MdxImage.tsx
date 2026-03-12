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
}
 
export const MdxImage = ({ category, slug, ...props }: MdxImageProps) => {
    const {
        src,
        alt,
        width,
        height,
        ...rest
    } = props;
 
    const resolvedSrc = resolveImagePath(category, slug, src as string);
 
    return (
        <span className="relative block w-full aspect-[16/9] max-h-[65vh] my-4 print:max-h-none print:h-auto">
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
 