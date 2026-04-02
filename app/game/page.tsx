'use client';

import { useEffect, useRef, useState } from 'react';

export default function DinoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  // 게임 상태를 React State가 아닌 일반 Ref로 관리 (성능 최적화: 매 프레임 리렌더링 방지)
  const gameStatus = useRef({
    active: true,
    score: 0,
    obstacles: [] as any[],
    lastSpawnTime: 0,
  });

  const GRAVITY = 0.6;
  const JUMP_STRENGTH = -12;
  const GAME_SPEED = 5;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 공룡 객체 생성
    const dino = {
      x: 50,
      y: canvas.height - 40,
      width: 40,
      height: 40,
      vy: 0,
      jumping: false,
    };

    let animationId: number;

    const gameLoop = (timestamp: number) => {
      if (!gameStatus.current.active) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. 공룡 물리 업데이트
      dino.y += dino.vy;
      if (dino.y < canvas.height - dino.height) {
        dino.vy += GRAVITY;
      } else {
        dino.y = canvas.height - dino.height;
        dino.vy = 0;
        dino.jumping = false;
      }

      // 2. 공룡 그리기
      ctx.fillStyle = '#535353';
      ctx.fillRect(dino.x, dino.y, dino.width, dino.height);

      // 3. 장애물 생성 및 관리
      if (timestamp - gameStatus.current.lastSpawnTime > 1500 + Math.random() * 1000) {
        gameStatus.current.obstacles.push({
          x: canvas.width,
          y: canvas.height - 40, // 가변 높이 적용 가능
          width: 30,
          height: 40,
        });
        gameStatus.current.lastSpawnTime = timestamp;
      }

      // 4. 장애물 업데이트 및 충돌 체크
      for (let i = gameStatus.current.obstacles.length - 1; i >= 0; i--) {
        const obs = gameStatus.current.obstacles[i];
        obs.x -= GAME_SPEED;

        ctx.fillStyle = '#ff4d4d';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // 충돌 체크
        if (
          dino.x < obs.x + obs.width &&
          dino.x + dino.width > obs.x &&
          dino.y < obs.y + obs.height &&
          dino.y + dino.height > obs.y
        ) {
          gameStatus.current.active = false;
          setIsGameOver(true);
        }

        // 화면 밖으로 나간 장애물 제거 및 점수 추가
        if (obs.x + obs.width < 0) {
          gameStatus.current.obstacles.splice(i, 1);
          gameStatus.current.score += 1;
          setScore(gameStatus.current.score); // UI 점수 업데이트
        }
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    const handleInput = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !dino.jumping && gameStatus.current.active) {
        dino.vy = JUMP_STRENGTH;
        dino.jumping = true;
      }
    };

    window.addEventListener('keydown', handleInput);
    animationId = requestAnimationFrame(gameLoop);

    // 컴포넌트 언마운트 시 정리 (Cleanup)
    return () => {
      window.removeEventListener('keydown', handleInput);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const resetGame = () => {
    window.location.reload(); // 가장 간단한 리셋 방식
  };

  return (
    <div className="flex flex-col items-center p-8 bg-white shadow-lg rounded-xl">
      <h1 className="text-3xl font-bold mb-4">Dino Run</h1>
      <div className="text-xl mb-2">Score: {score}</div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={200}
        className="border-b-4 border-gray-800 bg-gray-50 rounded-sm"
      />

      {isGameOver && (
        <div className="mt-6 text-center">
          <p className="text-2xl text-red-600 font-bold mb-4">GAME OVER!</p>
          <button
            onClick={resetGame}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
}