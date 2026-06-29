#!/usr/bin/env python3
"""gamer520.com PC游戏资源爬虫
用法: python game520_scraper.py [页数] [最大游戏数]
"""

import re
import json
import time
import hashlib
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

BASE_URL = "https://www.gamer520.com"
AJAX_URL = f"{BASE_URL}/wp-admin/admin-ajax.php"
LIST_URL = f"{BASE_URL}/pcplay"
OUTPUT_FILE = Path(__file__).parent.parent / "game-resources.json"
PUBLIC_FILE = Path(__file__).parent.parent / "public" / "game-resources.json"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

PASSWORD = "laoquzhang.com"

CATEGORY_KW = {
    "动作": ["动作", "射击", "格斗", "ACT", "FPS"],
    "角色扮演": ["角色扮演", "RPG", "扮演", "冒险"],
    "策略": ["策略", "战棋", "SLG", "RTS"],
    "模拟": ["模拟", "经营", "养成"],
    "竞速": ["竞速", "赛车"],
    "休闲": ["休闲", "益智", "解谜"],
}


def classify(title: str) -> str:
    for cat, kws in CATEGORY_KW.items():
        for kw in kws:
            if kw in title:
                return cat
    return "其他"


def fetch(url: str, referer: str = "", post: dict = None, timeout: int = 30) -> str:
    """使用 curl 获取页面"""
    cmd = ["curl", "-sL", "--compressed", "-m", str(timeout),
           "-H", f"User-Agent: {UA}",
           "-H", "Accept-Language: zh-CN,zh;q=0.9"]
    if referer:
        cmd += ["-H", f"Referer: {referer}"]
    if post:
        cmd += ["-H", "X-Requested-With: XMLHttpRequest",
                "-H", "Accept: application/json"]
        for k, v in post.items():
            cmd += ["--data-urlencode", f"{k}={v}"]
    cmd.append(url)

    try:
        r = subprocess.run(cmd, capture_output=True, timeout=timeout + 5,
                           encoding="utf-8", errors="replace")
        return r.stdout or ""
    except Exception:
        return ""


def game_list(html: str) -> list[tuple[str, str]]:
    """从列表页提取游戏 post_id 和标题"""
    pat = r'href="https://www\.gamer520\.com/(\d+)\.html"\s+title="([^"]*)"\s+rel="bookmark"'
    seen = set()
    res = []
    skip = ["Switch历代", "Switch ", "大气层", "常用插件"]
    for pid, title in re.findall(pat, html):
        if pid in seen:
            continue
        seen.add(pid)
        clean = title.replace("&#038;", "&").replace("&amp;", "&").strip()
        if any(kw in clean for kw in skip) or len(clean) < 5:
            continue
        res.append((pid, clean))
    return res


def api_go(post_id: str) -> str | None:
    """AJAX 获取跳转 URL"""
    resp = fetch(AJAX_URL, referer=f"{BASE_URL}/{post_id}.html",
                 post={"action": "user_down_ajax", "post_id": post_id})
    try:
        d = json.loads(resp)
        if d.get("status") == "1" and d.get("msg"):
            return d["msg"]
    except json.JSONDecodeError:
        pass
    return None


def download_links(html: str) -> dict[str, str]:
    """从 gamers520 下载页提取网盘链接"""
    links = {}

    # 主方案：从 QR 码 data 参数提取（URL 编码的完整链接）
    # HTML 格式: src="...qrserver...&#038;data=https%3A%2F%2Fpan.baidu.com%2Fs%2F..."
    qr_pat = r'(?:data|&#038;data|&amp;data)=(https?%3A%2F%2Fpan\.(?:quark\.cn|baidu\.com)[^"&\s<>]+)'
    for enc in re.findall(qr_pat, html):
        link = unquote(enc)
        if "pan.quark.cn" in link and "quark" not in links:
            links["quark"] = link
        elif "pan.baidu.com" in link and "baidu" not in links:
            links["baidu"] = link

    # 补充方案：直接搜索 (排除侧边栏广告)
    if "quark" not in links:
        q = re.findall(r'https?://pan\.quark\.cn/s/[a-zA-Z0-9]+', html)
        if q:
            links["quark"] = q[0]
    if "baidu" not in links:
        b = re.findall(r'https?://pan\.baidu\.com/s/[a-zA-Z0-9_-]+(?:\?pwd=[a-zA-Z0-9]+)?', html)
        valid = [u for u in b if "dysb" not in u]  # 排除限时特惠广告
        if valid:
            links["baidu"] = valid[0]

    return links


