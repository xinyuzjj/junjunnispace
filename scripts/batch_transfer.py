#!/usr/bin/env python3
"""批量转存工具 v2 - 修复版
处理流程:
  1. 从爬取结果读取新游戏
  2. 夸克: share-save → list diff → share (async polling)
  3. 百度: transfer → ls diff → share -d 0
  4. 更新 game-resources.json
"""

import json, re, sys, time, subprocess, os
from pathlib import Path

QUARK_CLI = "C:/Users/Administrator/.workbuddy/skills/quark-drive/scripts/quark_cli.py"
QUARK_HELPER = str(Path(__file__).parent / "quark_share_helper.py")
PYTHON = "C:/Users/Administrator/.workbuddy/binaries/python/versions/3.13.12/python.exe"
QUARK_CWD = "C:/Users/Administrator/.workbuddy/skills/quark-drive"
PUBLIC = Path(__file__).parent.parent / "public"
MAIN_JSON = PUBLIC / "game-resources.json"
QUARK_DIR = "/游戏"
BAIDU_DIR = "游戏资源"  # bdpan 相对路径, 实际保存在 /apps/bdpan/游戏资源/
BAIDU_FULL_DIR = "/apps/bdpan/游戏资源"
QUARK_SHARE_EXPIRY = 4  # 30天

def run(cmd, timeout=300, cwd=None):
    env = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}
    try:
        r = subprocess.run(cmd, capture_output=True, timeout=timeout,
                          encoding="utf-8", errors="replace", env=env, cwd=str(cwd) if cwd else None)
        return r.returncode, r.stdout + r.stderr
    except:
        return -1, "timeout"

def quark_list_dirs():
    """列出 /游戏 下的子目录名（使用 Python API 直接调用）"""
    script = f"""
import sys, json
sys.path.insert(0, "scripts")
from quark_cli import QuarkClient, DRIVE_DOMAIN
client = QuarkClient()
fid = client._resolve_path("{QUARK_DIR}")
result = client.list_files(fid, size=200)
files = result.get("data", {{}}).get("list", [])
for f in files:
    if f.get("file_type") == 0:  # 文件夹
        print(f.get("file_name", ""))
"""
    rc, out = run([PYTHON, "-c", script], timeout=60, cwd=QUARK_CWD)
    dirs = set()
    for line in out.split("\n"):
        name = line.strip()
        if name:
            dirs.add(name)
    return dirs

def quark_share_save_and_get_new(src_link):
    """转存夸克分享，返回新目录名"""
    before = quark_list_dirs()
    print(f"  [夸克] 转存... (现有 {len(before)} 个目录)")
    rc, out = run([PYTHON, QUARK_CLI, "share-save", src_link, "--to", QUARK_DIR], timeout=300, cwd=QUARK_CWD)
    time.sleep(3)
    after = quark_list_dirs()
    new = after - before
    if new:
        name = list(new)[0]
        print(f"    ✓ 新目录: {name[:60]}")
        return name
    # 重试一次
    time.sleep(3)
    after2 = quark_list_dirs()
    new2 = after2 - before
    if new2:
        name = list(new2)[0]
        print(f"    ✓ 新目录: {name[:60]}")
        return name
    print(f"    ⚠ 未找到新目录 (before={len(before)} after={len(after)})")
    return None

def quark_share(dir_name):
    """创建夸克永久分享"""
    print(f"  [夸克] 创建分享: {dir_name[:50]}...")
    rc, out = run([PYTHON, QUARK_HELPER, dir_name], timeout=180, cwd=QUARK_CWD)
    out = out.strip()
    if out.startswith("http"):
        print(f"    ✓ {out[:70]}")
        return out
    print(f"    ✗ {out[:200]}")
    return None

def baidu_list_dirs():
    """列出百度 /apps/bdpan/游戏资源/ 下的子目录"""
    rc, out = run(["bdpan", "ls", BAIDU_FULL_DIR, "--json"], timeout=60)
    dirs = set()
    try:
        # Try JSON parse
        data = json.loads(out)
        for item in data if isinstance(data, list) else data.get("list", []):
            name = item.get("filename") or item.get("server_filename") or ""
            if name:
                dirs.add(name)
    except:
        # Fallback: text parse
        for line in out.split("\n"):
            line = line.strip()
            if line and "/" in line:
                name = line.split("/")[0].strip()
                if name:
                    dirs.add(name)
    return dirs

