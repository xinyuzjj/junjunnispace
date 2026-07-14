#!/usr/bin/env python3
"""Targeted fill for games that still miss quark/baidu links."""
import sys, time, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import game520_scraper as S

PUBLIC_FILE = Path(__file__).parent.parent / "game-resources.json"
OUT_FILE = Path(__file__).parent.parent / "public" / "game-resources.json"

PIDS = ["90434", "117236", "116979", "115805", "92525"]

def main():
    data = json.load(open(PUBLIC_FILE, encoding="utf-8"))
    games = data["resources"]
    by_pid = {g.get("sourcePostId"): g for g in games}
    quark = S.QuarkShareHelper()

    for pid in PIDS:
        g = by_pid.get(pid)
        if not g:
            print(pid, "NOT FOUND"); continue
        name = g["name"]
        has_q = bool(g.get("quarkLink")); has_b = bool(g.get("baiduLink"))
        if has_q and has_b:
            print(pid, name, "already complete"); continue
        # re-resolve fresh
        links = S.resolve_source_links(pid)
        if not g.get("sourceQuarkLink") and links.get("quark"):
            g["sourceQuarkLink"] = links["quark"]
        if not g.get("sourceBaiduLink") and links.get("baidu"):
            g["sourceBaiduLink"] = links["baidu"]
        print(f"\n[{pid}] {name} resolve={links}")

        for attempt in range(3):
            if not g.get("quarkLink") and g.get("sourceQuarkLink") and quark.quark_ok:
                url = quark.transfer_and_share(g["sourceQuarkLink"], S.PASSWORD, name)
                if url:
                    g["quarkLink"] = url; g["netdisk"]["showQuark"] = True
                    print("  quark OK", url)
            if not g.get("baiduLink") and g.get("sourceBaiduLink"):
                url = S.baidu_transfer_and_share(g["sourceBaiduLink"], S.PASSWORD, name)
                if url:
                    g["baiduLink"] = url; g["netdisk"]["showBaidu"] = True
                    print("  baidu OK", url)
            if g.get("quarkLink") and g.get("baiduLink"):
                break
            time.sleep(3)

        if not g.get("quarkLink"):
            print("  quark STILL MISSING")
        if not g.get("baiduLink"):
            print("  baidu STILL MISSING")
        time.sleep(1)

    out = {"updated": time.strftime("%Y-%m-%d %H:%M:%S"),
           "count": len(games), "resources": games}
    for fp in [OUT_FILE, PUBLIC_FILE]:
        json.dump(out, open(fp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("\n=== saved ===")
    print("quark", sum(1 for g in games if g.get("quarkLink")), "/", len(games))
    print("baidu", sum(1 for g in games if g.get("baiduLink")), "/", len(games))

if __name__ == "__main__":
    main()
