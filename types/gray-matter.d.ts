declare module "gray-matter" {
  export interface GrayMatterFile<TData = Record<string, unknown>> {
    data: TData;
    content: string;
    excerpt?: string;
    empty?: string;
    isEmpty?: boolean;
    orig: Buffer | string;
  }

  export default function matter<TData = Record<string, unknown>>(
    input: string | Buffer
  ): GrayMatterFile<TData>;
}
