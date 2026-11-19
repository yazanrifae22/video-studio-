import { z } from 'zod';

/**
 * Machine-readable contracts exchanged between agents, the worker and the studio (brief §26).
 * Missing data is null — never a guessed value.
 */

export const FORMATS = ['ranking', 'clipping', 'compilation', 'quiz', 'episode', 'explainer'] as const;   // episode = kids3d long-form (2026-11-02); explainer = tech:build (2026-11-03)
export const PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook', 'threads'] as const;
export const SOURCE_PLATFORMS = ['youtube', 'twitch', 'pexels', 'pixabay', 'wikimedia', 'internet_archive', 'nasa', 'facebook', 'creator', 'own', 'other'] as const;

/** Rights categories (§18). Only `approved` / `approved_with_conditions` may enter a publishable production. */
export const RIGHTS = ['approved', 'approved_with_conditions', 'pending', 'research_only', 'rejected'] as const;
export const PUBLISHABLE_RIGHTS: ReadonlySet<string> = new Set(['approved', 'approved_with_conditions']);

/** Production board pipeline (§21E). */
export const STAGES = ['idea', 'research', 'rights', 'analysis', 'script', 'editing', 'qa', 'approved', 'scheduled', 'published', 'analytics', 'rejected'] as const;

const nul = <T extends z.ZodTypeAny>(t: T) => t.nullable();
const evidence = z.object({ claim: z.string(), url: z.string().url().nullable(), observed_at: z.string().nullable() });

export const VideoIdea = z.object({
  idea_id: z.string(),
  brand_id: z.string(),
  topic: z.string().min(3),
  audience: nul(z.string()),
  language: z.string().default('en'),
  description: nul(z.string()),
  hook: nul(z.string()),
  supporting_sources: z.array(z.object({ name: z.string(), license_basis: z.string(), url: nul(z.string()) })).default([]),
  trend_evidence: z.array(evidence).default([]),
  opportunity_score: nul(z.number().min(0).max(100)),
  production_estimate: nul(z.string()),
  status: z.enum(['proposed', 'approved', 'in_production', 'produced', 'rejected', 'parked']).default('proposed'),
});
export type VideoIdea = z.infer<typeof VideoIdea>;

export const SourceAsset = z.object({
  asset_id: z.string(),
  original_url: z.string().url(),
  source_platform: z.enum(SOURCE_PLATFORMS),
  external_id: nul(z.string()),
  creator: nul(z.string()),
  title: nul(z.string()),
  description: nul(z.string()),
  language: nul(z.string()),
  published_at: nul(z.string()),
  duration: nul(z.number().nonnegative()),
  view_count: nul(z.number().int().nonnegative()),
  views_observed_at: nul(z.string()),
  license: nul(z.string()),
  license_url: nul(z.string()),
  permission_status: z.enum(RIGHTS),
  usage_restrictions: z.array(z.string()).default([]),
  attribution: nul(z.string()),
  commercial_use: nul(z.boolean()),
  derivatives_allowed: nul(z.boolean()),
  download_url: nul(z.string()),
  local_path: nul(z.string()),
  fingerprint: nul(z.string()),
  acquisition_date: nul(z.string()),
});
export type SourceAsset = z.infer<typeof SourceAsset>;

const score = z.number().min(0).max(10).nullable();
export const ClipCandidate = z.object({
  candidate_id: z.string(),
  asset_id: z.string(),
  production_id: nul(z.string()),
  start_time: z.number().nonnegative(),
  end_time: z.number().positive(),
  transcript_excerpt: nul(z.string()),
  moment_description: z.string(),
  speakers: nul(z.string()),
  topic: nul(z.string()),
  suggested_title: nul(z.string()),
  suggested_hook: nul(z.string()),
  missing_context: nul(z.string()),
  hook_score: score,
  coherence_score: score,
  emotional_score: score,
  value_score: score,
  payoff_score: score,
  visual_score: score,
  overall_score: nul(z.number().min(0).max(100)),
  editorial_rationale: z.string(),
  confidence: z.enum(['low', 'med', 'high']).nullable(),
  edit_difficulty: z.enum(['low', 'med', 'high']).nullable(),
  rights_status: z.enum(RIGHTS),
}).refine(c => c.end_time > c.start_time, { message: 'end_time must be after start_time' });
export type ClipCandidate = z.infer<typeof ClipCandidate>;

