import React, { useEffect, useRef } from 'react';

interface Meteor {
  id: number;
  birth: number;
  lifetime: number;
  startX: number;
  startY: number;
  speed: number;
  length: number;
  thickness: number;
  color: string;
}

interface MeteorBackgroundProps {
  color?: string;
  opacity?: number;
}

export const MeteorBackground: React.FC<MeteorBackgroundProps> = ({
  color = '#ffffff',
  opacity = 0.45,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let meteors: Meteor[] = [];
    let lastSpawn = 0;
    let nextSpawnInterval = 0.35;

    // Handle high-DPI displays for ultra-smooth anti-aliasing
    const handleResize = () => {
      const parent = canvas.parentElement;
      const displayWidth = parent ? parent.clientWidth : window.innerWidth;
      const displayHeight = parent ? parent.clientHeight : window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Direction vector bottom-right to top-left: dx: -1, dy: -1 normalized
    const norm = Math.SQRT1_2;
    const dirX = -norm;
    const dirY = -norm;

    const spawnMeteor = (nowSec: number, width: number, height: number): Meteor => {
      // Spawn distributed across bottom and right boundaries
      const spawnX = Math.random() * 1.35 * width;
      const spawnY = (1.0 + Math.random() * 0.35) * height;

      return {
        id: Math.random(),
        birth: nowSec,
        // Slower, graceful lifetime: 8.5 to 13 seconds
        lifetime: 8.5 + Math.random() * 4.5,
        startX: spawnX,
        startY: spawnY,
        // Slower gliding speed: 70 to 135 px/sec (smooth and serene)
        speed: 70 + Math.random() * 65,
        // Proportional length for serene shooting streaks
        length: 140 + Math.random() * 200,
        thickness: 1.6 + Math.random() * 1.4,
        color,
      };
    };

    const render = (timeMs: number) => {
      const nowSec = timeMs / 1000;
      const parent = canvas.parentElement;
      const width = parent ? parent.clientWidth : window.innerWidth;
      const height = parent ? parent.clientHeight : window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      // Controlled, serene spawn cadence
      if (nowSec - lastSpawn >= nextSpawnInterval) {
        lastSpawn = nowSec;
        nextSpawnInterval = 0.3 + Math.random() * 0.5;
        meteors.push(spawnMeteor(nowSec, width, height));
      }

      // Filter expired meteors
      meteors = meteors.filter((m) => nowSec - m.birth < m.lifetime);

      for (const m of meteors) {
        const age = nowSec - m.birth;
        const progress = Math.min(1, Math.max(0, age / m.lifetime));

        // Smooth fade-in (1.2s) and graceful fade-out (last 2.0s) to guarantee zero visual popping
        const fadeIn = Math.min(1, age / 1.2);
        const fadeOut = Math.min(1, (m.lifetime - age) / 2.0);
        const alpha = Math.max(0, fadeIn * fadeOut);

        if (alpha <= 0) continue;

        const headX = m.startX + dirX * m.speed * age;
        const headY = m.startY + dirY * m.speed * age;

        // Tail dynamics: smooth deceleration trail
        const currentLength = m.length * (1 - progress * 0.45);
        const tailX = headX - dirX * currentLength;
        const tailY = headY - dirY * currentLength;

        // Buttery smooth multi-stop gradient
        const gradient = ctx.createLinearGradient(tailX, tailY, headX, headY);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.3, `rgba(255, 255, 255, ${0.12 * alpha})`);
        gradient.addColorStop(0.7, `rgba(255, 255, 255, ${0.45 * alpha})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, ${0.95 * alpha})`);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = m.thickness;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full z-0"
      style={{ opacity }}
    />
  );
};
