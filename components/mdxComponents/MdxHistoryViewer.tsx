"use client";

import { useEffect, useMemo, useState } from "react";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";

import CategoryPostLinks from "@/components/CategoryPostLinks";
import CodeBlock from "@/components/CodeBlock";
import { MdxImage } from "@/components/MdxImage";
import CipherPlayground from "@/components/mdxComponents/CipherPlayground";
import FancyShowcase from "@/components/mdxComponents/FancyShowcase";
import JavaScriptPlayground from "@/components/mdxComponents/JavaScriptPlayground";
import PythonPlayground from "@/components/mdxComponents/PythonPlayground";
import SeminarInfo from "@/components/mdxComponents/SeminarInfo";

interface MdxHistoryViewerProps {
  owner?: string;
  repo?: string;
  historyPath?: string;
  filePath?: string;
  maxCommits?: number;
}

interface GitHubCommitItem {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

type RenderMode = "preview" | "source";

const defaultOwner = "crusthack";
const defaultRepo = "blog";
const defaultPath = "content/posts/Web/blog-feature-summary.mdx";

function stripFrontmatter(source: string) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function inferCategoryAndSlug(filePath: string) {
  const match = filePath.match(/^content\/posts\/([^/]+)\/([^/.]+)\.mdx?$/);
  if (!match) return { category: "", slug: "" };

  return {
    category: match[1],
    slug: match[2],
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortSha(sha: string) {
  return sha.slice(0, 7);
}

function makeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export default function MdxHistoryViewer({
  owner = defaultOwner,
  repo = defaultRepo,
  historyPath = defaultPath,
  filePath = defaultPath,
  maxCommits = 12,
}: MdxHistoryViewerProps) {
  const [historyInput, setHistoryInput] = useState(historyPath);
  const [fileInput, setFileInput] = useState(filePath);
  const [activeHistoryPath, setActiveHistoryPath] = useState(historyPath);
  const [activeFilePath, setActiveFilePath] = useState(filePath);
  const [commits, setCommits] = useState<GitHubCommitItem[]>([]);
  const [selectedSha, setSelectedSha] = useState("");
  const [source, setSource] = useState("");
  const [CompiledMdx, setCompiledMdx] = useState<React.ComponentType<any> | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>("preview");
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [isLoadingSource, setIsLoadingSource] = useState(false);
  const [error, setError] = useState("");

  const { category, slug } = useMemo(
    () => inferCategoryAndSlug(activeFilePath),
    [activeFilePath]
  );

  useEffect(() => {
    let ignore = false;

    async function loadCommits() {
      setIsLoadingCommits(true);
      setError("");
      setCompiledMdx(null);
      setSource("");

      try {
        const url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
        url.searchParams.set("path", activeHistoryPath);
        url.searchParams.set("per_page", String(maxCommits));

        const response = await fetch(url.toString(), {
          headers: {
            Accept: "application/vnd.github+json",
          },
        });

        if (!response.ok) {
          throw new Error(`GitHub commit fetch failed: ${response.status}`);
        }

        const data = (await response.json()) as GitHubCommitItem[];
        if (ignore) return;

        setCommits(data);
        setSelectedSha(data[0]?.sha ?? "");
      } catch (requestError) {
        if (!ignore) {
          setCommits([]);
          setSelectedSha("");
          setError(makeErrorMessage(requestError));
        }
      } finally {
        if (!ignore) setIsLoadingCommits(false);
      }
    }

    loadCommits();

    return () => {
      ignore = true;
    };
  }, [activeHistoryPath, maxCommits, owner, repo]);

  useEffect(() => {
    if (!selectedSha) return;

    let ignore = false;

    async function loadSource() {
      setIsLoadingSource(true);
      setError("");
      setCompiledMdx(null);

      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${selectedSha}/${activeFilePath}`;
        const response = await fetch(rawUrl);

        if (!response.ok) {
          throw new Error(`Raw MDX fetch failed: ${response.status}`);
        }

        const nextSource = await response.text();
        if (ignore) return;

        setSource(nextSource);

        const evaluated = await evaluate(stripFrontmatter(nextSource), {
          ...runtime,
          remarkPlugins: [remarkGfm],
        });

        if (!ignore) {
          setCompiledMdx(() => evaluated.default);
        }
      } catch (requestError) {
        if (!ignore) {
          setSource("");
          setCompiledMdx(null);
          setError(makeErrorMessage(requestError));
        }
      } finally {
        if (!ignore) setIsLoadingSource(false);
      }
    }

    loadSource();

    return () => {
      ignore = true;
    };
  }, [activeFilePath, owner, repo, selectedSha]);

  const selectedCommit = commits.find((commit) => commit.sha === selectedSha);

  const mdxComponents = {
    pre: (props: React.ComponentProps<"pre">) => <CodeBlock {...props} />,
    img: (props: React.ComponentProps<"img">) => (
      <MdxImage category={category} slug={slug} {...props} />
    ),
    a: (props: React.ComponentProps<"a">) => (
      <a {...props} target={props.href?.startsWith("http") ? "_blank" : undefined} />
    ),
    table: (props: React.ComponentProps<"table">) => (
      <div className="my-6 max-w-full overflow-auto">
        <table {...props} className="w-full border-collapse border border-slate-200" />
      </div>
    ),
    th: (props: React.ComponentProps<"th">) => (
      <th {...props} className="border border-slate-200 px-3 py-2 text-left" />
    ),
    td: (props: React.ComponentProps<"td">) => (
      <td {...props} className="border border-slate-200 px-3 py-2 align-top" />
    ),
    CipherPlayground,
    CategoryPostLinks,
    FancyShowcase,
    JavaScriptPlayground,
    MdxHistoryViewer: () => (
      <div className="my-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
        히스토리 미리보기 안의 MdxHistoryViewer는 중첩 렌더링을 막기 위해 생략했습니다.
      </div>
    ),
    PythonPlayground,
    SeminarInfo,
  };

  return (
    <section className="my-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-300">
          GitHub MDX History
        </p>
        <h3 className="mt-2 text-2xl font-black tracking-tight">
          과거 커밋의 MDX 내용 확인
        </h3>
      </div>

      <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-5 lg:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            기록 기준 경로
          </span>
          <input
            value={historyInput}
            onChange={(event) => setHistoryInput(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">
            렌더링할 MDX 파일
          </span>
          <input
            value={fileInput}
            onChange={(event) => setFileInput(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            setActiveHistoryPath(historyInput.trim());
            setActiveFilePath(fileInput.trim());
          }}
          className="self-end rounded-md bg-sky-600 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-500"
        >
          Load
        </button>
      </div>

      <div className="grid min-h-[520px] lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 p-4">
            <div className="text-sm font-black text-slate-900">
              Commits
            </div>
            <div className="mt-1 break-all font-mono text-xs text-slate-500">
              {activeHistoryPath}
            </div>
          </div>

          <div className="max-h-[560px] overflow-auto">
            {isLoadingCommits && (
              <div className="p-4 text-sm font-bold text-slate-500">
                커밋 목록을 불러오는 중...
              </div>
            )}

            {!isLoadingCommits && commits.length === 0 && (
              <div className="p-4 text-sm font-bold text-slate-500">
                표시할 커밋이 없습니다.
              </div>
            )}

            {commits.map((commit) => (
              <button
                key={commit.sha}
                type="button"
                onClick={() => setSelectedSha(commit.sha)}
                className={
                  selectedSha === commit.sha
                    ? "block w-full border-b border-slate-200 bg-sky-50 p-4 text-left"
                    : "block w-full border-b border-slate-200 p-4 text-left transition hover:bg-slate-50"
                }
              >
                <div className="font-mono text-xs font-black text-sky-700">
                  {shortSha(commit.sha)}
                </div>
                <div className="mt-1 line-clamp-2 text-sm font-bold text-slate-900">
                  {commit.commit.message}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {formatDate(commit.commit.author.date)}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 p-5">
          <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="break-all font-mono text-sm font-black text-slate-900">
                {activeFilePath}
              </div>
              {selectedCommit && (
                <div className="mt-1 text-sm text-slate-500">
                  {shortSha(selectedCommit.sha)} · {formatDate(selectedCommit.commit.author.date)}
                </div>
              )}
            </div>

            <div className="flex shrink-0 rounded-md border border-slate-200 bg-slate-100 p-1">
              {(["preview", "source"] as RenderMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRenderMode(mode)}
                  className={
                    renderMode === mode
                      ? "rounded bg-white px-3 py-1.5 text-sm font-black text-sky-700 shadow-sm"
                      : "rounded px-3 py-1.5 text-sm font-bold text-slate-500"
                  }
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
              {error}
            </div>
          )}

          {isLoadingSource && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
              MDX 내용을 불러오고 렌더링하는 중...
            </div>
          )}

          {!isLoadingSource && renderMode === "source" && (
            <pre className="max-h-[680px] overflow-auto rounded-md border border-slate-200 bg-slate-950 p-4 text-sm leading-relaxed text-slate-100">
              {source || "소스가 없습니다."}
            </pre>
          )}

          {!isLoadingSource && renderMode === "preview" && (
            <div className="markdown-body max-w-none rounded-md border border-slate-200 p-5">
              {CompiledMdx ? (
                <CompiledMdx components={mdxComponents} />
              ) : (
                <div className="text-sm font-bold text-slate-500">
                  렌더링할 MDX가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
