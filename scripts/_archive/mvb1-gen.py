import json, os
ASSET = 'src-261021-o7kw'
URL = 'https://images.nasa.gov/details/art002m1501061829_Artemis_II_Crew_Discusses_Historic_Moon_Mission_at_Post-Flight_News_Conference_250416'
ATTR = ('Footage: NASA. NASA media, generally not subject to U.S. copyright; used under NASA media usage guidelines; NASA does not endorse this video. '
        'Source: Artemis II post-flight news conference, April 16, 2026, NASA Johnson Space Center — ' + URL)
NAME_W = 'Reid Wiseman · Artemis II commander · days after splashdown'

clips = {
 'clip-261024-l4sr': dict(
  cta=('F2-1', 'follow_series', 'Next story drops in a few hours. Follow'),
  segs=[(1446.78, 1454.4, 'push'), (1457.30, 1465.55, 'pull'), (1498.5, 1521.27, 'push')],
  clean=False, hook='Five seconds of free fall on re-entry', ctx='Asked what his body felt coming home',
  name='Victor Glover · Artemis II pilot · days after splashdown',
  emphasis=['INTENSE', 'DROGUES', 'FREE', 'SKYSCRAPER', 'GLORY'],
  fixes=[dict(asset_id=ASSET, at=1463.57, **{'from': 'shoots', 'to': 'chutes'}),
         dict(asset_id=ASSET, at=1507.19, **{'from': 'it', 'to': ''}),
         dict(asset_id=ASSET, at=1518.47, **{'from': 'the', 'to': ''}),
         dict(asset_id=ASSET, at=1519.99, **{'from': 'it', 'to': ''}),
         dict(asset_id=ASSET, at=1520.09, **{'from': 'was', 'to': ''}),
         dict(asset_id=ASSET, at=1518.83, **{'from': 'pilots', 'to': 'pilot chutes'}),
         dict(asset_id=ASSET, at=1519.17, **{'from': 'in', 'to': 'and'})],
  title='Artemis II pilot: re-entry felt like diving off a skyscraper',
  desc_body=('Victor Glover, pilot of NASA\'s Artemis II, days after the crew splashed down. A reporter asked what his body told him as Orion came back from deeper in space than humans had ever been. '
             'Glover describes the 13 minutes and 36 seconds of entry, the moment the drogue parachutes released and the pilot chutes and mains came out, and the free fall in between: '
             '"if you dove off a skyscraper backwards, that\'s what it felt like for five seconds." Two cuts inside one answer (he compares with his Dragon flight in the gap; the clip skips that comparison).'),
  hashtags=['#ArtemisII', '#NASA', '#Orion', '#Astronaut', '#Space', '#VictorGlover'],
  ask='Next story drops in a few hours. Follow for more.',
  q='Fox 26 (McKenna Earnhardt): what did your body feel when the ocean came back into view?'),
 'clip-261024-8np0': dict(
  cta=('F4-1', 'comment_opinion', 'What surprised you most? Comment'),
  segs=[(1105.35, 1123.4, 'push'), (1123.4, 1133.3, 'pull'), (1133.3, 1146.43, 'push')],
  hook='A fire alarm 80,000 miles from home', ctx='Asked if anything worried the crew on safety',
  name=NAME_W, emphasis=['FIRE', 'TENSE', 'FAST', 'HANDS', 'DECISION'],
  fixes=[dict(asset_id=ASSET, at=1105.17, **{'from': 'then', 'to': ''}),
         dict(asset_id=ASSET, at=1109.93, **{'from': 'always', 'to': ''}),
         dict(asset_id=ASSET, at=1120.85, **{'from': '80', 'to': '80,000'}),
         dict(asset_id=ASSET, at=1121.13, **{'from': ',000', 'to': ''})],
  title='Artemis II commander: a fire alarm 80,000 miles from home',
  desc_body=('Reid Wiseman, commander of NASA\'s Artemis II, days after the crew returned. Asked whether any moment felt unsafe, he describes the smoke detector that went off on the next-to-last day, '
             'about 80,000 miles from home: "It wasn\'t scary, but it was tense," and the rule the crew drilled before launch, "no fast hands." '
             'Continuous take, trimmed at pauses only.'),
  hashtags=['#ArtemisII', '#NASA', '#Orion', '#Astronaut', '#Space', '#ReidWiseman'],
  ask='What surprised you most? Tell us in the comments.',
  q='Lauren Grush (Bloomberg): were there moments you felt concerned about safety?'),
 'clip-261024-og7k': dict(
  cta=('F6-1', 'share_save', 'Send this to someone who loves space'),
  segs=[(2843.05, 2857.6, 'push', 8), (2857.6, 2876.1, 'pull', 4), (2876.1, 2888.25, 'push', 0)],
  hook="He says they'd have landed on the Moon", ctx='Asked how realistic a Moon base feels',
  name=NAME_W, emphasis=['LANDER', 'APOLLO', 'LEAP', 'DOABLE', 'SOON'], fixes=[],
  title='Artemis II commander: "If you gave us the keys to the lander, we would have landed"',
  desc_body=('Reid Wiseman, commander of NASA\'s Artemis II, days after the crew flew around the Moon. Asked how realistic a lunar base is, he shares a "technical epiphany": '
             'had a lander been on board, at least three of his crewmates would have tried to land, as the Apollo 8, 9 and 10 crews knew. "It is not the leap I thought it was." '
             'Continuous take, trimmed at pauses only.'),
  hashtags=['#ArtemisII', '#NASA', '#Moon', '#Apollo', '#Astronaut', '#ReidWiseman'],
  ask='Send this to someone who loves space.',
  q='Eric Berger (Ars Technica): how realistic is a Moon base after flying Artemis II?'),
 'clip-261024-pw58': dict(
  cta=('F1-2', 'subscribe', 'Hit subscribe. More voices from orbit'),
  segs=[(926.09, 945.8, 'push'), (945.8, 963.1, 'pull'), (963.1, 971.62, 'push')],
  hook='She woke up thinking she was floating', ctx='Asked about sleep and dreams since splashdown',
  name='Christina Koch · Artemis II mission specialist · days after splashdown',
  emphasis=['FLOATING', '328', 'SURPRISED', 'BEST'], fixes=[],
  title='Artemis II astronaut: "I truly thought I was floating"',
  desc_body=('Christina Koch, mission specialist on NASA\'s Artemis II, days after splashdown. Asked about sleep and dreams, she says that after 328 days in space on her previous mission she never expected something to float in front of her, '
             'but on this return she woke thinking she was floating, and "space sleep is the best sleep ever." One continuous answer, trimmed at pauses only.'),
  hashtags=['#ArtemisII', '#NASA', '#ChristinaKoch', '#Astronaut', '#Space', '#Orion'],
  ask='Hit subscribe. More voices from orbit.',
  q='Nell Greenfield (NPR): have you been sleeping, any dreams of the Moon?'),
}

