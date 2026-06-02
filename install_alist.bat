@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==============================================
echo          Alist 本地部署脚本
echo ==============================================
echo.

set "ALIST_DIR=%~dp0alist"
set "ALIST_EXE=%ALIST_DIR%\alist.exe"
set "DOWNLOAD_URL=https://github.com/AlistGo/alist/releases/download/v3.37.0/alist-windows-amd64.zip"

if not exist "%ALIST_DIR%" (
    mkdir "%ALIST_DIR%"
)

if exist "%ALIST_EXE%" (
    echo 检测到 Alist 已安装，跳过下载...
) else (
    echo 正在下载 Alist Windows 版本...
    powershell -Command "Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%ALIST_DIR%\alist.zip'"
    
    if not exist "%ALIST_DIR%\alist.zip" (
        echo 下载失败，请检查网络连接
        pause
        exit /b 1
    )
    
    echo 正在解压...
    powershell -Command "Expand-Archive -Path '%ALIST_DIR%\alist.zip' -DestinationPath '%ALIST_DIR%' -Force"
    
    if not exist "%ALIST_EXE%" (
        echo 解压失败
        pause
        exit /b 1
    )
    
    del "%ALIST_DIR%\alist.zip"
    echo 下载解压完成！
)

echo.
echo 初始化 Alist...
cd /d "%ALIST_DIR%"
alist.exe admin set admin123

echo.
echo 启动 Alist...
echo 访问地址: http://localhost:5244
echo 用户名: admin
echo 密码: admin123
echo.
alist.exe server

pause
