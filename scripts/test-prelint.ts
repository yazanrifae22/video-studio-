// Pre-QA lint checks (packages/orchestrator/src/prelint.ts), pure parts. usage: npx tsx scripts/test-prelint.ts
import { AI_TEXT, MOJIBAKE, captionDisfluencies, captionsVsAsr, claimCoverage, creditWording, publicStrings, shortPages, narrationPace, packagingChecks, youtubeLimitChecks } from '../packages/orchestrator/src/prelint.ts';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };

const pages = [{ text: 'UM WE WENT', t0: 0, t1: 0.9 }, { text: 'TO TO THE MOON', t0: 0.9, t1: 1.5 }, { text: 'MOON AGAIN', t0: 1.5, t1: 2.4 }, { text: 'CLEAN PAGE', t0: 2.4, t1: 3.4 }];
const d = captionDisfluencies(pages);
ok(d.some(x => /filler um/.test(x.detail)) && d.some(x => /repeated "to"/.test(x.detail)) && d.some(x => /"moon" repeated across pages/.test(x.detail)) && d.length === 3, `fillers, stutters and cross-page repeats (${d.length})`);
const s = shortPages(pages);
ok(s.length === 1 && /TO TO THE MOON/.test(s[0].detail), 'pages under 0.7 s');
const asr = [{ w: 'we', s: 0.2, e: 0.4 }, { w: 'went', s: 0.4, e: 0.8 }, { w: 'to', s: 0.9, e: 1.0 }, { w: 'the', s: 1.0, e: 1.1 }, { w: 'moon', s: 1.1, e: 1.4 }, { w: 'again', s: 1.6, e: 2.0 }, { w: 'totally', s: 2.5, e: 3.0 }, { w: 'different', s: 3.0, e: 3.3 }];
const a = captionsVsAsr(pages, asr);
ok(a.failures.length === 1 && /CLEAN PAGE/.test(a.failures[0].detail), `caption text vs ASR words (${a.failures.map(f => f.detail).join(' | ')})`);
ok(captionsVsAsr([{ text: 'وصلنا للقمر', t0: 0, t1: 1 }], [{ w: 'وَصَلنا', s: 0.1, e: 0.4 }, { w: 'للقمر', s: 0.4, e: 0.9 }]).failures.length === 0, 'Arabic captions match ASR with diacritics stripped');

const sj = { title: 'TOP 5 MESSI FREE KICKS', on_screen: [{ text: 'STAY FOR #1', role: 'hook' }, { text: 'BANANA CURL', role: 'label' }], claims: [{ claim: 'all five are Messi free kicks', evidence: 'frames 2-6 s' }, { claim: '#2 goes over the wall', evidence: 'frames 2.0-6.6 s' }] };
const c = claimCoverage(sj, ['OVER THE WALL']);
ok(c.length === 1 && /BANANA CURL/.test(c[0].detail), `title covered, hook skipped, uncovered label flagged (${c.map(x => x.detail).join(' | ')})`);
ok(claimCoverage({ title: 'BIGGEST VOLCANO', claims: [{ claim: 'biggest volcano', evidence: '' }] }).length === 2, 'claim without evidence fails and does not cover');
ok(claimCoverage({ title: 'SATURN RINGS' }).length === 1, 'title with no claims[] fails');

const src = [{ asset_id: 'a1', record: 'CC BY 4.0 | Jane Doe', restrictions: ['Credit must read exactly "Video: Jane Doe / ESO (CC BY 4.0)"'] }];
const cw = creditWording(['Footage: public domain (NASA)'], src);
ok(cw.some(x => /public domain/.test(x.detail)) && cw.some(x => /Jane Doe \/ ESO/.test(x.detail)), 'false "public domain" + missing required credit wording');
ok(creditWording(['Video: Jane Doe / ESO (CC BY 4.0)'], src).length === 0, 'required wording present -> pass');
ok(creditWording(['Footage: public domain'], [{ asset_id: 'n', record: 'Public Domain (NASA, not subject to copyright)', restrictions: [] }]).length === 0, 'PD allowed when the record says PD');
ok(creditWording(['nothing'], src, false).length === 0, 'brands without a credit block skip the wording rule');

ok(AI_TEXT.test('Narration is AI-generated.') && AI_TEXT.test('صوت مولّد بالذكاء الاصطناعي') && AI_TEXT.test('voice: Gemini TTS') && !AI_TEXT.test('Gemini 4 spacewalk, 1965'), 'AI-generation text (Gemini missions are fine)');
ok(!AI_TEXT.test('Why AI Kept Drawing Six Fingers', 'tech') && AI_TEXT.test('Voiceover by ElevenLabs') && AI_TEXT.test('تم إنشاؤه بالذكاء الاصطناعي'), 'shared guard: topic titles about AI pass, creation/disclosure phrasing fails (2026-11-08)');
ok(publicStrings({ title: 'a', notes: 'b', publish: { description_ar: 'c' } }).map(x => x.key).join(',') === 'title,publish.description_ar', 'only viewer-facing keys are scanned for AI text');
ok(MOJIBAKE.test('Messi Â· Barcelona') && MOJIBAKE.test('â€” dash') && MOJIBAKE.test('Ø§Ù„') && !MOJIBAKE.test('Mbappé · «شو شايف؟» — ok'), 'mojibake vs real accents / Arabic / dashes');

