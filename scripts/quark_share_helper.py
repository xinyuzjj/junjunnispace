#!/usr/bin/env python3
"""夸克分享辅助脚本：创建分享并轮询异步任务获取链接
用法: python quark_share_helper.py <directory_name_in_游戏>
"""

import sys
import time
sys.path.insert(0, "scripts")
from quark_cli import QuarkClient, DRIVE_DOMAIN

def main():
    dir_name = sys.argv[1]
    client = QuarkClient()
    
    # 找到目录 fid
    parts = ["游戏"] + [dir_name]
    fid = client._resolve_path("/".join(parts))
    if not fid or fid == "0":
        print(f"ERROR: path not found: /游戏/{dir_name}")
        sys.exit(1)
    
    # 创建分享
    share_data = {
        "fid_list": [fid],
        "title": dir_name,
        "url_type": 1,
        "expired_type": 4,  # 永久（permanent）
    }
    result = client._request("POST", DRIVE_DOMAIN, "/1/clouddrive/share", json_data=share_data)
    if result.get("status") != 200:
        print(f"ERROR: share creation returned {result}")
        sys.exit(1)
    
    data = result.get("data", {})
    share_id = data.get("share_id")
    
    if not share_id:
        task_id = data.get("task_id")
        if task_id:
            for i in range(15):
                time.sleep(1)
                tr = client._request("GET", DRIVE_DOMAIN, "/1/clouddrive/task", params={"task_id": task_id})
                if tr.get("status") == 200:
                    td = tr.get("data", {})
                    if td.get("status") == 2:
                        share_id = td.get("share_id")
                        break
                    elif td.get("status") in (3, 4):
                        print(f"ERROR: task failed: {td}")
                        sys.exit(1)
            else:
                print(f"ERROR: task polling timeout")
                sys.exit(1)
        else:
            print(f"ERROR: no share_id or task_id: {data}")
            sys.exit(1)
    
    # 获取分享链接
    pwd = client._request("POST", DRIVE_DOMAIN, "/1/clouddrive/share/password",
                          json_data={"share_id": share_id})
    if pwd.get("status") != 200:
        print(f"ERROR: get share url failed: {pwd}")
        sys.exit(1)
    
    share_url = pwd.get("data", {}).get("share_url", "")
    if share_url:
        print(share_url)
    else:
        print(f"ERROR: no url: {pwd}")

if __name__ == "__main__":
    main()
