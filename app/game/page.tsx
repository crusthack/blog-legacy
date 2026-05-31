'use client';

import { memo, useEffect, useRef, useState, useCallback } from 'react';

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
};

type BaseballResult = { strikes: number; balls: number };
type BaseballGuess = { digits: string; result: BaseballResult };
type GameSound = 'open' | 'flag' | 'chord' | 'win' | 'lose' | 'input' | 'back' | 'submit' | 'reset' | 'start';

const BASEBALL_LENGTH = 4;
const MAX_BASEBALL_GUESSES = 10;

const createSecretDigits = () => {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, BASEBALL_LENGTH).join('');
};

const evaluateBaseballGuess = (guess: string, secret: string): BaseballResult => {
  let strikes = 0;
  let balls = 0;

  for (let i = 0; i < BASEBALL_LENGTH; i += 1) {
    if (guess[i] === secret[i]) {
      strikes += 1;
    } else if (secret.includes(guess[i])) {
      balls += 1;
    }
  }

  return { strikes, balls };
};

type MineCell = {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacent: number;
};

const MINE_ROWS = 16;
const MINE_COLS = 30;
const MINE_COUNT = 99;

let sharedAudioContext: AudioContext | null = null;

const playGameSound = (type: GameSound) => {
  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = sharedAudioContext;
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const playTone = (
      frequency: number,
      duration: number,
      oscillatorType: OscillatorType = 'sine',
      delay = 0,
    ) => {
      const osc = ctx.createOscillator();
      osc.type = oscillatorType;
      osc.frequency.setValueAtTime(frequency, now + delay);
      osc.connect(gain);
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    };

    gain.gain.setValueAtTime(0.0001, now);

    switch (type) {
      case 'open':
        gain.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        playTone(520, 0.08, 'triangle');
        break;
      case 'flag':
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        playTone(320, 0.07, 'square');
        break;
      case 'chord':
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        playTone(440, 0.07, 'triangle');
        playTone(660, 0.07, 'triangle', 0.07);
        break;
      case 'win':
        gain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        playTone(523, 0.08, 'triangle');
        playTone(659, 0.08, 'triangle', 0.08);
        playTone(784, 0.11, 'triangle', 0.17);
        break;
      case 'lose':
        gain.gain.exponentialRampToValueAtTime(0.13, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        playTone(180, 0.28, 'sawtooth');
        break;
      case 'input':
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        playTone(760, 0.05, 'sine');
        break;
      case 'back':
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        playTone(360, 0.06, 'triangle');
        break;
      case 'submit':
        gain.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        playTone(620, 0.05, 'triangle');
        playTone(820, 0.05, 'triangle', 0.05);
        break;
      case 'reset':
      case 'start':
        gain.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        playTone(type === 'start' ? 700 : 420, 0.12, 'triangle');
        break;
    }
  } catch {
    // Audio can be unavailable in some browser privacy modes.
  }
};

const createEmptyMineBoard = (): MineCell[][] =>
  Array.from({ length: MINE_ROWS }, () =>
    Array.from({ length: MINE_COLS }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacent: 0,
    }))
  );

const getMineNeighbors = (row: number, col: number) => {
  const neighbors: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < MINE_ROWS && nc >= 0 && nc < MINE_COLS) {
        neighbors.push([nr, nc]);
      }
    }
  }
  return neighbors;
};

