"""Generate cutlist.json + script.json for the Curiosity TWIWM video. python scripts/_archive/twiwm-curio-gen.py"""
import json
P = 'comp-261102-9qi0'
A = {'PIA11428':'x55m','PIA11429':'w1ou','PIA11427':'bxls','PIA13236':'tr2r','PIA13237':'7usr','PIA13384':'qeec','PIA14256':'f5ww','PIA14308':'tk5w','PIA11808':'wurz','PIA15087':'f3kf','PIA15021':'g1hq'}
def seg(pia, a, b, item, why, zoom=1.0, motion='push', px=None, py=None):
    d = {'asset_id': 'src-261102-' + A[pia], 'src_in': a, 'src_out': b, 'fill': 'blur', 'zoom': zoom, 'mute_source': True, 'item': item, 'why': why, 'motion': motion}
    if px is not None: d['pan_x'] = px
    if py is not None: d['pan_y'] = py
    return d
segs = [
 seg('PIA11428', 0, 2.8, 1, 'frame 0: the lowering hardware, punched in', 1.9, 'push'),
 seg('PIA11808', 0, 2.6, 1, 'rover attached to descent stage (Feb 2009)', 1.0, 'push'),
 seg('PIA11429', 0, 2.0, 2, 'rover taking shape, JPL clean room, Aug 2008', 1.0, 'pull'),
 seg('PIA11429', 2.0, 4.0, 2, 'closer on the rover', 1.4, 'push', 2, -2),
 seg('PIA11429', 4.0, 6.05, 2, 'punch in on the chassis and wheels', 1.8, 'push', 6, -4),
 seg('PIA11427', 0, 1.9, 3, 'one wheel, about 20 in across', 1.0, 'push'),
 seg('PIA13236', 1.9, 3.5, 3, 'three wheels lifted into place', 1.0, 'push'),
 seg('PIA13237', 3.5, 5.15, 3, 'wheels installed June 2010', 1.0, 'pull'),
 seg('PIA13384', 0, 1.5, 4, 'test drive over a ramp, Sept 2010', 1.0, 'push'),
 seg('PIA13384', 1.5, 2.9, 4, 'close on the wheels on the ramp', 1.5, 'push', 8, 4),
 seg('PIA14256', 2.9, 4.4, 4, 'wheel on ramp, mobility testing June 2011', 1.0, 'pull'),
 seg('PIA14256', 4.4, 5.8, 4, 'close on the wheel', 1.5, 'push', 6, 6),
 seg('PIA14308', 0, 1.8, 5, 'descent stage and rover tested together', 1.0, 'push'),
 seg('PIA14308', 1.8, 3.6, 5, 'punch in on the descent stage work', 1.6, 'push', 0, 0),
 seg('PIA11808', 2.4, 4.1, 6, 'descent stage + rover, punch in on the rover', 1.7, 'push', -6, 4),
 seg('PIA11428', 3.0, 4.7, 6, 'lowering hardware', 1.0, 'pull'),
 seg('PIA15087', 0, 1.4, 7, 'engineer says goodbye before shipment', 1.0, 'push'),
 seg('PIA15021', 0, 1.45, 7, 'closeout at Kennedy', 1.0, 'pull'),
 seg('PIA11428', 0, 2.1, 8, 'payoff: the lowering hardware, wide', 1.0, 'pull'),
 seg('PIA11428', 2.1, 4.2, 8, 'payoff: closer', 1.4, 'push'),
 seg('PIA11428', 4.2, 5.7, 8, 'closer again', 1.7, 'push'),
 seg('PIA11428', 5.7, 7.2, 8, 'loop: back to the frame-0 look under the CTA', 1.9, 'push'),
]
lines = [
 ('hook', 'How do you land a rover on Mars? Lower it from a hovering rocket.', 0.1),
 ('shape', "By August 2008, NASA's next Mars rover was taking shape in a JPL clean room.", 5.4),
 ('wheels', 'Six wheels, each about twenty inches wide, went on in June 2010.', 11.45),
 ('drive', 'Then it drove: a test ramp in 2010, and mobility tests in 2011.', 16.6),
 ('descent', 'Specialists tested the descent stage and rover as one.', 22.4),
 ('crane', 'The rocket stage hovers and lowers the rover to the surface.', 26.0),
 ('ship', 'Then it shipped to Kennedy to be readied for launch.', 29.4),
 ('payoff', 'Curiosity: built to be set down by a rocket crane.', 32.25),
]
texts = [
 {'text': 'LOWERED BY A ROCKET CRANE', 'at': 0, 'dur': 2.9, 'role': 'title'},
 {'text': 'JPL CLEAN ROOM · AUG 2008', 'at': 5.6, 'dur': 3.3, 'role': 'fact'},
 {'text': 'WHEELS ON · JUNE 2010', 'at': 11.65, 'dur': 3.4, 'role': 'fact'},
 {'text': 'TEST DRIVE · SEPT 2010', 'at': 16.8, 'dur': 3.0, 'role': 'fact'},
 {'text': 'DESCENT STAGE TEST', 'at': 22.6, 'dur': 2.8, 'role': 'fact'},
 {'text': 'Images: NASA/JPL-Caltech', 'at': 26.2, 'dur': 2.0, 'role': 'credit'},
 {'text': 'SHIPPED TO KENNEDY', 'at': 29.6, 'dur': 2.4, 'role': 'fact'},
 {'text': 'Hardest part to build? Comment', 'at': 36.4, 'dur': 3.0, 'role': 'cta'},
]
ids = list(A)
credits = ['NASA/JPL-Caltech (' + ', '.join(ids) + ') - https://images.nasa.gov/details/<id>', 'NASA does not endorse this video.']
cut = {'production_id': P, 'width': 1080, 'height': 1920, 'fps': 30, 'segments': segs, 'texts': texts,
 'narration': {'voice': 'Charon', 'style': 'Warm documentary storyteller, curious and unhurried, specific; clear diction, no hype.', 'lines': [{'id': i, 'text': t, 'at': a} for i, t, a in lines]},
 'captions': 'narration', 'caption_bg': True, 'caption_min_page': 0.7, 'caption_clip': [{'at': 32.31, 't0': 32.31, 't1': 33.05}], 'music': None, 'bed': 'tone', 'credits': credits, 'target_duration': 39.4}
json.dump(cut, open(f'productions/{P}/cutlist.json', 'w', encoding='utf8'), indent=2, ensure_ascii=False)
