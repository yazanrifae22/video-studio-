import json
ID='rank-261028-xkgv'
A=lambda k:'src-261028-'+k
seg=lambda a,d,item,why:dict(asset_id=A(a),src_in=0,src_out=d,fill='cover',mute_source=True,item=item,why=why)
segments=[seg('vbn8',1.0,0,'hook: SOHO/EIT X28 flare 4 Nov 2003 (#1) tight push; frame 0 = loop-end crop'),
 seg('was9',2.0,0,'hook shot 2 (cut at 1.0 s): five-bar lineup, one X-class scale, hatched = estimated'),
 seg('118f',2.1,5,'#5 7 Sep 2005 X17.0 bar graphic (no usable PD video; SOHO missed it)'),
 seg('y5u2',2.1,5,'#5 ladder graphic'),
 seg('g1wr',2.1,4,'#4 SOHO/EIT time-lapse around 28 Oct 2003 flare (NASA SVS 2959)'),
 seg('x0df',2.1,4,'#4 SOHO/EIT image 28 Oct 2003 11:12 UT, slow push'),
 seg('b6af',2.1,3,'#3 16 Aug 1989 X20.0 bar graphic (pre-SOHO, no video)'),
 seg('rfgp',2.1,3,'#3 ladder graphic'),
 seg('o6zi',2.2,2,'#2 2 Apr 2001 X20.0 bar graphic'),
 seg('m316',2.2,2,'#2 ladder graphic'),
 seg('yes4',2.5,1,'#1 SOHO/EIT time-lapse: the 4 Nov 2003 flash (NASA SVS 2959)'),
 seg('vvg6',2.5,1,'pull-out ends on the exact frame-0 crop: seamless loop')]
T=lambda text,at,dur,role='fact',**k:dict(text=text,at=at,dur=dur,role=role,**k)
texts=[T('X28 FLARE',0,3.0,'title'),T('ESTIMATED · DETECTOR SATURATED',0,3.0,font_px=46),
 T('#5 · X17.0',3.0,4.2,'rank'),T('7 SEP 2005',3.0,2.1),T('DATA GRAPHIC',5.1,2.1),
 T('#4 · X17.2',7.2,4.2,'rank'),T('28 OCT 2003 · TIME-LAPSE',7.2,2.1,font_px=50),T('SOHO IMAGE · 11:12 UT',9.3,2.1,font_px=50),
 T('#3 · X20.0',11.4,4.2,'rank'),T('16 AUG 1989',11.4,2.1),T('DATA GRAPHIC · NO VIDEO',13.5,2.1,font_px=50),
 T('#2 · X20.0',15.6,4.4,'rank'),T('2 APR 2001',15.6,2.2),T('DATA GRAPHIC · NO VIDEO',17.8,2.2,font_px=50),
 T('#1 · X28 (EST.)',20.0,4.4,'rank'),T('4 NOV 2003 · TIME-LAPSE',20.0,2.5,font_px=50),T('SOHO IMAGE · 19:48 UT',22.5,1.9,font_px=50),
 T('TIED WITH #2 · X20.0',11.4,4.2,y=18,font_px=46),T('TIED WITH #3 · NEWER FIRST',15.6,4.4,y=18,font_px=46),
 T('ESTIMATED · DETECTOR SATURATED',20.0,4.4,y=17,font_px=46),
 T('Images: NASA/ESA, NASA SVS',20.0,4.4,'credit',y=35,font_px=56),
 T('X28 FLARE',24.4,0.6,'title'),T('ESTIMATED · DETECTOR SATURATED',24.4,0.6,font_px=46),
 T('PEAK GOES X-RAY CLASS',0,25.0,y=22,font_px=40),T('NOAA ORIGINAL SCALE',0,25.0,y=26,font_px=40),
 T('ALL FLARES 1976-2025',0,25.0,y=30,font_px=40)]
nar=dict(voice='Charon',style="Brisk, continuous documentary read: confident and quick, almost no pause inside or between phrases, every number said crisply in one breath; no hype. Read only the transcript, nothing else.",max_pause=0.28,
 lines=[dict(id='hook',text='Biggest solar flares: one overloaded the detector.',at=0.1),
 dict(id='i5',text='Five: September two thousand five, X seventeen.',at=2.83),
 dict(id='i4',text='Four: October two thousand three, X seventeen point two.',at=7.03),
 dict(id='i3',text='Three: August nineteen eighty-nine, X twenty.',at=11.23),
 dict(id='i2',text='Two: April two thousand one, also X twenty.',at=15.43),
 dict(id='i1',text='One: November two thousand three, X twenty-eight, estimated.',at=19.83)])
credits=["Halloween Solar Storms from SOHO/EIT, 195 Angstroms (SOHO/EIT stills of 28 Oct and 4 Nov 2003 and time-lapse crops): NASA/ESA, NASA/Goddard Space Flight Center Scientific Visualization Studio (animator Tom Bridgman; sensor SOHO EIT, collected by NASA and ESA; NASA page states no copyright notice) - https://svs.gsfc.nasa.gov/2959",
 "X-class bar graphics: original studio graphics drawn from NOAA NCEI GOES X-ray flare event reports (no third-party imagery; font Cairo, SIL Open Font License 1.1)"]
cl=dict(production_id=ID,width=1080,height=1920,fps=30,segments=segments,texts=texts,narration=nar,captions='narration',music=None,bed='tone',
 bed_accents=[0,3.0,7.2,11.4,15.6,20.0],credits=credits,target_duration=25.0,caption_min_page=1.5,caption_per_line=True,caption_bg=True,caption_bg_alpha=0.8,
 caption_keep=['September two thousand five','October two thousand three','August nineteen eighty-nine','April two thousand one','November two thousand three','X seventeen','X seventeen point two','X twenty','also X twenty','X twenty-eight, estimated','one overloaded the detector','Biggest solar flares'])
json.dump(cl,open(f'productions/{ID}/cutlist.json','w',encoding='utf8'),indent=1,ensure_ascii=False)
print('ok')
