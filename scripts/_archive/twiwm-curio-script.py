"""Write script.json for comp-261102-9qi0. python scripts/_archive/twiwm-curio-script.py"""
import json
P = 'comp-261102-9qi0'
cut = json.load(open(f'productions/{P}/cutlist.json', encoding='utf8'))
U = lambda i: f'https://images.nasa.gov/details/{i}'
ids = ['PIA11428','PIA11429','PIA11427','PIA13236','PIA13237','PIA13384','PIA14256','PIA14308','PIA11808','PIA15087','PIA15021']
ev = {
 'hook': [U('PIA11428') + " ('hardware for controlling the final lowering of NASA Mars Science Laboratory rover to the surface of Mars from the spacecraft hovering, rocket-powered descent stage')"],
 'shape': [U('PIA11429') + " ('taken in August 2008 in a clean room at NASA JPL ... NASA next Mars rover, the Mars Science Laboratory, in the course of its assembly')"],
 'wheels': [U('PIA11427') + " ('Each of the six wheels ... is about half a meter 20 inches in diameter')", U('PIA13237') + " ('six new wheels ... installed on June 28 and 29 in the Spacecraft Assembly Facility at NASA JPL')"],
 'drive': [U('PIA13384') + " ('rolling over a ramp in this Sept. 10, 2010, test drive inside the Spacecraft Assembly Facility')", U('PIA14256') + " ('taken during mobility testing on June 3, 2011')"],
 'descent': [U('PIA14308') + " ('Spacecraft specialists test the descent stage and rover of the Mars Science Laboratory')"],
 'crane': [U('PIA11428') + " (lowering from the hovering, rocket-powered descent stage)", U('PIA11808') + " ('rover is attached to the spacecraft descent stage')"],
 'ship': [U('PIA15087') + " ('shortly before the spacecraft was readied for shipment to Kennedy Space Center for launch')", U('PIA15021') + " ('prepared for final integration into the complete NASA spacecraft ... inside the Payload Hazardous Servicing Facility at NASA Kennedy Space Center')"],
 'payoff': [U('PIA11428') + " (rocket-powered descent stage lowers the rover); " + U('PIA15087') + " (Curiosity name and powered descent vehicle)"],
}
narr = [{'id': l['id'], 'text': l['text'], 'words': len(l['text'].split()), 'slot_s': 0, 'sources': ev[l['id']]} for l in cut['narration']['lines']]
claims = [
 {'claim': 'Images: NASA/JPL-Caltech (credit chip)', 'evidence': 'Rights record attribution for each image: by NASA/JPL-Caltech (NASA media usage guidelines (generally not copyrighted)); secondary_creator NASA/JPL-Caltech on images.nasa.gov'},
 {'claim': 'Hardest part to build? Comment (CTA question, no factual claim)', 'evidence': 'Call to action C03 from docs/brands/compilations/goal-26.md; asks for opinions, asserts nothing'},
 {'claim': 'LOWERED BY A ROCKET CRANE (hook text) / lowered from a hovering rocket', 'evidence': U('PIA11428') + ": hardware for the final lowering of the rover to the surface from the hovering, rocket-powered descent stage (NASA's 'sky crane' lowering system)"},
 {'claim': 'JPL CLEAN ROOM - AUG 2008', 'evidence': U('PIA11429') + ': taken in August 2008 in a clean room at NASA JPL'},
 {'claim': 'Six wheels, each about twenty inches wide', 'evidence': U('PIA11427') + ': each of the six wheels is about half a meter (20 inches) in diameter'},
 {'claim': 'WHEELS ON - JUNE 2010', 'evidence': U('PIA13237') + ': wheels installed June 28 and 29 (2010) at NASA JPL'},
 {'claim': 'TEST DRIVE - SEPT 2010 / a test ramp in 2010', 'evidence': U('PIA13384') + ': Sept. 10, 2010 test drive, suspension rolling over a ramp'},
 {'claim': 'mobility tests in 2011', 'evidence': U('PIA14256') + ': mobility testing on June 3, 2011'},
 {'claim': 'DESCENT STAGE TEST / tested the descent stage and rover as one', 'evidence': U('PIA14308') + ': specialists test the descent stage and rover of the Mars Science Laboratory'},
 {'claim': 'The rocket stage hovers and lowers the rover to the surface', 'evidence': U('PIA11428') + ': lowering from the hovering, rocket-powered descent stage'},
 {'claim': 'SHIPPED TO KENNEDY / shipped to Kennedy to be readied for launch', 'evidence': U('PIA15087') + ': readied for shipment to Kennedy Space Center for launch; ' + U('PIA15021') + ': final integration at KSC Payload Hazardous Servicing Facility'},
 {'claim': 'Curiosity (rover name)', 'evidence': U('PIA15087') + ' and ' + U('PIA15021') + ': NASA JPL captions name the rover Curiosity'},
]
script = {
 'production_id': P, 'language': 'en', 'hook_text': 'LOWERED BY A ROCKET CRANE',
 'open_loop': "Hook asks how a rover is set down on Mars (a rocket crane); payoff 'built to be set down by a rocket crane' returns to the lowering hardware shown at frame 0.",
 'on_screen': [{'t': t['at'], 'text': t['text']} for t in cut['texts']],
 'title': 'Curiosity Rover: Built to Be Lowered by a Rocket Crane',
 'description': "Hardest part to build? Comment.\n\nHow do you land a rover on Mars? NASA's Curiosity (the Mars Science Laboratory) was built at the Jet Propulsion Laboratory in Pasadena: wheels installed in June 2010, test drives over a ramp, descent-stage tests, then shipment to Kennedy Space Center for launch. Its rocket-powered descent stage was designed to lower the rover to the surface. NASA/JPL photos, 2008-2011.\n\nImages: NASA/JPL-Caltech (" + ', '.join(ids) + '). Each record: images.nasa.gov/details/ followed by the image id. NASA does not endorse this video.',
 'hashtags': ['#Curiosity', '#NASA', '#JPL', '#Mars', '#TheWayItWasMade'],
 'attribution_block': 'Images courtesy of NASA/JPL-Caltech. ' + ' | '.join(f'{i} ({U(i)})' for i in ids) + '. NASA does not endorse this video.',
 'cta': {'id': 'C03', 'family': 'comment-opinion', 'placement': 'E', 'text': 'Hardest part to build? Comment', 'at': 36.4},
 'narration': narr, 'claims': claims,
 'credits': cut['credits'], 'target_duration': cut['target_duration'],
 'rights_windows': {},
}
json.dump(script, open(f'productions/{P}/script.json', 'w', encoding='utf8'), indent=2, ensure_ascii=False)
json.dump({'ruleset': 'twiwm-cta-v1', 'production_id': P, 'duration_s': 39.4, 'shots': len(cut['segments']), 'hook': 'LOWERED BY A ROCKET CRANE', 'cta': script['cta'], 'loop': 'payoff + last shot return to the frame-0 lowering hardware', 'results': None}, open(f'productions/{P}/enhancements.json', 'w', encoding='utf8'), indent=2)
