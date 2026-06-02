#!/usr/bin/env python3
import os
import sys
import zipfile
import subprocess
try:
    import urllib.request
except ImportError:
    import urllib as urllib

def download_file(url, dest_path):
    print(f"正在下载: {url}")
    try:
        urllib.request.urlretrieve(url, dest_path)
        print(f"下载完成: {dest_path}")
        return True
    except Exception as e:
        print(f"下载失败: {e}")
        return False

def unzip_file(zip_path, dest_dir):
    print(f"正在解压: {zip_path}")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(dest_dir)
        print(f"解压完成")
        return True
    except Exception as e:
        print(f"解压失败: {e}")
        return False

def main():
    print("="*50)
    print("🎯 Alist 本地部署脚本")
    print("="*50)
    
    alist_dir = os.path.join(os.path.dirname(__file__), 'alist')
    alist_exe = os.path.join(alist_dir, 'alist.exe')
    zip_path = os.path.join(alist_dir, 'alist.zip')
    
    if not os.path.exists(alist_dir):
        os.makedirs(alist_dir)
    
    if not os.path.exists(alist_exe):
        download_url = "https://github.com/AlistGo/alist/releases/download/v3.37.0/alist-windows-amd64.zip"
        
        if not download_file(download_url, zip_path):
            return
        
        if not unzip_file(zip_path, alist_dir):
            return
        
        if os.path.exists(zip_path):
            os.remove(zip_path)
    else:
        print("检测到 Alist 已安装，跳过下载...")
    
    print("\n🔧 初始化 Alist...")
    os.chdir(alist_dir)
    subprocess.run([alist_exe, 'admin', 'set', 'admin123'], check=True)
    
    print("\n🚀 启动 Alist...")
    print("="*50)
    print("访问地址: http://localhost:5244")
    print("用户名: admin")
    print("密码: admin123")
    print("="*50)
    
    subprocess.run([alist_exe, 'server'])

if __name__ == '__main__':
    main()
