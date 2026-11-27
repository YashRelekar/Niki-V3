import React from 'react';

/**
 * JourneyDots — page-control style progress across the guest journey.
 *
 * Future stops are translucent, completed stops are dimmed solid, and the
 * current stop is a solid elongated pill that grows into place. Lives in the
 * top chrome of the kiosk overlay; hidden on attract-loop screens.
 */

export type JourneyStep = 'WELCOME' | 'PHOTOS' | 'CHOOSE' | 'PRINT' | 'SOUVENIR';

const ORDER: JourneyStep[] = ['WELCOME', 'PHOTOS', 'CHOOSE', 'PRINT', 'SOUVENIR'];

export function journeyStepForState(state: string): JourneyStep | null {
  switch (state) {
    case 'WAIT_FOR_USER_ENGAGEMENT':
    case 'DETECT_PRESENCE':
      return 'WELCOME';
    case 'CAPTURE_PHOTOS':
      return 'PHOTOS';
    case 'WAIT_FOR_USER_CHOOSE_PHOTO':
      return 'CHOOSE';
    case 'PRINT_PHOTO':
    case 'PAPER_JAM_RECOVERY':
      return 'PRINT';
    case 'PRINT_SUCCESS':
    case 'GOODBYE':
      return 'SOUVENIR';
    default:
      return null; // IDLE, THINKING — attract loop shows no dots
  }
}

export const JourneyDots: React.FC<{ state: string }> = ({ state }) => {
  const current = journeyStepForState(state);
  if (!current) return null;

  const currentIndex = ORDER.indexOf(current);

  return (
    <div
      className="absolute top-3 inset-x-0 z-20 flex items-center justify-center gap-2 pointer-events-none"
      aria-label={`Step ${currentIndex + 1} of ${ORDER.length}`}
    >
      {ORDER.map((step, i) => {
        const isCurrent = i === currentIndex;
        const isPast = i < currentIndex;
        return (
          <span
            key={step}
            className={`h-2 rounded-full transition-colors duration-300 ease-out ${
              isCurrent
                ? 'w-6 bg-white shadow-sm'
                : isPast
                ? 'w-2 bg-white/60'
                : 'w-2 bg-white/25'
            }`}
          />
        );
      })}
    </div>
  );
};
