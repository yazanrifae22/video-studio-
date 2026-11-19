import re,html,sys,urllib.request
u=sys.argv[1]
req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
try: t=urllib.request.urlopen(req,timeout=40).read().decode('utf8','replace')
except Exception as e: print('ERR',u,e); sys.exit()
g=lambda p:re.findall(p,t)
print(u); print(' title',g(r'<title>([^<]*)')[:1]); print(' og',g(r'property="og:image" content="([^"]+)"')[:1]); print(' desc',g(r'property="og:description" content="([^"]+)"')[:1])
txt=html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',t)))
for m in re.finditer(r'(?i)(NASA Earth Observatory image|Astronaut photograph|Image courtesy|Landsat data|image by|Credit)[^.]{0,160}',txt): print('  cr:',m.group(0)[:200]); 
print(' dl',sorted(set(g(r'https://assets\.science\.nasa\.gov/[^"\' )]+\.(?:jpg|png|tif)[^"\' )]*')))[:8])
