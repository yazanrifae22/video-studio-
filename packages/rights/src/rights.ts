import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { PUBLISHABLE_RIGHTS, RIGHTS } from '../../shared/src/schemas.ts';
import { policy } from '../../shared/src/secrets.ts';

export type RightsStatus = typeof RIGHTS[number];

export interface LicenseAssessment {
  /** What the automated classifier proposes. Never 'approved' on its own — a Rights Scout confirms. */
  proposed: RightsStatus;
  /** What we store immediately: permissive licenses stay 'pending' until verified; NC/ND/unknown are final-ish. */
  initial: RightsStatus;
  license: string | null;
  commercial: boolean | null;
  derivatives: boolean | null;
  conditions: string[];
  reasons: string[];
}

/**
 * Machine classification from license metadata. Deliberately conservative:
 * - NC (we intend to monetise) and ND (we always edit) → research_only.
 * - PD / CC0 / CC BY / CC BY-SA / stock licenses → pending, proposed approved(_with_conditions).
 * - Anything unknown → pending with no proposal.
 * Extra red flags (credited music, re-upload signals) add conditions the scout must clear.
 */
export function classifyLicense(input: { platform: string; license?: string | null; licenseUrl?: string | null; description?: string | null; creator?: string | null }): LicenseAssessment {
  const raw = `${input.license ?? ''} ${input.licenseUrl ?? ''}`.toLowerCase();
  const conditions: string[] = [];
  const reasons: string[] = [];
  let proposed: RightsStatus = 'pending', commercial: boolean | null = null, derivatives: boolean | null = null;
  let license = input.license ?? null;

  const nc = /(\bnc\b|-nc|noncommercial|non-commercial)/.test(raw);
  const nd = /(\bnd\b|-nd|noderiv|no deriv)/.test(raw);
  const sa = /(\bsa\b|-sa|sharealike|share-alike)/.test(raw);

  if (input.platform === 'pexels' || input.platform === 'pixabay') {
    proposed = 'approved_with_conditions'; commercial = true; derivatives = true;
    license ??= input.platform === 'pexels' ? 'Pexels License' : 'Pixabay Content License';
    conditions.push('No sale/redistribution of unaltered copies', 'Do not imply endorsement by identifiable people/brands', 'Credit source in description (courtesy)');
    reasons.push(`${input.platform} license permits free commercial use with modification`);
  } else if (nc || nd) {
    proposed = 'research_only'; commercial = !nc; derivatives = !nd;
    reasons.push(`${nc ? 'NonCommercial' : ''}${nc && nd ? ' + ' : ''}${nd ? 'NoDerivatives' : ''} license is incompatible with edited, monetised shorts`);
  } else if (/public ?domain|publicdomain|pdm|cc0|zero\/1\.0|no known copyright|us government|united states government|pd-usgov/.test(raw)) {
    proposed = 'approved'; commercial = true; derivatives = true;
    reasons.push('Public domain / CC0 per source metadata');
  } else if (/creative ?commons attribution|cc[- ]by|licenses\/by(-sa)?\//.test(raw)) {
    proposed = 'approved_with_conditions'; commercial = true; derivatives = true;
    conditions.push(`Attribution required: credit "${input.creator ?? 'the creator'}" + license link in description and on screen`);
    if (sa) conditions.push('ShareAlike: our edited video must itself be offered under CC BY-SA');
    reasons.push(`CC BY${sa ? '-SA' : ''} permits commercial reuse and modification with attribution`);
  } else if (input.platform === 'nasa') {
    proposed = 'approved_with_conditions'; commercial = true; derivatives = true; license ??= 'NASA media usage guidelines (generally not copyrighted)';
    conditions.push('No implied NASA endorsement; do not use NASA insignia as branding', 'Verify no third-party copyrighted elements');
    reasons.push('NASA-produced media is generally not subject to US copyright');
  } else {
    reasons.push(license ? `Unrecognised license "${license}"` : 'No license metadata — standard copyright assumed until proven otherwise');
    proposed = input.platform === 'youtube' && !license ? 'research_only' : 'pending';
  }

  // Red flags that downgrade an otherwise permissive item.
  const desc = (input.description ?? '').toLowerCase();
  if (/music[:\s]|soundtrack|courtesy of|universal music|audio network|apm music|getty|ap archive|reuters|©|copyright \d{4}/.test(desc) && PUBLISHABLE_RIGHTS.has(proposed)) {
    conditions.push('Description credits third-party material (music/footage) — strip source audio or exclude credited segments');
    reasons.push('Third-party credit found in description');
    proposed = 'approved_with_conditions';
  }
  if (input.platform === 'youtube' && PUBLISHABLE_RIGHTS.has(proposed)) {
    conditions.push('Confirm uploader is the original rights holder (CC tags are often applied to re-uploads)');
    if (!policy().allowYoutubeCcDownload) conditions.push('Acquisition blocked: YouTube ToS restricts third-party downloading — request the file from the creator or find a mirror on a download-permitting host');
  }

  const initial: RightsStatus = (proposed as RightsStatus) === 'research_only' || (proposed as RightsStatus) === 'rejected' ? proposed : 'pending';
  return { proposed, initial, license, commercial, derivatives, conditions, reasons };
}

