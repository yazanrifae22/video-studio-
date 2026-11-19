p = r"E:\clips-viral\packages\orchestrator\src\cli.ts"
s = open(p, encoding="utf8").read()
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
rep(""" * ranking:reveal --n 3|5""", """ * ranking:cutlist <plan.json> [--out productions/<id>/cutlist.json]   RankingPlan → builder cut list in reveal order (re-runs the per-moment rights gate; refuses non-publishable)
 * ranking:zones <production>                    burned-in text heuristic under the rail/caption/title zones for the current cutlist (warn-only; build runs it too)
 * ranking:reveal --n 3|5""")
rep("""  async 'ranking:reveal'() {""", """  async 'ranking:cutlist'() {
    const { planToCutlist } = await import('../../ranking/src/cutlist.ts');
    const planPath = pos(0);
    if (!planPath) throw new Error('usage: ranking:cutlist <plan.json> [--out <cutlist.json>]');
    const { cutlist, warnings } = planToCutlist(readJson(planPath), { planPath });
    const outFile = flag('out') ?? path.join(P.productions, cutlist.production_id, 'cutlist.json');
    fs.writeFileSync(outFile, JSON.stringify(cutlist, null, 1), 'utf8');
    emit({ kind: 'ranking.cutlist', productionId: cutlist.production_id, agent: flag('agent'), message: `cut list written from plan (${cutlist.ranking.reveal_order.join('->')}, ${cutlist.segments.length} segments, rights gate passed per moment)` });
    out({ out: outFile, segments: cutlist.segments.map((s: any) => `#${s.item} ${s.asset_id} ${s.src_in}-${s.src_out}s ${s.fill}${s.mute_source ? ' muted' : ''}`), narration_lines: cutlist.narration?.lines.length ?? 0, cta: cutlist.rank_layers.cta, warnings });
  },
  async 'ranking:zones'() {
    const { zoneCheck } = await import('../../ranking/src/layers.ts');
    const id = pos(0);
    const cl = readJson(path.join(P.productions, id, 'cutlist.json'));
    const src: Record<string, any> = {};
    for (const s of cl.segments) { const r = db().prepare(`SELECT analysis FROM sources WHERE asset_id=?`).get(s.asset_id) as any; src[s.asset_id] = { a: J.parse(r?.analysis, {}) }; }
    let f = 0;
    const segs = cl.segments.map((s: any) => { const d = Math.round((s.src_out - s.src_in) * 30); const g = { ...s, startF: f, durF: d }; f += d; return g; });
    out(await zoneCheck(segs, src, path.join(P.productions, id, 'zone_check.json')));
  },
  async 'ranking:reveal'() {""")
open(p, "w", encoding="utf8", newline="").write(s)
print("ok")
