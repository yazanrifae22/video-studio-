"""Facebook Reels through the Meta Graph API (faster than Business Suite clicks; full-quality originals, no 10 MB cap).

usage:
  python scripts/fb-api.py auth                 # secrets/meta-user-token.txt (+ secrets/meta-app.json {app_id, app_secret}) -> Page tokens
  python scripts/fb-api.py status               # pages + token check + plan counts
  python scripts/fb-api.py schedule quiz-ar [--limit N] [--dry-run]   # upload planned reels: time "NOW" publishes, others SCHEDULED
  python scripts/fb-api.py list quiz-ar         # scheduled reels on the Page (Meta's view)

Tokens: data/tokens/facebook.json (git-ignored). Never printed. Page tokens made from a long-lived user token don't expire.
Plan: data/fb-plan.json (scripts/fb-plan.py); results recorded in data/studio.db publishing (platform 'facebook').
Flow (Meta docs, see ~/.claude/skills/meta-page-management): POST /{page}/video_reels?upload_phase=start -> POST rupload.facebook.com
(binary) -> POST /{page}/video_reels?upload_phase=finish&video_state=SCHEDULED|PUBLISHED&scheduled_publish_time=<unix>.
Meta requires scheduled_publish_time between 10 minutes and 29 days ahead (later slots are skipped until they come into range).
"""
import datetime as dt, json, os, sqlite3, sys, time, urllib.error, urllib.parse, urllib.request

sys.stdout.reconfigure(encoding="utf-8")
R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
V = "v23.0"
G = f"https://graph.facebook.com/{V}"
TOK = os.path.join(R, "data", "tokens", "facebook.json")
PAGES = {"rankings": "61595705258385", "quiz-ar": "61595600383297"}
CAIRO = dt.timedelta(hours=3)  # owner's local time (Africa/Cairo, UTC+3)


def call(method, url, params=None, data=None, headers=None):
    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise SystemExit(f"{method} {url.split('?')[0]} -> HTTP {e.code}: {body[:400]}")


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read().strip()


def auth():
    user = read(os.path.join(R, "secrets", "meta-user-token.txt"))
    app = os.path.join(R, "secrets", "meta-app.json")
    if os.path.exists(app):  # short-lived (1-2 h) -> long-lived (60 d) user token, whose Page tokens don't expire
        a = json.loads(read(app))
        user = call("GET", f"{G}/oauth/access_token", {"grant_type": "fb_exchange_token", "client_id": a["app_id"],
                                                        "client_secret": a["app_secret"], "fb_exchange_token": user})["access_token"]
    pages = call("GET", f"{G}/me/accounts", {"fields": "id,name,access_token,tasks", "limit": 100, "access_token": user})["data"]
    out = {}
    for brand, pid in PAGES.items():
        p = next((x for x in pages if x["id"] == pid), None)
        print(f"{brand}: {'OK ' + p['name'] + ' tasks=' + ','.join(p.get('tasks', [])) if p else 'NOT FOUND (token lacks this Page)'}")
        if p:
            out[brand] = {"page_id": pid, "name": p["name"], "token": p["access_token"]}
    os.makedirs(os.path.dirname(TOK), exist_ok=True)
    json.dump({"saved_at": dt.datetime.now().isoformat(timespec="seconds"), "long_lived": os.path.exists(app), "pages": out}, open(TOK, "w"), indent=1)
    print("saved", TOK, "(long-lived)" if os.path.exists(app) else "(short-lived: expires in ~1-2 h; add secrets/meta-app.json for permanent tokens)")


def page(brand):
    t = json.load(open(TOK))["pages"].get(brand)
    if not t:
        raise SystemExit(f"no Page token for {brand}: run auth")
    return t["page_id"], t["token"]