def baidu_transfer_and_get_new(src_link):
    """转存百度分享，返回新目录名"""
    before = baidu_list_dirs()
    print(f"  [百度] 转存... (现有 {len(before)} 个目录)")
    # 从链接中提取 pwd
    pwd = ""
    m = re.search(r'[?&]pwd=([a-zA-Z0-9]+)', src_link)
    if m:
        pwd = m.group(1)
    cmd = ["bdpan", "transfer", src_link, "-d", BAIDU_DIR]
    if pwd:
        cmd += ["-p", pwd]
    rc, out = run(cmd, timeout=300)
    print(f"    bdpan: {out.strip()[-200:] if len(out) > 200 else out.strip()}")
    time.sleep(3)
    after = baidu_list_dirs()
    new = after - before
    if new:
        name = list(new)[0]
        print(f"    ✓ 新目录: {name[:60]}")
        return name
    # 如果 bdpan 说已存在
    if "已存在" in out or "already" in out:
        print(f"    ⚠ 文件可能已存在，返回 True")
        return "__exists__"
    print(f"    ⚠ 未找到新目录 (before={len(before)} after={len(after)})")
    return None

def baidu_share(dir_name):
    """百度永久分享"""
    path = f"{BAIDU_FULL_DIR}/{dir_name}"
    print(f"  [百度] 创建永久分享: {path[:50]}...")
    rc, out = run(["bdpan", "share", path, "-d", "0"], timeout=180)
    for m in re.finditer(r'https?://pan\.baidu\.com/s/\S+', out):
        url = m.group().rstrip()
        print(f"    ✓ {url[:70]}")
        return url
    print(f"    ✗ 未找到链接: {out[:200]}")
    return None

# ============================================================

def main():
    batch_n = int(sys.argv[1]) if len(sys.argv) > 1 else 8
    
    # 加载已有
    existing = []
    existing_names = set()
    if MAIN_JSON.exists():
        existing = json.load(open(MAIN_JSON, "r", encoding="utf-8")).get("resources", [])
        existing_names = set(g["name"] for g in existing)
    print(f"现有: {len(existing_names)} 个游戏")
    
    # 收集待处理
    all_scraped = []
    # Also load game-resources-source.json
    for pattern in ["game-resources-source.json", "game-resources-p*.json"]:
        for f in sorted(PUBLIC.glob(pattern)):
            data = json.load(open(f, "r", encoding="utf-8"))
            all_scraped.extend(data.get("resources", []))
    
    pending = []
    for g in all_scraped:
        if g["name"] not in existing_names:
            existing_names.add(g["name"])
            pending.append(g)
    
    print(f"待处理: {len(pending)} 个")
    if not pending:
        print("没有新游戏！")
        return
    
    todo = pending[:batch_n]
    print(f"本次: {len(todo)} 个\n")
    
    results = []
    success_count = 0
    for i, g in enumerate(todo):
        name = g["name"].split("|")[0].strip()
        quark_src = g.get("quarkLink", "")
        baidu_src = g.get("baiduLink", "")
        
        print(f"\n{'='*55}")
        print(f"[{i+1}/{len(todo)}] {name[:45]}")
        print(f"{'='*55}")
        
        ng = dict(g)
        
        # 夸克
        if quark_src:
            dir_name = quark_share_save_and_get_new(quark_src)
            if dir_name:
                qlink = quark_share(dir_name)
                if qlink:
                    ng["quarkLink"] = qlink
                    print(f"    📦 夸克链接已更新")
        
        # 百度
        if baidu_src:
            dir_name = baidu_transfer_and_get_new(baidu_src)
            if dir_name:
                if dir_name == "__exists__":
                    print(f"    ⚠ 文件已存在，跳过分享")
                else:
                    blink = baidu_share(dir_name)
                    if blink:
                        ng["baiduLink"] = blink
                        print(f"    📦 百度链接已更新")
        
        results.append(ng)
        
        # 保存
        all_games = existing + results
        with open(MAIN_JSON, "w", encoding="utf-8") as f:
            json.dump({"updated": time.strftime("%Y-%m-%d %H:%M:%S"),
                       "count": len(all_games), "resources": all_games},
                      f, ensure_ascii=False, indent=2)
        
        success_count += 1
        print(f"    💾 已保存 ({len(all_games)} 个游戏)")
    
    print(f"\n{'='*55}")
    print(f"✅ 完成！{len(existing) + len(results)} 个游戏 ({len(existing)} 已有 + {success_count} 新增)")
    print(f"{'='*55}")

if __name__ == "__main__":
    main()
