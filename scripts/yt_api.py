"""Read-only YouTube Data/Analytics API helper (GET only). Tokens: data/tokens/<brand>.json + secrets/youtube-oauth-client.json.
Never prints tokens. Used by analytics-snapshots.py and the E7 check."""
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLIENT = ROOT / "secrets" / "youtube-oauth-client.json"
TOKENS = ROOT / "data" / "tokens"
_cache = {}


class ApiError(Exception):
    def __init__(self, status, msg):
        super().__init__(f"{status}: {msg}")
        self.status, self.msg = status, msg

    @property
    def scope_missing(self):
        m = (self.msg or "").lower()
        return self.status in (401, 403) and ("scope" in m or "insufficient" in m or "forbidden" in m or "permission" in m)


def token(brand):
    if brand in _cache:
        return _cache[brand]
    j = json.loads(CLIENT.read_text(encoding="utf8"))
    c = j.get("installed") or j.get("web")
    rt = json.loads((TOKENS / f"{brand}.json").read_text(encoding="utf8"))["refresh_token"]
    body = urllib.parse.urlencode({"client_id": c["client_id"], "client_secret": c["client_secret"], "refresh_token": rt,
                                   "grant_type": "refresh_token"}).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=body), timeout=30) as r:
            t = json.load(r)
    except urllib.error.HTTPError as e:
        raise ApiError(e.code, "token refresh failed")
    _cache[brand] = t["access_token"]
    return _cache[brand]


def get(brand, url):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token(brand)}"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            msg = json.load(e).get("error", {}).get("message", e.reason)
        except Exception:
            msg = str(e.reason)
        raise ApiError(e.code, msg)


def videos(brand, ids, part="snippet,contentDetails,statistics,status"):
    out = {}
    for i in range(0, len(ids), 50):
        j = get(brand, "https://www.googleapis.com/youtube/v3/videos?" + urllib.parse.urlencode({"part": part, "id": ",".join(ids[i:i + 50])}))
        for v in j.get("items", []):
            out[v["id"]] = v
    return out


def report(brand, **p):
    p = {"ids": "channel==MINE", **p}
    j = get(brand, "https://youtubeanalytics.googleapis.com/v2/reports?" + urllib.parse.urlencode(p))
    cols = [h["name"] for h in j["columnHeaders"]]
    return [dict(zip(cols, r)) for r in j.get("rows", [])]


def duration_s(iso):
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    return int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + int(m.group(3) or 0) if m else None
