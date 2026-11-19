/**
 * Brand profiles for the tech builder (tech:build / celebrity:build, 2026-11-08).
 * celebrity = Moments That Made Them: palette/voice/music from docs/brands/celebrity/brand.json; original typography
 * and illustration only (no clips, no likeness): lintCelebrityScenes() refuses <video>/<iframe> and raster images
 * that are not listed as original in productions/<id>/assets/provenance.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { P } from '../../shared/src/paths.ts';

export interface BrandProfile {
  brand: string; voice: string; style: string; music: string; background: string;
  /** CSS appended after tech.css (palette overrides via the :root variables) */
  css: string;
  hook: { color: string; bg: string; border: string };
  caption: { color: string; shadow: string };
  band: [number, number];   // duration warn band, s
}

const TECH_KIT = path.join(P.data, 'brand', 'tech', 'kit');
const brandJson = (b: string) => { try { return JSON.parse(fs.readFileSync(path.join(P.root, 'docs', 'brands', b, 'brand.json'), 'utf8').replace(/^﻿/, '')); } catch { return {}; } };

export const TECH_STYLE = 'Confident, curious tech explainer talking to one friend. Fast but clear, about 2.8 words per second. Questions rise; reveal words land with a short beat. No announcer voice.';
const CELEB_STYLE = 'Warm, assured sports-and-culture storyteller talking to one fan. About 2.6 words per second; the number lands with a short beat, the turn is said quietly. No announcer or trailer voice.';

export function brandProfile(brand: string | null | undefined): BrandProfile {
  if (brand === 'celebrity') {
    const d = brandJson('celebrity').data ?? {};
    const [bg, gold, ink, red] = [...(d.palette ?? []), '#0B0B0D', '#E8C170', '#F4EFE6', '#E5484D'].slice(0, 4) as string[];
    const own = path.join(P.data, 'brand', 'celebrity', 'kit', 'music', `${d.music ?? 'story-cinematic'}.wav`);
    return {
      brand: 'celebrity', voice: d.voice?.name ?? 'Algenib', style: CELEB_STYLE, background: bg,
      music: fs.existsSync(own) ? own : path.join(P.data, 'legacy', 'video-automation', 'assets', 'music', 'story-cinematic.wav'),
      css: `:root{--bg:${bg};--ink:${ink};--acc:${gold};--gold:${gold};--bad:${red};--warn:${gold};--good:${ink};--vio:${gold};--muted:#A49E92;--panel:#16151A;--line:#2C2820}
#bg{background-image:none;opacity:1;background:radial-gradient(120% 70% at 50% 18%,#1C1A17 0%,${bg} 70%)}
#glow{background:radial-gradient(circle,rgba(232,193,112,.16),rgba(232,193,112,0) 62%)}`,
      hook: { color: ink, bg: 'rgba(11,11,13,0.94)', border: `4px solid ${gold}` },
      caption: { color: ink, shadow: `0 0 6px ${bg}, 0 4px 14px rgba(0,0,0,0.95), 0 0 2px #000` },
      band: [36, 55],
    };
  }
  return {
    brand: 'tech', voice: 'Charon', style: TECH_STYLE, background: '#070A12', music: path.join(TECH_KIT, 'music', 'tech-focus.wav'), css: '',
    hook: { color: '#EEF3FF', bg: 'rgba(15,23,43,0.92)', border: '4px solid #5B8CFF' },
    caption: { color: '#EEF3FF', shadow: '0 0 6px #070A12, 0 4px 14px rgba(0,0,0,0.95), 0 0 2px #000' },
    band: [28, 47],
  };
}

/** celebrity rule: no clips, no likeness. Returns problems (empty = ok). Pure on (scene html list, provenance). */
export function lintCelebrityScenes(htmls: { scene: string; html: string }[], provenance: any): string[] {
  const originals = new Set<string>((provenance?.items ?? []).filter((i: any) => i?.original === true || /^original/i.test(String(i?.origin ?? ''))).map((i: any) => String(i.path).replace(/^assets\//, '')));
  const bad: string[] = [];
  for (const { scene, html } of htmls) {
    if (/<(video|iframe|audio)\b/i.test(html)) bad.push(`scene ${scene}: <video>/<iframe>/<audio> not allowed (celebrity: no clips)`);
    for (const m of html.matchAll(/assets\/([^"')\s]+\.(?:jpe?g|png|webp|gif|avif))/gi))
      if (!originals.has(m[1])) bad.push(`scene ${scene}: raster image assets/${m[1]} is not listed as original in assets/provenance.json (celebrity: no photos/likeness)`);
    if (/https?:\/\/[^"')\s]+\.(?:jpe?g|png|webp|gif|avif|mp4|webm)/i.test(html)) bad.push(`scene ${scene}: remote image/video URL not allowed`);
  }
  return bad;
}
