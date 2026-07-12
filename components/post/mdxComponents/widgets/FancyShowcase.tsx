"use client";
// Interactive MDX component used in posts.

import { useMemo, useState } from "react";

type Mode = "overview" | "metrics" | "timeline";

interface FancyShowcaseProps {
  title?: string;
  accent?: "blue" | "emerald" | "rose";
}

const accentMap = {
  blue: {
    text: "text-blue-600",
    bg: "bg-blue-600",
    soft: "bg-blue-50",
    border: "border-blue-200",
  },
  emerald: {
    text: "text-emerald-600",
    bg: "bg-emerald-600",
    soft: "bg-emerald-50",
    border: "border-emerald-200",
  },
  rose: {
    text: "text-rose-600",
    bg: "bg-rose-600",
    soft: "bg-rose-50",
    border: "border-rose-200",
  },
};

const stats = [
  { label: "MDX", value: 94 },
  { label: "Slides", value: 88 },
  { label: "UX", value: 91 },
];

export default function FancyShowcase({
  title = "Interactive MDX Component",
  accent = "blue",
}: FancyShowcaseProps) {
  const [mode, setMode] = useState<Mode>("overview");
  const [enabled, setEnabled] = useState(true);
  const [intensity, setIntensity] = useState(68);
  const colors = accentMap[accent] ?? accentMap.blue;

  const score = useMemo(() => {
    const base = enabled ? intensity : Math.round(intensity * 0.45);
    return Math.min(100, Math.max(0, base));
  }, [enabled, intensity]);

  return (
    <section className={`my-8 overflow-hidden rounded-lg border ${colors.border} bg-white shadow-xl`}>
      <div className={`flex flex-col gap-4 border-b ${colors.border} ${colors.soft} p-5 md:flex-row md:items-center md:justify-between`}>
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.25em] ${colors.text}`}>
            React in MDX
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {title}
          </h3>
        </div>

        <div className="flex rounded-md border border-slate-200 bg-white p-1 shadow-sm">
          {(["overview", "metrics", "timeline"] as Mode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded px-3 py-1.5 text-sm font-bold transition ${
                mode === item
                  ? `${colors.bg} text-white`
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
        <div className="p-5">
          {mode === "overview" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700">Feature Power</span>
                  <span className={`text-2xl font-black ${colors.text}`}>{score}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${colors.bg} transition-all duration-300`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>

              <label className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <span>
                  <span className="block text-sm font-bold text-slate-800">Live mode</span>
                  <span className="text-sm text-slate-500">Toggle client-side state inside MDX.</span>
                </span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-5 w-5 accent-blue-600"
                />
              </label>

              <label className="block rounded-lg border border-slate-200 p-4">
                <span className="mb-3 block text-sm font-bold text-slate-800">Intensity</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>
          )}

          {mode === "metrics" && (
            <div className="space-y-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 flex justify-between text-sm font-bold">
                    <span>{stat.label}</span>
                    <span className={colors.text}>{stat.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className={`h-2 rounded-full ${colors.bg}`} style={{ width: `${stat.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {mode === "timeline" && (
            <ol className="space-y-4">
              {["Create component", "Register in MDXRemote", "Use JSX in markdown"].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colors.bg} text-sm font-black text-white`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">{item}</p>
                    <p className="text-sm text-slate-500">This step is rendered by a React component inside an MDX document.</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-950 p-5 text-slate-100 md:border-l md:border-t-0">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Preview
            </span>
            <span className={`rounded px-2 py-1 text-xs font-black text-white ${colors.bg}`}>
              {mode}
            </span>
          </div>
          <pre className="overflow-auto rounded bg-black/30 p-4 text-sm leading-relaxed text-slate-200">
{`<FancyShowcase
  title="${title}"
  accent="${accent}"
/>`}
          </pre>
        </div>
      </div>
    </section>
  );
}
