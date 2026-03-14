// /components/CodeBlock.tsx
"use client";
 
import { DetailedHTMLProps, HTMLAttributes, useRef, useState } from "react";
 
const IconCopy = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);
 
const IconCheck = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
 
interface CodeBlockProps extends DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement> {
    isSlide?: boolean;
    totalWeight?: number;
}

const CodeBlock = ({
    className = "",
    children,
    isSlide = false,
    totalWeight = 0,
    ...props
}: CodeBlockProps) => {
    const [isCopied, setIsCopied] = useState(false);
    const preRef = useRef<HTMLPreElement>(null);
 
    const handleCopy = async () => {
        const code = preRef.current?.textContent;
        if (!code) return;
 
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1200);
    };

    // rehype-pretty-code 등이 제공하는 data-language 속성 추출
    const language = (props as any)["data-language"] || "";

    // 슬라이드 가중치(코드 외 내용량)에 따른 동적 높이 계산
    // 가중치가 0일 때(코드만 있을 때) 600px
    // 가중치가 10일 때(내용이 꽉 찼을 때) 150px
    const dynamicMaxHeight = isSlide 
        ? `${Math.max(60, 500 - (totalWeight * 60))}px`
        : 'none';
 
    return (
        <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 shadow-xl">
            {/* 상단 타이틀 바 (언어 라벨 및 복사 버튼) */}
            <div className="
                flex items-center justify-between
                bg-[#1e1e1e] px-4 py-2
                border-b border-white/5
            ">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                    {language || "code"}
                </div>
                
                <button
                    onClick={handleCopy}
                    aria-label="Copy code"
                    className="
                        flex items-center gap-1.5
                        text-gray-400 hover:text-white
                        transition-colors text-[10px] font-bold
                        print:hidden
                    "
                >
                    <span className="flex items-center scale-90">{isCopied ? <IconCheck /> : <IconCopy />}</span>
                    {isCopied ? "COPIED!" : "COPY"}
                </button>
            </div>
 
            <pre 
                ref={preRef} 
                {...props} 
                style={{ 
                    ...props.style, 
                    ...(isSlide ? { maxHeight: dynamicMaxHeight } : {}) 
                }}
                className={`${className} !text-[0.8rem] leading-snug !m-0 !rounded-t-none ${isSlide ? 'overflow-auto print:max-h-none print:overflow-visible' : ''} print:max-h-none print:overflow-visible print:whitespace-pre-wrap print:break-words scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent [&_code]:!text-[0.8rem] p-4`}
            >
                {children}
            </pre>
        </div>
    );
};
 
export default CodeBlock;