const createMineBoard = (safeRow: number, safeCol: number): MineCell[][] => {
  const board = createEmptyMineBoard();
  const blocked = new Set([`${safeRow},${safeCol}`, ...getMineNeighbors(safeRow, safeCol).map(([r, c]) => `${r},${c}`)]);
  const candidates: Array<[number, number]> = [];

  for (let row = 0; row < MINE_ROWS; row += 1) {
    for (let col = 0; col < MINE_COLS; col += 1) {
      if (!blocked.has(`${row},${col}`)) candidates.push([row, col]);
    }
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  candidates.slice(0, MINE_COUNT).forEach(([row, col]) => {
    board[row][col].isMine = true;
  });

  for (let row = 0; row < MINE_ROWS; row += 1) {
    for (let col = 0; col < MINE_COLS; col += 1) {
      if (board[row][col].isMine) continue;
      board[row][col].adjacent = getMineNeighbors(row, col)
        .filter(([nr, nc]) => board[nr][nc].isMine)
        .length;
    }
  }

  return board;
};

const MinesweeperGame = memo(function MinesweeperGame() {
  const [board, setBoard] = useState<MineCell[][]>(() => createEmptyMineBoard());
  const [isStarted, setIsStarted] = useState(false);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [flags, setFlags] = useState(0);
  const [pressedCell, setPressedCell] = useState<[number, number] | null>(null);

  const reset = () => {
    playGameSound('reset');
    setBoard(createEmptyMineBoard());
    setIsStarted(false);
    setStatus('playing');
    setFlags(0);
    setPressedCell(null);
  };

  const revealBoard = (source: MineCell[][], startRow: number, startCol: number) => {
    const next = source.map((row) => row.map((cell) => ({ ...cell })));
    const queue: Array<[number, number]> = [[startRow, startCol]];

    while (queue.length > 0) {
      const [row, col] = queue.shift()!;
      const cell = next[row][col];
      if (cell.isRevealed || cell.isFlagged) continue;

      cell.isRevealed = true;
      if (cell.adjacent !== 0 || cell.isMine) continue;

      getMineNeighbors(row, col).forEach(([nr, nc]) => {
        if (!next[nr][nc].isRevealed && !next[nr][nc].isFlagged) {
          queue.push([nr, nc]);
        }
      });
    }

    return next;
  };

  const revealManyCells = (source: MineCell[][], cells: Array<[number, number]>) => {
    let next = source;
    for (const [row, col] of cells) {
      const cell = next[row][col];
      if (!cell.isRevealed && !cell.isFlagged && !cell.isMine) {
        next = revealBoard(next, row, col);
      }
    }
    return next;
  };

  const revealAllMines = (source: MineCell[][]) =>
    source.map((row) => row.map((cell) => ({ ...cell, isRevealed: cell.isRevealed || cell.isMine })));

  const hasWon = (source: MineCell[][]) =>
    source.every((row) => row.every((cell) => cell.isMine || cell.isRevealed));

  const revealCell = (row: number, col: number) => {
    if (status !== 'playing') return;
    setPressedCell(null);

    const activeBoard = isStarted ? board : createMineBoard(row, col);
    const cell = activeBoard[row][col];
    if (cell.isFlagged) return;

    if (cell.isRevealed) {
      if (cell.adjacent === 0) return;

      const neighbors = getMineNeighbors(row, col);
      const flaggedCount = neighbors.filter(([nr, nc]) => activeBoard[nr][nc].isFlagged).length;
      if (flaggedCount !== cell.adjacent) return;

      const hiddenUnflagged = neighbors.filter(([nr, nc]) => {
        const neighbor = activeBoard[nr][nc];
        return !neighbor.isRevealed && !neighbor.isFlagged;
      });
      const hitMine = hiddenUnflagged.some(([nr, nc]) => activeBoard[nr][nc].isMine);
      if (hitMine) {
        playGameSound('lose');
        setBoard(revealAllMines(activeBoard));
        setStatus('lost');
        return;
      }

      const next = revealManyCells(activeBoard, hiddenUnflagged);
      setBoard(next);
      if (hasWon(next)) {
        playGameSound('win');
        setStatus('won');
      } else {
        playGameSound('chord');
      }
      return;
    }

    if (cell.isMine) {
      playGameSound('lose');
      setBoard(revealAllMines(activeBoard));
      setStatus('lost');
      setIsStarted(true);
      return;
    }

    const next = revealBoard(activeBoard, row, col);
    setBoard(next);
    setIsStarted(true);
    if (hasWon(next)) {
      playGameSound('win');
      setStatus('won');
    } else {
      playGameSound('open');
    }
  };

  const toggleFlag = (row: number, col: number) => {
    if (status !== 'playing') return;

    setBoard((prev) => {
      const cell = prev[row][col];
      const currentFlags = prev.flat().filter((item) => item.isFlagged).length;
      if (cell.isRevealed || (!cell.isFlagged && currentFlags >= MINE_COUNT)) return prev;

      setPressedCell(null);

      const next = prev.map((r) => r.map((c) => ({ ...c })));
      next[row][col].isFlagged = !next[row][col].isFlagged;
      setFlags(currentFlags + (next[row][col].isFlagged ? 1 : -1));
      playGameSound('flag');
      return next;
    });
  };

  const isPressedPreviewCell = (row: number, col: number) => {
    if (!pressedCell) return false;

    const [pressedRow, pressedCol] = pressedCell;
    const sourceCell = board[pressedRow]?.[pressedCol];
    if (!sourceCell?.isRevealed || sourceCell.adjacent === 0) return false;

    const targetCell = board[row][col];
    if (targetCell.isRevealed || targetCell.isFlagged) return false;

    return getMineNeighbors(pressedRow, pressedCol).some(([nr, nc]) => nr === row && nc === col);
  };

  const numberColor = (value: number) => {
    if (value === 1) return 'text-blue-400';
    if (value === 2) return 'text-emerald-400';
    if (value === 3) return 'text-red-400';
    if (value === 4) return 'text-violet-400';
    return 'text-amber-300';
  };

  return (
    <section className="w-full max-w-6xl rounded-[2rem] border border-slate-800 bg-slate-950 p-6 shadow-2xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-100">MINESWEEPER</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-400">
            Reveal every safe cell. Left click opens a cell, right click places a flag. The first click is safe.
          </p>
        </div>
        <div className="text-right font-mono text-sm font-black text-emerald-400">
          {MINE_COUNT - flags} mines left
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-5">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-black/30 p-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-300">
            {status === 'playing' && (isStarted ? 'Use the numbers to locate the mines.' : 'Pick any cell to start.')}
            {status === 'won' && 'Clear. Every safe cell is open.'}
            {status === 'lost' && 'Mine triggered. Try another field.'}
          </div>
          <button
            onClick={reset}
            className="rounded-lg bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
          >
            NEW FIELD
          </button>
        </div>

        <div className="w-full rounded-xl border border-slate-800 bg-black/40 p-2">
          <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-0.5" onMouseLeave={() => setPressedCell(null)}>
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const content = cell.isFlagged && !cell.isRevealed
                  ? '⚑'
                  : cell.isMine && cell.isRevealed
                    ? '✹'
                    : cell.isRevealed && cell.adjacent > 0
                      ? cell.adjacent
                      : '';
                const isPressedPreview = isPressedPreviewCell(rowIndex, colIndex);

                return (
                  <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => revealCell(rowIndex, colIndex)}
                  onMouseDown={(event) => {
                    if (event.button === 2) {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleFlag(rowIndex, colIndex);
                    }
                    if (event.button === 0 && cell.isRevealed && cell.adjacent > 0) {
                      setPressedCell([rowIndex, colIndex]);
                    }
                  }}
                  onMouseUp={() => setPressedCell(null)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                    className={`flex aspect-square w-full min-w-0 select-none items-center justify-center rounded border text-[clamp(0.45rem,0.9vw,0.75rem)] font-black transition ${
                      cell.isRevealed
                        ? cell.isMine
                          ? 'border-red-500 bg-red-950 text-red-300'
                          : 'border-slate-700 bg-slate-900 text-slate-200'
                        : isPressedPreview
                          ? 'translate-y-px border-slate-700 bg-slate-900 text-slate-500 shadow-none'
                          : 'border-slate-600 bg-slate-700 text-amber-300 shadow-[inset_0_-2px_0_rgba(0,0,0,0.35)] hover:border-emerald-400 hover:bg-slate-600'
                    } ${cell.isRevealed && !cell.isMine ? numberColor(cell.adjacent) : ''}`}
                    aria-label={`row ${rowIndex + 1}, column ${colIndex + 1}`}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

const NumberBaseballGame = memo(function NumberBaseballGame() {
  const [secret, setSecret] = useState(() => createSecretDigits());
  const [current, setCurrent] = useState('');
  const [guesses, setGuesses] = useState<BaseballGuess[]>([]);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const reset = () => {
    playGameSound('reset');
    setSecret(createSecretDigits());
    setCurrent('');
    setGuesses([]);
    setStatus('playing');
  };

  const addDigit = (digit: string) => {
    if (status !== 'playing' || current.length >= BASEBALL_LENGTH || current.includes(digit)) return;
    playGameSound('input');
    setCurrent((prev) => `${prev}${digit}`);
  };

  const removeLast = () => {
    if (status !== 'playing' || current.length === 0) return;
    playGameSound('back');
    setCurrent((prev) => prev.slice(0, -1));
  };

  const submitGuess = () => {
    if (status !== 'playing' || current.length !== BASEBALL_LENGTH) return;

    const result = evaluateBaseballGuess(current, secret);
    const nextGuesses = [...guesses, { digits: current, result }];
    setGuesses(nextGuesses);
    setCurrent('');

    if (result.strikes === BASEBALL_LENGTH) {
      playGameSound('win');
      setStatus('won');
    } else if (nextGuesses.length >= MAX_BASEBALL_GUESSES) {
      playGameSound('lose');
      setStatus('lost');
    } else {
      playGameSound('submit');
    }
  };

  return (
    <section className="w-full max-w-6xl rounded-[2rem] border border-slate-800 bg-slate-950 p-6 shadow-2xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-100">NUMBER BASEBALL</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-400">
            Find the hidden 4-digit number. Strike means right digit and position. Ball means right digit in another position.
          </p>
        </div>
        <div className="text-right font-mono text-sm font-black text-emerald-400">
          {guesses.length} / {MAX_BASEBALL_GUESSES}
        </div>
      </div>

      <div className="grid gap-6 pt-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {Array.from({ length: MAX_BASEBALL_GUESSES }).map((_, index) => {
            const guess = guesses[index];
            const isCurrent = index === guesses.length && status === 'playing';
            const rowDigits = guess?.digits ?? (isCurrent ? current : '');

            return (
              <div
                key={index}
                className={`grid grid-cols-[1fr_150px] items-center gap-4 rounded-lg border px-4 py-3 ${
                  isCurrent ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-900'
                }`}
              >
                <div className="flex gap-2">
                  {Array.from({ length: BASEBALL_LENGTH }).map((__, slot) => {
                    const digit = rowDigits[slot];
                    return (
                      <div
                        key={slot}
                        className={`flex h-10 w-10 items-center justify-center rounded-md border text-lg font-black ${
                          digit ? 'border-emerald-400 bg-slate-950 text-emerald-300' : 'border-white/10 bg-slate-800 text-slate-600'
                        }`}
                      >
                        {digit ?? ''}
                      </div>
                    );
                  })}
                </div>
                <div className="text-right font-mono text-xs font-black uppercase tracking-wider text-slate-400">
                  {guess ? (
                    <>
                      <span className="text-emerald-400">{guess.result.strikes} strike</span>
                      <span className="mx-2 text-slate-600">/</span>
                      <span className="text-amber-300">{guess.result.balls} ball</span>
                    </>
                  ) : isCurrent ? (
                    'current'
                  ) : (
                    'locked'
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-4">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, digit) => (
              <button
                key={digit}
                onClick={() => addDigit(String(digit))}
                disabled={status !== 'playing' || current.length >= BASEBALL_LENGTH || current.includes(String(digit))}
                className="h-14 rounded-lg border border-slate-700 bg-slate-900 text-lg font-black text-slate-100 transition hover:scale-[1.03] hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {digit}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={removeLast}
              className="rounded-lg border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800"
            >
              BACK
            </button>
            <button
              onClick={submitGuess}
              disabled={current.length !== BASEBALL_LENGTH || status !== 'playing'}
              className="rounded-lg bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              CHECK
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm font-bold text-slate-300">
            {status === 'playing' && 'Enter 4 different digits, then check the strike/ball feedback.'}
            {status === 'won' && `Solved in ${guesses.length} tries.`}
            {status === 'lost' && (
              <div className="space-y-3">
                <p>Out of guesses. The answer was:</p>
                <div className="font-mono text-3xl font-black tracking-[0.4em] text-emerald-300">
                  {secret}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={reset}
            className="mt-4 w-full rounded-lg border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-slate-800"
          >
            NEW NUMBER
          </button>
        </div>
      </div>
    </section>
  );
});

export default function DinoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isNight, setIsNight] = useState(false);

  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 300;
  const GROUND_LINE = 250;
  const DINO_SIZE = 60;
  const GROUND_Y = GROUND_LINE - DINO_SIZE;

  const requestRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const isGameOverRef = useRef(false);
  const scoreRef = useRef(0);
  const lastScoreRenderRef = useRef(0);
  const dino = useRef({ x: 80, y: GROUND_Y, width: DINO_SIZE, height: DINO_SIZE, vy: 0, isDucking: false });
  const gameState = useRef({
    speed: 7, baseSpeed: 7, speedVariation: 0,
    obstacles: [] as any[], stars: [] as any[], particles: [] as any[],
    binaries: [] as any[], // Cyber 테마용
    distance: 0, nextSpawnTime: 0, lastCheckPoint: 0, audioCtx: null as AudioContext | null
  });

  const playSound = useCallback((type: 'jump' | 'pass' | 'crash' | 'duck') => {
    try {
      if (!gameState.current.audioCtx) gameState.current.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = gameState.current.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      switch(type) {
        case 'jump':
          osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
          gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(); osc.stop(now + 0.1); break;
        case 'pass':
          osc.type = 'triangle'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(2400, now + 0.07);
          gain.gain.setValueAtTime(0.06, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
          osc.start(); osc.stop(now + 0.07); break;
        case 'duck':
          osc.type = 'sine'; osc.frequency.setValueAtTime(200, now);
          gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.05);
          osc.start(); osc.stop(now + 0.05); break;
        case 'crash':
          osc.type = 'square'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
          gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(); osc.stop(now + 0.3); break;
      }
    } catch (e) {}
  }, []);

  const createParticle = useCallback((x: number, y: number, color: string, type: 'dust' | 'piece' | 'ember' | 'feather') => {
    const count = type === 'piece' ? 15 : (type === 'dust' ? 3 : 1);
    for(let i=0; i < count; i++) {
      gameState.current.particles.push({
        x, y, vx: (Math.random() - 0.5) * (type === 'piece' ? 10 : 3),
        vy: (Math.random() - 0.5) * (type === 'piece' ? 10 : 3) - (type === 'ember' || type === 'feather' ? 2 : 0),
        size: Math.random() * (type === 'dust' ? 5 : 6) + 2,
        life: 1.0, color, type
      });
    }
  }, []);

  useEffect(() => {
    const stars = [];
    for(let i=0; i<60; i++) stars.push({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * (GROUND_LINE - 120), size: Math.random() * 1.5 + 0.5 });
    gameState.current.stars = stars;
    const bins = [];
    for(let i=0; i<20; i++) bins.push({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT, val: Math.random() > 0.5 ? '1' : '0', speed: Math.random() * 3 + 2 });
    gameState.current.binaries = bins;
    const saved = localStorage.getItem('dinoHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const handleGameOverAction = useCallback(() => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true; setIsGameOver(true);
    isPlayingRef.current = false; setIsPlaying(false);
    shakeRef.current = 20; playSound('crash');
    setScore(scoreRef.current);
    const d = dino.current;
    createParticle(d.x + d.width/2, d.y + d.height/2, '#ef4444', 'piece');
    setHighScore(prev => {
      const newHigh = Math.max(prev, scoreRef.current);
      localStorage.setItem('dinoHighScore', newHigh.toString());
      return newHigh;
    });
  }, [playSound, createParticle]);

  const drawScene = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const state = gameState.current;
    const d = dino.current;
    const s = scoreRef.current;
    
    const isHell = s > 20000 && s <= 25000;
    const isHeaven = s > 25000 && s <= 30000;
    const isSpace = s > 30000 && s <= 35000;
    const isCyber = s > 35000;

    if (isPlayingRef.current && !isGameOverRef.current) {
      const currentPoint = Math.floor(state.distance / 1000);
      if (currentPoint > state.lastCheckPoint) {
        state.lastCheckPoint = currentPoint;
        if (s < 20000 && Math.random() < 0.4) setIsNight(prev => !prev);
        
        if (s > 20000) {
          if (Math.random() < 0.3) state.speedVariation += Math.random() * 1.5;
          state.speedVariation = Math.max(0, state.speedVariation);
        } else {
          if (Math.random() < 0.6) state.speedVariation = (Math.random() * 5) - 2;
          else state.speedVariation = 0;
        }
      }

      state.baseSpeed = 7 + (state.distance / 2000);
      state.speed = Math.max(6, state.baseSpeed + state.speedVariation);
      d.y += d.vy;
      const currentGroundY = d.isDucking ? GROUND_LINE - (DINO_SIZE / 2) : GROUND_Y;
      if (d.y < currentGroundY) d.vy += 0.75; else { d.y = currentGroundY; d.vy = 0; }

      if (time > state.nextSpawnTime) {
        const isFlying = Math.random() > 0.8 && state.distance > 800;
        if (isFlying) state.obstacles.push({ x: CANVAS_WIDTH, y: GROUND_Y + (Math.random() * 20), width: 40, height: 25, type: 'flying', passed: false });
        else state.obstacles.push({ x: CANVAS_WIDTH, y: GROUND_LINE - (40+Math.random()*30), width: 20*(Math.floor(Math.random()*3)+1), height: 40+Math.random()*30, type: 'ground', passed: false });
        state.nextSpawnTime = time + Math.max(450, 1500 - state.speed * 80) + (Math.random() * 800);
      }

      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obs = state.obstacles[i]; obs.x -= state.speed;
        if (!obs.passed && obs.x < d.x + d.width / 2) { obs.passed = true; playSound('pass'); }
        const p = 12;
        if (d.x + p < obs.x + obs.width - p && d.x + d.width - p > obs.x + p && d.y + p < obs.y + obs.height - p && d.y + d.height - p > obs.y + p) handleGameOverAction();
        if (obs.x + obs.width < -100) state.obstacles.splice(i, 1);
      }

      state.distance += state.speed * 0.1;
      scoreRef.current = Math.floor(state.distance);
      if (time - lastScoreRenderRef.current > 80) {
        lastScoreRenderRef.current = time;
        setScore(scoreRef.current);
      }

      if (isHell && Math.random() < 0.2) createParticle(Math.random() * CANVAS_WIDTH, GROUND_LINE, '#ef4444', 'ember');
      if (isHeaven && Math.random() < 0.1) createParticle(Math.random() * CANVAS_WIDTH, GROUND_LINE, '#ffffff', 'feather');
    }

    // Theme Selector
    const theme = isCyber ? { bg: '#000000', ground: '#052e16', dino: '#22c55e', obs: '#4ade80', fly: '#22c55e' } :
                  isSpace ? { bg: '#020617', ground: '#1e293b', dino: '#f8fafc', obs: '#fbbf24', fly: '#eab308' } :
                  isHeaven ? { bg: '#f0f9ff', ground: '#bae6fd', dino: '#0369a1', obs: '#0ea5e9', fly: '#38bdf8' } :
                  isHell ? { bg: '#450a0a', ground: '#7f1d1d', dino: '#fecaca', obs: '#ef4444', fly: '#f97316' } :
                  (isNight ? { bg: '#0f172a', ground: '#334155', dino: '#f1f5f9', obs: '#64748b', fly: '#fbbf24' } : 
                             { bg: '#f8fafc', ground: '#e2e8f0', dino: '#1e293b', obs: '#059669', fly: '#f59e0b' });

    ctx.save();
    if (shakeRef.current > 0) { ctx.translate((Math.random()-0.5)*shakeRef.current, (Math.random()-0.5)*shakeRef.current); shakeRef.current *= 0.9; }
    
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (isCyber) {
      ctx.fillStyle = '#064e3b'; ctx.font = '12px monospace';
      state.binaries.forEach(b => {
        ctx.fillText(b.val, b.x, b.y); b.y += b.speed;
        if (b.y > CANVAS_HEIGHT) { b.y = -10; b.x = Math.random() * CANVAS_WIDTH; }
      });
    } else if (isSpace || isNight) {
      ctx.fillStyle = isSpace ? '#fbbf24' : '#ffffff';
      state.stars.forEach(star => {
        ctx.globalAlpha = 0.2 + Math.abs(Math.sin(time/600+star.x))*0.6;
        ctx.beginPath(); ctx.arc(star.x, star.y, isSpace ? star.size*1.5 : star.size, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha = 1.0;
    }

    ctx.strokeStyle = theme.ground; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, GROUND_LINE); ctx.lineTo(CANVAS_WIDTH, GROUND_LINE); ctx.stroke();

    state.obstacles.forEach(obs => {
      ctx.fillStyle = obs.type === 'flying' ? theme.fly : theme.obs;
      drawRoundedRect(ctx, obs.x, obs.y, obs.width, obs.height, 6);
      if (isHell || isCyber) { ctx.shadowBlur = 15; ctx.shadowColor = theme.obs; ctx.fill(); ctx.shadowBlur = 0; }
    });

    for(let i=state.particles.length-1; i>=0; i--) {
      const p = state.particles[i]; ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, p.size, p.size); p.x += p.vx; p.y += p.vy; p.life -= 0.02;
      if(p.life <= 0) state.particles.splice(i, 1);
    }
    ctx.globalAlpha = 1.0;

    if(!isGameOverRef.current) {
      ctx.fillStyle = theme.dino;
      const drawH = d.isDucking ? d.height : d.height - 15;
      drawRoundedRect(ctx, d.x, d.y, d.width, drawH, 12);
      if(isHell || isCyber) { ctx.shadowBlur = 20; ctx.shadowColor = theme.dino; ctx.fill(); ctx.shadowBlur = 0; }
      ctx.fillStyle = (isHell || isCyber || isSpace) ? theme.bg : '#ffffff';
      ctx.fillRect(d.x + d.width - 18, d.y + 12, 10, 10);
      if (!d.isDucking) {
        const isOnGround = d.y >= (GROUND_LINE - DINO_SIZE) - 5;
        const move = (isPlayingRef.current && isOnGround) ? Math.sin(time/50)*14 : 0;
        ctx.fillStyle = theme.dino;
        ctx.fillRect(d.x + 8, d.y + drawH - 2, 12, 16 - Math.max(0, move));
        ctx.fillRect(d.x + d.width - 20, d.y + drawH - 2, 12, 16 - Math.max(0, -move));
      }
    }
    ctx.restore();
    requestRef.current = requestAnimationFrame(drawScene);
  }, [handleGameOverAction, playSound, createParticle, isNight]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(drawScene);
    return () => cancelAnimationFrame(requestRef.current);
  }, [drawScene]);

  const startGame = () => {
    if (!gameState.current.audioCtx) gameState.current.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    playGameSound('start');
    gameState.current = { ...gameState.current, speed: 7, baseSpeed: 7, speedVariation: 0, obstacles: [], particles: [], distance: 0, nextSpawnTime: performance.now()+500, lastCheckPoint: 0 };
    dino.current = { x: 80, y: GROUND_Y, width: DINO_SIZE, height: DINO_SIZE, vy: 0, isDucking: false };
    isPlayingRef.current = true; isGameOverRef.current = false; scoreRef.current = 0;
    lastScoreRenderRef.current = 0;
    setScore(0); setIsGameOver(false); setIsPlaying(true); setIsNight(false);
  };

  const jump = useCallback(() => {
    const d = dino.current;
    if (d.isDucking || !isPlayingRef.current || isGameOverRef.current) return;
    if (d.y >= GROUND_Y - 5) { d.vy = -15; playSound('jump'); createParticle(d.x+20, GROUND_LINE, '#cbd5e1', 'dust'); }
  }, [playSound, createParticle]);

  const setDucking = useCallback((ducking: boolean) => {
    const d = dino.current;
    if (isGameOverRef.current || !isPlayingRef.current) return;
    if (ducking && d.y < GROUND_Y - 5) return;
    if (ducking && !d.isDucking) { d.isDucking = true; d.height = DINO_SIZE/2; d.y = GROUND_LINE-d.height; playSound('duck'); }
    else if (!ducking && d.isDucking) { d.isDucking = false; d.height = DINO_SIZE; d.y = GROUND_Y; }
  }, [playSound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); if (!isPlayingRef.current) startGame(); else jump(); }
      else if (e.code === 'ArrowDown') { e.preventDefault(); if (isPlayingRef.current) setDucking(true); }
      else if (e.code === 'KeyH') { e.preventDefault(); jumpTo(20000) }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'ArrowDown') setDucking(false); };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [jump, setDucking]);

  const jumpTo = (s: number) => {
    if (!isPlayingRef.current) startGame();
    gameState.current.distance = s; gameState.current.lastCheckPoint = Math.floor(s/1000);
    scoreRef.current = s; lastScoreRenderRef.current = performance.now(); setScore(s);
  };

  const modeName = score > 35000 ? 'CYBER' : score > 30000 ? 'SPACE' : score > 25000 ? 'HEAVEN' : score > 20000 ? 'HELL' : 'BLOCK';
  const modeColor = score > 35000 ? 'text-green-500' : score > 30000 ? 'text-yellow-400' : score > 25000 ? 'text-blue-400' : score > 20000 ? 'text-red-500' : 'text-indigo-500';

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen gap-8 transition-all duration-1000 ${score > 35000 ? 'bg-black' : score > 30000 ? 'bg-slate-950' : score > 25000 ? 'bg-blue-50' : score > 20000 ? 'bg-red-950' : (isNight ? 'bg-slate-950' : 'bg-slate-300')} p-4 py-8 overflow-y-auto font-sans`}>
      <div className="fixed bottom-4 right-4 flex gap-2 opacity-20 hover:opacity-100 transition-opacity z-50">
        <button onClick={() => jumpTo(20001)} className="bg-black/50 text-[10px] text-white px-2 py-1 rounded border border-white/20 uppercase font-black">20K</button>
        <button onClick={() => jumpTo(25001)} className="bg-black/50 text-[10px] text-white px-2 py-1 rounded border border-white/20 uppercase font-black">25K</button>
        <button onClick={() => jumpTo(30001)} className="bg-black/50 text-[10px] text-white px-2 py-1 rounded border border-white/20 uppercase font-black">30K</button>
        <button onClick={() => jumpTo(35001)} className="bg-black/50 text-[10px] text-white px-2 py-1 rounded border border-white/20 uppercase font-black">35K</button>
      </div>

      <div className={`p-10 rounded-[3.5rem] shadow-2xl w-full max-w-6xl border-4 transition-all duration-1000 ${score > 35000 ? 'border-green-900 shadow-green-900/50' : score > 30000 ? 'border-slate-800 shadow-yellow-900/20' : score > 25000 ? 'border-blue-200 bg-white shadow-blue-200/50' : score > 20000 ? 'border-red-600 bg-red-900 shadow-red-900/50' : (isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')}`}>
        <div className="flex justify-between items-end mb-8 px-4 flex-wrap gap-4">
          <div>
            <h1 className={`text-5xl font-black tracking-tighter transition-colors ${score > 35000 ? 'text-green-500' : score > 30000 ? 'text-white' : score > 25000 ? 'text-blue-600' : score > 20000 ? 'text-red-100' : (isNight ? 'text-white' : 'text-slate-900')}`}>
              {modeName} <span className={modeColor}>{score > 35000 ? 'MATRIX' : 'RUN'}</span>
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-[0.4em] mt-2 ${score > 25000 && score <= 30000 ? 'text-blue-400' : 'text-slate-500'}`}>
              {score > 35000 ? 'SYSTEM OVERRIDE' : score > 30000 ? 'BEYOND THE STARS' : score > 25000 ? 'ETERNAL PEACE' : 'Probabilistic Engine'}
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="flex gap-2 mb-2">
              <div className={`px-3 py-2 rounded-2xl border transition-colors ${score > 20000 ? 'bg-black/20 border-white/10' : 'bg-slate-50'}`}>
                  <span className={`text-[10px] font-black uppercase mr-2 ${modeColor}`}>Speed</span>
                  <span className={`text-xl font-mono font-black ${modeColor}`}>{(gameState.current.speed / 7).toFixed(1)}x</span>
              </div>
              <div className={`px-4 py-2 rounded-2xl border transition-colors ${score > 20000 ? 'bg-black/20 border-white/10' : 'bg-slate-50'}`}>
                  <span className={`text-[10px] font-black uppercase mr-3 ${modeColor}`}>Best</span>
                  <span className={`text-xl font-mono font-bold ${modeColor}`}>{highScore.toString().padStart(5, '0')}</span>
              </div>
            </div>
            <p className={`text-8xl font-mono font-black leading-none tracking-tighter transition-colors ${score > 35000 ? 'text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]' : score > 30000 ? 'text-white' : score > 25000 ? 'text-blue-600' : score > 20000 ? 'text-red-100' : (isNight ? 'text-white' : 'text-slate-900')}`}>
              {score.toString().padStart(5, '0')}
            </p>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-[2.5rem] border-4 transition-colors duration-1000 ${score > 20000 ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-100'} shadow-2xl`}>
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-auto block" />
          {!isPlaying && !isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/10 backdrop-blur-[3px] cursor-pointer group" onClick={startGame}>
              <div className={`px-16 py-8 rounded-[2rem] shadow-2xl text-center transform group-hover:scale-105 transition-all duration-500 ${isNight ? 'bg-slate-800' : 'bg-white'}`}>
                <p className={`text-4xl font-black mb-3 ${isNight ? 'text-white' : 'text-slate-900'}`}>READY?</p>
                <p className="text-indigo-500 font-bold animate-pulse text-lg tracking-widest">SPACE TO RUN</p>
              </div>
            </div>
          )}
          {isGameOver && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center backdrop-blur-xl transition-all ${score > 35000 ? 'bg-black/90' : score > 30000 ? 'bg-slate-950/80' : score > 25000 ? 'bg-blue-100/80' : score > 20000 ? 'bg-red-950/80' : 'bg-white/80'}`}>
              <div className="text-center p-12">
                <h2 className={`text-8xl font-black mb-4 tracking-tighter ${modeColor}`}>{score > 35000 ? 'ERROR' : score > 30000 ? 'LOST' : score > 25000 ? 'REST' : 'FAIL'}</h2>
                <button onClick={startGame} className={`px-20 py-6 ${score > 35000 ? 'bg-green-600' : score > 30000 ? 'bg-slate-100 text-black' : score > 25000 ? 'bg-blue-600' : score > 20000 ? 'bg-red-600' : 'bg-indigo-600'} text-white text-2xl font-black rounded-full transition-all shadow-xl hover:scale-110 active:scale-95`}>RETRY</button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-center gap-16 flex-wrap">
          <div className="flex items-center gap-5">
            <kbd className={`px-5 py-3 rounded-2xl font-mono font-bold shadow-2xl text-lg ${score > 20000 ? 'bg-white/10 text-white' : 'bg-white'}`}>SPACE</kbd>
            <span className={`text-xs font-black uppercase tracking-widest ${modeColor}`}>Jump</span>
          </div>
          <div className="flex items-center gap-5">
            <kbd className={`px-5 py-3 rounded-2xl font-mono font-bold shadow-2xl text-lg ${score > 20000 ? 'bg-white/10 text-white' : 'bg-white'}`}>DOWN ↓</kbd>
            <span className={`text-xs font-black uppercase tracking-widest ${modeColor}`}>Duck</span>
          </div>
        </div>
      </div>
      <NumberBaseballGame />
      <MinesweeperGame />
    </div>
  );
}
