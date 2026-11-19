"""rank-261028-xkgv v6 fix round: patch cutlist.json + script.json (utf8)."""
import json
ID='rank-261028-xkgv'; P=f'productions/{ID}/'
cl=json.load(open(P+'cutlist.json',encoding='utf8'))
sg=cl['segments']
for s in sg:
    if s['asset_id']=='src-261028-brnj': s['src_out']=1.0; s['why']='hook: real GOES-12 X-ray flux 4 Nov 2003, flat top + X28 marker at frame 0 (= loop-end frame), pushes in 1.0->1.12 so 1 s differs; cut at 1.0 s'
    if s['asset_id']=='src-261028-was9': s['src_out']=2.0
    if s['asset_id']=='src-261028-7yyk': s['src_out']=5.0; s['why']='#1 card: X28 GOES plot first, estimate line rises, pulls out to the exact frame-0 plot (loop)'
cl['segments']=[s for s in sg if s['asset_id']!='src-261028-sijj']
T=cl['texts']; out=[]
for t in T:
    x=t['text']
    if x=='REAL X2.2 FLARE · SDO, 2014': continue
    if t['role']=='credit' and t['at']==20.0: continue
    if x=='GOES X-RAY DATA · 4 NOV 2003': t['at']=20.0; t['dur']=4.4
    if t['role']=='credit': t['y']=-41
    if x=='Data: NOAA NCEI GOES-12': t['at']=20.0; t['dur']=4.4
    if x=='PEAK GOES X-RAY CLASS': t['y']=29
    if x=='NOAA ORIGINAL SCALE': t['y']=32.2
    if x=='ALL FLARES 1976-2025': t['y']=35.4
    out.append(t)
    if x=='REAL X5.4 FLARE · SDO, 2012': out.append(dict(text='NOT THE 2003 FLARE',at=9.3,dur=2.1,role='fact',y=-7,font_px=50))
cl['texts']=out
cl['caption_y_ranges']=[dict(**{'from':0,'to':26,'y':23})]
cl['caption_keep']=sorted(cl['caption_keep'],key=lambda k:-len(k.split()))
cl['credits'][0]=cl['credits'][0].replace('6 Mar 2012 X5.4 and 10 Jun 2014 X2.2 flares, shown as illustrations of X-class flares, not the 2003 events','6 Mar 2012 X5.4 flare, shown as an illustration of an X-class flare, not the 2003 event').replace(' ; https://images.nasa.gov/details/GSFC_20140610_SDO_m11564_XFlares','')
json.dump(cl,open(P+'cutlist.json','w',encoding='utf8'),indent=1,ensure_ascii=False)
s=json.load(open(P+'script.json',encoding='utf8'))
s['on_screen']=[dict(t=t['at'],dur=t['dur'],text=t['text']) for t in cl['texts']]
d=s['description']
d=d.replace('The two Sun clips are REAL NASA SDO footage of other X-class flares (6 Mar 2012, X5.4, and 10 Jun 2014, X2.2): SDO launched in 2010, so no SDO video of the 2001-2005 events exists; they are labelled as such on screen.','The one Sun clip (#4 card) is REAL NASA SDO footage of another X-class flare (6 Mar 2012, X5.4): SDO launched in 2010, so no SDO video of the 2001-2005 events exists; it is labelled "NOT THE 2003 FLARE" on screen.')
d=d.replace(' ; https://images.nasa.gov/details/GSFC_20140610_SDO_m11564_XFlares (X2.2, 10 Jun 2014)','')
a=s['attribution_block'].replace(' ; https://images.nasa.gov/details/GSFC_20140610_SDO_m11564_XFlares (X2.2, 10 Jun 2014)','')
s['description']=d; s['attribution_block']=a
s['pacing_note']='25.0 s: hook 3.0 (real GOES-12 plot with flat top + X28 marker at frame 0, pushes in, cut at 1.0 s to lineup), #5 at 3.0, 4.2 s per entry (#2 4.4), #1 card 5.0 = X28 GOES plot (estimate line rises) pulling out to the exact frame-0 plot (loop). Footer chips on every frame.'
json.dump(s,open(P+'script.json','w',encoding='utf8'),indent=1,ensure_ascii=False)
print(len(cl['segments']),'2014' in d, '2014' in a)
