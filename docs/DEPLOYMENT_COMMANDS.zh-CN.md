# 云端部署与本地构建命令

本文档整理五子棋项目常用的云端部署命令和本地开发/打包命令。命令默认以当前项目配置为例：

- 云端域名：`https://yanyan-gomoku.duckdns.org`
- 云服务器系统：`Ubuntu`
- 云端项目目录：`~/gomoku-game`
- 本地项目目录：`E:\GPT\gomoku-game`
- Node 版本建议：`22.x`

## 一、云端首次部署

### 1. 更新系统并安装基础工具

```bash
# 更新软件源
sudo apt update

# 安装 Git、curl、Nginx、Certbot
sudo apt install -y git curl nginx certbot python3-certbot-nginx
```

### 2. 安装 Node.js 22 和 PM2

```bash
# 添加 NodeSource 的 Node.js 22 安装源
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# 安装 Node.js
sudo apt install -y nodejs

# 安装 PM2，用于守护 Node 服务
sudo npm install -g pm2

# 查看版本，确认安装成功
node -v
npm -v
pm2 -v
```

### 3. 拉取项目代码

```bash
# 克隆私有仓库，前提是服务器已经配置好 GitHub SSH Deploy Key
git clone git@github.com:Denghui1013/gomoku-game.git

# 进入项目目录
cd ~/gomoku-game
```

### 4. 创建云端环境变量

```bash
# 写入云端联机地址
cat > .env.local <<'EOF'
NEXT_PUBLIC_MULTIPLAYER_SERVER_URL=https://yanyan-gomoku.duckdns.org
NEXT_PUBLIC_DISABLE_INDICATOR=true
EOF
```

### 5. 安装依赖并构建

```bash
# 使用 legacy peer deps，避免 React 版本与第三方库 peer dependency 冲突
npm install --legacy-peer-deps

# 构建生产版本
npm run build
```

### 6. 启动联机服务

```bash
# 使用 PM2 启动联机服务
pm2 start npm --name gomoku -- run start:multiplayer

# 保存 PM2 当前进程列表
pm2 save

# 查看运行状态
pm2 status
```

### 7. 配置 Nginx 反向代理

```bash
# 写入 Nginx 配置，将 80/443 转发到本机 3000 端口
sudo tee /etc/nginx/sites-available/gomoku > /dev/null <<'EOF'
server {
    listen 80;
    server_name yanyan-gomoku.duckdns.org;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
EOF

# 禁用默认站点，启用 gomoku 配置
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/gomoku /etc/nginx/sites-enabled/gomoku

# 检查 Nginx 配置是否正确
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

### 8. 申请 HTTPS 证书

```bash
# 使用 Certbot 自动申请并部署 HTTPS 证书
sudo certbot --nginx -d yanyan-gomoku.duckdns.org
```

证书部署成功后，访问地址应为：

```text
https://yanyan-gomoku.duckdns.org
```

## 二、云端日常更新

### 1. 拉取最新代码并重启

```bash
# 进入项目目录
cd ~/gomoku-game

# 拉取 GitHub 最新代码
git pull

# 如 package-lock 或依赖有变化，建议执行一次
npm install --legacy-peer-deps

# 重新构建
npm run build

# 重启 PM2 服务，并加载最新环境变量
pm2 restart gomoku --update-env

# 查看服务状态
pm2 status
```

### 2. 查看云端日志

```bash
# 查看最近 100 行日志
pm2 logs gomoku --lines 100

# 只查看 PM2 进程状态
pm2 status
```

### 3. 测试网页与联机接口

```bash
# 测试网页是否正常返回
curl -I https://yanyan-gomoku.duckdns.org/mode

# 测试创建房间接口
curl -i -X POST https://yanyan-gomoku.duckdns.org/api/network/create-room \
  -H "Content-Type: application/json" \
  -d '{"playerName":"test","playerId":"ecs-check"}'
```

返回中出现 `"success":true`，说明接口正常。

### 4. 检查端口监听

```bash
# 查看 80、443、3000 端口是否正常监听
sudo ss -ltnp | grep -E '(:80|:443|:3000)'
```

正常情况：

```text
80/443 -> nginx
3000   -> node
```

### 5. 停止或重启服务

```bash
# 停止五子棋服务
pm2 stop gomoku

