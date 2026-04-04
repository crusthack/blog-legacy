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
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 300;
  const GROUND_LINE = 250;
  const DINO_SIZE = 60;
  const GROUND_Y = GROUND_LINE - DINO_SIZE;

  // Refs for Game Engine (Always keep latest values without triggering re-renders)
  const requestRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const isGameOverRef = useRef(false);
  const scoreRef = useRef(0);
  
  const dino = useRef({
    x: 80, y: GROUND_Y, width: DINO_SIZE, height: DINO_SIZE, vy: 0, isDucking: false
  });
  
  const gameState = useRef({
    speed: 7, baseSpeed: 7, speedVariation: 0,
    obstacles: [] as any[],
    stars: [] as {x: number, y: number, size: number}[],
    particles: [] as any[],
    distance: 0, nextSpawnTime: 0, lastCheckPoint: 0,
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
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      switch(type) {
        case 'jump':
          osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
          gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now); osc.stop(now + 0.1); break;
        case 'pass':
          osc.type = 'triangle'; osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(2400, now + 0.07);
          gain.gain.setValueAtTime(0.06, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
          osc.start(now); osc.stop(now + 0.07); break;
        case 'duck':
          osc.type = 'sine'; osc.frequency.setValueAtTime(200, now);
          gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.05);
          osc.start(now); osc.stop(now + 0.05); break;
        case 'crash':
          osc.type = 'square'; osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
          gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now); osc.stop(now + 0.3); break;
      }
    } catch (e) {}
  }, []);

  // 파티클 생성 함수
  const createParticle = useCallback((x: number, y: number, color: string, type: 'dust' | 'piece' | 'ember') => {
    const count = type === 'dust' ? 3 : (type === 'ember' ? 1 : 15);
    for(let i=0; i < count; i++) {
      gameState.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * (type === 'piece' ? 10 : 3),
        vy: (Math.random() - 0.5) * (type === 'piece' ? 10 : 3) - (type === 'ember' ? 2 : 0),
        size: Math.random() * (type === 'dust' ? 5 : 6) + 2,
        life: 1.0, color, type
      });
    }
  }, []);

  const handleGameOverAction = useCallback(() => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    setIsGameOver(true);
    isPlayingRef.current = false;
    setIsPlaying(false);
    shakeRef.current = 20;
    playSound('crash');
    const d = dino.current;
    createParticle(d.x + d.width/2, d.y + d.height/2, scoreRef.current > 20000 ? '#fecaca' : '#1e293b', 'piece');
    
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
    const isHell = state.distance > 20000;

    // --- 1. Logic & Physics ---
    if (isPlayingRef.current && !isGameOverRef.current) {
      const currentPoint = Math.floor(state.distance / 1000);
      if (currentPoint > state.lastCheckPoint) {
        state.lastCheckPoint = currentPoint;
        if (Math.random() < 0.4) setIsNight(prev => !prev);
        if (isHell) {
          if (Math.random() < 0.3) state.speedVariation += Math.random() * 1.5;
          state.speedVariation = Math.min(state.speedVariation, 3.5);
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
      if (d.y < currentGroundY) d.vy += GRAVITY;
      else { d.y = currentGroundY; d.vy = 0; }

      if (time > state.nextSpawnTime) {
        const isFlying = Math.random() > 0.8 && state.distance > 800;
        if (isFlying) {
          state.obstacles.push({ x: CANVAS_WIDTH, y: GROUND_Y + (Math.random() * 20), width: 40, height: 25, type: 'flying', passed: false });
        } else {
          const count = Math.floor(Math.random() * 3) + 1;
          const h = 40 + (Math.random() * 30);
          state.obstacles.push({ x: CANVAS_WIDTH, y: GROUND_LINE - h, width: 20 * count + (Math.random() * 10), height: h, type: 'ground', count: count, passed: false });
        }
        state.nextSpawnTime = time + Math.max(450, 1500 - state.speed * 80) + (Math.random() * 800);
      }

      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obs = state.obstacles[i];
        obs.x -= state.speed;
        if (!obs.passed && obs.x < d.x + d.width / 2) { 
          obs.passed = true; 
          playSound('pass'); 
        }
        const p = 12;
        if (d.x + p < obs.x + obs.width - p && d.x + d.width - p > obs.x + p && d.y + p < obs.y + obs.height - p && d.y + d.height - p > obs.y + p) {
          handleGameOverAction();
        }
        if (obs.x + obs.width < -100) state.obstacles.splice(i, 1);
      }

      state.distance += state.speed * 0.1;
      scoreRef.current = Math.floor(state.distance);
      setScore(scoreRef.current);

      if (isHell && Math.random() < 0.2) createParticle(Math.random() * CANVAS_WIDTH, GROUND_LINE, '#ef4444', 'ember');
    }

    // --- 2. Rendering ---
    const theme = {
      bg: isHell ? '#450a0a' : (isNight ? '#0f172a' : '#f8fafc'),
      ground: isHell ? '#7f1d1d' : (isNight ? '#334155' : '#e2e8f0'),
      dino: isHell ? '#fecaca' : (isNight ? '#f1f5f9' : '#1e293b'),
      obs: isHell ? '#ef4444' : (isNight ? '#64748b' : '#059669'),
      flying: isHell ? '#f97316' : (isNight ? '#fbbf24' : '#f59e0b'),
    };

    ctx.save();
    if (shakeRef.current > 0) {
      ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      shakeRef.current *= 0.9;
    }

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (isHell) {
      const grad = ctx.createLinearGradient(0, GROUND_LINE, 0, 0);
      grad.addColorStop(0, '#7f1d1d'); grad.addColorStop(1, '#450a0a');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (isNight && !isHell) {
      ctx.fillStyle = '#ffffff';
      state.stars.forEach(star => {
        ctx.globalAlpha = 0.2 + Math.abs(Math.sin(time / 600 + star.x)) * 0.6;
        ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1.0;
    }

    ctx.strokeStyle = theme.ground; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, GROUND_LINE); ctx.lineTo(CANVAS_WIDTH, GROUND_LINE); ctx.stroke();

    state.obstacles.forEach(obs => {
      ctx.fillStyle = obs.type === 'flying' ? theme.flying : theme.obs;
      drawRoundedRect(ctx, obs.x, obs.y, obs.width, obs.height, 6);
      if(isHell) { ctx.shadowBlur = 15; ctx.shadowColor = '#ef4444'; ctx.fill(); ctx.shadowBlur = 0; }
    });

    for(let i=state.particles.length - 1; i>=0; i--) {
      const p = state.particles[i];
      ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      p.x += p.vx; p.y += p.vy; p.life -= 0.02;
      if(p.life <= 0) state.particles.splice(i, 1);
    }
    ctx.globalAlpha = 1.0;

    if(!isGameOverRef.current) {
      ctx.fillStyle = theme.dino;
      const drawH = d.isDucking ? d.height : d.height - 15;
      drawRoundedRect(ctx, d.x, d.y, d.width, drawH, 12);
      if(isHell) { ctx.shadowBlur = 20; ctx.shadowColor = '#fecaca'; ctx.fill(); ctx.shadowBlur = 0; }
      ctx.fillStyle = isHell ? '#450a0a' : (isNight ? '#0f172a' : '#ffffff');
      ctx.fillRect(d.x + d.width - 18, d.y + 12, 10, 10);
      if (!d.isDucking) {
        const isOnGround = d.y >= (GROUND_LINE - DINO_SIZE) - 5;
        const move = (isPlayingRef.current && isOnGround) ? Math.sin(time / 50) * 14 : 0;
        ctx.fillStyle = theme.dino;
        ctx.fillRect(d.x + 8, d.y + drawH - 2, 12, 16 - Math.max(0, move));
        ctx.fillRect(d.x + d.width - 20, d.y + drawH - 2, 12, 16 - Math.max(0, -move));
      }
    }
    ctx.restore();
    requestRef.current = requestAnimationFrame(drawScene);
  }, [isNight, playSound, handleGameOverAction, createParticle]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(drawScene);
    return () => cancelAnimationFrame(requestRef.current);
  }, [drawScene]);

  const startGame = () => {
    if (!gameState.current.audioCtx) {
      gameState.current.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    gameState.current = { ...gameState.current, speed: 7, baseSpeed: 7, speedVariation: 0, obstacles: [], particles: [], distance: 0, nextSpawnTime: performance.now() + 500, lastCheckPoint: 0 };
    dino.current = { x: 80, y: GROUND_Y, width: DINO_SIZE, height: DINO_SIZE, vy: 0, isDucking: false };
    
    isPlayingRef.current = true;
    isGameOverRef.current = false;
    scoreRef.current = 0;
    
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    setIsNight(false);
  };

  const jump = useCallback(() => {
    const d = dino.current;
    if (d.isDucking || !isPlayingRef.current || isGameOverRef.current) return;
    if (d.y >= GROUND_Y - 5) {
      d.vy = JUMP_STRENGTH; playSound('jump');
      createParticle(d.x + 20, GROUND_LINE, '#cbd5e1', 'dust');
    }
  }, [playSound, createParticle]);

  const setDucking = useCallback((ducking: boolean) => {
    const d = dino.current;
    if (isGameOverRef.current || !isPlayingRef.current) return;
    if (ducking && d.y < GROUND_Y - 5) return;
    if (ducking && !d.isDucking) {
      d.isDucking = true; d.height = DINO_SIZE / 2; d.y = GROUND_LINE - d.height; playSound('duck');
    } else if (!ducking && d.isDucking) {
      d.isDucking = false; d.height = DINO_SIZE; d.y = GROUND_Y;
    }
  }, [playSound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault(); if (!isPlayingRef.current) startGame(); else jump();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault(); if (isPlayingRef.current) setDucking(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'ArrowDown') setDucking(false); };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [jump, setDucking]);

  const jumpToHell = () => {
    if (!isPlayingRef.current) startGame();
    gameState.current.distance = 20001;
    gameState.current.lastCheckPoint = 20;
    scoreRef.current = 20001;
    setScore(20001);
  };

  const currentIsHell = score > 20000;

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen transition-all duration-1000 ${currentIsHell ? 'bg-red-950' : (isNight ? 'bg-slate-950' : 'bg-slate-300')} p-4 overflow-hidden font-sans`}>
      <div className="fixed bottom-4 right-4 opacity-20 hover:opacity-100 transition-opacity z-50">
        <button onClick={jumpToHell} className="bg-black/50 text-[10px] text-white px-2 py-1 rounded border border-white/20 uppercase font-black">Dev: Jump 20K</button>
      </div>

      <div className={`p-10 rounded-[3.5rem] shadow-2xl w-full max-w-6xl border-4 transition-all duration-1000 ${currentIsHell ? 'bg-red-900 border-red-600 shadow-red-900/50' : (isNight ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')}`}>
        <div className="flex justify-between items-end mb-8 px-4 flex-wrap gap-4">
          <div>
            <h1 className={`text-5xl font-black tracking-tighter transition-colors ${currentIsHell ? 'text-red-100' : (isNight ? 'text-white' : 'text-slate-900')}`}>
              {currentIsHell ? 'HELL' : 'BLOCK'} <span className={currentIsHell ? 'text-orange-500' : 'text-indigo-500'}>{currentIsHell ? 'GATE' : 'RUN'}</span>
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-[0.4em] mt-2 transition-colors ${currentIsHell ? 'text-red-400' : (isNight ? 'text-slate-500' : 'text-slate-400')}`}>
              {currentIsHell ? 'Survive the Eternal Fire' : 'Probabilistic Rhythm Engine'}
            </p>
          </div>
          <div className="text-right flex flex-col items-end flex-grow sm:flex-grow-0">
            <div className="flex gap-2 mb-2">
              <div className={`px-3 py-2 rounded-2xl border transition-colors ${currentIsHell ? 'bg-red-950 border-red-800' : (isNight ? 'bg-slate-800 border-slate-700' : 'bg-amber-50 border-amber-100')}`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest mr-2 ${currentIsHell ? 'text-red-500' : (isNight ? 'text-slate-500' : 'text-amber-400')}`}>Speed</span>
                  <span className={`text-xl font-mono font-black ${currentIsHell ? 'text-red-400' : (isNight ? 'text-amber-400' : 'text-amber-600')}`}>{(gameState.current.speed / 7).toFixed(1)}x</span>
              </div>
              <div className={`px-4 py-2 rounded-2xl border transition-colors ${currentIsHell ? 'bg-red-950 border-red-800' : (isNight ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100')}`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest mr-3 ${currentIsHell ? 'text-red-500' : 'text-slate-400'}`}>Best</span>
                  <span className={`text-xl font-mono font-bold ${currentIsHell ? 'text-red-200' : (isNight ? 'text-indigo-400' : 'text-indigo-600')}`}>{highScore.toString().padStart(5, '0')}</span>
              </div>
            </div>
            <p className={`text-8xl font-mono font-black leading-none tracking-tighter transition-colors ${currentIsHell ? 'text-red-100 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]' : (isNight ? 'text-white' : 'text-slate-900')}`}>
              {score.toString().padStart(5, '0')}
            </p>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-[2.5rem] border-4 transition-colors duration-1000 ${currentIsHell ? 'bg-red-950 border-red-700' : (isNight ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100')} shadow-2xl`}>
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-auto block" />
          {!isPlaying && !isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/10 backdrop-blur-[3px] cursor-pointer group" onClick={startGame}>
              <div className={`px-16 py-8 rounded-[2rem] shadow-2xl text-center transform group-hover:scale-105 transition-all duration-500 ${isNight ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
                <p className={`text-4xl font-black mb-3 ${isNight ? 'text-white' : 'text-slate-900'}`}>READY?</p>
                <p className="text-indigo-500 font-bold animate-pulse text-lg tracking-widest">SPACE TO RUN</p>
              </div>
            </div>
          )}
          {isGameOver && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center backdrop-blur-xl transition-all ${currentIsHell ? 'bg-red-950/80' : (isNight ? 'bg-slate-950/80' : 'bg-white/80')}`}>
              <div className="text-center p-12">
                <h2 className={`text-8xl font-black mb-4 tracking-tighter ${currentIsHell ? 'text-red-100' : (isNight ? 'text-white' : 'text-slate-900')}`}>{currentIsHell ? 'BURNED' : 'CRASH'}</h2>
                <p className={`${currentIsHell ? 'text-orange-400' : 'text-indigo-500'} text-xl font-bold mb-12 uppercase tracking-[0.5em]`}>Score: {score}</p>
                <button onClick={startGame} className={`px-20 py-6 ${currentIsHell ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white text-2xl font-black rounded-full transition-all shadow-xl hover:scale-110 active:scale-95`}>RETRY</button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 flex justify-center gap-16 flex-wrap">
          <div className="flex items-center gap-5">
            <kbd className={`px-5 py-3 rounded-2xl font-mono font-bold shadow-2xl text-lg transition-colors ${currentIsHell ? 'bg-red-950 text-red-100 border border-red-800' : (isNight ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white')}`}>SPACE</kbd>
            <span className={`text-xs font-black uppercase tracking-widest text-left leading-tight ${currentIsHell ? 'text-red-500' : (isNight ? 'text-slate-500' : 'text-slate-400')}`}>Jump</span>
          </div>
          <div className="flex items-center gap-5">
            <kbd className={`px-5 py-3 rounded-2xl font-mono font-bold shadow-2xl text-lg transition-colors ${currentIsHell ? 'bg-red-950 text-red-100 border border-red-800' : (isNight ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white')}`}>DOWN ↓</kbd>
            <span className={`text-xs font-black uppercase tracking-widest text-left leading-tight ${currentIsHell ? 'text-red-500' : (isNight ? 'text-slate-500' : 'text-slate-400')}`}>Duck</span>
          </div>
        </div>
      </div>
    </div>
  );
}
