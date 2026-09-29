"""Temporary: prints the relevant lines of official sources so equipment figures can be
checked against the originals (the dev container cannot reach these sites).
Removed once the equipment pilot data is verified."""
import html, io, re, subprocess, urllib.request

UA = {"User-Agent": "Mozilla/5.0 (diplomapper source check; +https://github.com/Hydroponicz/diplomapper)"}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def text_of(raw):
    s = raw.decode("utf-8", "replace")
    s = re.sub(r"(?is)<(script|style).*?</\1>", " ", s)
    s = re.sub(r"(?s)<[^>]+>", "\n", s)
    lines = [re.sub(r"\s+", " ", html.unescape(l)).strip() for l in s.split("\n")]
    return [l for l in lines if l]


def grep(lines, pattern, limit=60):
    rx = re.compile(pattern, re.I)
    hits = [l for l in lines if rx.search(l)]
    for l in hits[:limit]:
        print("   ", l[:400])
    if not hits:
        print("    (no matching lines)")


def section(title, fn):
    print(f"\n===== {title} =====", flush=True)
    try:
        fn()
    except Exception as e:  # keep going so one failure doesn't hide the rest
        print("    ERROR:", repr(e))


def uk():
    base = "https://www.gov.uk/government/statistics/uk-armed-forces-equipment-and-formations-2026"
    raw = get(base)
    grep(text_of(raw), r"published|updated|open government licence|licence")
    links = sorted(set(re.findall(r'href="([^"]+\.(?:xlsx|ods|csv))"', raw.decode("utf-8", "replace"))))
    print("    attachments:", links)
    lines2 = text_of(get(base + "/uk-armed-forces-equipment-and-formations-2026"))
    grep(lines2, r"challenger|typhoon|f-35|lightning|apache|submarine|astute|vanguard|destroyer|frigate|carrier|in service|1 april", 80)
    import openpyxl
    rx = re.compile(r"challenger|typhoon|f-35|lightning|apache|astute|vanguard|type 45|type 23|type 26|type 31|queen elizabeth|carrier|submarine|in service|storage|stored", re.I)
    for link in links:
        if not link.endswith(".xlsx"):
            continue
        url = link if link.startswith("http") else "https://www.gov.uk" + link
        print("    workbook:", url)
        wb = openpyxl.load_workbook(io.BytesIO(get(url)), data_only=True, read_only=True)
        for ws in wb.worksheets:
            for row in ws.iter_rows(values_only=True):
                cells = [str(c).strip() for c in row if c not in (None, "")]
                if cells and rx.search(" | ".join(cells)):
                    print(f"    [{ws.title}]", " | ".join(cells)[:400])


def uk_quality():
    url = "https://www.gov.uk/government/statistics/uk-armed-forces-equipment-and-formations-2026/background-quality-report-uk-armed-forces-equipment-and-formations-2026"
    grep(text_of(get(url)), r"in service|storage|stored|definition|availab")


def nvr():
    url = "https://www.navsea.navy.mil/Resources/Naval-Vessel-Register/NVR-Ships/Fleet-Size/"
    grep(text_of(get(url)), r"battle force|submarine|carrier|as of|total|ssn|ssbn|ssgn|cvn", 80)


def navy_plan():
    url = "https://media.defense.gov/2026/May/11/2003928909/-1/-1/1/NAVY%20SHIPBUILDING%20PLAN%20MAY%202026.PDF"
    with open("/tmp/plan.pdf", "wb") as f:
        f.write(get(url))
    out = subprocess.run(["pdftotext", "-layout", "/tmp/plan.pdf", "-"], capture_output=True, text=True).stdout
    grep([l.strip() for l in out.splitlines() if l.strip()], r"\b291\b|battle force (?:ships|inventory)|as of", 40)


def norway():
    url = "https://www.regjeringen.no/en/whats-new/norway-unveils-its-first-new-super-missile-jsm-and-celebrates-delivery-of-all-52-f-35-fighter-jets/id3098456/"
    grep(text_of(get(url)), r"52|f-35|published|date|nlod|licen|copyright|reuse", 40)


def army():
    url = "https://www.army.mil/article/194952/army_rolls_out_latest_version_of_iconic_abrams_main_battle_tank"
    grep(text_of(get(url)), r"sepv3|sep v3|fielded|unit|20\d\d", 30)


def mnd():
    for url in ["https://www.mnd.go.kr/mbshome/mbs/mndEN/", "https://www.mnd.go.kr/"]:
        print("   ", url)
        s = get(url).decode("utf-8", "replace")
        hits = list(re.finditer(r"(?i)(kogl|공공누리|copyright|저작권)", s))[:4]
        for m in hits:
            print("     ...", re.sub(r"\s+", " ", s[max(0, m.start() - 200): m.end() + 200]))
        if not hits:
            print("     (no licence text found)")


for title, fn in [("UK MoD 2026", uk), ("UK quality report", uk_quality), ("NAVSEA fleet size", nvr),
                  ("Navy shipbuilding plan May 2026", navy_plan), ("Norway F-35", norway),
                  ("army.mil Abrams", army), ("South Korea MND licence", mnd)]:
    section(title, fn)
