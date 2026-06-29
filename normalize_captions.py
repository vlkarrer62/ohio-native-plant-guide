#!/usr/bin/env python3
"""
Normalize every plant page's botanical-plate <figcaption> to:

    <figcaption><em>Scientific name</em> · Botanical field plate</figcaption>

Scientific names are read from data/plants.json (matched by slug, then url).
Genus-level names keep their rank abbreviation roman, e.g. <em>Solidago</em> spp.
Pages with no plants.json entry (catmint) are reported and left untouched.

SAFE BY DEFAULT: dry-run unless --apply. Writes a .bak beside each changed file.
Idempotent: a caption already in the target form is left alone.

Usage:
    python3 normalize_captions.py            # dry run
    python3 normalize_captions.py --apply    # rewrite (.bak backups)
"""
import re, sys, json, glob, os

APPLY = "--apply" in sys.argv
TAIL = " · Botanical field plate"           # the middle dot is U+00B7

FIG_RE = re.compile(r'(?ms)(^[ \t]*<figure class="botanical-plate[^"]*".*?</figure>)')
CAP_RE = re.compile(r'<figcaption>.*?</figcaption>', re.S)
RANK_RE = re.compile(r'^(.*?)(\s+(?:spp\.|sp\.|var\.|subsp\.|ssp\.|f\.|cv\.).*)$')


def format_sci(sci):
    """Italicize the name; keep a rank qualifier (spp., var., ...) roman."""
    sci = sci.strip()
    m = RANK_RE.match(sci)
    if m:
        return f"<em>{m.group(1).strip()}</em>{m.group(2)}"
    return f"<em>{sci}</em>"


def load_sci_map():
    plants = json.load(open("data/plants.json", encoding="utf-8"))
    m = {}
    for p in plants:
        sci = (p.get("scientificName") or "").strip()
        if not sci:
            continue
        for key in (p.get("slug"), (p.get("url") or "").replace(".html", "")):
            if key:
                m.setdefault(key.lower(), sci)
    return m


def main():
    sci_map = load_sci_map()
    pages = sorted(p for p in glob.glob("plants/*.html")
                   if os.path.basename(p) != "index.html")
    updated, unchanged, problems = [], [], []

    for path in pages:
        slug = os.path.basename(path)[:-5].lower()
        sci = sci_map.get(slug)
        if not sci:
            problems.append((os.path.basename(path), "no scientificName in plants.json"))
            continue

        html = open(path, encoding="utf-8").read()
        figm = FIG_RE.search(html)
        if not figm:
            problems.append((os.path.basename(path), "no botanical-plate figure"))
            continue

        block = figm.group(1)
        new_caption = f"<figcaption>{format_sci(sci)}{TAIL}</figcaption>"

        if not CAP_RE.search(block):
            problems.append((os.path.basename(path), "no figcaption in figure"))
            continue

        new_block = CAP_RE.sub(lambda _: new_caption, block, count=1)
        if new_block == block:
            unchanged.append(os.path.basename(path))
            continue

        new_html = html[:figm.start(1)] + new_block + html[figm.end(1):]
        if APPLY:
            if not os.path.exists(path + ".bak"):
                open(path + ".bak", "w", encoding="utf-8").write(html)
            open(path, "w", encoding="utf-8").write(new_html)
        updated.append((os.path.basename(path), new_caption))

    print(f"{'APPLIED' if APPLY else 'DRY RUN'} — {len(pages)} pages scanned\n")
    print(f"  updated   : {len(updated)}")
    for n, cap in updated:
        print(f"      • {n:24s} {cap}")
    print(f"  unchanged : {len(unchanged)} (already in target form)")
    if problems:
        print(f"  skipped   : {len(problems)}")
        for n, why in problems:
            print(f"      ! {n}: {why}")
    if not APPLY and updated:
        print("\n(dry run — no files written. Re-run with --apply to make changes.)")


if __name__ == "__main__":
    main()
