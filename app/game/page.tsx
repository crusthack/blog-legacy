'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * 범용적인 둥근 사각형 그리기 함수
 */
const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
};

export default function DinoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isNight, setIsNight] = useState(false);

  // Constants
  const GRAVITY = 0.75;
  const JUMP_STRENGTH = -15;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const GROUND_LINE = 250;
  const DINO_SIZE = 60;
  const GROUND_Y = GROUND_LINE - DINO_SIZE;

  // Refs for Game Engine
  const requestRef = useRef<number>(0);
  const shakeRef = useRef<number>(0); // 화면 흔들림 강도
  
  const dino = useRef({
    x: 80,
    y: GROUND_Y,
    width: DINO_SIZE,
    height: DINO_SIZE,
    vy: 0,
    isDucking: false
  });
  
  const gameState = useRef({
    speed: 7,
    baseSpeed: 7,
    speedVariation: 0,
    obstacles: [] as any[],
    stars: [] as {x: number, y: number, size: number}[],
    particles: [] as any[], // 먼지/폭발 파티클
    distance: 0,
    nextSpawnTime: 0,
    lastCheckPoint: 0,
    audioCtx: null as AudioContext | null
  });

  // 사운드 합성 엔진
  const playSound = useCallback((type: 'jump' | 'pass' | 'crash' | 'duck') => {
    try {
      if (!gameState.current.audioCtx) {
        gameState.current.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = gameState.current.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      switch(type) {
        case 'jump':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        case 'pass':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(2400, now + 0.07);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
          osc.start(now);
          osc.stop(now + 0.07);
          break;
        case 'duck':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(200, now);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        case 'crash':
          osc.type = 'square';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          // 노이즈 추가
          const noise = ctx.createBufferSource();
          const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
          noise.buffer = buffer;
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.1, now);
          noiseGain.gain.linearRampToValueAtTime(0, now + 0.3);
          noise.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.3);
          break;
      }
    } catch (e) {}
  }, []);

  // 파티클 생성 함수
  const createParticle = (x: number, y: number, color: string, type: 'dust' | 'piece') => {
    for(let i=0; i < (type === 'dust' ? 3 : 15); i++) {
      gameState.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * (type === 'dust' ? 2 : 10),
        vy: (Math.random() - 0.5) * (type === 'dust' ? 2 : 10),
        size: Math.random() * (type === 'dust' ? 5 : 8) + 2,
        life: 1.0,
        color,
        type
      });
    }
  };

  // 초기 별 생성
  useEffect(() => {
    const stars = [];
    for(let i=0; i<40; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (GROUND_LINE - 120),
        size: Math.random() * 1.5 + 0.5
      });
    }
    gameState.current.stars = stars;
    const saved = localStorage.getItem('dinoHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const drawScene = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const state = gameState.current;
    const d = dino.current;

    // --- 1. Physics & Logic ---
    if (isPlaying && !isGameOver) {
      const currentPoint = Math.floor(state.distance / 1000);
      if (currentPoint > state.lastCheckPoint) {
        state.lastCheckPoint = currentPoint;
        // 30% 확률로 낮밤 전환 (전환되지 않으면 현재 테마 유지)
        if (Math.random() < 0.3) setIsNight(prev => !prev);
        
        // 60% 확률로 속도 리듬 변화
        if (Math.random() < 0.6) state.speedVariation = (Math.random() * 5) - 2;
        else state.speedVariation = 0;
      }

      state.baseSpeed = 7 + (state.distance / 2000);
      state.speed = Math.max(6, state.baseSpeed + state.speedVariation);

      d.y += d.vy;
      const currentGroundY = d.isDucking ? GROUND_LINE - (DINO_SIZE / 2) : GROUND_Y;
      
      if (d.y < currentGroundY) {
        d.vy += GRAVITY;
      } else {
        d.y = currentGroundY;
        d.vy = 0;
      }

      if (time > state.nextSpawnTime) {
        const isFlying = Math.random() > 0.8 && state.distance > 800;
        if (isFlying) {
          state.obstacles.push({
            x: CANVAS_WIDTH,
            y: GROUND_Y + (Math.random() * 20),
            width: 40, height: 25, type: 'flying', passed: false
          });
        } else {
          const count = Math.floor(Math.random() * 3) + 1;
          const h = 40 + (Math.random() * 30);
          state.obstacles.push({
            x: CANVAS_WIDTH, y: GROUND_LINE - h,
            width: 20 * count + (Math.random() * 10),
            height: h, type: 'ground', count: count, passed: false
          });
        }
        const gap = Math.max(450, 1500 - state.speed * 80);
        state.nextSpawnTime = time + gap + (Math.random() * 800);
      }

      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obs = state.obstacles[i];
        obs.x -= state.speed;

        // 효과음 타이밍 앞당김 (캐릭터 몸체와 겹칠 때 발생)
        if (!obs.passed && obs.x < d.x + d.width / 2) {
          obs.passed = true;
          playSound('pass');
        }

        const p = 12; // Hitbox 여유
        if (
          d.x + p < obs.x + obs.width - p &&
          d.x + d.width - p > obs.x + p &&
          d.y + p < obs.y + obs.height - p &&
          d.y + d.height - p > obs.y + p
        ) {
          handleGameOverAction();
        }
        if (obs.x + obs.width < -100) state.obstacles.splice(i, 1);
      }

      state.distance += state.speed * 0.1;
      setScore(Math.floor(state.distance));
    }

    // --- 2. Rendering ---
    const theme = {
      bg: isNight ? '#0f172a' : '#f8fafc',
      ground: isNight ? '#334155' : '#e2e8f0',
      dino: isNight ? '#f1f5f9' : '#1e293b',
      obs: isNight ? '#64748b' : '#059669',
      flying: isNight ? '#fbbf24' : '#f59e0b',
    };

    // 화면 흔들림 적용
    ctx.save();
    if (shakeRef.current > 0) {
      ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      shakeRef.current *= 0.9; // 서서히 감소
    }

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (isNight) {
      ctx.fillStyle = '#ffffff';
      state.stars.forEach(star => {
        const glow = Math.abs(Math.sin(time / 600 + star.x));
        ctx.globalAlpha = 0.2 + glow * 0.6;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
    }

    ctx.strokeStyle = theme.ground;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_LINE);
    ctx.lineTo(CANVAS_WIDTH, GROUND_LINE);
    ctx.stroke();

    state.obstacles.forEach(obs => {
      ctx.fillStyle = obs.type === 'flying' ? theme.flying : theme.obs;
      drawRoundedRect(ctx, obs.x, obs.y, obs.width, obs.height, 6);
      if(obs.type === 'flying') {
        const wing = Math.sin(time / 100) * 12;
        ctx.fillRect(obs.x + 5, obs.y - 4 + wing, 25, 4);
      }
    });

    // 파티클 처리
    for(let i=state.particles.length - 1; i>=0; i--) {
      const p = state.particles[i];
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      if(p.life <= 0) state.particles.splice(i, 1);
    }
    ctx.globalAlpha = 1.0;

    // 캐릭터 그리기
    if(!isGameOver) {
      ctx.fillStyle = theme.dino;
      const drawH = d.isDucking ? d.height : d.height - 15;
      drawRoundedRect(ctx, d.x, d.y, d.width, drawH, 12);
      ctx.fillStyle = isNight ? '#0f172a' : '#ffffff';
      ctx.fillRect(d.x + d.width - 18, d.y + 12, 10, 10);

      if (!d.isDucking) {
        const isOnGround = d.y >= (GROUND_LINE - DINO_SIZE) - 5;
        const move = (isPlaying && isOnGround) ? Math.sin(time / 50) * 14 : 0;
        ctx.fillStyle = theme.dino;
        ctx.fillRect(d.x + 8, d.y + drawH - 2, 12, 16 - Math.max(0, move));
        ctx.fillRect(d.x + d.width - 20, d.y + drawH - 2, 12, 16 - Math.max(0, -move));
      }
    }

    ctx.restore();
    requestRef.current = requestAnimationFrame(drawScene);
  }, [isPlaying, isGameOver, isNight, playSound]);

  const handleGameOverAction = () => {
    if (isGameOver) return;
    setIsGameOver(true);
    setIsPlaying(false);
    shakeRef.current = 15; // 충돌 흔들림
    playSound('crash');
    const d = dino.current;
    createParticle(d.x + d.width/2, d.y + d.height/2, isNight ? '#f1f5f9' : '#1e293b', 'piece');
    
    const finalScore = Math.floor(gameState.current.distance);
    setHighScore(prev => {
      const newHigh = Math.max(prev, finalScore);
      localStorage.setItem('dinoHighScore', newHigh.toString());
      return newHigh;
    });
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(drawScene);
    return () => cancelAnimationFrame(requestRef.current);
  }, [drawScene]);

  const startGame = () => {
    if (!gameState.current.audioCtx) {
      gameState.current.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    gameState.current = {
      ...gameState.current,
      speed: 7, baseSpeed: 7, speedVariation: 0,
      obstacles: [], particles: [], distance: 0,
      nextSpawnTime: performance.now() + 500, lastCheckPoint: 0
    };
    dino.current = { x: 80, y: GROUND_Y, width: DINO_SIZE, height: DINO_SIZE, vy: 0, isDucking: false };
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    setIsNight(false);
  };

  const jump = useCallback(() => {
    const d = dino.current;
    if (d.isDucking) return;
    if (d.y >= GROUND_Y - 5) {
      d.vy = JUMP_STRENGTH;
      playSound('jump');
      createParticle(d.x + 20, GROUND_LINE, '#cbd5e1', 'dust');
    }
  }, [playSound]);

  const setDucking = useCallback((ducking: boolean) => {
    const d = dino.current;
    if (ducking && d.y < GROUND_Y - 5) return;
    if (ducking && !d.isDucking) {
      d.isDucking = true;
      d.height = DINO_SIZE / 2;
      d.y = GROUND_LINE - d.height;
      playSound('duck');
    } else if (!ducking && d.isDucking) {
      d.isDucking = false;
      d.height = DINO_SIZE;
      d.y = GROUND_Y;
    }
  }, [playSound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!isPlaying) startGame();
        else jump();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (isPlaying) setDucking(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') setDucking(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, jump, setDucking]);

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen transition-colors duration-1000 ${isNight ? 'bg-slate-950' : 'bg-slate-300'} p-4 overflow-hidden`}>
      <div className={`p-10 rounded-[3.5rem] shadow-2xl w-full max-w-4xl border-4 transition-all duration-1000 ${isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex justify-between items-end mb-8 px-4 text-center sm:text-left flex-wrap gap-4">
          <div>
            <h1 className={`text-5xl font-black tracking-tighter transition-colors ${isNight ? 'text-white' : 'text-slate-900'}`}>
              DYNAMIC <span className="text-indigo-500 italic">ACTION</span>
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-[0.5em] mt-2 transition-colors ${isNight ? 'text-slate-500' : 'text-slate-400'}`}>
              High Fidelity Physics Engine
            </p>
          </div>
          <div className="text-right flex flex-col items-end flex-grow sm:flex-grow-0">
            <div className="flex gap-2 mb-2">
              <div className={`px-3 py-2 rounded-2xl border transition-colors ${isNight ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 border-amber-100'}`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest mr-2 ${isNight ? 'text-slate-500' : 'text-amber-400'}`}>Speed</span>
                  <span className={`text-xl font-mono font-black ${isNight ? 'text-amber-400' : 'text-amber-600'}`}>
                    {(gameState.current.speed / 7).toFixed(1)}x
                  </span>
              </div>
              <div className={`px-4 py-2 rounded-2xl border transition-colors ${isNight ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-3">Best</span>
                  <span className={`text-xl font-mono font-bold ${isNight ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {highScore.toString().padStart(5, '0')}
                  </span>
              </div>
            </div>
            <p className={`text-8xl font-mono font-black leading-none tracking-tighter transition-colors ${isNight ? 'text-white' : 'text-slate-900'}`}>
              {score.toString().padStart(5, '0')}
            </p>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-[2.5rem] border-4 transition-colors duration-1000 ${isNight ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'} shadow-2xl`}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-auto block"
          />

          {!isPlaying && !isGameOver && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-indigo-900/10 backdrop-blur-[3px] cursor-pointer group"
              onClick={startGame}
            >
              <div className={`px-16 py-8 rounded-[2rem] shadow-2xl text-center transform group-hover:scale-105 transition-all duration-500 ${isNight ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                <p className={`text-4xl font-black mb-3 ${isNight ? 'text-white' : 'text-slate-900'}`}>GO!</p>
                <p className="text-indigo-500 font-bold animate-pulse text-lg tracking-widest">SPACE TO RUN</p>
              </div>
            </div>
          )}

          {isGameOver && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center backdrop-blur-xl transition-all ${isNight ? 'bg-slate-950/80' : 'bg-white/80'}`}>
              <div className="text-center p-12">
                <h2 className={`text-8xl font-black mb-4 tracking-tighter ${isNight ? 'text-white' : 'text-slate-900'}`}>REBOOT</h2>
                <p className="text-indigo-500 text-xl font-bold mb-12 uppercase tracking-[0.5em]">Result: {score}</p>
                <button
                  onClick={startGame}
                  className="px-20 py-6 bg-indigo-600 text-white text-2xl font-black rounded-full hover:bg-indigo-700 transition-all shadow-[0_15px_40px_rgba(79,70,229,0.4)] hover:scale-110 active:scale-95"
                >
                  RETRY
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-center gap-16 flex-wrap">
          <div className="flex items-center gap-5">
            <kbd className={`px-5 py-3 rounded-2xl font-mono font-bold shadow-2xl text-lg transition-colors ${isNight ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}`}>SPACE</kbd>
            <span className={`text-xs font-black uppercase tracking-widest text-left leading-tight ${isNight ? 'text-slate-500' : 'text-slate-400'}`}>Jump</span>
          </div>
          <div className="flex items-center gap-5">
            <kbd className={`px-5 py-3 rounded-2xl font-mono font-bold shadow-2xl text-lg transition-colors ${isNight ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'}`}>DOWN ↓</kbd>
            <span className={`text-xs font-black uppercase tracking-widest text-left leading-tight ${isNight ? 'text-slate-500' : 'text-slate-400'}`}>Duck</span>
          </div>
        </div>
      </div>
    </div>
  );
}
