import type { Round } from '../spec.ts';
import type { Cue } from '../templates.ts';

/** Brand palette («شو شايف؟» visual system). Use these instead of new colours. */
export const PAL = {
  ink: '#1D1548', gold: '#FFC83D', goldDeep: '#F5B800', white: '#fff', teal: '#19D3C5', blue: '#2F8CFF', violet: '#6A3BFF',
  red: '#FF3355', pink: '#FF5C7A', green: '#22D489', orange: '#FF9F43', lilac: '#DCD3FF',
} as const;

/** Every SFX name a variant may cue (packages/quiz SFX library + synth_hook_sfx.py). A variant can also ship its own
 *  `<name>.wav` in packages/quiz/src/hooks/sfx/ and cue it by that name. */
export const SFX = ['tick', 'tick_last', 'whoosh', 'swap', 'pop', 'ding', 'shimmer', 'sting', 'flip',
  'hook_slam', 'hook_riser', 'hook_blink', 'hook_lock', 'hook_alarm', 'hook_roll'] as const;

export type Beats = Record<string, any>;

/** Everything a variant gets. */
export interface HookCtx {
  r: Round;
  /** round params (free-form per variant: t1 / t2 / foot / words / max …, plus beats overrides) */
  P: Record<string, any>;
  /** the variant's default beats merged with params.beats */
  B: Beats;
  /** scene duration in s (≥ timings.dur, default 2.0, stretched to fit the spoken line, max 2.5) */
  D: number;
  /** production-relative path of the round-1 teaser crop (900x860 jpg, heavily blurred by the shared layer), or undefined */
  teaser?: string;
  /** the hook line's on-screen text (script line params.line → onscreen_ar), '' when silent */
  onscreen: string;
  /** spoken text of the hook line (narration_ar), '' when silent */
  spoken: string;
  pal: typeof PAL;
  /** HTML-escape a string */
  esc: (s: string) => string;
  /** a SFX cue (kept under the hook voice automatically) */
  cue: (name: string, at: number, gain_db: number) => Cue;
}

/** What a variant renders. Coordinates are card px (900 wide; the card's top-left is canvas 90,470). */
export interface HookScene {
  /** inside #hk-top: the text band ABOVE the card (1080 wide, 252 tall, rtl). Use class "hk-t" for big lines. */
  top: string;
  /** on the card, after #hk-top (absolute layers; class "abs") */
  body: string;
  /** extra CSS (scope it with your own ids/classes) */
  css?: string;
  /** GSAP code appended to the shared prelude. In scope: tl (timeline), Q (QUIZ data), X (exit time = D-0.3),
   *  shake(sel,at,amp,dur,rot), slam(sel,at,fromScale,dur). Full-bleed #bgfx layer (behind the card) starts at opacity 0. */
  js: string;
  /** html placed in the root under the card (default '<div id="bgfx"></div>') */
  root?: string;
}

export interface HookVariant {
  /** registry key = file name (snake_case) */
  name: string;
  /** other names accepted in quiz.json params.variant */
  aliases?: string[];
  /** one line: the motion concept (shown in errors / README) */
  about: string;
  /** default beat times (s from scene start); params.beats overrides any of them */
  beats: Beats;
  /** CSS colour laid over the blurred teaser on the card */
  tint: string;
  /** SFX cues (a closing whoosh at D-0.36 is added for you) */
  sfx(c: HookCtx): Cue[];
  render(c: HookCtx): HookScene;
}

export const defineHook = (v: HookVariant) => v;

/** round to 0.01 s (same as templates.ts r2; kept here so variants import nothing outside this folder) */
export const r2 = (x: number) => Math.round(x * 100) / 100;
