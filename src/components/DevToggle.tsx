import React from 'react';
import { Wrench } from 'lucide-react';

/**
 * Discreet, low-profile Dev Mode toggle for User Mode.
 * A subtle semi-transparent icon tucked into the top-right safe-area corner.
 * Deliberately unobtrusive so flyer-mode screenshots read as a clean kiosk.
 */
export const DevToggle: React.FC<{ onEnterDev: () => void }> = ({ onEnterDev }) => {
  return (
    <button
      onClick={onEnterDev}
      className="fixed z-50 flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 active:scale-90 transition-all border border-white/10 text-white/25 hover:text-white/70"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
        right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
      }}
      title="Developer Studio (staff only)"
      aria-label="Open Developer Studio"
    >
      <Wrench className="w-4 h-4" />
    </button>
  );
};
