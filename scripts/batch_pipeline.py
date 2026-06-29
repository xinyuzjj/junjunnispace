#!/usr/bin/env python3
"""批量爬取+转存流水线
用法: python batch_pipeline.py <起始页> <页数> [hot]
每页爬取后保存到 public/game-resources-p{N}.json
加 hot 参数按热度排行
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from game520_scraper import scrape

PUBLIC = Path(__file__).parent.parent / "public"

def main():
    start_page = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    pages = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    order = sys.argv[3] if len(sys.argv) > 3 else ""

    total = 0
    for p in range(start_page, start_page + pages):
        print(f"\n{'='*60}")
        print(f"Scraping page {p} (order={order or 'default'})...")
        print(f"{'='*60}")

        games = scrape(p, order=order)

        out_file = PUBLIC / f"game-resources-p{p}.json"
        out_data = {
            "updated": time.strftime("%Y-%m-%d %H:%M:%S"),
            "count": len(games),
            "page": p,
            "resources": games
        }
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(out_data, f, ensure_ascii=False, indent=2)
        
        total += len(games)
        print(f"\nPage {p}: {len(games)} games saved to {out_file.name}")
        
        if p < start_page + pages - 1:
            time.sleep(3)
    
    print(f"\n{'='*60}")
    print(f"Total: {total} games across {pages} pages")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
