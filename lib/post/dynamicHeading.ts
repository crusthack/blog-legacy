// /lib/post/dynamicHeading.ts
"use client";
 
import { useState, useEffect } from "react";
 
export function useDynamicHeading() {
    const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
 
    useEffect(() => {
        const getHeadings = () =>
            Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")) as HTMLElement[];
 
        const handleScroll = () => {
            const headings = getHeadings();
            headings.sort((a, b) => a.offsetTop - b.offsetTop);
            const scrollTop = window.scrollY + 50;
            let current: string | null = null;
 
            for (const el of headings) {
                if (!el.id) continue;
                const top = el.offsetTop;
                if (top <= scrollTop) current = el.id;
            }
 
            if (!current && headings.length > 0) {
                current = headings.find(h => h.id)?.id ?? null;
            }
 
            setActiveHeadingId(current);
        };
 
        window.addEventListener("scroll", handleScroll);
 
        handleScroll();
 
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);
 
    return activeHeadingId;
}