for pid, c in clips.items():
    segs = []
    t = 0.0
    prev_out = None
    for sg in c['segs']:
        a, b, mo = sg[:3]; px = sg[3] if len(sg) > 3 else -6
        segs.append(dict(asset_id=ASSET, src_in=a, src_out=b, motion=mo, fill='cover', zoom=c.get('zoom', 1.12), pan_x=px, pan_y=6,
                         mute_source=False, volume=1.0, why='single close-up; split in pauses for push/pull; speech untouched'))
        t += b - a
    total = round(t, 3)
    cta_at = round(total - 3.0, 3)
    texts = [dict(text=c['hook'], at=0.0, dur=3.0, role='hook', y=-31),
             dict(text=c['ctx'], at=3.0, dur=4.0, role='lower_third', y=-32),
             dict(text=c['name'], at=7.0, dur=3.6, role='lower_third', y=-32),
             dict(text='Footage: NASA', at=10.6, dur=round(cta_at - 10.6, 3), role='credit', x=30),
             dict(text=c['cta'][2], at=cta_at, dur=3.0, role='cta')]
    cut = dict(production_id=pid, width=1080, height=1920, fps=30, segments=segs, texts=texts, narration=None,
               captions='source', music=None, credits=[ATTR], target_duration=total, caption_clean=c.get('clean', True),
               caption_onset_snap=True, emphasis=c['emphasis'])
    if c['fixes']:
        cut['caption_fixes'] = c['fixes']
    d = os.path.join('E:/clips-viral/productions', pid)
    os.makedirs(d, exist_ok=True)
    def dump(name, obj):
        with open(os.path.join(d, name), 'w', encoding='utf-8') as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
    dump('cutlist.json', cut)
    cid, fam, ctext = c['cta']
    desc = (c['ask'] + '\n\n' + c['desc_body'] + '\n\nSource: NASA, "Artemis II Crew Discusses Historic Moon Mission at Post-Flight News Conference", April 16, 2026, Johnson Space Center. '
            'Captions lightly cleaned of filler words; audio untouched. ' + ATTR)
    script = dict(production_id=pid, hook_text=c['hook'], narration=[],
                  on_screen=[dict(t=x['at'], text=x['text']) for x in texts],
                  title=c['title'], description=desc, hashtags=c['hashtags'], attribution_block=ATTR, synthetic_media=False,
                  cta=dict(id=cid, family=fam, text=ctext),
                  notes='Original speech only; no narration, no TTS. Context card paraphrases the reporter question: ' + c['q'] + ' Window not used by vx23 (686-735 s).')
    dump('script.json', script)
    dump('brief.json', dict(production_id=pid, candidate_id='cand-mv-' + pid[-4:], segments=[dict(asset_id=ASSET, start=c['segs'][0][0], end=c['segs'][-1][1],
         keep_ranges=[[x[0], x[1]] for x in c['segs']], boundary_notes='Boundaries snapped to measured silences (20 ms RMS); whisper word starts before pauses are early.')],
         duration=total, hook_text=c['hook'], context_card=c['ctx'], context_check=c['q'] + ' Speaker answers within the kept range; no qualifier removed.',
         cta=dict(id=cid, family=fam, text=ctext), arabic_variant=None))
    print(pid, total, cta_at)
