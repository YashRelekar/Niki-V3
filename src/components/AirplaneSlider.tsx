import React, { useRef, useState } from 'react';
import { Plane } from 'lucide-react';

interface AirplaneSliderProps {
  progress: number; // 0 to 1
  onChange: (newProgress: number) => void;
  className?: string;
}

export const AirplaneSlider: React.FC<AirplaneSliderProps> = ({
  progress,
  onChange,
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateProgressFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clamped = Math.max(0, Math.min(x, rect.width));
    const newProgress = rect.width > 0 ? clamped / rect.width : 0;
    onChange(newProgress);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    calculateProgressFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    calculateProgressFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Clamped percentage
  const pct = Math.max(0, Math.min(100, progress * 100));

  return (
    <div className={`relative w-full py-3 select-none touch-none ${className}`}>
      {/* Slider Track Container */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-12 w-full flex items-center cursor-pointer group"
      >
        {/* Background Track Line */}
        <div className="absolute left-0 right-0 h-1.5 bg-white/30 rounded-full overflow-hidden shadow-inner">
          {/* Active flight progress trail */}
          <div
            className="h-full bg-teal-300/80 transition-[width] duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Airplane Thumb */}
        <div
          className="absolute -translate-x-1/2 flex items-center justify-center transition-[transform] duration-75"
          style={{ left: `${pct}%` }}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all ${
              isDragging
                ? 'scale-125 bg-teal-500/40 shadow-xl shadow-black/50 ring-2 ring-white'
                : 'hover:scale-110 bg-white/10'
            }`}
          >
            {/* 
              Oriented pointing horizontally to the right:
              In Lucide, Plane starts at 45° (top-right).
              Rotating +45° clockwise points the nose straight to the right (90° / east).
            */}
            <Plane
              className="w-8 h-8 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
              style={{ transform: 'rotate(45deg)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