// narration pace (Podium Pop, 2026-11-02): 2.0 words/s floor, gaps <= 1.0 s
const fast = [0,1,2,3,4,5].map(i => ({ text: 'ONE TWO THREE FOUR FIVE', t0: i * 2.2, t1: i * 2.2 + 2.0 }));
ok(narrationPace(fast).length === 0, 'flowing narration (~2.3 words/s, 0.2 s beats) passes');
const slow = [{ text: 'NUMBER FIVE', t0: 0, t1: 1.2 }, { text: 'WOW', t0: 4.6, t1: 5.2 }, { text: 'NUMBER FOUR', t0: 6.0, t1: 7.0 }, { text: 'NICE', t0: 10.2, t1: 10.8 }];
const sp = narrationPace(slow);
ok(sp.some(x => x.check === 'narration_pace') && sp.filter(x => x.check === 'narration_gap').length === 2, `slow narration with 3-4 s holes fails (${sp.length})`);

// packaging.json = the published surface (audit 2026-11-08 I1)
const srcJ = [{ asset_id: 'a1', record: 'CC BY 4.0 | Jane Doe', restrictions: ['Credit must read exactly "Video: Jane Doe / ESO (CC BY 4.0)"'] }];
const pkAi = packagingChecks({ chosen_title: 'Moon walk', titles: ['Moon walk'], description: 'Narration is AI-generated.', hashtags: ['#moon'] }, {}, [], 'clipping');
ok(pkAi.some(x => x.check === 'ai_text' && /packaging\.description/.test(x.detail)), 'packaging: AI-generation text in description fails');
ok(packagingChecks({ chosen_title: 'Ã©clair', titles: [] }, {}, [], 'tech').some(x => x.check === 'mojibake'), 'packaging: mojibake fails');
ok(packagingChecks({ chosen_title: 't', description: 'Great clip.' }, {}, srcJ, 'clipping').some(x => x.check === 'credit_wording' && /Jane Doe \/ ESO/.test(x.detail)), 'packaging: required credit missing from description + attribution fails');
ok(packagingChecks({ chosen_title: 't', description: 'Great clip.' }, { attribution_block: ['Video: Jane Doe / ESO (CC BY 4.0)'] }, srcJ, 'clipping').length === 0, 'packaging: credit from script.json attribution block passes');
ok(packagingChecks({ chosen_title: 't', description: 'KEEP script.json description unchanged' }, {}, srcJ, 'clipping').length === 0, 'packaging: KEEP marker defers to script.json (checked there)');
ok(packagingChecks({ chosen_title: 'TOP 5 SAVES', description: 'Wild saves. Credits: @someone' }, {}, [], 'viral-rankings').some(x => x.check === 'credit_wording' && /Podium Pop/.test(x.detail)), 'packaging: Podium Pop credit block is forbidden');
ok(packagingChecks({ chosen_title: 'TOP 5 SAVES', description: 'Wild saves. Which one is #1?', hashtags: ['#football'] }, {}, srcJ, 'viral-rankings').length === 0, 'packaging: Podium Pop without credits passes');
// YouTube metadata limits (owner 2026-11-08): packaging over limits fails; script.json fallback + credits counted; plan entries checked
const ylim = (pk: any, sj: any, brand = 'clipping', pe: any[] = []) => youtubeLimitChecks(pk, sj, brand, 'db', pe).map(f => f.detail.split(':')[0]);
ok(ylim({ chosen_title: 'T'.repeat(101), description: 'ok' }, {}).join() === 'published title (packaging.json)', 'limits: title 101 fails');
ok(ylim({ chosen_title: 'T'.repeat(100), description: 'ok' }, {}).length === 0, 'limits: title 100 passes');
ok(ylim(null, { titles: { youtube: 'عنوان' }, description_ar: 'ك'.repeat(2501) }, 'quiz-ar').join() === 'published description (script.json)', 'limits: Arabic 2501 letters = 5002 bytes fails (script.json fallback)');
ok(ylim({ chosen_title: 't', description: 'd'.repeat(4980) }, { attribution_block: 'Video: NASA (public domain)' }).join() === 'published description (packaging.json)', 'limits: credits appended push the description over 5000 bytes');
ok(ylim({ chosen_title: 'a <b>', description: 'x', hashtags: Array.from({ length: 16 }, (_, i) => '#h' + 'abcdefghijklmnop'[i]) }, {}).join() === 'published title (packaging.json),published hashtags (packaging.json)', 'limits: < > and 16 hashtags fail');
ok(ylim({ chosen_title: 't', description: 'd' }, {}, 'clipping', [{ title: 't', description: 'd'.repeat(5001), tags: [] }]).join() === 'publish-plan entry description', 'limits: publish-plan entry checked');
ok(packagingChecks({ chosen_title: 'x', title_evidence: [{ term: 'ai generated video', source: 'yt' }] }, {}, [], 'tech').length === 0, 'packaging: search evidence is not published text');

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
