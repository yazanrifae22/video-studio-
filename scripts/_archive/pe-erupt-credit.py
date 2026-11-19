import re,html,sys,urllib.request
for u in sys.argv[1:]:
    t=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read().decode('utf8','replace')
    txt=html.unescape(re.sub(r'\s+',' ',re.sub(r'<(script|style)[^>]*>.*?</\1>',' ',re.sub(r'<!--.*?-->','',t,flags=re.S),flags=re.S)))
    txt=re.sub(r'<[^>]+>',' ',txt)
    print('==',u)
    for m in re.finditer(r'(?i)(Image courtesy|NASA Earth Observatory image|Astronaut photograph|Landsat data|ASTER|Credit|Acquired|copyright)[^|]{0,260}',txt): print('  ',m.group(0)[:300])
