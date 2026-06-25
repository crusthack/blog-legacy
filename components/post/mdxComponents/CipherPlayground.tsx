"use client";
// Interactive MDX component used in posts.

import { useState } from "react";

type CipherType = "caesar" | "vigenere";
type CipherMode = "encrypt" | "decrypt";

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
      const isLetter =
        (code >= 65 && code <= 90) || (code >= 97 && code <= 122);

      if (!isLetter) return char;

      const shift = shifts[keyIndex % shifts.length];
      keyIndex += 1;

      return shiftChar(char, decrypt ? -shift : shift);
    })
    .join("");
}

export default function CipherPlayground() {
  const [cipherType, setCipherType] = useState<CipherType>("caesar");
  const [cipherMode, setCipherMode] = useState<CipherMode>("encrypt");
  const [inputText, setInputText] = useState("KEEPER");
  const [caesarShift, setCaesarShift] = useState(3);
  const [vigenereKey, setVigenereKey] = useState("KEY");
  const [showTable, setShowTable] = useState(false);

  const isCaesar = cipherType === "caesar";
  const isDecrypt = cipherMode === "decrypt";

  const result = isCaesar
    ? caesar(inputText, caesarShift, isDecrypt)
    : vigenere(inputText, vigenereKey, isDecrypt);

  const keyShifts = getKeyShifts(vigenereKey);

  return (
    <section className="my-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300">
          Classical Cipher Playground
        </p>

        <h3 className="mt-2 text-2xl font-black">고전 암호 동작 확인</h3>

        <p className="mt-2 text-sm text-slate-300">
          카이사르 암호와 비즈네르 암호를 선택하고, 암호화 또는 복호화 방향을
          바꿔가며 결과를 확인합니다.
        </p>
      </div>

      <div className="space-y-3 border-b border-slate-200 bg-slate-50 p-4">
        <ToggleGroup>
          <CipherToggleButton
            active={cipherType === "caesar"}
            onClick={() => setCipherType("caesar")}
          >
            카이사르 암호
          </CipherToggleButton>

          <CipherToggleButton
            active={cipherType === "vigenere"}
            onClick={() => setCipherType("vigenere")}
          >
            비즈네르 암호
          </CipherToggleButton>
        </ToggleGroup>

        <ToggleGroup>
          <CipherToggleButton
            active={cipherMode === "encrypt"}
            onClick={() => setCipherMode("encrypt")}
          >
            암호화
          </CipherToggleButton>

          <CipherToggleButton
            active={cipherMode === "decrypt"}
            onClick={() => setCipherMode("decrypt")}
          >
            복호화
          </CipherToggleButton>
        </ToggleGroup>
      </div>

      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5 border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              {cipherMode === "encrypt" ? "원문" : "암호문"}
            </span>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="h-32 w-full resize-none rounded-md border border-slate-300 p-3 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder={
                cipherMode === "encrypt"
                  ? "암호화할 영문 텍스트를 입력하세요."
                  : "복호화할 암호문을 입력하세요."
              }
            />
          </label>

          {cipherType === "caesar" ? (
            <CaesarOptions shift={caesarShift} onShiftChange={setCaesarShift} />
          ) : (
            <VigenereOptions
              cipherKey={vigenereKey}
              onKeyChange={setVigenereKey}
              keyShifts={keyShifts}
            />
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
            {cipherType === "caesar" ? (
              <p className="m-0">
                카이사르 암호는 알파벳을 일정한 칸 수만큼 밀어서 암호문을
                만드는 단순 치환 암호입니다. 복호화할 때는 같은 칸 수만큼 반대로
                이동합니다.
              </p>
            ) : (
              <p className="m-0">
                비즈네르 암호는 키 문자열의 각 문자를 이동값으로 바꾸고,
                원문의 각 알파벳에 순서대로 적용하는 다중 치환 암호입니다.
                복호화할 때는 같은 키를 반대 방향으로 적용합니다.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h4 className="font-black text-slate-900">
                {cipherType === "caesar" ? "카이사르 암호" : "비즈네르 암호"}
              </h4>

              <CipherBadge>
                {cipherType === "caesar"
                  ? `${cipherMode === "encrypt" ? "+" : "-"}${normalizeShift(
                      caesarShift
                    )}`
                  : keyShifts.length > 0
                    ? keyShifts.join(", ")
                    : "키 없음"}
              </CipherBadge>
            </div>

            <FlowResult
              label={cipherMode === "encrypt" ? "원문" : "암호문"}
              value={inputText}
            />

            <FlowArrow label={cipherMode === "encrypt" ? "암호화" : "복호화"} />

            <FlowResult
              label={cipherMode === "encrypt" ? "암호문" : "복호문"}
              value={result}
              strong
            />
          </div>

          {cipherType === "caesar" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => setShowTable((prev) => !prev)}
                className="flex w-full items-center justify-between text-left font-black text-slate-900"
              >
                <span>알파벳 변환표</span>
                <span className="text-sm text-blue-600">
                  {showTable ? "접기" : "보기"}
                </span>
              </button>

              {showTable && (
                <div className="mt-3 grid grid-cols-2 gap-1 text-center font-mono text-[11px] sm:grid-cols-4">
                  {alphabet.split("").map((char) => (
                    <div
                      key={char}
                      className="rounded border border-slate-200 bg-white px-1 py-1"
                    >
                      {char} →{" "}
                      {caesar(char, caesarShift, cipherMode === "decrypt")}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ToggleGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-200 p-1">
      {children}
    </div>
  );
}

function CipherToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-white px-4 py-2 text-sm font-black text-blue-700 shadow-sm"
          : "rounded-md px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-white/60 hover:text-slate-900"
      }
    >
      {children}
    </button>
  );
}

function CaesarOptions({
  shift,
  onShiftChange,
}: {
  shift: number;
  onShiftChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex justify-between text-sm font-bold text-slate-700">
        <span>카이사르 이동값</span>
        <span className="text-blue-600">{shift}</span>
      </span>

      <input
        type="range"
        min="0"
        max="25"
        value={shift}
        onChange={(e) => onShiftChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

function VigenereOptions({
  cipherKey,
  onKeyChange,
  keyShifts,
}: {
  cipherKey: string;
  onKeyChange: (value: string) => void;
  keyShifts: number[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        비즈네르 키
      </span>

      <input
        value={cipherKey}
        onChange={(e) => onKeyChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 p-3 font-mono text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        placeholder="KEY"
      />

      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        현재 키 이동값:{" "}
        <span className="font-mono font-bold text-slate-700">
          {keyShifts.length > 0 ? keyShifts.join(", ") : "없음"}
        </span>
      </p>
    </label>
  );
}

function CipherBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="max-w-[220px] truncate rounded bg-blue-100 px-2 py-1 text-xs font-black text-blue-700">
      {children}
    </span>
  );
}

function FlowResult({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "rounded-md border border-blue-200 bg-blue-50 p-3"
          : "rounded-md border border-slate-200 bg-white p-3"
      }
    >
      <div className="mb-1 text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="break-words font-mono text-lg font-black text-slate-900">
        {value || "(empty)"}
      </div>
    </div>
  );
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-2 text-xs font-black text-slate-400">
      ↓ {label}
    </div>
  );
}