def scrape(page: int = 1, order: str = "") -> list[dict]:
    """抓取一页，order 可选 'hot' 按热度排行"""
    if order == "hot":
        url = f"{LIST_URL}?order=hot" if page == 1 else f"{LIST_URL}/page/{page}?order=hot"
    else:
        url = LIST_URL if page == 1 else f"{LIST_URL}/page/{page}"
    print(f"[P{page}] {url}")

    html = fetch(url)
    if not html:
        print("  No HTML")
        return []

    ids = game_list(html)
    print(f"  {len(ids)} games")

    games = []
    for i, (pid, title) in enumerate(ids):
        short = title[:50] + "..." if len(title) > 50 else title
        print(f"  [{i+1}/{len(ids)}] {short}")

        go = api_go(pid)
        if not go:
            print(f"    skip: no go_url")
            continue

        go_html = fetch(go, referer=f"{BASE_URL}/{pid}.html")
        if not go_html:
            print(f"    skip: no go page")
            continue

        js = re.search(r"window\.location\s*=\s*'([^']+)'", go_html)
        if not js:
            print(f"    skip: no JS redirect")
            continue

        gamers = js.group(1)
        if not gamers.startswith("http"):
            gamers = "https://gamers520.com" + gamers

        dl_html = fetch(gamers, referer=go)
        if not dl_html:
            print(f"    skip: no dl page")
            continue

        links = download_links(dl_html)
        if not links:
            print(f"    skip: no links")
            continue

        name = re.sub(r'\|.*$', '', title).strip()
        desc = title.split("|", 1)[1].strip() if "|" in title else title
        cat = classify(title)

        game = {
            "id": hashlib.md5(pid.encode()).hexdigest()[:8],
            "name": name,
            "category": cat,
            "desc": desc,
            "code": PASSWORD,
            "quarkLink": links.get("quark", ""),
            "baiduLink": links.get("baidu", ""),
            "tags": [cat] if cat != "其他" else [],
            "netdisk": {"showQuark": bool(links.get("quark")), "showBaidu": bool(links.get("baidu"))},
            "sourcePostId": pid,
            "sourceUrl": f"{BASE_URL}/{pid}.html",
        }
        games.append(game)
        q = "Q" if links.get("quark") else "--"
        b = "B" if links.get("baidu") else "--"
        print(f"    [{q}][{b}]")

        time.sleep(2)

    return games


def main():
    pages = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    max_n = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    print(f"=== gamer520 Game Scraper === pages={pages} max={max_n}\n")

    all_games = []
    for p in range(1, pages + 1):
        g = scrape(p)
        all_games.extend(g)
        if len(all_games) >= max_n:
            all_games = all_games[:max_n]
            break
        if p < pages and g:
            time.sleep(3)

    out = {"updated": time.strftime("%Y-%m-%d %H:%M:%S"),
           "count": len(all_games), "resources": all_games}

    for fp in [OUTPUT_FILE, PUBLIC_FILE]:
        fp.parent.mkdir(parents=True, exist_ok=True)
        with open(fp, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"\n=== Done: {len(all_games)} games ===")
    cats = {}
    for g in all_games:
        cats[g["category"]] = cats.get(g["category"], 0) + 1
    print(f"Cats: {cats}")


if __name__ == "__main__":
    main()