# 启动已存在的五子棋服务
pm2 start gomoku

# 删除 PM2 中的五子棋服务记录
pm2 delete gomoku
pm2 save
```

## 三、本地开发命令

### 1. 进入项目目录

```powershell
cd E:\GPT\gomoku-game
```

### 2. 安装依赖

```powershell
# 使用 legacy peer deps，避免依赖冲突
npm install --legacy-peer-deps
```

### 3. 配置本地环境变量

确保 `E:\GPT\gomoku-game\.env.local` 中包含：

```env
NEXT_PUBLIC_MULTIPLAYER_SERVER_URL=https://yanyan-gomoku.duckdns.org
NEXT_PUBLIC_DISABLE_INDICATOR=true
```

### 4. 本地开发运行

```powershell
# 启动本地联机开发服务
npm run dev:multiplayer
```

常用本地测试地址：

```text
http://127.0.0.1:3000/mode
http://127.0.0.1:3000/multiplayer
```

### 5. 本地构建检查

```powershell
# 构建 Next.js 项目，确认没有编译错误
npm run build
```

## 四、本地 Git 提交流程

### 1. 查看改动

```powershell
git status
```

### 2. 提交联机稳定性相关改动

```powershell
git add src\hooks\useMultiplayer.ts src\network\NetworkManager.ts src\network\RoomManager.ts src\app\api\network\chat src\app\api\network\game-end src\app\api\network\leave-room src\app\api\network\restart-accept src\app\api\network\restart-decline src\app\api\network\restart-request docs\DEPLOYMENT_COMMANDS.zh-CN.md

git commit -m "Use HTTP polling for multiplayer stability"

git push
```

### 3. 只提交重开拒绝提示修复

```powershell
git add src\hooks\useMultiplayer.ts src\network\RoomManager.ts src\app\api\network\restart-decline\route.ts

git commit -m "Fix restart decline notification polling"

git push
```

## 五、本地 APK 打包

### 1. 执行版本化打包脚本

```powershell
cd E:\GPT\gomoku-game

.\build-apk-versioned.bat
```

打包成功后，APK 通常会输出到：

```text
E:\GPT\gomoku-game\dist\apk\
```

### 2. 原始 Gradle APK 输出位置

```text
E:\GPT\gomoku-game\android\app\build\outputs\apk\debug\app-debug.apk
```

## 六、测试建议

### 1. 网页端测试

云端更新完成后，浏览器强制刷新：

```text
Ctrl + F5
```

然后访问：

```text
https://yanyan-gomoku.duckdns.org/mode
```

### 2. APK 端测试

如果修改了客户端代码，例如：

- 联机逻辑
- 页面 UI
- API 地址
- 打包环境变量

需要重新执行 APK 打包并安装新包。

### 3. 联机功能测试顺序

```text
1. 设备 A 创建房间
2. 设备 B 加入房间
3. 双方各落几步，观察同步是否顺畅
4. 一方认输，确认另一方看到结算
5. 一方点击“再来一局”，另一方点击“接受”
6. 一方点击“再来一局”，另一方点击“稍后”，确认邀请方收到提示
```

## 七、常见问题

### 1. 网页提示旧版本或 Server Action 错误

通常是浏览器还缓存着旧前端资源。处理方式：

```text
Ctrl + F5 强制刷新
```

如果仍然异常，可以关闭页面后重新打开。

### 2. APK 无法连接服务器

先用手机浏览器打开：

```text
https://yanyan-gomoku.duckdns.org/mode
```

如果浏览器也打不开，优先检查：

```text
域名解析
ECS 安全组 80/443
Nginx 状态
PM2 状态
```

### 3. PM2 服务未启动

```bash
cd ~/gomoku-game
pm2 start npm --name gomoku -- run start:multiplayer
pm2 save
```

### 4. Nginx 配置检查失败

```bash
sudo nginx -t
```

按错误提示检查：

```text
server_name 是否正确
证书路径是否存在
443 是否被其他服务占用
```

### 5. HTTPS 证书续期

Certbot 通常会自动安装续期任务。可以手动测试：

```bash
sudo certbot renew --dry-run
```
