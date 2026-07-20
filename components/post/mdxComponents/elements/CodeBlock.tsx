// /components/post/CodeBlock.tsx
"use client";

import { DetailedHTMLProps, HTMLAttributes, useId, useRef, useState } from "react";

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

const IconChevron = ({ collapsed }: { collapsed: boolean }) => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
        aria-hidden="true"
    >
        <path d="m6 9 6 6 6-6" />
    </svg>
);

interface CodeBlockProps extends DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement> {
    isSlide?: boolean;
    weight?: number;
}

const CodeBlock = ({
    className = "",
    children,
    isSlide = false,
    weight = 2,
    ...props
}: CodeBlockProps) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const preRef = useRef<HTMLPreElement>(null);
    const codeId = useId();

    const handleCopy = async () => {
        const code = preRef.current?.textContent;
        if (!code) return;

        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1200);
    };

    // rehype-pretty-code 등이 제공하는 정보 추출
    let language = (props as any)["data-language"] || "";
    let title =
        (props as any)["data-title"] ||
        (props as any)["data-filename"] ||
        (props as any)["data-file"] ||
        (props as any)["title"] ||
        "";

    // 슬라이드 가중치에 따른 동적 높이 계산
    // 전달받은 weight(할당된 가중치)를 기반으로 높이 결정
    const dynamicMaxHeight = isSlide
        ? `${Math.max(180, -20 + 80 * weight)}px`
        : undefined;

    return (
        <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 shadow-xl print:border-none print:shadow-none print:!overflow-visible print:!max-h-none">
            {/* 상단 타이틀 바 (언어 라벨, 파일 주소, 복사 버튼) */}
            <div className="
                flex items-center justify-between
                bg-[#1e1e1e] px-4 py-2
                border-b border-white/5
                print:bg-transparent print:border-b-gray-200
            ">
                <div className="flex items-center gap-3">
                    {language && (
                        <div className="text-sm font-mono text-blue-400 tracking-widest font-black border-r border-white/10 pr-3 print:text-blue-600">
                            {language}
                        </div>
                    )}
                    {title && (
                        <div className="text-[12px] font-mono text-gray-400 font-bold truncate max-w-[300px] print:text-gray-700">
                            {title}
                        </div>
                    )}
                    {!language && !title && (
                        <div className="text-[12px] font-mono text-gray-500 uppercase tracking-widest font-bold print:text-gray-400">
                            CODE
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {!isSlide && (
                        <button
                            type="button"
                            onClick={() => setIsCollapsed((current) => !current)}
                            aria-expanded={!isCollapsed}
                            aria-controls={codeId}
                            className="flex items-center gap-1.5 rounded px-1 py-1 text-[11px] font-bold text-gray-400 transition-colors hover:bg-white/5 hover:text-white print:hidden"
                        >
                            <IconChevron collapsed={isCollapsed} />
                            {isCollapsed ? "EXPAND" : "COLLAPSE"}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCopy}
                        aria-label="Copy code"
                        className="flex items-center gap-1.5 rounded px-1 py-1 text-[11px] font-bold text-gray-400 transition-colors hover:bg-white/5 hover:text-white print:hidden"
                    >
                        <span className="flex items-center scale-90">{isCopied ? <IconCheck /> : <IconCopy />}</span>
                        {isCopied ? "COPIED!" : "COPY"}
                    </button>
                </div>
            </div>

            <pre
                id={codeId}
                ref={preRef}
                {...props}
                style={{
                    ...props.style,
                    ...(dynamicMaxHeight ? { maxHeight: dynamicMaxHeight } : {})
                }}
                className={`${className} !text-[2rem] leading-snug !m-0 !rounded-t-none ${isSlide ? 'overflow-auto [&_code]:!text-[1.8rem] print:!max-h-none print:!overflow-visible' : `[&_code]:!text-[.9rem] ${isCollapsed ? '!hidden print:!block' : ''}`} print:!max-h-none print:!overflow-visible print:whitespace-pre-wrap print:break-words scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent p-4`}
            >
                {children}
            </pre>
        </div>
    );
};

export default CodeBlock;
