#!/usr/bin/env python3
import json
import os
import requests
import time
import hashlib
from tkinter import Tk, messagebox
from urllib.parse import quote, unquote

class BaiduPanAPI:
    def __init__(self):
        self.access_token = ""
        self.session = requests.Session()
        self.base_url = "https://pan.baidu.com/api"
    
    def get_access_token(self, username, password):
        try:
            login_url = "https://passport.baidu.com/v2/api/?login"
            data = {
                "username": username,
                "password": hashlib.md5(password.encode()).hexdigest(),
                "tpl": "mn",
                "u": "https://pan.baidu.com/"
            }
            response = self.session.post(login_url, data=data)
            if response.ok:
                self.access_token = self.session.cookies.get("BDUSS")
                return self.access_token is not None
            return False
        except Exception as e:
            print(f"登录失败: {e}")
            return False
    
    def get_file_list(self, path="/"):
        try:
            url = f"{self.base_url}/list"
            params = {
                "dir": quote(path),
                "order": "name",
                "desc": 0,
                "showempty": 0,
                "web": 1,
                "page": 1,
                "num": 100,
                "channel": "chunlei",
                "clienttype": 0,
                "app_id": 250528,
                "bdstoken": self.access_token
            }
            response = self.session.get(url, params=params)
            if response.ok:
                data = response.json()
                return data.get("list", [])
            return []
        except Exception as e:
            print(f"获取文件列表失败: {e}")
            return []
    
    def create_share_link(self, fs_id, is_dir=False):
        try:
            url = f"{self.base_url}/share/create"
            data = {
                "fid_list": json.dumps([fs_id]),
                "bdstoken": self.access_token,
                "channel": "chunlei",
                "clienttype": 0,
                "app_id": 250528
            }
            response = self.session.post(url, data=data)
            if response.ok:
                result = response.json()
                if result.get("errno") == 0:
                    share_info = result.get("info", [])[0]
                    return {
                        "share_id": share_info.get("share_id"),
                        "share_url": share_info.get("share_url"),
                        "pwd": share_info.get("pwd", "")
                    }
            return None
        except Exception as e:
            print(f"生成分享链接失败: {e}")
            return None

class AutoShareGenerator:
    def __init__(self):
        self.api = BaiduPanAPI()
        self.output_file = os.path.join(os.path.dirname(__file__), 'public', 'auto_share_resources.json')
    
    def run(self):
        print("="*50)
        print("🎯 百度网盘自动分享链接生成器")
        print("="*50)
        
        username = input("请输入百度网盘账号: ")
        password = input("请输入百度网盘密码: ")
        
        print("\n🔐 正在登录百度网盘...")
        if not self.api.get_access_token(username, password):
            print("❌ 登录失败，请检查账号密码")
            return
        
        print("✅ 登录成功！")
        
        print("\n📂 正在获取文件列表...")
        files = self.api.get_file_list("/")
        
        if not files:
            print("❌ 未找到文件")
            return
        
        print(f"✅ 找到 {len(files)} 个文件/文件夹")
        print("\n--- 文件列表 ---")
        for i, file in enumerate(files, 1):
            file_type = "📁" if file.get("isdir") else "📄"
            print(f"{i}. {file_type} {file.get('server_filename', '')}")
        
        print("\n⚡ 开始批量生成分享链接...")
        share_results = []
        
        for i, file in enumerate(files, 1):
            if file.get("isdir"):
                continue
            
            print(f"\r处理中: [{i}/{len(files)}] {file.get('server_filename')}", end="")
            
            share_info = self.api.create_share_link(file.get("fs_id"), file.get("isdir"))
            if share_info:
                resource = {
                    "id": str(i),
                    "title": file.get("server_filename", "").replace(".zip", "").replace(".rar", ""),
                    "desc": f"自动生成的分享资源",
                    "baiduLink": share_info.get("share_url", ""),
                    "code": share_info.get("pwd", ""),
                    "tags": ["自动分享", "百度网盘"]
                }
                share_results.append(resource)
            
            time.sleep(1)
        
        print("\n\n📥 正在保存结果...")
        self.save_results(share_results)
        
        print(f"\n🎉 完成！成功生成 {len(share_results)} 个分享链接")
        print(f"📄 结果已保存到: {self.output_file}")
    
    def save_results(self, resources):
        try:
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(resources, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存失败: {e}")

if __name__ == '__main__':
    generator = AutoShareGenerator()
    generator.run()
