"""Pick each channel's posting times from where its viewers are (YouTube Analytics, views by country).

usage: python scripts/audience-slots.py
Reads data/audience/<brand>.json (written by `npx tsx scripts/youtube.ts analytics <brand>`), maps countries to time zones,
picks the audience time zone (views-weighted; the top country nearest the weighted mean UTC offset) and writes
config/publish-times.json: per brand the audience tz + slot times in *audience* local time. scripts/publish-plan.py converts
those to the owner's local time per date (DST-safe). Below MIN_VIEWS country views a brand keeps its language default.
Owner request 2026-10-26: schedule for the viewers' time zone, based on each channel's analytics.
"""
import datetime as dt, json, math, os, sys
from zoneinfo import ZoneInfo

sys.stdout.reconfigure(encoding="utf-8")
R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MIN_VIEWS = 300
# Shorts: lunch break → late evening in the viewer's own time
SLOTS = {1: ["19:00"], 2: ["13:00", "19:00"], 3: ["12:00", "17:00", "20:00"], 4: ["12:00", "15:00", "18:00", "21:00"]}
PER_DAY = {"clipping": 4, "compilations": 4, "quiz-ar": 4}
# language defaults until a channel has enough country data
DEFAULT_TZ = {"rankings": "America/New_York", "clipping": "America/New_York", "compilations": "America/New_York", "quiz-ar": "Asia/Riyadh"}
TZ = {"US": "America/New_York", "CA": "America/Toronto", "MX": "America/Mexico_City", "BR": "America/Sao_Paulo", "AR": "America/Argentina/Buenos_Aires",
      "CO": "America/Bogota", "GB": "Europe/London", "IE": "Europe/Dublin", "DE": "Europe/Berlin", "FR": "Europe/Paris", "NL": "Europe/Amsterdam",
      "ES": "Europe/Madrid", "IT": "Europe/Rome", "PL": "Europe/Warsaw", "SE": "Europe/Stockholm", "TR": "Europe/Istanbul", "RU": "Europe/Moscow",
      "UA": "Europe/Kyiv", "EG": "Africa/Cairo", "MA": "Africa/Casablanca", "DZ": "Africa/Algiers", "TN": "Africa/Tunis", "LY": "Africa/Tripoli",
      "SD": "Africa/Khartoum", "NG": "Africa/Lagos", "KE": "Africa/Nairobi", "ZA": "Africa/Johannesburg", "SA": "Asia/Riyadh", "AE": "Asia/Dubai",
      "KW": "Asia/Kuwait", "QA": "Asia/Qatar", "BH": "Asia/Bahrain", "OM": "Asia/Muscat", "YE": "Asia/Aden", "IQ": "Asia/Baghdad", "SY": "Asia/Damascus",
      "JO": "Asia/Amman", "LB": "Asia/Beirut", "PS": "Asia/Hebron", "IL": "Asia/Jerusalem", "IR": "Asia/Tehran", "PK": "Asia/Karachi", "IN": "Asia/Kolkata",
      "BD": "Asia/Dhaka", "LK": "Asia/Colombo", "NP": "Asia/Kathmandu", "ID": "Asia/Jakarta", "MY": "Asia/Kuala_Lumpur", "SG": "Asia/Singapore",
      "PH": "Asia/Manila", "TH": "Asia/Bangkok", "VN": "Asia/Ho_Chi_Minh", "CN": "Asia/Shanghai", "HK": "Asia/Hong_Kong", "TW": "Asia/Taipei",
      "JP": "Asia/Tokyo", "KR": "Asia/Seoul", "AU": "Australia/Sydney", "NZ": "Pacific/Auckland"}


def offset_h(tz):
    return ZoneInfo(tz).utcoffset(dt.datetime.now()).total_seconds() / 3600


def pick(countries):
    rows = [(c["country"], c["views"]) for c in countries if c["country"] in TZ and c["views"] > 0]
    total = sum(v for _, v in rows)
    if total < MIN_VIEWS:
        return None, total
    # circular weighted mean of UTC offsets (24 h clock), then the top-viewed country within 3 h of it
    x = sum(v * math.cos(offset_h(TZ[c]) / 24 * 2 * math.pi) for c, v in rows)
    y = sum(v * math.sin(offset_h(TZ[c]) / 24 * 2 * math.pi) for c, v in rows)
    mean = math.atan2(y, x) / (2 * math.pi) * 24
    near = [(v, c) for c, v in rows if abs(((offset_h(TZ[c]) - mean) + 12) % 24 - 12) <= 3] or [(v, c) for c, v in rows]
    return TZ[max(near)[1]], total


out = {}
for brand, n in PER_DAY.items():
    f = os.path.join(R, "data", "audience", f"{brand}.json")
    a = json.load(open(f, encoding="utf-8")) if os.path.exists(f) else {"countries": []}
    tz, views = pick(a["countries"])
    top = ", ".join(f'{c["country"]} {c["views"]}' for c in a["countries"][:5]) or "none yet"
    out[brand] = {"audience_tz": tz or DEFAULT_TZ[brand], "times": SLOTS[n],
                  "source": f"analytics: top countries {top}" if tz else f"default by language (only {views} country views; need {MIN_VIEWS})",
                  "data_through": a.get("end"), "updated": dt.date.today().isoformat()}
    owner = [dt.datetime.combine(dt.date.today(), dt.time.fromisoformat(t), ZoneInfo(out[brand]["audience_tz"])).astimezone().strftime("%H:%M") for t in SLOTS[n]]
    print(f'{brand:13} {out[brand]["audience_tz"]:17} {" ".join(SLOTS[n])}  = owner {" ".join(owner)}  [{out[brand]["source"]}]')
# keep hand-managed entries this script does not compute (viral-rankings, tech, celebrity, kids, paused brands; 2026-11-08: all of them,
# not only paused ones) and keep celebrity's new_times grid on a recomputed entry
_old = json.load(open(os.path.join(R, "config", "publish-times.json"), encoding="utf-8")) if os.path.exists(os.path.join(R, "config", "publish-times.json")) else {}
for _b, _v in _old.items():
    if _b not in out:
        out[_b] = _v
    elif _v.get("new_times"):
        out[_b]["new_times"] = _v["new_times"]
json.dump(out, open(os.path.join(R, "config", "publish-times.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