/** The only way rights status changes. Every transition is logged with a reason and actor. */
export function setRights(assetId: string, to: RightsStatus, opts: { actor: string; reason: string; evidence?: string; conditions?: string[] }) {
  if (!RIGHTS.includes(to)) throw new Error(`invalid rights status ${to}`);
  const row = db().prepare(`SELECT permission_status, usage_restrictions FROM sources WHERE asset_id=?`).get(assetId) as any;
  if (!row) throw new Error(`source ${assetId} not found`);
  if (to === 'approved' || to === 'approved_with_conditions') {
    if (!opts.evidence) throw new Error('approval requires --evidence (license page URL, permission email reference, etc.)');
  }
  const restrictions = opts.conditions ? [...new Set([...J.parse<string[]>(row.usage_restrictions, []), ...opts.conditions])] : null;
  db().prepare(`UPDATE sources SET permission_status=?, permission_evidence=COALESCE(?, permission_evidence),
    usage_restrictions=COALESCE(?, usage_restrictions), updated_at=datetime('now') WHERE asset_id=?`)
    .run(to, opts.evidence ?? null, restrictions ? J.str(restrictions) : null, assetId);
  db().prepare(`INSERT INTO rights_log(asset_id, actor, from_status, to_status, reason, evidence) VALUES (?,?,?,?,?,?)`)
    .run(assetId, opts.actor, row.permission_status, to, opts.reason, opts.evidence ?? null);
  // Candidates inherit the asset's rights status.
  db().prepare(`UPDATE candidates SET rights_status=? WHERE asset_id=?`).run(to, assetId);
  emit({ kind: 'rights.changed', agent: opts.actor, level: PUBLISHABLE_RIGHTS.has(to) ? 'success' : to === 'rejected' ? 'warn' : 'info',
    message: `${assetId}: ${row.permission_status} → ${to} — ${opts.reason}`, data: { assetId, evidence: opts.evidence } });
}

/** Hard gate used before acquisition, editing, rendering and publishing. Throws listing every offending asset. */
export function assertPublishable(assetIds: string[]) {
  const bad: string[] = [];
  for (const id of assetIds) {
    const r = db().prepare(`SELECT permission_status, license_expires FROM sources WHERE asset_id=?`).get(id) as any;
    if (!r) bad.push(`${id} (unknown)`);
    else if (!PUBLISHABLE_RIGHTS.has(r.permission_status)) bad.push(`${id} (${r.permission_status})`);
    else if (r.license_expires && new Date(r.license_expires) < new Date()) bad.push(`${id} (license expired ${r.license_expires})`);
  }
  if (bad.length) throw new Error(`Rights gate: not publishable → ${bad.join(', ')}`);
}
