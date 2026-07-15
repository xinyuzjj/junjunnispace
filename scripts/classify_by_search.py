"""按真实游戏数据库（Steam 商店 API，免费、无需 key）为 376 款游戏重新分类。

思路：
  1. 对每款游戏，先用 Steam storesearch 按游戏名检索，取首个匹配；
  2. 拉取该游戏的 genres（官方类型），映射到本站 12 个分类之一；
  3. Steam 不把“射击/格斗/恐怖”作为独立主类型（通常并入“动作”），
     因此这三类的精准判定用游戏名关键词兜底（仅作覆盖，不扩大误判）；
  4. Steam 无结果时，回退到名称推断（classify_name）作为最佳努力。

结果写入 category + tags，并额外记录 genreSource（steam/name/other）便于追溯。
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse

sys.path.insert(0, "scripts")
from reclassify_genres import classify_name  # 名称推断兜底

DATA_FILES = ["game-resources.json", "public/game-resources.json", "out/game-resources.json"]
CACHE_FILE = "scripts/steam_cache.json"
REPORT_FILE = "scripts/classify_report.txt"

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

# Steam 官方类型 → 本站分类（1:1 映射）
STEAM_GENRE_MAP = {
    "竞速": "竞速",
    "角色扮演": "角色扮演",
    "策略": "策略",
    "模拟": "模拟",
    "冒险": "冒险",
    "独立": "独立",
    "休闲": "休闲",
    "解谜": "解谜",
    "动作": "动作",
    "大型多人在线": "角色扮演",
    "体育": "其他",
    "早期试用": "其他",
}
# 多类型时的挑选规则（见 pick_steam）：优先 竞速；纯 RPG（无动作）才判 RPG；
# 含 动作 的动作/RPG/生存类一律归 动作；其余按此顺序兜底。
STEAM_PRIORITY = ["竞速", "策略", "模拟", "解谜", "冒险", "独立", "休闲"]

# Steam 缺失的子类，用名称关键词兜底（仅取无歧义词，避免误判）
SUB_KW = {
    "射击": ["使命召唤", "毁灭战士", "孤岛惊魂", "生化危机", "光环", "战地", "孤岛危机",
             "狙击", "反恐", "彩虹六号", "求生之路", "无主之地", "穿越火线", "绝地求生",
             "武装突袭", "DOOM", "FPS", "幽灵", "黑色行动", "射击", "枪战", "突袭", "战地"],
    "格斗": ["拳皇", "街头霸王", "街霸", "铁拳", "死或生", "生或死", "罪恶装备", "格斗",
             "VR战士", "龙珠斗士", "武术", "格斗"],
    "恐怖": ["寂静岭", "丧尸", "僵尸", "七日杀", "死亡空间", "零~", "昏迷", "笼子",
             "隔离区", "恐怖", "异形", "生化女神", "地狱丧钟", "尸姬", "灰烬之国"],
}

# 名称清洗：去掉版本/ editions 后缀，提升 Steam 匹配率
SUFFIXES = ["豪华中文版", "豪华版", "黄金版", "年度版", "完整版", "典藏版", "终极版",
            "限定版", "中文版", "免安装", "破解版", "绿色版", "正版", "steam版",
            "全dlc", "预购奖励", "修改器", "豪华", "破解", "版"]


def normalize(name: str) -> str:
    n = re.sub(r"[（(].*?[)）]", "", name)        # 去掉括号及内容
    n = n.replace("：", " ").replace(":", " ")
    for s in SUFFIXES:
        n = n.replace(s, " ")
    n = re.sub(r"\s+", " ", n).strip()
    return n


def _name_score(term: str, cand: str) -> float:
    """名字相似度：包含关系给满分，否则用字符 Jaccard 重叠率。"""
    t = re.sub(r"\s+", "", term.lower())
    c = re.sub(r"\s+", "", cand.lower())
    if not t or not c:
        return 0.0
    if t in c or c in t:
        return 1.0
    # 去掉常见符号再算重叠
    t2 = re.sub(r"[®©:·\-_']", "", t)
    c2 = re.sub(r"[®©:·\-_']", "", c)
    if t2 and (t2 in c or c in t2):
        return 1.0
    st, sc = set(t2), set(c2)
    if not st or not sc:
        return 0.0
    return len(st & sc) / len(st | sc)


def steam_search(term: str):
    """返回 (matched_name, [genres]) 或 None。带缓存。
    从候选列表里挑名字最像的那款（而非死用第 1 条）。"""
    cache = load_cache()
    if term in cache:
        return cache[term]
    try:
        url = "https://store.steampowered.com/api/storesearch/?term=" + urllib.parse.quote(term) + "&cc=us&l=schinese"
        req = urllib.request.Request(url, headers=UA)
        data = json.load(urllib.request.urlopen(req, timeout=15))
        items = data.get("items", [])
        if not items:
            res = None
        else:
            # 挑相似度最高的候选
            best = max(items, key=lambda it: _name_score(term, it.get("name", "")))
            if _name_score(term, best.get("name", "")) < 0.15:
                res = None  # 没有像样的匹配，交给名称兜底
            else:
                aid = best["id"]
                durl = "https://store.steampowered.com/api/appdetails?appids=%s&cc=us&l=schinese" % aid
                req2 = urllib.request.Request(durl, headers=UA)
                det = json.load(urllib.request.urlopen(req2, timeout=15))
                gd = det.get(str(aid), {}).get("data", {})
                genres = [g["description"] for g in gd.get("genres", [])]
                res = (best["name"], genres)
    except Exception:
        res = None
    cache[term] = res
    save_cache(cache)
    return res


def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            return json.load(open(CACHE_FILE, encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_cache(c):
    json.dump(c, open(CACHE_FILE, "w", encoding="utf-8"), ensure_ascii=False)


def pick_steam(genres):
    """Steam 多类型挑选规则：
    1) 竞速 优先（最明确）
    2) 纯 RPG（含 角色扮演 且不含 动作）→ RPG
    3) 含 动作 → 动作（动作/RPG/生存类统一归动作，避免僵尸生存误判为 RPG）
    4) 其余按 STEAM_PRIORITY 顺序兜底
    """
    if not genres:
        return None
    has = set(genres)
    if "竞速" in has:
        return "竞速"
    if "角色扮演" in has and "动作" not in has:
        return "角色扮演"
    if "动作" in has:
        return "动作"
    if "角色扮演" in has:
        return "角色扮演"
    for cat in STEAM_PRIORITY:
        if cat in has:
            return cat
    return None


def name_subcat(name: str):
    for cat, kws in SUB_KW.items():
        for kw in kws:
            if kw.lower() in name.lower():
                return cat
    return None


def classify_game(g):
    name = g.get("name", "")
    # 1) Steam 检索（先用清洗名，失败再用原名）
    info = steam_search(normalize(name)) or steam_search(name)
    # 2) 去掉阿拉伯数字后用系列名再搜（续作/重制版靠同系列前作定类型）
    if not info:
        base = re.sub(r"\d+", "", normalize(name)).strip()
        base = re.sub(r"\s+", " ", base)
        # 至少保留 2 个中文字/字母，避免搜到空泛词
        if len(re.sub(r"\s", "", base)) >= 2:
            info = steam_search(base)
    # 3) 英文名兜底（仅取字母词，排除纯数字 token，避免 "2" 命中 CS2）
    if not info:
        latin = " ".join(re.findall(r"[A-Za-z]{3,}", name))
        if latin:
            info = steam_search(latin)
    steam_genres = info[1] if info else []
    steam_cat = pick_steam(steam_genres)
    # 2) 子类兜底（仅 Steam 缺失的 射击/格斗/恐怖）
    sub = name_subcat(name)
    if sub:
        final = sub
        source = "name-sub"
    elif steam_cat:
        final = steam_cat
        source = "steam"
    else:
        fallback = classify_name(name)
        final = fallback if fallback != "其他" else "其他"
        source = "name" if fallback != "其他" else "other"
    return final, source, steam_genres, (info[0] if info else None)


def save_data(data):
    """增量落盘：每处理一批就写回三处，避免被中断时全部丢失。"""
    for f in DATA_FILES:
        if os.path.exists(f):
            json.dump(data, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


def main():
    # 清掉“匹配名对不上”的旧缓存，强制用改进匹配重查
    cache = load_cache()
    bad_terms = [t for t, v in cache.items()
                 if v and _name_score(t, v[0]) < 0.15]
    for t in bad_terms:
        del cache[t]
    if bad_terms:
        save_cache(cache)
        print("已清理 %d 条错误匹配缓存，将重新检索" % len(bad_terms), flush=True)

    # 以 public 为权威来源读取
    data = json.load(open("public/game-resources.json", encoding="utf-8"))
    res = data["resources"]
    report = []
    counts = {}
    for i, g in enumerate(res):
        final, source, genres, matched = classify_game(g)
        g["category"] = final
        g["tags"] = [final] if final != "其他" else []
        g["genreSource"] = source
        counts[final] = counts.get(final, 0) + 1
        report.append("%s\t%s\t%s\t%s\t%s" % (
            g.get("name", ""), source, final, "/".join(genres), matched or ""))
        if (i + 1) % 25 == 0:
            save_data(data)  # 增量落盘
            print("进度 %d/%d  已落盘" % (i + 1, len(res)), flush=True)
        time.sleep(0.2)

    # 收尾写回三处 + 报告
    save_data(data)
    with open(REPORT_FILE, "w", encoding="utf-8") as fh:
        fh.write("游戏名\t来源\t分类\tSteam类型\tSteam匹配名\n")
        fh.write("\n".join(report) + "\n")

    print("\n=== 分类结果 ===")
    for k, v in sorted(counts.items(), key=lambda x: -x[1]):
        print("  %s: %d" % (k, v))
    steam_n = sum(1 for r in report if r.split("\t")[1] == "steam")
    print("\nSteam 命中: %d  名称子类: %d  名称兜底: %d  其他: %d" % (
        steam_n,
        sum(1 for r in report if r.split("\t")[1] == "name-sub"),
        sum(1 for r in report if r.split("\t")[1] == "name"),
        sum(1 for r in report if r.split("\t")[1] == "other"),
    ))


if __name__ == "__main__":
    main()
