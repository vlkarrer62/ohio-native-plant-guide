#!/usr/bin/env python3
"""
Normalize every plant page's botanical-plate to the canonical framed variant
(the one 31 of 40 pages already use, with the 'Plate pending' placeholder and
onload/onerror handlers).

SAFE BY DEFAULT: dry-run unless you pass --apply. Writes a .bak beside each file.
Idempotent: pages already in the canonical form are left untouched.
Preserves each page's existing src, alt, and figcaption text verbatim — so the
off-convention-but-working images (foxglove-beardtongue, milkweed) keep working.

Usage:
    python3 normalize_plates.py            # dry run: report only
    python3 normalize_plates.py --apply    # rewrite files (.bak backups made)
"""
import re, sys, glob, os

APPLY = "--apply" in sys.argv
PLANT_DIR = "plants"

FIG_RE = re.compile(r'(?ms)^([ \t]*)<figure class="botanical-plate[^"]*".*?</figure>')
SRC_RE = re.compile(r'src="([^"]*)"')
ALT_RE = re.compile(r'alt="([^"]*)"')
CAP_RE = re.compile(r'<figcaption>(.*?)</figcaption>', re.S)


def build_block(base, src, alt, figcap, file_path):
    """Return canonical framed-placeholder figure, indented to `base`."""
    b = base
    return (
        f'{b}<figure class="botanical-plate botanical-plate--placeholder">\n'
        f'{b}  <div class="botanical-plate-frame">\n'
        f'{b}    <img\n'
        f'{b}      src="{src}"\n'
        f'{b}      alt="{alt}"\n'
        f'{b}      onload="this.closest(\'.botanical-plate\').classList.add(\'has-image\')"\n'
        f'{b}      onerror="this.style.display=\'none\'; this.closest(\'.botanical-plate\').classList.add(\'is-missing\')"\n'
        f'{b}    />\n'
        f'{b}    <div class="botanical-plate-placeholder" aria-hidden="true">\n'
        f'{b}      <span class="botanical-plate-placeholder-label">Plate pending</span>\n'
        f'{b}      <span class="botanical-plate-placeholder-file">{file_path}</span>\n'
        f'{b}    </div>\n'
        f'{b}  </div>\n'
        f'{b}  <figcaption>{figcap}</figcaption>\n'
        f'{b}</figure>'
    )


def main():
    pages = sorted(p for p in glob.glob(f"{PLANT_DIR}/*.html")
                   if os.path.basename(p) != "index.html")
    converted, already, problems = [], [], []

    for path in pages:
        html = open(path, encoding="utf-8").read()
        m = FIG_RE.search(html)
        name = os.path.basename(path)
        if not m:
            problems.append((name, "no botanical-plate figure found"))
            continue

        base, block = m.group(1), m.group(0)

        if "botanical-plate-frame" in block:
            already.append(name)            # canonical already — leave it
            continue

        src = SRC_RE.search(block)
        alt = ALT_RE.search(block)
        cap = CAP_RE.search(block)
        if not (src and cap):
            problems.append((name, "could not extract src/figcaption"))
            continue

        src_v = src.group(1)
        alt_v = alt.group(1) if alt else f"Botanical plate illustration"
        cap_v = cap.group(1).strip()
        file_v = src_v.replace("../", "")   # placeholder text mirrors the real src

        new_block = build_block(base, src_v, alt_v, cap_v, file_v)
        new_html = html[:m.start()] + new_block + html[m.end():]

        if APPLY:
            open(path + ".bak", "w", encoding="utf-8").write(html)
            open(path, "w", encoding="utf-8").write(new_html)
        converted.append(name)

    print(f"{'APPLIED' if APPLY else 'DRY RUN'} — {len(pages)} pages scanned\n")
    print(f"  already canonical : {len(already)}")
    print(f"  converted A -> B  : {len(converted)}")
    for n in converted:
        print(f"      • {n}")
    if problems:
        print(f"  problems          : {len(problems)}")
        for n, why in problems:
            print(f"      ! {n}: {why}")
    if not APPLY and converted:
        print("\n(dry run — no files written. Re-run with --apply to make changes.)")


if __name__ == "__main__":
    main()
