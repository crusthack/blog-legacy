"use client";

import { useMemo, useState } from "react";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function normalizeShift(shift: number) {
  return ((shift % 26) + 26) % 26;
}

function shiftChar(char: string, shift: number) {
  const code = char.charCodeAt(0);
  const isUpper = code >= 65 && code <= 90;
  const isLower = code >= 97 && code <= 122;

  if (!isUpper && !isLower) return char;

  const base = isUpper ? 65 : 97;
  const next = ((code - base + normalizeShift(shift)) % 26) + base;
  return String.fromCharCode(next);
}

function caesar(text: string, shift: number, decrypt = false) {
  const actualShift = decrypt ? -shift : shift;
  return [...text].map((char) => shiftChar(char, actualShift)).join("");
}

function getKeyShifts(key: string) {
  return [...key.toUpperCase()]
    .filter((char) => char >= "A" && char <= "Z")
    .map((char) => char.charCodeAt(0) - 65);
}

function vigenere(text: string, key: string, decrypt = false) {
  const shifts = getKeyShifts(key);
  if (shifts.length === 0) return text;

  let keyIndex = 0;

  return [...text]
    .map((char) => {
      const code = char.charCodeAt(0);
      const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
      if (!isLetter) return char;

      const shift = shifts[keyIndex % shifts.length];
      keyIndex += 1;
      return shiftChar(char, decrypt ? -shift : shift);
    })
    .join("");
}

export default function CipherPlayground() {
  const [plainText, setPlainText] = useState("KEEPER");
  const [caesarShift, setCaesarShift] = useState(3);
  const [vigenereKey, setVigenereKey] = useState("KEY");

  const caesarEncrypted = useMemo(
    () => caesar(plainText, caesarShift),
    [plainText, caesarShift]
  );
  const caesarDecrypted = useMemo(
    () => caesar(caesarEncrypted, caesarShift, true),
    [caesarEncrypted, caesarShift]
  );
  const vigenereEncrypted = useMemo(
    () => vigenere(plainText, vigenereKey),
    [plainText, vigenereKey]
  );
  const vigenereDecrypted = useMemo(
    () => vigenere(vigenereEncrypted, vigenereKey, true),
    [vigenereEncrypted, vigenereKey]
  );
  const keyShifts = getKeyShifts(vigenereKey);

  return (
    <section className="my-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
          Classical Cipher Playground
        </p>
        <h3 className="mt-2 text-2xl font-black">카이사르 / 비즈네르 암호 동작 확인</h3>
        <p className="mt-2 text-sm text-slate-300">
          영문 알파벳만 암호화하고, 공백/숫자/기호는 그대로 유지합니다.
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5 border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">원문</span>
            <textarea
              value={plainText}
              onChange={(e) => setPlainText(e.target.value)}
              className="h-28 w-full resize-none rounded-md border border-slate-300 p-3 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex justify-between text-sm font-bold text-slate-700">
              <span>카이사르 이동값</span>
              <span className="text-blue-600">{caesarShift}</span>
            </span>
            <input
              type="range"
              min="0"
              max="25"
              value={caesarShift}
              onChange={(e) => setCaesarShift(Number(e.target.value))}
              className="w-full"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">비즈네르 키</span>
            <input
              value={vigenereKey}
              onChange={(e) => setVigenereKey(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-3 font-mono text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="KEY"
            />
          </label>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-black text-slate-900">카이사르 암호</h4>
              <span className="rounded bg-blue-100 px-2 py-1 text-xs font-black text-blue-700">
                +{normalizeShift(caesarShift)}
              </span>
            </div>
            <ResultRow label="암호문" value={caesarEncrypted} />
            <ResultRow label="복호화" value={caesarDecrypted} />
            <div className="mt-3 grid grid-cols-2 gap-1 text-center font-mono text-[11px]">
              {alphabet.split("").map((char) => (
                <div key={char} className="rounded border border-slate-200 bg-white px-1 py-1">
                  {`${char} -> ${caesar(char, caesarShift)}`}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-black text-slate-900">비즈네르 암호</h4>
              <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">
                {keyShifts.length > 0 ? keyShifts.join(", ") : "키 없음"}
              </span>
            </div>
            <ResultRow label="암호문" value={vigenereEncrypted} />
            <ResultRow label="복호화" value={vigenereDecrypted} />
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              키의 각 글자를 0부터 25까지의 이동값으로 바꾼 뒤, 원문의 알파벳마다 순서대로 적용합니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-1 text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="break-words font-mono text-lg font-black text-slate-900">
        {value || "(empty)"}
      </div>
    </div>
  );
}
