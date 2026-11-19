"""Google Trends daily trending searches per country (free RSS feed, no key): python scripts/trends-rss.py US GB SA EG
Prints approx traffic | date | search term | top news headline. Used by the Karto topic radar (research/radar/)."""
import sys, urllib.request, xml.etree.ElementTree as ET

NS = {"ht": "https://trends.google.com/trending/rss"}
out = []
for geo in sys.argv[1:]:
    url = f"https://trends.google.com/trending/rss?geo={geo}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=25).read()
        root = ET.fromstring(data)
    except Exception as e:
        out.append(f"== {geo}: FAILED {e!r}")
        continue
    items = root.findall(".//item")
    out.append(f"== {geo}: {len(items)} items")
    for it in items[:25]:
        title = (it.findtext("title") or "").strip()
        traffic = (it.findtext("ht:approx_traffic", namespaces=NS) or "").strip()
        date = (it.findtext("pubDate") or "")[5:16]
        news = it.find("ht:news_item", NS)
        head = ""
        if news is not None:
            head = (news.findtext("ht:news_item_title", namespaces=NS) or "").strip()[:90]
        out.append(f"{traffic:>6} | {date} | {title} | {head}")
sys.stdout.reconfigure(encoding="utf8")
print("\n".join(out))
