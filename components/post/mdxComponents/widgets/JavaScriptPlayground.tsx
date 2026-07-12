"use client";
// Interactive MDX component used in posts.

import { useState } from "react";

interface JavaScriptPlaygroundProps {
  initialCode?: string;
}

const defaultCode = `const users = [
  { name: "Ada", score: 92 },
  { name: "Grace", score: 87 },
  { name: "Linus", score: 76 },
];

const passed = users
  .filter((user) => user.score >= 80)
  .map((user) => user.name);

console.log("passed:", passed);
return passed.length;`;

type OutputKind = "log" | "warn" | "error" | "return";

interface OutputLine {
  kind: OutputKind;
  value: string;
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function JavaScriptPlayground({
  initialCode = defaultCode,
}: JavaScriptPlaygroundProps) {
  const [code, setCode] = useState(initialCode.trim());
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runCode = async () => {
    setIsRunning(true);

    const nextOutput: OutputLine[] = [];
    const sandboxConsole = {
      log: (...values: unknown[]) => {
        nextOutput.push({ kind: "log", value: values.map(formatValue).join(" ") });
      },
      warn: (...values: unknown[]) => {
        nextOutput.push({ kind: "warn", value: values.map(formatValue).join(" ") });
      },
      error: (...values: unknown[]) => {
        nextOutput.push({ kind: "error", value: values.map(formatValue).join(" ") });
      },
    };

    try {
      const execute = new Function(
        "console",
        `"use strict"; return (async () => {\n${code}\n})();`
      );
      const result = await execute(sandboxConsole);

      if (result !== undefined) {
        nextOutput.push({ kind: "return", value: formatValue(result) });
      }
    } catch (error) {
      nextOutput.push({ kind: "error", value: formatValue(error) });
    } finally {
      setOutput(nextOutput);
      setIsRunning(false);
    }
  };

  return (
    <section className="my-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 p-5 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
            JavaScript Runner
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight">
            Edit, run, inspect output
          </h3>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCode(initialCode.trim())}
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={runCode}
            disabled={isRunning}
            className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? "Running" : "Run"}
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <label className="block border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
          <span className="mb-3 block text-sm font-black text-slate-700">
            Code
          </span>
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            className="h-[360px] w-full resize-y rounded-md border border-slate-300 bg-slate-950 p-4 font-mono text-sm leading-relaxed text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-700">Output</h4>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
              console + return
            </span>
          </div>

          <pre className="min-h-[360px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            {output.length === 0
              ? "Run the code to see output."
              : output.map((line, index) => (
                  <span
                    key={`${line.kind}-${index}`}
                    className={
                      line.kind === "error"
                        ? "block text-rose-700"
                        : line.kind === "warn"
                          ? "block text-amber-700"
                          : line.kind === "return"
                            ? "block text-emerald-700"
                            : "block"
                    }
                  >
                    {line.kind === "return" ? "return" : line.kind}
                    {": "}
                    {line.value}
                  </span>
                ))}
          </pre>
        </div>
      </div>
    </section>
  );
}