def schedule(brand, limit, dry):
    pid, token = page(brand)
    db = sqlite3.connect(os.path.join(R, "data", "studio.db"))
    done = {r[0] for r in db.execute("SELECT production_id FROM publishing WHERE platform='facebook' AND publication_status IN ('scheduled','published')")}
    plan = [p for p in json.load(open(os.path.join(R, "data", "fb-plan.json"), encoding="utf-8")) if p["brand"] == brand and p["production_id"] not in done]
    now, n = dt.datetime.utcnow(), 0
    for p in plan:
        if limit is not None and n >= limit:
            break
        if p["time"] == "NOW":
            when = None
        else:
            when = dt.datetime.fromisoformat(f"{p['date']}T{p['time']}") - CAIRO
            if when < now + dt.timedelta(minutes=15):
                print(p["production_id"], p["date"], p["time"], "SKIP (slot passed - replan)")
                continue
            if when > now + dt.timedelta(days=29):
                print(p["production_id"], p["date"], p["time"], "LATER (beyond Meta's 29-day window)")
                continue
        size = os.path.getsize(p["file"])
        print(p["production_id"], p["date"], p["time"], f"{size / 1048576:.1f} MB", "dry-run" if dry else "uploading...", flush=True)
        if dry:
            n += 1
            continue
        vid = call("POST", f"{G}/{pid}/video_reels", {"upload_phase": "start", "access_token": token})["video_id"]
        with open(p["file"], "rb") as f:
            up = call("POST", f"https://rupload.facebook.com/video-upload/{V}/{vid}", data=f.read(),
                      headers={"Authorization": f"OAuth {token}", "offset": "0", "file_size": str(size)})
        if not up.get("success"):
            raise SystemExit(f"upload failed for {p['production_id']}: {up}")
        fin = {"upload_phase": "finish", "video_id": vid, "description": p["caption"], "access_token": token}
        fin.update({"video_state": "PUBLISHED"} if when is None else {"video_state": "SCHEDULED", "scheduled_publish_time": int(when.replace(tzinfo=dt.timezone.utc).timestamp())})
        res = call("POST", f"{G}/{pid}/video_reels", fin)
        if not res.get("success"):
            raise SystemExit(f"finish failed for {p['production_id']}: {res}")
        utc = (when or now).strftime("%Y-%m-%dT%H:%M:00Z")
        meta = {"page": p["page"], "page_id": pid, "video_id": vid, "local_time": f"{p['date']} {p['time']} PC local",
                "method": "Meta Graph API (scripts/fb-api.py)", "url": f"https://www.facebook.com/reel/{vid}"}
        db.execute("""UPDATE publishing SET publication_status=?, scheduled_time=?, external_post_id=?, metadata=?, approved_by='owner',
                      approved_at=datetime('now'), updated_at=datetime('now') WHERE idempotency_key=?""",
                   ("published" if when is None else "scheduled", utc, vid, json.dumps(meta, ensure_ascii=False), f"facebook:{p['production_id']}"))
        db.commit()
        n += 1
        print("  ->", "published" if when is None else "scheduled", vid, flush=True)
        time.sleep(3)  # gentle pacing (the account was rate-restricted once)
    print(f"{n} reel(s) {'checked' if dry else 'done'} for {brand}")


def status():
    t = json.load(open(TOK)) if os.path.exists(TOK) else {"pages": {}}
    print("tokens saved:", t.get("saved_at"), "long-lived:", t.get("long_lived"))
    for brand in PAGES:
        if brand in t["pages"]:
            pid, token = page(brand)
            me = call("GET", f"{G}/{pid}", {"fields": "id,name,followers_count", "access_token": token})
            print(f"{brand}: {me['name']} followers={me.get('followers_count')}")
        else:
            print(f"{brand}: no token")
    db = sqlite3.connect(os.path.join(R, "data", "studio.db"))
    for row in db.execute("SELECT a.brand_id, pu.publication_status, count(*) FROM publishing pu JOIN productions a USING(production_id) WHERE pu.platform='facebook' GROUP BY 1,2"):
        print(" ", *row)


def listing(brand):
    pid, token = page(brand)
    r = call("GET", f"{G}/{pid}/scheduled_posts", {"fields": "id,message,scheduled_publish_time", "limit": 100, "access_token": token})
    for x in r.get("data", []):
        print(x["id"], x.get("scheduled_publish_time"), (x.get("message") or "")[:50].replace("\n", " "))


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "status":
        status()
    elif a[0] == "auth":
        auth()
    elif a[0] == "schedule":
        schedule(a[1], int(a[a.index("--limit") + 1]) if "--limit" in a else None, "--dry-run" in a)
    elif a[0] == "list":
        listing(a[1])
