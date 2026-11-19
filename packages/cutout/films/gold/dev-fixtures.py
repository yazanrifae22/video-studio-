import json, os, glob, shutil
# Dev fixtures for the gold film: copies each real production's film.json (productions/expl-261119-i2xn|x0ki) into productions/_fixture-gold-en|ar WITH the strings.d keys merged,
# so `build _fixture-gold-en --draft` works before the orchestrator re-runs make-film-json. Re-run after the storyboard changes.  python packages/cutout/films/gold/dev-fixtures.py
R = r'E:\clips-viral'
sd = R + r'\docs\brands\karto\gold\strings.d'
for lang, pid in (('en', 'expl-261119-i2xn'), ('ar', 'expl-261119-x0ki')):
    f = json.load(open(f'{R}\\productions\\{pid}\\film.json', encoding='utf8'))
    for p in sorted(glob.glob(sd + '\\*.json')):
        for k, v in json.load(open(p, encoding='utf8')).items():
            f['strings'].setdefault(k, v[lang])
    d = f'{R}\\productions\\_fixture-gold-{lang}'
    os.makedirs(d, exist_ok=True)
    json.dump(f, open(d + '\\film.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(d, len(f['strings']))
