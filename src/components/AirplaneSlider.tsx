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
        {/* Flight Route: solid trail behind, dashed route ahead */}
        <div className="absolute left-0 right-0 h-1.5 bg-black/30 rounded-full shadow-inner" />
        <div
          className="absolute left-0 right-0 h-0 border-t-2 border-dashed border-white/45 rounded-full"
          style={{ left: `${pct}%` }}
        />
        <div
          className="absolute left-0 h-[7px] top-1/2 -translate-y-1/2 bg-teal-300 rounded-full"
          style={{ width: `${pct}%` }}
        />

        {/* Airplane Thumb */}
        <div
          className="absolute -translate-x-1/2 flex items-center justify-center"
          style={{ left: `${pct}%` }}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-[transform,background-color,box-shadow] duration-150 ${
              isDragging
                ? 'scale-125 bg-brand-dark shadow-xl shadow-black/50 ring-2 ring-white'
                : 'hover:scale-110 bg-brand shadow-lg border-2 border-white active:scale-105'
            }`}
          >
            <Plane
              className="w-8 h-8 text-white drop-shadow"
              style={{ transform: 'rotate(45deg)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
