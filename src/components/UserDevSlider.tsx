import React from 'react';
import { User, Terminal } from 'lucide-react';

interface UserDevSliderProps {
  mode: 'user' | 'dev';
  onChange: (mode: 'user' | 'dev') => void;
}

export const UserDevSlider: React.FC<UserDevSliderProps> = ({ mode, onChange }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center">
      <div 
        className="relative flex items-center bg-slate-950/85 backdrop-blur-md border border-teal-500/40 rounded-full p-1 shadow-2xl shadow-black/60 select-none transition-all duration-200 hover:border-teal-400"
        role="group"
        aria-label="Preview Mode Switcher"
      >
        {/* Sliding Highlight Pill */}
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-teal-600 shadow-md shadow-teal-950 transition-all duration-300 ease-out ${
            mode === 'user' ? 'left-1' : 'left-[calc(50%+2px)]'
          }`}
        />

        {/* User Button */}
        <button
          onClick={() => onChange('user')}
          className={`relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors duration-200 ${
            mode === 'user'
              ? 'text-white'
              : 'text-teal-300/70 hover:text-white'
          }`}
          aria-pressed={mode === 'user'}
        >
          <User className="w-3.5 h-3.5" />
          <span>User</span>
        </button>

        {/* Dev Button */}
        <button
          onClick={() => onChange('dev')}
          className={`relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors duration-200 ${
            mode === 'dev'
              ? 'text-white'
              : 'text-teal-300/70 hover:text-white'
          }`}
          aria-pressed={mode === 'dev'}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Dev</span>
        </button>
      </div>
    </div>
  );
};
