import { useEffect, useRef } from 'react';

interface LunarSurfaceCanvasProps {
  type: 'source' | 'reference' | 'registered';
  className?: string;
  overlayText?: string;
}

export default function LunarSurfaceCanvas({
  type = 'source',
  className = '',
  overlayText
}: LunarSurfaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = 640);
    const height = (canvas.height = 400);

    // Deep lunar surface base gradient
    const centerX = type === 'source' ? 240 : 380;
    const centerY = type === 'source' ? 160 : 220;
    const grad = ctx.createRadialGradient(
      centerX,
      centerY,
      30,
      width / 2,
      height / 2,
      340
    );

    if (type === 'source') {
      grad.addColorStop(0, '#2e3846');
      grad.addColorStop(0.5, '#16202c');
      grad.addColorStop(1, '#0b1017');
    } else if (type === 'reference') {
      grad.addColorStop(0, '#263442');
      grad.addColorStop(0.5, '#141d27');
      grad.addColorStop(1, '#090e15');
    } else {
      grad.addColorStop(0, '#243b3d');
      grad.addColorStop(0.5, '#14222b');
      grad.addColorStop(1, '#0a1016');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Realistic regolith noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let i = 0; i < 600; i++) {
      const rx = (Math.sin(i * 127.1) * 0.5 + 0.5) * width;
      const ry = (Math.cos(i * 311.7) * 0.5 + 0.5) * height;
      const rsize = (i % 3 === 0) ? 1.5 : 1;
      ctx.fillRect(rx, ry, rsize, rsize);
    }

    // Crater profiles based on South Pole region (Manzinus C & Boguslawsky)
    // Source vs Reference: slight rotation and solar angle illumination shift
    const craters =
      type === 'source'
        ? [
            { x: 260, y: 175, r: 85, shadowX: -0.7, shadowY: -0.4, label: 'MANZINUS-C (OHRC)' },
            { x: 130, y: 95, r: 36, shadowX: -0.65, shadowY: -0.35, label: 'CR-82A' },
            { x: 460, y: 240, r: 64, shadowX: -0.75, shadowY: -0.45, label: 'CR-94B' },
            { x: 380, y: 80, r: 26, shadowX: -0.6, shadowY: -0.3, label: 'RIM-SEC' },
            { x: 110, y: 290, r: 42, shadowX: -0.7, shadowY: -0.4, label: '' },
            { x: 530, y: 110, r: 22, shadowX: -0.6, shadowY: -0.35, label: '' },
            { x: 310, y: 315, r: 30, shadowX: -0.7, shadowY: -0.4, label: '' }
          ]
        : [
            // Reference: slightly shifted perspective & solar shadow angle (due to different orbit time)
            { x: 268, y: 169, r: 84, shadowX: 0.72, shadowY: 0.42, label: 'MANZINUS-C (NAC)' },
            { x: 138, y: 91, r: 35, shadowX: 0.68, shadowY: 0.38, label: 'CR-82A' },
            { x: 467, y: 234, r: 63, shadowX: 0.76, shadowY: 0.46, label: 'CR-94B' },
            { x: 386, y: 76, r: 25, shadowX: 0.65, shadowY: 0.35, label: 'RIM-SEC' },
            { x: 116, y: 284, r: 41, shadowX: 0.72, shadowY: 0.42, label: '' },
            { x: 536, y: 106, r: 21, shadowX: 0.66, shadowY: 0.36, label: '' },
            { x: 318, y: 309, r: 29, shadowX: 0.72, shadowY: 0.42, label: '' }
          ];

    craters.forEach((c) => {
      // Outer crater rim illumination
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r + 2, 0, Math.PI * 2);
      ctx.strokeStyle =
        type === 'source'
          ? 'rgba(255, 159, 67, 0.22)'
          : type === 'reference'
          ? 'rgba(63, 208, 224, 0.22)'
          : 'rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Inner crater floor with realistic asymmetric solar shadow
      const rimGrad = ctx.createLinearGradient(
        c.x - c.r * c.shadowX,
        c.y - c.r * c.shadowY,
        c.x + c.r * c.shadowX,
        c.y + c.r * c.shadowY
      );
      rimGrad.addColorStop(0, '#04070a');
      rimGrad.addColorStop(0.48, '#0d141e');
      rimGrad.addColorStop(0.78, '#263445');
      rimGrad.addColorStop(1, '#45586f');

      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // Central mound / peak in larger craters
      if (c.r > 50) {
        ctx.beginPath();
        ctx.arc(c.x + c.shadowX * 6, c.y + c.shadowY * 6, c.r * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = '#060a0f';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(c.x + c.shadowX * 3, c.y + c.shadowY * 3, c.r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = type === 'source' ? 'rgba(255, 159, 67, 0.15)' : 'rgba(63, 208, 224, 0.15)';
        ctx.fill();
      }

      // Telemetry annotation
      if (c.label) {
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle =
          type === 'source'
            ? 'rgba(255, 159, 67, 0.75)'
            : type === 'reference'
            ? 'rgba(63, 208, 224, 0.75)'
            : 'rgba(16, 185, 129, 0.8)';
        ctx.fillText(c.label, c.x - c.r + 2, c.y - c.r - 4);
      }
    });

    // Metric coordinate grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.6;
    for (let x = 60; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 50; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Center focal reticle
    ctx.strokeStyle =
      type === 'source'
        ? 'rgba(255, 159, 67, 0.4)'
        : type === 'reference'
        ? 'rgba(63, 208, 224, 0.4)'
        : 'rgba(16, 185, 129, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width / 2 - 38, height / 2);
    ctx.lineTo(width / 2 - 12, height / 2);
    ctx.moveTo(width / 2 + 12, height / 2);
    ctx.lineTo(width / 2 + 38, height / 2);
    ctx.moveTo(width / 2, height / 2 - 38);
    ctx.lineTo(width / 2, height / 2 - 12);
    ctx.moveTo(width / 2, height / 2 + 12);
    ctx.lineTo(width / 2, height / 2 + 38);
    ctx.stroke();
  }, [type]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover block select-none ${className}`}
      />
      {overlayText && (
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-slate-700 text-[10px] font-mono text-slate-300">
          {overlayText}
        </div>
      )}
    </div>
  );
}
