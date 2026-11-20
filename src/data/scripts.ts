/**
 * NIKI Screen Scripts & Copy — single source of truth.
 *
 * Every line of dialogue, monologue, and static screen copy lives here so the
 * booth's voice can be re-tuned in one place without touching UI components
 * or the backend state machine.
 */

/** Demo-flyer name used to personalize the invite greeting. Overridable via localStore settings (`demoName`). */
export const DEFAULT_DEMO_NAME = 'Candbot';

/** 1. IDLE — sleeping kaomoji + status line. */
export const IDLE_SCRIPT = {
  kaomoji: '(ᴗ˳ᴗ)ᶻ𝗓𐰁 .ᐟ',
  status: 'Kiosk Sleeping • Tap anywhere to wake',
} as const;

/** 2. DETECT_PRESENCE — first greeting as the flyer approaches. */
export const PRESENCE_SCRIPT = {
  headline: 'Hello, flyer!',
  sub: 'Come closer!',
  cta: 'Step forward or tap to interact',
} as const;

/** 3. WAIT_FOR_USER_ENGAGEMENT — greeting + invitation card. */
export const INVITE_SCRIPT = {
  /** `${demoName}` is replaced with the configured demo name at render time. */
  welcomeText: "The weather looks great today, ${demoName}!\nWouldn't you want to take a picture?",
  welcomeSub: "Welcome!\nTake a photo with me!",
  primaryButton: "Let's start!",
  secondaryButton: 'No thanks',
} as const;

/** Builds the finalized invite greeting for a given demo name. */
export function buildInviteWelcome(demoName: string = DEFAULT_DEMO_NAME): string {
  return INVITE_SCRIPT.welcomeText.replace(/\$\{demoName\}/g, demoName);
}

/** 6. PRINT_PHOTO — Niki's technology monologue, pre-split into lines. */
export const PRINTING_MONOLOGUE_LINES: string[] = [
  "Hi! I'm Niki, your friendly little robot.",
  "You're probably wondering how I can move, talk, see, and still look this cute.",
  "Well… it's not magic — it's some pretty cool technology!",
  'I use a Vision-Language Model so I can see the world and chat with you about it.',
  'SLAM helps me walk around while building a map in my head at the same time.',
  'LoRAs let me add a fun, personal twist to every photo I create.',
  'And with MCP, all these abilities come together like my arms, legs, and tiny robot brain.',
  "Pretty cool, right? Let's explore together!",
];

/** Stage copy shown under the printing progress bar. */
export const PRINTING_STAGE_SCRIPT = [
  'Optimizing souvenir resolution & colors...',
  'Thermal printing souvenir postcard...',
  'Finalizing glossy finish & dispensing...',
] as const;

export const PRINT_SUCCESS_SCRIPT = {
  finishedHeadline: 'Printing Finished!',
  trayLine: 'Please check the dispenser tray below for your printed souvenir.',
  collectLine: 'Please collect your souvenir print from the tray below.',
  badge: 'Cathay Pacific Souvenir',
  headline: 'Print success!',
  emoji: '🎉',
  countdown: 'Returning to start in',
  tapToFinish: 'Tap anywhere to finish now',
} as const;

/** 7. PAPER_JAM_RECOVERY — Niki's spoken reassurance (CONCERNED emotion). */
export const PAPER_JAM_REASSURANCE =
  "Please hold on for just a second! I'm retracting the paper and preparing a fresh print for you right now.";

export const PAPER_JAM_SCRIPT = {
  banner: 'Printer Jam Detected • Auto-Recovery Active',
  headline: 'Hold on just a moment! ⚠️',
  body: 'Please be patient while Niki gently retracts the stuck paper, clears the feed rollers, and automatically prints a fresh souvenir photo.',
  steps: [
    { id: 1, title: 'Jam Detection', desc: 'Detecting dispenser paper position' },
    { id: 2, title: 'Paper Retraction', desc: 'Gently retracting jammed sheet into clearance tray' },
    { id: 3, title: 'Roller Calibration', desc: 'Cleaning feed rollers & realigning print ribbon' },
    { id: 4, title: 'Thermal Reprint', desc: 'Dispensing fresh souvenir photo print' },
  ],
  skipButton: 'Fast-forward to Ready',
  footer: 'Automatic paper jam clearing protocol',
} as const;

/** 8. GOODBYE — farewell before the automatic reset to IDLE. */
export const GOODBYE_SCRIPT = {
  emoji: '✈️',
  headline: 'Have a wonderful journey!',
  body: 'Thank you for visiting Cathay Pacific. Resetting kiosk for the next guest...',
  footer: 'Returning to home screen...',
} as const;

/** Voice-test sample used by the Dev Studio. */
export const VOICE_TEST_SAMPLE =
  "Hi! I'm Niki, your friendly Cathay Pacific photo companion! Ready to capture some beautiful memories?";
