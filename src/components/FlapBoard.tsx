import React, { useMemo } from 'react';

/**
 * FlapBoard — split-flap "departure board" text.
 *
 * Every character sits in its own flap cell; when a character changes, that
 * cell flips like a real Solari board. Use for short status lines
 * (print stages, system states) in uppercase, not for body copy.
 *
 * Honors prefers-reduced-motion via CSS (cells render settled, no flip).
 */

interface FlapBoardProps {
  text: string;
  className?: string;
  cellClassName?: string;
}

export const FlapBoard: React.FC<FlapBoardProps> = ({
  text,
  className = '',
  cellClassName = '',
}) => {
  const chars = useMemo(() => Array.from(text.toUpperCase()), [text]);

  return (
    <span
      className={`inline-flex items-center gap-[2px] font-mono tabular-nums ${className}`}
      aria-label={text}
    >
      {chars.map((ch, i) =>
        ch === ' ' ? (
          <span key={i} className="w-[0.42ch]" aria-hidden="true" />
        ) : (
          <span
            key={`${i}-${ch}`}
            className={`flap-cell relative inline-flex items-center justify-center ${cellClassName}`}
            aria-hidden="true"
          >
            {ch}
          </span>
        ),
      )}
    </span>
  );
};