export const ProductionJob = z.object({
  production_id: z.string(),
  brand_id: z.string(),
  format: z.enum(FORMATS),
  title: z.string(),
  source_assets: z.array(z.string()),
  selected_candidates: z.array(z.string()),
  script: nul(z.string()),
  openchatcut_project_id: nul(z.string()),
  assigned_agents: z.array(z.string()),
  current_state: z.enum(STAGES),
  approval_status: z.enum(['pending', 'approved', 'rejected', 'revision_requested']),
});

export const PublishingRecord = z.object({
  production_id: z.string(),
  platform: z.enum(PLATFORMS),
  account_id: nul(z.string()),
  export_variant: nul(z.string()),
  metadata: z.object({ title: z.string(), description: z.string(), hashtags: z.array(z.string()), synthetic_media_disclosure: z.boolean(), attribution: nul(z.string()) }),
  scheduled_time: nul(z.string()),
  publication_status: z.enum(['draft', 'awaiting_approval', 'approved', 'scheduled', 'uploading', 'published', 'private', 'failed']),
  external_post_id: nul(z.string()),
  error_details: nul(z.string()),
});

export const AnalyticsSnapshot = z.object({
  external_post_id: z.string(),
  platform: z.enum(PLATFORMS),
  observation_time: z.string(),
  views: nul(z.number().int()),
  reach: nul(z.number().int()),
  watch_time: nul(z.number()),
  retention_metrics: nul(z.record(z.string(), z.unknown())),
  engagement_metrics: nul(z.record(z.string(), z.unknown())),
  followers_gained: nul(z.number().int()),
  available_revenue_metrics: nul(z.record(z.string(), z.unknown())),
});

/** Independent QA review (§17). The 8 criteria sum to 100. */
export const QA_RUBRIC = { hook: 15, pacing: 15, story: 15, editing: 15, audio: 10, captions: 10, originality: 10, format: 10 } as const;
export const Review = z.object({
  production_id: z.string(),
  version: z.number().int().positive(),
  reviewer: z.string(),
  breakdown: z.object(Object.fromEntries(Object.entries(QA_RUBRIC).map(([k, max]) => [k, z.number().min(0).max(max)])) as Record<keyof typeof QA_RUBRIC, z.ZodNumber>),
  issues: z.array(z.object({ t: z.string(), severity: z.enum(['blocker', 'major', 'minor']), issue: z.string(), fix: z.string(), owner: z.string() })),
  blockers: z.array(z.string()),
  summary: z.string(),
});

/**
 * Review kinds (hardening 2026-10-31). Only `qa` reviews (stored as reviews.kind 'agent', the historical default) set
 * productions.qa_score / current_state and count as "the latest independent QA review" for approval. Retention, rights and
 * critic reviews are recorded alongside (reviews.kind = retention | rights | critic) and never overwrite the QA director's score.
 * Kind = review JSON `kind`, else inferred from the reviewer id. Existing rows are untouched.
 */
export const REVIEW_KINDS = ['qa', 'retention', 'rights', 'critic'] as const;
export const SIDE_REVIEWERS: Record<string, (typeof REVIEW_KINDS)[number]> = { 'retention-reviewer': 'retention', 'rights-scout': 'rights', 'punchline-critic': 'critic' };
/** Retention rubric (retention-v1, R1..R8) breakdown. Since 2026-11-02 qa-director writes the retention review (retention-reviewer
 *  retired): a qa-director review whose breakdown is the R1..R8 rubric is a retention review even without `kind`, so it can never
 *  overwrite the QA score or become "the latest QA review" for approval. The retention bar (clipping / viral-rankings >= 80) is met by
 *  the latest reviews.kind='retention' row from any reviewer (qa-director or the historical retention-reviewer). */
