"use client";

import { useState } from "react";

interface PythonPlaygroundProps {
  initialCode?: string;
}

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime>;
  }
}

interface PyodideRuntime {
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: {
    set: (name: string, value: unknown) => void;
  };
}

const pyodideVersion = "0.28.3";
const pyodideBaseUrl = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`;
let pyodidePromise: Promise<PyodideRuntime> | null = null;

const defaultCode = `users = [
    {"name": "Ada", "score": 92},
    {"name": "Grace", "score": 87},
    {"name": "Linus", "score": 76},
]

passed = [user["name"] for user in users if user["score"] >= 80]
print("passed:", passed)
print("count:", len(passed))`;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Pyodide script.")), { once: true });
      if (window.loadPyodide) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Pyodide script."));
    document.head.appendChild(script);
  });
}

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadScript(`${pyodideBaseUrl}pyodide.js`).then(() => {
      if (!window.loadPyodide) {
        throw new Error("loadPyodide is unavailable after loading pyodide.js.");
      }

      return window.loadPyodide({ indexURL: pyodideBaseUrl });
    });
  }

  return pyodidePromise;
}

function formatError(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

export default function PythonPlayground({
  initialCode = defaultCode,
}: PythonPlaygroundProps) {
  const [code, setCode] = useState(initialCode.trim());
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "running">("idle");

  const runCode = async () => {
    setStatus(pyodidePromise ? "running" : "loading");
    setStdout("");
    setStderr("");

    try {
      const pyodide = await getPyodide();
      setStatus("running");
      pyodide.globals.set("__playground_code", code);

      const result = await pyodide.runPythonAsync(`
import contextlib
import io
import json
import traceback

stdout = io.StringIO()
stderr = io.StringIO()

try:
    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
        exec(__playground_code, {})
except Exception:
    traceback.print_exc(file=stderr)

json.dumps({
    "stdout": stdout.getvalue(),
    "stderr": stderr.getvalue(),
})
`);

      const parsed = JSON.parse(String(result)) as {
        stdout: string;
        stderr: string;
      };

      setStdout(parsed.stdout);
      setStderr(parsed.stderr);
    } catch (error) {
      setStderr(formatError(error));
    } finally {
      setStatus("idle");
    }
  };

  return (
    <section className="my-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 p-5 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
            Python Runner
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight">
            Edit Python and run in browser
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
            disabled={status !== "idle"}
            className="rounded-md bg-blue-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Loading Pyodide" : status === "running" ? "Running" : "Run"}
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
            className="h-[360px] w-full resize-y rounded-md border border-slate-300 bg-slate-950 p-4 font-mono text-sm leading-relaxed text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-700">Output</h4>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
              stdout + stderr
            </span>
          </div>

          <pre className="min-h-[360px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            {stdout || stderr ? (
              <>
                {stdout && <span className="block whitespace-pre-wrap">{stdout}</span>}
                {stderr && <span className="block whitespace-pre-wrap text-rose-700">{stderr}</span>}
              </>
            ) : (
              "Run the code to see output. The first run downloads the Python runtime."
            )}
          </pre>
        </div>
      </div>
    </section>
  );
}
