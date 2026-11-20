import React, { useEffect, useMemo, useState } from 'react';

/**
 * ScrambleText — "decoder ring" load-in for major copy.
 *
 * Letters cycle through random glyphs, then lock in left-to-right until the
 * full word lands. Whitespace (spaces / newlines) is never scrambled, and the
 * animation length is capped so long headlines don't crawl.
 *
 * Honors prefers-reduced-motion by rendering the final text immediately.
 */

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789✈✦';
const TICK_MS = 30;
const MAX_TICKS = 26; // ~780ms worst case

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** Optional delay before the decode starts (beat 2, beat 3...) */
  delay?: number;
}

export const ScrambleText: React.FC<ScrambleTextProps> = ({
  text,
  className,
  delay = 0,
}) => {
  const chars = useMemo(() => Array.from(text), [text]);
  const [revealed, setRevealed] = useState(() =>
    prefersReducedMotion() ? chars.length : 0,
  );

  useEffect(() => {
    if (prefersReducedMotion()) {
      setRevealed(Array.from(text).length);
      return;
    }

    const total = Array.from(text).length;
    setRevealed(0);

    let timer: number;
    const startTimer = window.setTimeout(() => {
      let tick = 0;
      timer = window.setInterval(() => {
        tick += 1;
        // Reveal faster on long strings so total time stays under ~0.8s
        const perTick = Math.max(1, Math.ceil(total / MAX_TICKS));
        setRevealed(tick * perTick);
        if (tick * perTick >= total) {
          clearInterval(timer);
          setRevealed(total);
        }
      }, TICK_MS);
    }, delay);

    return () => {
      clearTimeout(startTimer);
      clearInterval(timer);
    };
  }, [text, delay]);

  if (revealed >= chars.length) {
    return (
      <span className={className} style={{ whiteSpace: 'pre-line' }}>
        {text}
      </span>
    );
  }

  return (
    // aria-hidden during decode; re-announced via the settled text below
    <span className={className} style={{ whiteSpace: 'pre-line' }} aria-hidden="true">
      {chars.map((ch, i) => {
        if (i < revealed) return <React.Fragment key={i}>{ch}</React.Fragment>;
        if (/\s/.test(ch)) return <React.Fragment key={i}>{ch}</React.Fragment>;
        // Left edge locks in solid while the right edge keeps flickering.
        return (
          <React.Fragment key={i}>
            {GLYPHS[Math.floor(Math.random() * GLYPHS.length)]}
          </React.Fragment>
        );
      })}
    </span>
  );
};
