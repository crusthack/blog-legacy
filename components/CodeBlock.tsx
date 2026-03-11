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
 
const CodeBlock = ({
    className = "",
    children,
    ...props
}: DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>) => {
    const [isCopied, setIsCopied] = useState(false);
    const preRef = useRef<HTMLPreElement>(null);
 
    const handleCopy = async () => {
        const code = preRef.current?.textContent;
        if (!code) return;
 
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1200);
    };
 
    return (
        <div className="relative">
            <button
                onClick={handleCopy}
                aria-label="Copy code"
                className="
                    absolute right-3 top-3
                    flex items-center gap-1
                    rounded-md bg-black/60
                    px-2 py-1 text-xs text-white
                    hover:bg-black/80 transition
                "
            >
                <span className="flex items-center">{isCopied ? <IconCheck /> : <IconCopy />}</span>
                {isCopied ? "Copied!" : "Copy"}
            </button>
 
            <pre 
                ref={preRef} 
                {...props} 
                className={`${className} !text-[0.8rem] leading-snug max-h-[55vh] overflow-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent [&_code]:!text-[0.8rem] p-3`}
            >
                {children}
            </pre>


        </div>
    );
};
 
export default CodeBlock;