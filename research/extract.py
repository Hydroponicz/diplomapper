"""Temporary: prints the relevant lines of official sources so equipment figures can be
checked against the originals (the dev container cannot reach these sites).
Removed once the equipment pilot data is verified.

Run 1 verified the UK MoD figures; this run retries the sources that refused the request."""
import html, re, subprocess, urllib.request

UA = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def get(url, timeout=120):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def curl(url, path):
    r = subprocess.run(["curl", "-sSL", "--max-time", "120", "-A", UA["User-Agent"], "-o", path, "-w", "%{http_code}", url],
                       capture_output=True, text=True)
    print("    curl status:", r.stdout, r.stderr.strip()[:200])
    return r.stdout == "200"


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


def nvr():
    path = "/tmp/nvr.html"
    if curl("https://www.navsea.navy.mil/Resources/Naval-Vessel-Register/NVR-Ships/Fleet-Size/", path):
        grep(text_of(open(path, "rb").read()), r"battle force|submarine|carrier|as of|total|ssn|ssbn|ssgn|cvn", 80)


def navy_plan():
    path = "/tmp/plan.pdf"
    if curl("https://media.defense.gov/2026/May/11/2003928909/-1/-1/1/NAVY%20SHIPBUILDING%20PLAN%20MAY%202026.PDF", path):
        out = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True).stdout
        grep([l.strip() for l in out.splitlines() if l.strip()], r"\b291\b|battle force (?:ships|inventory)|as of|ssn|ssbn|cvn|aircraft carrier", 60)


def norway():
    path = "/tmp/nor.html"
    if curl("https://www.regjeringen.no/en/whats-new/norway-unveils-its-first-new-super-missile-jsm-and-celebrates-delivery-of-all-52-f-35-fighter-jets/id3098456/", path):
        grep(text_of(open(path, "rb").read()), r"52|f-35|published|date|nlod|licen|copyright|reuse", 40)
    path2 = "/tmp/nor-terms.html"
    print("    terms page:")
    if curl("https://www.regjeringen.no/en/om-nettstedet/copyright/id2584/", path2):
        grep(text_of(open(path2, "rb").read()), r"licen|nlod|copyright|reuse|free", 20)


def mnd():
    for url in ["https://www.mnd.go.kr/mbshome/mbs/mndEN/", "https://www.mnd.go.kr/"]:
        path = "/tmp/mnd.html"
        print("   ", url)
        if curl(url, path):
            s = open(path, "rb").read().decode("utf-8", "replace")
            hits = list(re.finditer(r"(?i)(kogl|공공누리|copyright|저작권)", s))[:4]
            for m in hits:
                print("     ...", re.sub(r"\s+", " ", s[max(0, m.start() - 200): m.end() + 200]))
            if not hits:
                print("     (no licence text found)")


for title, fn in [("NAVSEA fleet size", nvr), ("Navy shipbuilding plan May 2026", navy_plan),
                  ("Norway F-35", norway), ("South Korea MND licence", mnd)]:
    section(title, fn)