export const isRetentionBreakdown = (b: unknown) => !!b && typeof b === 'object' && Object.keys(b as object).length > 0 && Object.keys(b as object).every(k => /^R[1-8]$/.test(k));
export function reviewKind(raw: any): (typeof REVIEW_KINDS)[number] {
  const k = raw?.kind ?? SIDE_REVIEWERS[String(raw?.reviewer ?? '')] ?? (isRetentionBreakdown(raw?.breakdown) ? 'retention' : 'qa');
  if (!(REVIEW_KINDS as readonly string[]).includes(k)) throw new Error(`review kind must be one of ${REVIEW_KINDS.join(', ')}`);
  return k;
}
/** SQL filter for "QA reviews only" (historical rows have kind 'agent'). */
export const QA_REVIEW_SQL = `COALESCE(kind,'agent') IN ('agent','qa')`;
/** Non-QA review: any numeric breakdown, optional explicit score (default = sum of the breakdown). */
export const SideReview = Review.extend({
  kind: z.enum(REVIEW_KINDS).optional(),
  breakdown: z.record(z.string(), z.number().min(0)),
  score: z.number().min(0).max(100).optional(),
});

export function validate<T extends z.ZodTypeAny>(schema: T, value: unknown, what: string): z.infer<T> {
  const r = schema.safeParse(value);
  if (!r.success) throw new Error(`${what} failed schema validation: ${r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  return r.data;
}

/* ===================================================================== viral-rankings (2026-10-31, pipeline-engineer)
 * Moment library + ranking plan contracts. Additive: nothing above changed. Unknown metrics stay null (never 0). */

/** Creative lifecycle of a moment. Legal status lives in a SEPARATE field (`rights_status`), never mixed in here. */
export const MOMENT_CREATIVE = ['discovered', 'metadata_verified', 'analyzed', 'usable', 'reserved', 'used_in_draft', 'used_in_approved', 'published', 'rejected', 'expired', 'unavailable'] as const;
/** Creative states that can never enter a cut list, whatever the rights say. */
export const MOMENT_DEAD: ReadonlySet<string> = new Set(['rejected', 'expired', 'unavailable']);
export const USAGE_STATUS = ['planned', 'reserved', 'in_draft', 'approved', 'published', 'released'] as const;
export const AGE_BUCKETS = ['24h', '72h', '7d', '28d', 'lifetime'] as const;

const strList = z.array(z.string()).default([]);

export const Category = z.object({
  id: z.string(),
  brand_id: z.string(),
  parent_id: z.string().nullable().default(null),      // null = top-level category; set = subcategory
  slug: z.string().regex(/^[a-z0-9][a-z0-9/-]*$/),
  title: z.string().min(2),
  purpose: z.string().nullable().default(null),
  audience_fit: z.string().nullable().default(null),
  research_queries: strList,
  keywords: strList,
  exclusions: strList,
  origin: z.string().nullable().default(null),         // where the category came from (seed, research doc, analytics)
  rights_risk: z.enum(['low', 'medium', 'high']).nullable().default(null),
  safety_constraints: strList,
  review_cadence: z.string().nullable().default(null), // e.g. "weekly"
  next_experiments: strList,
  status: z.enum(['active', 'paused', 'exhausted', 'retired']).default('active'),
});
export type Category = z.infer<typeof Category>;

const metric = z.number().nullable().default(null);
/** One timestamped metrics observation for a category. Rows are appended, never overwritten (history survives refreshes). */
export const CategoryMetricsSnapshot = z.object({
  category_id: z.string(),
  observed_at: z.string(),
  age_bucket: z.enum(AGE_BUCKETS).nullable().default(null),  // compare like with like: 24h vs 24h, 7d vs 7d
  platform: z.string().nullable().default(null),
  sample_size: z.number().int().nonnegative().nullable().default(null),
  total_views: metric, median_views: metric, engaged_views: metric, normalized_perf: metric,
  avg_view_duration: metric, avg_pct_viewed: metric, stayed_to_watch: metric,
  likes_per_1k: metric, comments_per_1k: metric, subs_per_1k: metric,
  production_count: metric, usable_moments: metric,
  confidence: z.enum(['none', 'low', 'medium', 'high']).nullable().default(null),
  is_fixture: z.boolean().default(false),              // true = clearly-labelled test data, excluded from real decisions
  source: z.string().min(2),                           // e.g. "youtube-analytics-api", "studio-page-read", "fixture"
  provenance: z.string().nullable().default(null),     // file / URL / query the numbers came from
});
export type CategoryMetricsSnapshot = z.infer<typeof CategoryMetricsSnapshot>;
export const CATEGORY_METRICS = ['total_views', 'median_views', 'engaged_views', 'normalized_perf', 'avg_view_duration', 'avg_pct_viewed', 'stayed_to_watch',
  'likes_per_1k', 'comments_per_1k', 'subs_per_1k', 'production_count', 'usable_moments'] as const;

export const Moment = z.object({
  moment_id: z.string(),
  source_id: z.string(),
  brand_id: z.string().nullable().default(null),
  category_id: z.string().nullable().default(null),
  idea_id: z.string().nullable().default(null),
  start_ms: z.number().int().nonnegative(),
  end_ms: z.number().int().positive(),
  setup_ms: z.number().int().nonnegative().nullable().default(null),     // absolute source ms
  payoff_ms: z.number().int().nonnegative().nullable().default(null),
  reaction_ms: z.number().int().nonnegative().nullable().default(null),
  scene_boundaries: z.array(z.number().int().nonnegative()).default([]),
  description: z.string().min(3),
  transcript: z.array(z.object({ w: z.string(), t0: z.number(), t1: z.number() })).nullable().default(null),
  quality: z.object({ visual: z.number().min(0).max(10).nullable(), audio: z.number().min(0).max(10).nullable(), notes: z.string().nullable() }).nullable().default(null),
  rank_suitability: z.number().min(0).max(10).nullable().default(null),
  content_risks: strList,
  tags: strList,
  creative_status: z.enum(MOMENT_CREATIVE).default('discovered'),
  /** null = inherits the source's permission_status. Set it to narrow rights for this window (e.g. a broadcast logo → rejected). */
  rights_status: z.enum(RIGHTS).nullable().default(null),
  license_conditions: strList,
  checksum: z.string().nullable().default(null),       // sha256 of the exact file the window was analysed on
  phash: z.string().nullable().default(null),          // perceptual/content fingerprint of the window
  duplicate_of: z.string().nullable().default(null),   // moment_id of the same underlying event
  audio_essential: z.boolean().nullable().default(null),
  baked_captions: z.boolean().nullable().default(null),
  confidence: z.enum(['low', 'med', 'high']).nullable().default(null),
  evidence: z.record(z.string(), z.unknown()).default({}),
}).refine(m => m.end_ms > m.start_ms, { message: 'end_ms must be after start_ms' })
  .refine(m => [m.setup_ms, m.payoff_ms, m.reaction_ms].every(t => t == null || (t >= m.start_ms && t <= m.end_ms)), { message: 'setup/payoff/reaction must lie inside [start_ms, end_ms]' });
export type Moment = z.infer<typeof Moment>;

export const MomentUsage = z.object({
  production_id: z.string(),
  version: z.number().int().positive().nullable().default(null),
  moment_id: z.string(),
  in_ms: z.number().int().nonnegative().nullable().default(null),
  out_ms: z.number().int().positive().nullable().default(null),
  timeline_start_ms: z.number().int().nonnegative().nullable().default(null),
  rank_position: z.number().int().positive().nullable().default(null),
  reveal_index: z.number().int().nonnegative().nullable().default(null),
  transformation: z.record(z.string(), z.unknown()).default({}),   // narration line, crop, commentary added, etc.
  status: z.enum(USAGE_STATUS).default('planned'),
  platform: z.string().nullable().default(null),
  published_at: z.string().nullable().default(null),
});
export type MomentUsage = z.infer<typeof MomentUsage>;

export const RANKING_FORMATS = { top3: 3, top5: 5 } as const;
export const RankingEntry = z.object({
  rank_position: z.number().int().positive(),       // the editorial rank (#1 = best under the criterion)
  reveal_index: z.number().int().nonnegative(),     // screen order, 0 = shown first
  source_id: z.string(),
  moment_id: z.string(),
  in_ms: z.number().int().nonnegative(),            // absolute source ms (same timebase as the moment)
  out_ms: z.number().int().positive(),
  left_label: z.string().min(1).max(28),            // rail label, persists after its reveal
  narration_ref: z.string().nullable().optional(),
  captions_ref: z.string().nullable().optional(),
  rights_decision_id: z.number().int().positive().nullable().optional(),  // rights_log.id that approved this source/moment
  // build step (2026-10-31, pipeline-engineer): optional narration one-liner for this entry (Gemini TTS via the builder); spoken at the entry's reveal
  narration_text: z.string().min(1).max(160).nullable().optional(),
  caption_center_y_px: z.number().min(560).max(1420).nullable().optional(),   // per-entry caption centre (canvas px) when the subject sits where the default band is (2026-10-31 fzcu v4)
  // optional framing override for the cut list: blur (fit in the footage box below the title band, default for landscape) | cover (full bleed, default for portrait)
  fill: z.enum(['blur', 'cover']).nullable().optional(),
  mute_source: z.boolean().nullable().optional(),   // default: muted when the source's rights conditions say mute/strip, else plan.source_audio
  // per-entry framing (2026-10-31, showrunner-viral-rankings pilot): source-pixel trim (crop away a baked-in bug), the canvas box the cropped picture
  // is fitted into (default VR.footage), and an optional slow punch-in (seconds relative to the entry start, scale ratio vs the fitted size, bottom edge kept)
  framing: z.object({
    trim: z.object({ top: z.number().int().nonnegative().optional(), bottom: z.number().int().nonnegative().optional(),
      left: z.number().int().nonnegative().optional(), right: z.number().int().nonnegative().optional() }).nullable().optional(),
    fit_box: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable().optional(),
    punch: z.object({ from_s: z.number().nonnegative(), to_s: z.number().positive(), scale_to: z.number().min(1).max(1.5),
      clip: z.boolean().optional() }).nullable().optional(),   // clip (default true since 2026-10-31): zoom stays inside the fit_box; false = legacy grow-upward keyframes
    // hardening (2026-10-31, pipeline-engineer): centre-crop the source so the picture fills the fit_box (no blur bars). The converter computes the
    // trim from the source size (on top of any manual trim); refused when it would cut more than 25 % of the width or height. Recommended with title_layout "compact".
    fill_box: z.boolean().nullable().optional(),
    // follow-crop (2026-10-31, ohdc): animated crop window that tracks the subject. `zoom` = window width as a fraction of the (trimmed) frame width (0.4-1),
    // window aspect = the fit_box aspect; `keys` = [seconds from the entry start, cx, cy] with cx/cy = window centre as a fraction of the frame; linear between keys, window kept inside the frame.
    follow: z.object({ zoom: z.number().min(0.4).max(1).optional(), aspect: z.number().min(0.5).max(1.6).optional(),
      keys: z.array(z.tuple([z.number().nonnegative(), z.number().min(0).max(1), z.number().min(0).max(1)])).min(1) }).nullable().optional(),
    // zoom guard (2026-11-08): follow.zoom < 0.75 needs a reason (ranking:cutlist refuses without it); a subject whole in frame beats a subject large in frame
    zoom_ok_reason: z.string().nullable().optional(), zoom_note: z.string().nullable().optional(),
  }).nullable().optional(),
  // overlay clearance (2026-11-08): explicit plate position, canvas px top-left (wins over the measured placement); caption_center_y_px above pins the caption
  plate_xy: z.tuple([z.number(), z.number()]).nullable().optional(), caption_pin_note: z.string().nullable().optional(),
  // per-clip exposure lift (2026-10-31, pipeline-engineer): ffmpeg eq on this entry's window (-> segment.lift). gamma 1.0-2.0 lifts mid-tones
  // (dark kittens: 1.25-1.4), brightness -0.2..0.3 (small steps: 0.03-0.08), contrast 0.7-1.5 (1.05-1.1 restores punch after a gamma lift)
  grade: z.object({ brightness: z.number().min(-0.2).max(0.3).optional(), contrast: z.number().min(0.7).max(1.5).optional(),
    gamma: z.number().min(0.7).max(2).optional() }).nullable().optional(),
  // on-screen per-clip credit (2026-10-31; default: derived from the source's attribution/creator/platform, shortened to one line)
  credit: z.string().min(1).max(80).nullable().optional(),
  // natural single-frame lightning/flash spikes in the source (2026-10-31, qjyv): 2-frame blend so the flash stays visible but is no longer a one-frame spike (techqa no_flash_frames)
  flash_soften: z.boolean().nullable().optional(),
  deflash: z.boolean().nullable().optional(),   // replace single/double-frame camera-flash spikes by the previous frame (freezeframes; no ghosting, unlike flash_soften)
  // playback rate for an honest timelapse speed-up (2026-10-31, oerp): 1-3; window in_ms/out_ms stay SOURCE time (rights), on-screen length = window / speed
  speed: z.number().min(0.25).max(3).nullable().optional(),   // < 1 = slow-mo (2026-11-02, PACING)
  // extra shots of the SAME rank (2026-11-02, PACING: build-up + key moment + slow-mo replay). Each is a window inside the entry window (source ms), optional speed 0.25-3 and framing.
  extra_shots: z.array(z.object({ in_ms: z.number().int().nonnegative(), out_ms: z.number().int().positive(), speed: z.number().min(0.25).max(3).optional(),
    framing: z.any().optional() })).nullable().optional(),
  // payoff override (absolute source ms, inside the window): drives the #1 emphasis (punch + white flash + sting + bed dip); default = the moment's payoff_ms
  payoff_ms: z.number().int().nonnegative().nullable().optional(),
});
export type RankingEntry = z.infer<typeof RankingEntry>;

/**
 * A ranking production plan (docs/brands/viral-rankings/RANKING-ENGINE.md). It is NOT the builder cut list:
 * a later step turns it into productions/<id>/cutlist.json. Structural checks live here; DB checks
 * (moment bounds, overlaps, rights gate) in packages/ranking/src/plan.ts.
 */
export const RankingPlan = z.object({
  schema: z.literal('ranking-plan/1').default('ranking-plan/1'),
  brand_id: z.string(),
  production_id: z.string().nullable().optional(),
  idea_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  format: z.enum(['top3', 'top5']),
  ranking_criterion: z.string().min(5),
  criterion_kind: z.enum(['editorial', 'measured']).default('editorial'),  // editorial = subjective, presented as opinion
  reveal_order: z.array(z.number().int().positive()),  // rank_position shown at each reveal_index
  entries: z.array(RankingEntry),
  title: z.string().nullable().optional(),
  // spans (build step, optional): explicit per-word colours, e.g. [{text:"TOP 3",color:"primary"},{text:"CAT",color:"connector"},{text:"FAILS",color:"secondary"}];
  // color = primary | secondary | connector | #RRGGBB. Without spans the converter colours the longest word primary and the last word secondary.
  title_styles: z.object({ primary: z.string(), secondary: z.string(), connector: z.string().default('white'),
    spans: z.array(z.object({ text: z.string().min(1), color: z.string() })).nullable().optional() }).nullable().default(null),
  // logo_asset = local PNG path (default brand watermark); brand_text = fallback text mark when no logo file exists
  branding: z.object({ logo_asset_id: z.string().nullable().optional(), logo_asset: z.string().nullable().optional(), brand_text: z.string().nullable().optional() }).nullable().optional(),
  cta_variant: z.string().default('none'),          // none | mid_sub (≤ 0.8 s subscribe pill, experiment)
  cta_at_ms: z.number().int().nonnegative().nullable().optional(),   // mid_sub: timeline ms (default: first safe slot in reveal 2)
  cta_text: z.string().max(24).nullable().optional(),
  rank_flash: z.boolean().default(false),           // big #N flash (0.5 s) at each reveal after the first (frame 0 stays clean action + title)
  // lines (2026-10-31): explicit locked script lines with their timeline start (ms); when present they replace hook + per-entry narration_text
  narration: z.object({ voice: z.string().optional(), style: z.string().optional(), hook: z.string().max(160).nullable().optional(), max_pause: z.number().min(0.1).max(2).nullable().optional(),
    lines: z.array(z.object({ id: z.string().min(1), text: z.string().min(1).max(160), at_ms: z.number().int().nonnegative() })).nullable().optional() }).nullable().optional(),
  // build extras (2026-10-31): caption emphasis colours (WORD -> #RRGGBB), bed dips (-dB windows on the tone bed), persistent small credit line
  caption_emphasis: z.record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/)).nullable().optional(),
  bed_dips: z.array(z.object({ at_ms: z.number().int().nonnegative(), dur_ms: z.number().int().positive(), db: z.number().min(-24).max(0) })).nullable().optional(),
  credit_text: z.string().max(160).nullable().optional(),
  caption_center_y_px: z.number().min(1000).max(1420).nullable().optional(),   // caption band centre (canvas px, default VR.caption centre); lets a credit line sit under it
  // credit plate centre (canvas px). Was capped at 1430. Now ≤ 1520 (2026-10-31): ≤ 1460 is clear of Shorts/Reels/TikTok bottom UI on current
  // layouts (channel/description row starts ≈ 1500); 1461-1520 is allowed (jcx9 approved at 1515) but the validator warns — QA must check the plate
  // is not under the channel row. See docs/cutlist.md (viral-rankings post-edit fields).
  credit_center_y_px: z.number().min(1000).max(1520).nullable().optional(),
  // post-edit fields (2026-10-31, pipeline-engineer): what showrunners used to hand-edit in cutlist.json after ranking:cutlist; the converter maps them so a re-run reproduces the build
  // subscribe/like badge (owner 2026-11-01): mid-video time = narrator's spoken ask; sub_badge false turns it off, {x1,y0} moves it
  spoken_cta_at_ms: z.number().min(0).nullable().optional(),
  spoken_cta: z.object({ at_s: z.number().min(0) }).passthrough().nullable().optional(),
  sub_badge: z.union([z.literal(false), z.object({ x1: z.number().nullable().optional(), y0: z.number().nullable().optional(), pin: z.boolean().optional() })]).nullable().optional(),
  end_hold_ms: z.number().int().min(0).max(3500).nullable().optional(),             // freeze the last frame (+ room tone) after the last word -> cutlist.end_hold (s)
  credit_style: z.object({ font_px: z.number().int().min(18).max(40).nullable().optional(), max_chars: z.number().int().min(24).max(80).nullable().optional() }).nullable().optional(),   // credit plate (default 28 px / 48 chars)
  caption_max_chars: z.number().int().min(8).max(32).nullable().optional(),        // caption page width in chars (default 20)
  caption_min_page: z.number().min(0.3).max(2).nullable().optional(),                // merge caption pages shorter than this (s) into a neighbour (never across a >0.4 s gap)
  caption_clip: z.array(z.object({ at: z.number(), max: z.number().optional(), t0: z.number().optional(), t1: z.number().optional(), text: z.string().optional() })).nullable().optional(),   // retime a caption page (cutlist caption_clip)
  caption_font_px: z.number().int().min(40).max(90).nullable().optional(),          // caption size in output px (default 64)
  credits: z.array(z.string().min(1).max(400)).nullable().optional(),                // replaces the auto credits (source file names) with clean titles; must stay truthful
  // title band layout (2026-10-31): standard = 3-line band y 270-585 (footage box y 590-1210); compact = one-line band y 262-402 so footage can
  // use y 410-1370 (960 px = 50 % of the frame). Default standard; existing plans unchanged.
  // tall (2026-10-31, QA F13): band y 262-372, footage y 380-1600 (64 %), captions/credit/CTA stay in the safe box over the footage.
  title_layout: z.enum(['standard', 'compact', 'tall', 'full']).nullable().optional(),
  // style v2 (owner 2026-11-04, default): two-line title split at the accent words, compact rail with slide-in reveals, glass caption pill (packages/ranking/src/layout.ts VR_V2); "v1" = the old one-line look
  style: z.enum(['v1', 'v2']).nullable().optional(),
  rail_label_at_ms: z.array(z.number().int().nonnegative().nullable()).nullable().optional(),   // per reveal: timeline ms at which the active rail card shows its label (default: at the reveal)
  rail_off_at_ms: z.number().int().nonnegative().nullable().optional(),   // timeline ms at which the last rank's rail card is replaced by the empty rail (loop echo / hold must not carry the #1 label)
  // F9 end CTA (2026-10-31): on-screen text for the last dur_ms (default 2200), always placed in the caption band (never over the subject); replaces post-cutlist.py CTA texts
  end_cta: z.object({ text: z.string().min(1).max(40), dur_ms: z.number().int().min(1500).max(3000).nullable().optional() }).nullable().optional(),   // max 3000 (2026-10-31, ohdc v17: retention asks a full 3 s CTA)
  // build defaults (2026-10-31, docs/brands/viral-rankings/RANKING-ENGINE.md §6): all on unless set false here; tail_max_ms null = no tail trim
  build_defaults: z.object({ overlay_clearance: z.boolean().optional(), caption_zero: z.boolean().optional(), rail_empty: z.boolean().optional(), open_punch: z.boolean().optional(),
    one_hit: z.boolean().optional(), clip_credits: z.boolean().optional(), cta_band: z.boolean().optional(),
    tail_max_ms: z.number().int().min(150).max(1000).nullable().optional() }).nullable().optional(),
  source_audio: z.boolean().default(false),         // keep source audio where rights allow (default muted: narration-led format)
  bed: z.enum(['tone', 'none']).default('tone'),
}).superRefine((p, ctx) => {
  const n = RANKING_FORMATS[p.format];
  const err = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: 'custom', message, path });
  const seq = (from: number) => Array.from({ length: n }, (_, i) => i + from).join();
  if (p.entries.length !== n) err(`${p.format} needs exactly ${n} entries, got ${p.entries.length}`, ['entries']);
  if (p.reveal_order.length !== n) err(`reveal_order must list ${n} ranks, got ${p.reveal_order.length}`, ['reveal_order']);
  if (p.entries.map(e => e.rank_position).sort((a, b) => a - b).join() !== seq(1)) err(`rank_position must be exactly 1..${n} once each, got [${p.entries.map(e => e.rank_position)}]`, ['entries']);
  if (p.entries.map(e => e.reveal_index).sort((a, b) => a - b).join() !== seq(0)) err(`reveal_index must be exactly 0..${n - 1} once each, got [${p.entries.map(e => e.reveal_index)}]`, ['entries']);
  if ([...p.reveal_order].sort((a, b) => a - b).join() !== seq(1)) err(`reveal_order must be a permutation of 1..${n}, got [${p.reveal_order}]`, ['reveal_order']);
  for (const e of p.entries) {
    if (p.reveal_order[e.reveal_index] !== e.rank_position) err(`entry #${e.rank_position} has reveal_index ${e.reveal_index} but reveal_order[${e.reveal_index}] = ${p.reveal_order[e.reveal_index]}`, ['reveal_order']);
    if (e.out_ms <= e.in_ms) err(`entry #${e.rank_position}: out_ms must be after in_ms`, ['entries']);
    else if (e.out_ms - e.in_ms < 800) err(`entry #${e.rank_position}: window shorter than 0.8 s (builder minimum)`, ['entries']);
  }
  const ids = p.entries.map(e => e.moment_id);
  if (new Set(ids).size !== ids.length) err('the same moment appears twice', ['entries']);
});
export type RankingPlan = z.infer<typeof RankingPlan>;
