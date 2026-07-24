'use client';

import type { ComponentProps } from 'react';

import CodeBlock from '@/components/post/mdxComponents/elements/CodeBlock';
import GridBlock, { GridItem } from '@/components/post/mdxComponents/elements/GridBlock';
import { MdxImage } from '@/components/post/mdxComponents/elements/MdxImage';
import CipherPlayground from '@/components/post/mdxComponents/widgets/CipherPlayground';
import FancyShowcase from '@/components/post/mdxComponents/widgets/FancyShowcase';
import JavaScriptPlayground from '@/components/post/mdxComponents/widgets/JavaScriptPlayground';
import PythonPlayground from '@/components/post/mdxComponents/widgets/PythonPlayground';
import SeminarInfo from '@/components/post/mdxComponents/widgets/SeminarInfo';

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export function createClientSlideMdxComponents({
  category,
  slug,
  allocatedWeight,
}: {
  category: string;
  slug: string;
  allocatedWeight: number;
}) {
  return {
    h1: (props: ComponentProps<'h1'>) => (
      <h1 className="!text-7xl md:text-9xl mb-8 tracking-tighter border-b-4 pb-4 inline-block" {...props} />
    ),
    h2: (props: ComponentProps<'h2'>) => <h2 className="!text-7xl ml-10" {...props} />,
    h3: (props: ComponentProps<'h3'>) => <h3 className="!text-5xl ml-10" {...props} />,
    h4: (props: ComponentProps<'h4'>) => <h4 className="!text-5xl ml-10" {...props} />,
    h5: (props: ComponentProps<'h5'>) => <h5 className="!text-4xl ml-10 !mb-7" {...props} />,
    pre: (props: ComponentProps<'pre'>) => (
      <CodeBlock {...props} isSlide={true} weight={allocatedWeight} />
    ),
    img: (props: ComponentProps<'img'>) => (
      <MdxImage
        category={category}
        slug={slug}
        isSlide={true}
        weight={allocatedWeight}
        {...props}
      />
    ),
    ul: ({ className, ...props }: ComponentProps<'ul'>) => (
      <ul className={joinClassNames('!list-disc space-y-10 ml-8 my-6 text-xl md:text-4xl [&_ul]:!list-disc', className)} {...props} />
    ),
    ol: ({ className, ...props }: ComponentProps<'ol'>) => (
      <ol className={joinClassNames('!list-decimal space-y-10 ml-8 my-6 text-xl md:text-4xl [&_ol]:!list-decimal', className)} {...props} />
    ),
    p: (props: ComponentProps<'p'>) => (
      <p className="text-xl md:text-5xl leading-relaxed mb-6" {...props} />
    ),
    table: ({ className, ...props }: ComponentProps<'table'>) => (
      <div className="mdx-table-frame my-6 max-w-full overflow-auto">
        <table className={joinClassNames('w-full min-w-full table-auto border-collapse border border-gray-200', className)} {...props} />
      </div>
    ),
    th: ({ className, ...props }: ComponentProps<'th'>) => (
      <th className={joinClassNames('break-words border border-gray-200 px-3 py-2 align-top', className)} {...props} />
    ),
    td: ({ className, ...props }: ComponentProps<'td'>) => (
      <td className={joinClassNames('break-words border border-gray-200 px-3 py-2 align-top', className)} {...props} />
    ),
    CipherPlayground,
    FancyShowcase,
    GridBlock,
    GridItem,
    JavaScriptPlayground,
    PythonPlayground,
    SeminarInfo,
  };
}
