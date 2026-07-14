#!/usr/bin/env python3
"""gamer520.com PC游戏资源爬虫
用法: python game520_scraper.py [页数] [最大游戏数]

流程：
1. 加载已有游戏数据（保留自有网盘链接）
2. 补抓已有游戏的封面/截图/详情（不触碰链接）
3. 抓取新游戏（获取源链接+详情）
4. 转存源链接到用户自己的夸克/百度网盘
5. 创建分享链接填充 quarkLink/baiduLink
6. 写入文件
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


def parse_detail(post_id: str) -> dict:
    """从原帖页面提取封面图、截图、简介、详细介绍"""
    url = f"{BASE_URL}/{post_id}.html"
    html = fetch(url, timeout=20)
    info = {"coverImage": "", "screenshots": [], "brief": "", "details": "", "info": {}}

    if not html:
        return info

    # 封面图：优先 ssgc-main-banner，其次 og:image
    m = re.search(r'ssgc-main-banner[^>]*src="([^"]+)"', html)
    if m:
        info["coverImage"] = m.group(1)
    else:
        m = re.search(r'og:image"\s+content="([^"]+)"', html)
        if m:
            info["coverImage"] = m.group(1)

    # 截图列表：ssgc-shot-img
    shots = re.findall(r'ssgc-shot-img[^>]*src="([^"]+)"', html)
    info["screenshots"] = shots[:6]

    # 游戏简介：ssgc-brief-panel 内的文本
    m = re.search(r'ssgc-brief-panel.*?<p[^>]*>(.*?)</p>', html, re.DOTALL)
    if m:
        brief = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        brief = brief.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
        info["brief"] = brief[:300]

    # 详细介绍：ssgc-details-body 内的文本
    m = re.search(r'ssgc-details-body">(.*?)</div>', html, re.DOTALL)
    if m:
        raw = m.group(1)
        text = re.sub(r'<br\s*/?>', '\n', raw)
        text = re.sub(r'</?p[^>]*>', '\n', text)
        text = re.sub(r'</?li[^>]*>', '\n', text)
        text = re.sub(r'</?[ou]l[^>]*>', '', text)
        text = re.sub(r'</?h[0-9][^>]*>', '\n', text)
        text = re.sub(r'</?strong[^>]*>', '', text)
        text = re.sub(r'</?span[^>]*>', '', text)
        text = re.sub(r'<img[^>]*>', '', text)
        text = re.sub(r'<video[^>]*>.*?</video>', '', text, flags=re.DOTALL)
        text = re.sub(r'<[^>]+>', '', text)
        text = text.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
        text = text.replace("&#038;", "&").replace("&nbsp;", " ")
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        info["details"] = '\n'.join(lines)[:2000]

    # 信息标签
    for tag in re.finditer(r'ssgc-tag-item.*?<strong>(.*?)</strong>(.*?)</div>', html, re.DOTALL):
        key = re.sub(r'<[^>]+>', '', tag.group(1)).strip().rstrip('：:')
        val = re.sub(r'<[^>]+>', '', tag.group(2)).strip()
        if key and val:
            info["info"][key] = val

    return info


def download_links(html: str) -> dict[str, str]:
    """从 gamers520 下载页提取网盘链接"""
    links = {}

    # 主方案：从 QR 码 data 参数提取
    qr_pat = r'(?:data|&#038;data|&amp;data)=(https?%3A%2F%2Fpan\.(?:quark\.cn|baidu\.com)[^"&\s<>]+)'
    for enc in re.findall(qr_pat, html):
        link = unquote(enc)
        if "pan.quark.cn" in link and "quark" not in links:
            links["quark"] = link
        elif "pan.baidu.com" in link and "baidu" not in links:
            links["baidu"] = link

    # 补充方案：直接搜索
    if "quark" not in links:
        q = re.findall(r'https?://pan\.quark\.cn/s/[a-zA-Z0-9]+', html)
        if q:
            links["quark"] = q[0]
    if "baidu" not in links:
        b = re.findall(r'https?://pan\.baidu\.com/s/[a-zA-Z0-9_-]+(?:\?pwd=[a-zA-Z0-9]+)?', html)
        valid = [u for u in b if "dysb" not in u]
        if valid:
            links["baidu"] = valid[0]

    return links


def resolve_source_links(pid: str) -> dict[str, str]:
    """统一解析游戏源下载链接（网盘链接）。

    两条通道（互补）：
    1) 主通道：ajax user_down_ajax → go_url(https://www.gamer520.com/go?post_id=)
       → 跟随 JS 跳转到真实下载页 gamers520.com/{下载页id}.html → 提取链接
       （文章 id ≠ 下载页 id，必须走这个跳转拿到正确下载页）
    2) 兜底：直接抓 gamers520.com/{pid}.html（当文章 id 恰好等于下载页 id 时有效）
    返回 {"quark": ..., "baidu": ...}（可能只含其中之一或为空）。
    """
    # --- 通道1：ajax → go_url → JS 跳转 ---
    go = api_go(pid)
    if go:
        go_html = fetch(go, referer=f"{BASE_URL}/{pid}.html")
        if go_html:
            m = re.search(r"window\.location\s*=\s*'([^']+)'", go_html)
            if m:
                dl_url = m.group(1)
                if not dl_url.startswith("http"):
                    dl_url = "https://gamers520.com" + dl_url
                dl_html = fetch(dl_url, referer=go)
                if dl_html:
                    links = download_links(dl_html)
                    if links.get("quark") or links.get("baidu"):
                        return links

    # --- 通道2：直抓同 id 下载页（兜底）---
    dl_html = fetch(f"https://gamers520.com/{pid}.html",
                    referer=f"{BASE_URL}/{pid}.html")
    if dl_html:
        links = download_links(dl_html)
        if links.get("quark") or links.get("baidu"):
            return links

    return {}


# ============================================================
# 夸克网盘 API 辅助类
# ============================================================

class QuarkShareHelper:
    """夸克网盘转存+分享自动化（使用 Cookie header 方式调用 API）"""

    DRIVE_BASE = "https://drive-pc.quark.cn"
    PARAMS = {"pr": "ucpro", "fr": "pc", "uc_param_str": ""}
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"

    def __init__(self):
        config_path = Path.home() / ".workbuddy" / "quark-drive" / "config.json"
        if config_path.exists():
            self.cookie = json.loads(config_path.read_text()).get("cookie", "")
        else:
            self.cookie = ""
        if not self.cookie:
            print("  ⚠️ 夸克 Cookie 未配置")
        self.quark_ok = bool(self.cookie) and "__pus" in self.cookie
        if self.cookie and not self.quark_ok:
            print("  ⚠️ 夸克 Cookie 无效（缺少登录态 __pus），将跳过夸克转存")
        self.client = httpx_init(self.cookie)

    def _api(self, method: str, path: str, json_data=None, extra_params=None) -> dict:
        params = {**self.PARAMS, **(extra_params or {})}
        url = f"{self.DRIVE_BASE}{path}"
        try:
            if method == "GET":
                resp = self.client.get(url, params=params)
            elif method == "POST":
                resp = self.client.post(url, params=params, json=json_data)
            else:
                return {}
            return resp.json()
        except Exception as e:
            print(f"  ⚠️ 夸克API错误: {e}")
            return {}

    def _get_fid_by_path(self, path_parts: list[str]) -> str | None:
        """逐级导航获取文件夹 fid"""
        current_fid = "0"
        for i, part in enumerate(path_parts):
            result = self._api("GET", "/1/clouddrive/file/sort",
                               extra_params={"pdir_fid": current_fid, "_page": "1", "_size": "200"})
            items = result.get("data", {}).get("list", [])
            found = False
            for item in items:
                if item.get("file_name") == part:
                    current_fid = item["fid"]
                    found = True
                    break
            if not found:
                return None
        return current_fid

    def _list_folder(self, pdir_fid: str, size: int = 200) -> list:
        """列举文件夹内文件，返回 list"""
        r = self._api("GET", "/1/clouddrive/file/sort",
                      extra_params={"pdir_fid": pdir_fid, "_page": "1", "_size": str(size)})
        return r.get("data", {}).get("list", [])

    def search_fid(self, name: str) -> str | None:
        """搜索文件/文件夹 fid"""
        result = self._api("GET", "/1/clouddrive/file/search",
                           extra_params={"q": name, "_page": "1", "_size": "10"})
        for item in result.get("data", {}).get("list", []):
            if item.get("file_name") == name:
                return item["fid"]
        return None

    def transfer_and_share(self, source_url: str, passcode: str, game_name: str) -> str | None:
        """转存源夸克分享到用户网盘 → 创建新分享链接 → 返回分享URL"""
        if not self.quark_ok:
            return None

        # 1. 提取 pwd_id
        m = re.search(r'/s/([a-f0-9]+)', source_url)
        if not m:
            print(f"  ⚠️ 无效夸克链接: {source_url}")
            return None
        pwd_id = m.group(1)

        # 2. 获取 stoken
        token_result = self._api("POST", "/1/clouddrive/share/sharepage/token",
                                 json_data={"pwd_id": pwd_id, "passcode": passcode,
                                            "support_visit_limit_private_share": True})
        stoken = token_result.get("data", {}).get("stoken")
        if not stoken:
            print(f"  ⚠️ 获取夸克stoken失败: {token_result.get('message', '')}")
            return None

        # 3. 获取分享详情（文件列表）
        detail_result = self._api("GET", "/1/clouddrive/share/sharepage/detail",
                                  extra_params={"pwd_id": pwd_id, "stoken": stoken,
                                                 "pdir_fid": "0", "force": "0",
                                                 "_page": "1", "_size": "200", "_fetch_share": "1"})
        file_list = detail_result.get("data", {}).get("list", [])
        if not file_list:
            print(f"  ⚠️ 夸克分享无文件: {pwd_id}")
            return None

        # 转存进来的文件保留源分享的原始名称（不一定等于游戏名）
        transferred_names = [f.get("file_name") for f in file_list if f.get("file_name")]

        # 4. 转存到 /游戏/ 文件夹
        game_fid = self._get_fid_by_path(["游戏"])
        if not game_fid:
            print("  ⚠️ 夸克 /游戏/ 文件夹不存在")
            return None

        # 转存前快照 + 当前文件夹清单（按原始文件名匹配，处理已转存过的游戏）
        before = {it.get("fid") for it in self._list_folder(game_fid)}
        folder_items = self._list_folder(game_fid)

        share_fids = []
        for nm in transferred_names:
            for it in folder_items:
                if it.get("file_name") == nm and it.get("fid") not in share_fids:
                    share_fids.append(it["fid"])
                    break

        if share_fids:
            print(f"  ℹ️ 夸克已有 {game_name}（{len(share_fids)}项），直接分享")
        else:
            fid_list = [f.get("fid", "") for f in file_list]
            fid_token_list = [f.get("share_fid_token", "") for f in file_list]

            save_data = {
                "fid_list": fid_list,
                "fid_token_list": fid_token_list,
                "to_pdir_fid": game_fid,
                "pwd_id": pwd_id,
                "stoken": stoken,
                "pdir_fid": "0",
                "pdir_save_all": True,
                "exclude_fids": [],
                "scene": "link",
            }
            save_result = self._api("POST", "/1/clouddrive/share/sharepage/save", json_data=save_data)
            if save_result.get("status") != 200:
                print(f"  ⚠️ 夸克转存失败: {save_result.get('message', '')}")
                return None
            print(f"  ✅ 夸克转存成功")

            # 等待转存完成，用「快照差集」定位新增文件（比按名搜索可靠）
            time.sleep(3)
            after = self._list_folder(game_fid)
            new_fids = [it["fid"] for it in after if it.get("fid") not in before]
            for nm in transferred_names:
                for it in after:
                    if it.get("file_name") == nm and it["fid"] not in share_fids:
                        share_fids.append(it["fid"])
                        break
            if not share_fids:
                share_fids = new_fids  # 兜底：取全部新增文件

        if not share_fids:
            print(f"  ⚠️ 夸克找不到转存后的文件（{game_name}）")
            return None

        # 5. 创建分享链接（分享所有转存进来的项）
        # expired_type 实测映射: 1=无期限(永久), 2=1天, 3=7天, 4=30天
        share_result = self._api("POST", "/1/clouddrive/share",
                                 json_data={"fid_list": share_fids, "title": game_name,
                                            "url_type": 1, "expired_type": 1})
        task_id = share_result.get("data", {}).get("task_id")
        if not task_id:
            share_id_direct = share_result.get("data", {}).get("share_id")
            if share_id_direct:
                return self._get_share_url(share_id_direct)
            print(f"  ⚠️ 夸克创建分享失败: {share_result}")
            return None

        # 6. 等待并查询任务获取 share_id
        for retry in range(5):
            time.sleep(2)
            task_result = self._api("GET", "/1/clouddrive/task",
                                    extra_params={"task_id": task_id, "retry_index": str(retry)})
            share_id = task_result.get("data", {}).get("share_id")
            if share_id:
                return self._get_share_url(share_id)

        print(f"  ⚠️ 夸克分享任务未完成")
        return None

    def reshare_existing(self, share_url: str, game_name: str) -> str | None:
        """把已有（可能30天）的夸克分享，用其文件重新生成一个【无期限】分享链接。

        流程：取自有分享 stoken → 读文件列表 → 用相同 fid 重新创建 expired_type=1 的分享。
        """
        if not self.quark_ok:
            return None
        m = re.search(r"/s/([a-f0-9]+)", share_url)
        if not m:
            return None
        pwd_id = m.group(1)
        tok = self._api("POST", "/1/clouddrive/share/sharepage/token",
                        json_data={"pwd_id": pwd_id, "passcode": "",
                                   "support_visit_limit_private_share": True})
        stoken = tok.get("data", {}).get("stoken")
        if not stoken:
            print(f"  ⚠️ 取自有分享stoken失败: {tok.get('message', '')}")
            return None
        det = self._api("GET", "/1/clouddrive/share/sharepage/detail",
                        extra_params={"pwd_id": pwd_id, "stoken": stoken,
                                       "pdir_fid": "0", "force": "0",
                                       "_page": "1", "_size": "200", "_fetch_share": "1"})
        file_list = det.get("data", {}).get("list", [])
        if not file_list:
            print(f"  ⚠️ 读取自有分享文件失败")
            return None
        fid_list = [f.get("fid") for f in file_list if f.get("fid")]
        fid_token_list = [f.get("share_fid_token") for f in file_list if f.get("share_fid_token")]
        # 重新生成【无期限】分享（expired_type=1 = 永久）
        r = self._api("POST", "/1/clouddrive/share",
                      json_data={"fid_list": fid_list, "fid_token_list": fid_token_list,
                                 "title": game_name, "url_type": 1, "expired_type": 1})
        task_id = r.get("data", {}).get("task_id")
        if not task_id:
            print(f"  ⚠️ 重新分享失败: {r}")
            return None
        for retry in range(5):
            time.sleep(2)
            t = self._api("GET", "/1/clouddrive/task",
                          extra_params={"task_id": task_id, "retry_index": str(retry)})
            share_id = t.get("data", {}).get("share_id")
            if share_id:
                return self._get_share_url(share_id)
        print(f"  ⚠️ 重新分享任务未完成")
        return None

    def _get_share_url(self, share_id: str) -> str | None:
        """从 share_id 获取分享 URL"""
        pwd_result = self._api("POST", "/1/clouddrive/share/password",
                               json_data={"share_id": share_id})
        share_url = pwd_result.get("data", {}).get("share_url")
        if share_url:
            print(f"  ✅ 夸克分享链接: {share_url}")
        return share_url


def httpx_init(cookie: str) -> "httpx.Client":
    """初始化 httpx 客户端（使用 Cookie header 方式）"""
    import httpx
    return httpx.Client(timeout=30.0, headers={
        "User-Agent": QuarkShareHelper.UA,
        "Cookie": cookie,
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Origin": "https://pan.quark.cn",
        "Referer": "https://pan.quark.cn/",
    }, follow_redirects=True)


# ============================================================
# 百度网盘辅助函数（使用 bdpan CLI）
# ============================================================

def baidu_transfer_and_share(source_url: str, password: str, game_name: str) -> str | None:
    """转存源百度分享到用户网盘 → 创建新分享 → 返回分享URL"""
    # 提取密码（URL中可能有 ?pwd=xxxx）
    pwd_match = re.search(r'pwd=([a-zA-Z0-9]{4})', source_url)
    pwd = pwd_match.group(1) if pwd_match else password

    # 1. 转存
    try:
        cmd = ["bdpan", "transfer", source_url, "-p", pwd, "-d", f"游戏资源/{game_name}"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if "成功" not in result.stdout and result.returncode != 0:
            print(f"  ⚠️ 百度转存失败: {result.stdout[:200]}")
            return None
        print(f"  ✅ 百度转存成功")
    except Exception as e:
        print(f"  ⚠️ 百度转存异常: {e}")
        return None

    # 2. 创建分享
    try:
        cmd = ["bdpan", "share", f"游戏资源/{game_name}"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        # 解析分享链接
        m = re.search(r'https://pan\.baidu\.com/s/[a-zA-Z0-9_-]+(?:\?pwd=[a-zA-Z0-9]+)?', result.stdout)
        if m:
            share_url = m.group(0)
            print(f"  ✅ 百度分享链接: {share_url}")
            return share_url
        print(f"  ⚠️ 百度分享输出: {result.stdout[:200]}")
    except Exception as e:
        print(f"  ⚠️ 百度分享异常: {e}")
    return None


# ============================================================
# 爬虫核心逻辑
# ============================================================

def scrape(page: int = 1, order: str = "") -> list[dict]:
    """抓取一页新游戏（获取详情 + 源下载链接）"""
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

        name = re.sub(r'\|.*$', '', title).strip()
        desc = title.split("|", 1)[1].strip() if "|" in title else title
        cat = ""  # 用户要求不做分类

        # 抓取详情页
        detail = parse_detail(pid)

        # 抓取源下载链接（统一解析：ajax→go_url→跳转 为主，直抓为兜底）
        source_links = resolve_source_links(pid)

        game = {
            "id": hashlib.md5(pid.encode()).hexdigest()[:8],
            "name": name,
            "category": "",
            "desc": detail.get("brief") or desc,
            "versionInfo": desc,
            "code": PASSWORD,
            "quarkLink": "",
            "baiduLink": "",
            "tags": [],
            "netdisk": {"showQuark": False, "showBaidu": False},
            "sourcePostId": pid,
            "sourceUrl": f"{BASE_URL}/{pid}.html",
            "sourceQuarkLink": source_links.get("quark", ""),
            "sourceBaiduLink": source_links.get("baidu", ""),
            "coverImage": detail.get("coverImage", ""),
            "screenshots": detail.get("screenshots", []),
            "details": detail.get("details", ""),
            "info": detail.get("info", {}),
        }
        games.append(game)
        sq = "SQ" if source_links.get("quark") else "--"
        sb = "SB" if source_links.get("baidu") else "--"
        c = "C" if detail.get("coverImage") else "--"
        s = len(detail.get("screenshots", []))
        print(f"    [{sq}][{sb}][{c}] shots={s}")

        time.sleep(2)

    return games


def enrich_existing(games: list[dict], delay: float = 1.0) -> list[dict]:
    """为已有游戏补抓封面图、截图、详细介绍（不修改链接）"""
    total = len(games)
    need = sum(1 for g in games if not g.get("coverImage") and not g.get("screenshots"))
    if need == 0:
        print("All games already have cover/screenshots, skipping enrich.\n")
        return games
    print(f"\n=== Enriching {need}/{total} games (missing cover/screenshots) ===\n")

    enriched = []
    done = 0
    for i, g in enumerate(games):
        if g.get("coverImage") or g.get("screenshots"):
            enriched.append(g)
            continue

        pid = g.get("sourcePostId", "")
        if not pid:
            enriched.append(g)
            continue

        detail = parse_detail(pid)
        g["coverImage"] = detail.get("coverImage", g.get("coverImage", ""))
        g["screenshots"] = detail.get("screenshots", g.get("screenshots", []))
        if detail.get("brief") and not g.get("desc"):
            g["desc"] = detail["brief"]
        g["details"] = detail.get("details", g.get("details", ""))
        g["info"] = detail.get("info", g.get("info", {}))

        done += 1
        c = "C" if g.get("coverImage") else "--"
        s = len(g.get("screenshots", []))
        print(f"  [{done}/{need}] {g.get('name','?')[:35]} [{c}] shots={s}")

        enriched.append(g)
        if done < need:
            time.sleep(delay)

    print(f"\n=== Enrich done: {done} games updated ===\n")
    return enriched


def load_existing(path: Path) -> tuple[list[dict], set[str]]:
    """加载已有游戏数据，返回 (列表, 已存在ID集合)"""
    if not path.exists():
        return [], set()
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        existing = data.get("resources", [])
        ids = {g.get("id", "") for g in existing}
        return existing, ids
    except Exception:
        return [], set()


def fill_links(game: dict, quark_helper: QuarkShareHelper | None) -> dict:
    """为游戏填充自有网盘链接：转存源链接 → 创建分享"""
    sq = game.get("sourceQuarkLink", "")
    sb = game.get("sourceBaiduLink", "")

    # 夸克转存+分享
    if sq and quark_helper:
        quark_url = quark_helper.transfer_and_share(sq, PASSWORD, game["name"])
        if quark_url:
            game["quarkLink"] = quark_url
            game["netdisk"]["showQuark"] = True

    # 百度转存+分享
    if sb:
        baidu_url = baidu_transfer_and_share(sb, PASSWORD, game["name"])
        if baidu_url:
            game["baiduLink"] = baidu_url
            game["netdisk"]["showBaidu"] = True

    return game


def main():
    pages = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    max_n = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    print(f"=== gamer520 Game Scraper === pages={pages} max={max_n}\n")

    # 1. 加载已有数据（以 public/game-resources.json 为主数据源）
    existing_games, existing_ids = load_existing(PUBLIC_FILE)
    print(f"Loaded {len(existing_games)} existing games, {len(existing_ids)} unique IDs\n")

    # 2. 补抓已有游戏中缺少的封面/截图/详情（不触碰链接）
    existing_games = enrich_existing(existing_games)

    # 3. 初始化夸克网盘辅助类
    quark_helper = QuarkShareHelper()

    # 4. 抓取新游戏（获取详情+源链接），只收集「新」的游戏，最多 max_n 个
    new_games = []
    new_ids = set()
    for p in range(1, pages + 1):
        g = scrape(p)
        if g:
            for game in g:
                if game["id"] in existing_ids or game["id"] in new_ids:
                    continue
                new_ids.add(game["id"])
                new_games.append(game)
        if len(new_games) >= max_n:
            break
        if p < pages:
            time.sleep(3)

    # 5. 去重后追加到已有列表末尾（精确截取 max_n）
    actually_new = new_games[:max_n]
    print(f"\nNew unique games: {len(actually_new)} / scraped: {len(new_games)}")

    # 6. 为新游戏转存+分享源链接，填充自有网盘链接
    print(f"\n=== Transferring & Sharing {len(actually_new)} new games ===\n")
    for ng in actually_new:
        print(f"  🔗 {ng['name'][:35]}")
        fill_links(ng, quark_helper)

    all_games = existing_games + actually_new

    # 7. 写入文件
    out = {"updated": time.strftime("%Y-%m-%d %H:%M:%S"),
           "count": len(all_games), "resources": all_games}

    for fp in [PUBLIC_FILE, OUTPUT_FILE]:
        fp.parent.mkdir(parents=True, exist_ok=True)
        with open(fp, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"\n=== Done: {len(actually_new)} new + {len(existing_games)} old = {len(all_games)} total ===")
    # 统计链接填充情况
    filled_q = sum(1 for g in actually_new if g.get("quarkLink"))
    filled_b = sum(1 for g in actually_new if g.get("baiduLink"))
    print(f"Links filled: quark={filled_q}/{len(actually_new)}, baidu={filled_b}/{len(actually_new)}")
    cats = {}
    for g in all_games:
        cats[g["category"]] = cats.get(g["category"], 0) + 1
    print(f"Cats: {cats}")


if __name__ == "__main__":
    main()
