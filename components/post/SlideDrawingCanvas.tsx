'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import type { DrawingTool } from '@/components/post/SlideDrawingToolbar';

export interface SlideDrawingCanvasHandle {
  clear: () => void;
  getDrawings: () => Record<string, string>;
}

interface SlideDrawingCanvasProps {
  enabled: boolean;
  tool: DrawingTool;
  color: string;
  size: number;
  slideId: string;
}

const SlideDrawingCanvas = forwardRef<SlideDrawingCanvasHandle, SlideDrawingCanvasProps>(
  function SlideDrawingCanvas({ enabled, tool, color, size, slideId }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const currentSlideIdRef = useRef(slideId);
    const slideDrawingsRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

    const stopDrawing = () => {
      isDrawingRef.current = false;
      lastPointRef.current = null;
    };

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const clear = () => {
      slideDrawingsRef.current.delete(currentSlideIdRef.current);
      clearCanvas();
    };

    const copyCanvas = (source: HTMLCanvasElement) => {
      const copy = document.createElement('canvas');
      copy.width = source.width;
      copy.height = source.height;
      copy.getContext('2d')?.drawImage(source, 0, 0);
      return copy;
    };

    const saveCurrentSlide = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      slideDrawingsRef.current.set(currentSlideIdRef.current, copyCanvas(canvas));
    };

    const getDrawings = () => {
      saveCurrentSlide();
      return Object.fromEntries(
        Array.from(slideDrawingsRef.current, ([id, drawing]) => [id, drawing.toDataURL('image/png')])
      );
    };

    const restoreSlide = (id: string) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const savedDrawing = slideDrawingsRef.current.get(id);
      if (savedDrawing) {
        ctx.drawImage(savedDrawing, 0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
    };

    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const visibleDrawing = copyCanvas(canvas);
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.drawImage(
        visibleDrawing,
        0,
        0,
        visibleDrawing.width,
        visibleDrawing.height,
        0,
        0,
        rect.width,
        rect.height
      );
    };

    const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!enabled) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      isDrawingRef.current = true;
      lastPointRef.current = getPoint(event);
    };

    const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!enabled || !isDrawingRef.current || !lastPointRef.current) return;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      const nextPoint = getPoint(event);
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(nextPoint.x, nextPoint.y);
      ctx.stroke();
      lastPointRef.current = nextPoint;
    };

    useImperativeHandle(ref, () => ({ clear, getDrawings }));

    useEffect(() => {
      resize();
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }, []);

    useEffect(() => {
      if (currentSlideIdRef.current !== slideId) {
        saveCurrentSlide();
        currentSlideIdRef.current = slideId;
        restoreSlide(slideId);
      }
      stopDrawing();
    }, [slideId]);

    return (
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-[54] h-full w-full touch-none print:hidden ${
          enabled ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
        }`}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        onPointerLeave={stopDrawing}
      />
    );
  }
);

export default SlideDrawingCanvas;
