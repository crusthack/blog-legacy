'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
      setScore(scoreRef.current);

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
    gameState.current = { ...gameState.current, speed: 7, baseSpeed: 7, speedVariation: 0, obstacles: [], particles: [], distance: 0, nextSpawnTime: performance.now()+500, lastCheckPoint: 0 };
    dino.current = { x: 80, y: GROUND_Y, width: DINO_SIZE, height: DINO_SIZE, vy: 0, isDucking: false };
    isPlayingRef.current = true; isGameOverRef.current = false; scoreRef.current = 0;
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
    scoreRef.current = s; setScore(s);
  };

  const modeName = score > 35000 ? 'CYBER' : score > 30000 ? 'SPACE' : score > 25000 ? 'HEAVEN' : score > 20000 ? 'HELL' : 'BLOCK';
  const modeColor = score > 35000 ? 'text-green-500' : score > 30000 ? 'text-yellow-400' : score > 25000 ? 'text-blue-400' : score > 20000 ? 'text-red-500' : 'text-indigo-500';

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen transition-all duration-1000 ${score > 35000 ? 'bg-black' : score > 30000 ? 'bg-slate-950' : score > 25000 ? 'bg-blue-50' : score > 20000 ? 'bg-red-950' : (isNight ? 'bg-slate-950' : 'bg-slate-300')} p-4 overflow-hidden font-sans`}>
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
    </div>
  );
}
