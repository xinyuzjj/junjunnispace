# 🎯 Alist 本地部署指南

## 一、下载 Alist

1. 打开浏览器访问：[Alist 官方下载页](https://github.com/AlistGo/alist/releases)

2. 下载 Windows 版本：
   - 文件名称：`alist-windows-amd64.zip`
   - 推荐版本：v3.37.0（稳定版）

## 二、解压文件

1. 新建文件夹：`E:\junjunni\alist`
2. 将下载的 ZIP 文件解压到该文件夹
3. 确认解压后有 `alist.exe` 文件

## 三、初始化与启动

### 方式一：双击运行（推荐）

1. 打开 `alist` 文件夹
2. 双击 `alist.exe`
3. 会弹出命令行窗口，等待启动完成

### 方式二：命令行启动

```cmd
cd E:\junjunni\alist
alist.exe admin set admin123
alist.exe server
```

## 四、访问 Alist

启动成功后，打开浏览器访问：

- **地址**：http://localhost:5244
- **用户名**：admin
- **密码**：admin123

## 五、配置网盘（以百度网盘为例）

1. 登录后点击左侧菜单的「存储」
2. 点击「添加」按钮
3. 选择存储类型为「百度网盘」
4. 填写配置信息：
   - **名称**：任意名称（如：我的百度网盘）
   - **Refresh Token**：需要获取百度网盘的 Refresh Token
   - **根目录**：/（保持默认）

### 获取百度网盘 Refresh Token

1. 访问：https://pan.baidu.com/
2. 登录你的百度账号
3. 打开浏览器开发者工具（F12）
4. 在「Application」→「Cookies」中找到 `BDUSS`
5. 使用在线工具或脚本获取 Refresh Token

## 六、常用命令

```cmd
# 查看帮助
alist.exe help

# 设置管理员密码
alist.exe admin set 新密码

# 查看当前密码
alist.exe admin list

# 启动服务
alist.exe server

# 停止服务（Ctrl+C）
```

## 七、配置文件说明

配置文件位于：`E:\junjunni\alist\data\config.json`

主要配置项：
- `port`: 服务端口（默认 5244）
- `database`: 数据库配置
- `storage`: 存储配置

## 八、与你的网站集成

### 方式一：API 调用

Alist 提供 REST API，可以通过接口获取文件列表和分享链接：

```bash
# 获取文件列表
GET http://localhost:5244/api/fs/list?path=/

# 获取分享链接
POST http://localhost:5244/api/fs/share
```

### 方式二：嵌入 iframe

在你的网站中嵌入 Alist：

```html
<iframe 
  src="http://localhost:5244" 
  width="100%" 
  height="800px"
  frameborder="0"
></iframe>
```

## 九、故障排查

### 端口被占用

```cmd
# 查看端口占用
netstat -ano | findstr :5244

# 杀死占用进程
taskkill /F /PID <进程ID>
```

### 启动失败

确保：
- 文件夹有读写权限
- 网络连接正常（首次启动需要下载资源）
- 没有其他程序占用 5244 端口

---

## 📌 总结

| 项目 | 信息 |
|------|------|
| **服务地址** | http://localhost:5244 |
| **用户名** | admin |
| **密码** | admin123 |
| **数据目录** | E:\junjunni\alist\data |
| **配置文件** | E:\junjunni\alist\data\config.json |

部署完成后，你可以：
1. 添加各种网盘存储
2. 管理文件和文件夹
3. 生成分享链接
4. 在线预览文件
