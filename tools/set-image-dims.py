#!/usr/bin/env python3
"""
Write the real pixel dimensions of every local image into the HTML.

Explicit width/height on an <img> is what reserves the right amount of space
before the file downloads, which is what stops the page jumping around as it
loads. Guessed numbers reserve the wrong space, so they have to be corrected
against the actual files — this does that, instead of you doing it by hand.

Run it from the repo root after adding or re-exporting any image:

    python3 tools/set-image-dims.py            # show what would change
    python3 tools/set-image-dims.py --write    # apply

It also keeps og:image:width / og:image:height in step when a page's OG image
is one of the local files.

Standard library only — no packages, no build step, same as the rest of the
site. Handles PNG and JPEG, which is all this site uses.
"""

import argparse
import pathlib
import re
import struct
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = sorted(
    path.relative_to(ROOT).as_posix()
    for path in ROOT.rglob("*.html")
    if "assets/og" not in path.as_posix()
)

# og:image is written as an absolute URL; strip this to get a repo path.
SITE = "https://lernerworks.com/"


def png_size(fp):
    """PNG: IHDR is the first chunk, width/height are big-endian at byte 16."""
    head = fp.read(24)
    if len(head) < 24 or head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", head[16:24])


def jpeg_size(fp):
    """JPEG: walk the marker segments to the SOFn that carries the size."""
    fp.seek(0)
    if fp.read(2) != b"\xff\xd8":
        return None
    while True:
        b = fp.read(1)
        if not b:
            return None
        if b != b"\xff":
            continue
        marker = fp.read(1)
        while marker == b"\xff":            # padding runs of 0xFF
            marker = fp.read(1)
        if not marker:
            return None
        m = marker[0]
        if m in (0xD8, 0xD9) or 0xD0 <= m <= 0xD7:
            continue
        seg = fp.read(2)
        if len(seg) < 2:
            return None
        length = struct.unpack(">H", seg)[0]
        # SOF0-SOF15, excluding the non-frame markers DHT/JPG/DAC
        if 0xC0 <= m <= 0xCF and m not in (0xC4, 0xC8, 0xCC):
            data = fp.read(5)
            if len(data) < 5:
                return None
            h, w = struct.unpack(">HH", data[1:5])
            return w, h
        fp.seek(length - 2, 1)


def image_size(path):
    try:
        with open(path, "rb") as fp:
            return png_size(fp) or jpeg_size(fp)
    except OSError:
        return None


def mask_comments(html):
    """
    Blank out <!-- ... --> with same-length spaces.

    Offsets stay valid, so matches found here point at the right place in the
    real document — and commented-out markup (like the <img> that documents
    how to replace the calculator placeholder) is invisible to the scan.
    """
    return re.sub(r"<!--.*?-->", lambda m: " " * len(m.group(0)), html, flags=re.S)


def resolve(page_path, src):
    """Resolve an img src, relative to the page, into a real file path."""
    if src.startswith(("http://", "https://", "data:", "//")):
        return None
    return (ROOT / page_path).parent.joinpath(src).resolve()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="apply changes")
    args = ap.parse_args()

    changed = missing = ok = 0

    for page in PAGES:
        page_file = ROOT / page
        if not page_file.exists():
            continue
        html = original = page_file.read_text(encoding="utf-8")

        # Collect edits first, then splice them in from the end so earlier
        # offsets stay valid.
        edits = []
        for hit in re.finditer(r"<img\b[^>]*>", mask_comments(html)):
            tag = html[hit.start():hit.end()]
            m = re.search(r'src="([^"]+)"', tag)
            if not m:
                continue
            src = m.group(1)
            target = resolve(page, src)

            if target is None:
                continue
            if not target.exists():
                print(f"  missing  {page}  {src}")
                missing += 1
                continue

            size = image_size(target)
            if not size:
                print(f"  unreadable  {page}  {src}")
                missing += 1
                continue

            w, h = size
            cur_w = re.search(r'\bwidth="(\d+)"', tag)
            cur_h = re.search(r'\bheight="(\d+)"', tag)
            if cur_w and cur_h and (int(cur_w.group(1)), int(cur_h.group(1))) == (w, h):
                ok += 1
                continue

            new_tag = tag
            if cur_w:
                new_tag = re.sub(r'\bwidth="\d+"', f'width="{w}"', new_tag, count=1)
            if cur_h:
                new_tag = re.sub(r'\bheight="\d+"', f'height="{h}"', new_tag, count=1)
            if not (cur_w and cur_h):
                # No attributes at all — add them right after src.
                new_tag = new_tag.replace(
                    f'src="{src}"', f'src="{src}" width="{w}" height="{h}"', 1
                )

            was = f"{cur_w.group(1)}x{cur_h.group(1)}" if cur_w and cur_h else "none"
            print(f"  {page}  {src.split('/')[-1]}  {was} -> {w}x{h}")
            edits.append((hit.start(), hit.end(), new_tag))
            changed += 1

        for start, end, new_tag in reversed(edits):
            html = html[:start] + new_tag + html[end:]

        # Keep the OG image dimensions honest too.
        og = re.search(r'<meta property="og:image" content="([^"]+)"', html)
        if og and og.group(1).startswith(SITE):
            og_file = ROOT / og.group(1)[len(SITE):]
            size = image_size(og_file) if og_file.exists() else None
            if size:
                w, h = size
                for prop, val in (("og:image:width", w), ("og:image:height", h)):
                    pat = f'(<meta property="{prop}" content=")(\\d+)(")'
                    hit = re.search(pat, html)
                    if hit and hit.group(2) != str(val):
                        print(f"  {page}  {prop}  {hit.group(2)} -> {val}")
                        html = re.sub(pat, f"\\g<1>{val}\\g<3>", html, count=1)
                        changed += 1

        if html != original and args.write:
            page_file.write_text(html, encoding="utf-8")

    print(f"\n{ok} already correct, {changed} to update, {missing} missing")
    if changed and not args.write:
        print("Nothing written. Re-run with --write to apply.")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
