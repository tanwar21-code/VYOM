import { useEffect, useState } from 'react';

interface MetricCardProps {
  title: string;
  value: number;
  decimals?: number;
  unit?: string;
  description: string;
  quality: string;
  qualityColor?: string;
  progressPercent?: number;
  trigger?: boolean;
}

export default function MetricCard({
  title,
  value,
  decimals = 2,
  unit = '',
  description,
  quality,
  qualityColor = '#10B981',
  progressPercent = 80,
  trigger = true
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    if (!trigger) {
      setDisplayValue(0);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;
    const duration = 800; // ms

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = easeOut * value;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, trigger]);

  const formattedNumber =
    decimals === 0 ? Math.round(displayValue).toString() : displayValue.toFixed(decimals);

  return (
    <div className="bg-[#101723] border border-slate-800/90 rounded p-3.5 shadow-md hover:border-slate-700 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between font-mono text-[9px] text-slate-500 uppercase tracking-wider mb-1">
          <span>{title}</span>
          <span
            className="text-[9px] font-mono px-1 py-0.2 rounded"
            style={{
              backgroundColor: `${qualityColor}18`,
              color: qualityColor
            }}
          >
            {quality}
          </span>
        </div>

        <div className="flex items-baseline gap-1 my-1">
          <span className="font-mono text-2xl sm:text-3xl font-bold text-white leading-none tracking-tight">
            {formattedNumber}
          </span>
          {unit && <span className="font-mono text-[10px] text-slate-400">{unit}</span>}
        </div>
      </div>

      <div className="mt-2.5">
        <div className="h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800/40">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: qualityColor,
              boxShadow: `0 0 6px ${qualityColor}80`
            }}
          />
        </div>
        <div className="mt-1.5 font-mono text-[9px] text-slate-400 truncate flex items-center justify-between">
          <span>{description}</span>
          <span style={{ color: qualityColor }}>{quality}</span>
        </div>
      </div>
    </div>
  );
}
