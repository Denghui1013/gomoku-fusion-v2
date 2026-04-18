# Gomoku Fusion VPS 部署步骤

目标：用 `standalone/gomoku-fusion` 独立版替换 VPS 上当前主项目服务，并继续使用：

- 域名：`https://yanyan-gomoku.duckdns.org`
- 端口：`3000`
- Nginx 反代：`127.0.0.1:3000`

## 当前判断

VPS 当前 3000 端口运行的是旧主项目根目录的 `server.ts`：

```bash
/usr/bin/node ... /root/gomoku-game/... server.ts
```

这个旧服务没有完整承载独立版的 Next API 路由，因此 App 请求：

```text
POST /api/network/create-room
```

会进入旧服务，出现 500 或 404。

独立版应运行：

```bash
cd /root/gomoku-game/standalone/gomoku-fusion
PORT=3000 npm run start:multiplayer
```

该入口会同时承载：

- Next 页面：`/mode`、`/game`、`/rank`、`/multiplayer`
- REST API：`/api/network/create-room` 等
- WebSocket：`/api/network/ws`

## 推荐上线流程

### 1. 备份旧项目

```bash
cd /root
cp -a gomoku-game "gomoku-game.backup.$(date +%Y%m%d-%H%M%S)"
```

### 2. 停止旧服务

如果使用 PM2：

```bash
pm2 list
pm2 stop gomoku
```

如果是手动进程：

```bash
ps -ef | grep gomoku-game
kill <PID>
```

### 3. 更新代码

如果 VPS 上是 git 仓库：

```bash
cd /root/gomoku-game
git pull
```

如果不是 git 仓库，就把本地 `standalone/gomoku-fusion` 上传到：

```text
/root/gomoku-game/standalone/gomoku-fusion
```

### 4. 安装依赖并构建

```bash
cd /root/gomoku-game/standalone/gomoku-fusion
npm install
npm run build
```

### 5. 用 PM2 启动独立版

```bash
cd /root/gomoku-game/standalone/gomoku-fusion
PORT=3000 pm2 start npm --name gomoku-fusion -- run start:multiplayer
pm2 save
```

如果旧进程也叫 `gomoku`，建议确认后删除旧进程：

```bash
pm2 delete gomoku
pm2 save
```

### 6. Nginx 保持现有配置

当前配置已经正确：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_read_timeout 3600;
    proxy_send_timeout 3600;
}
```

如无特殊需求，不需要再改 Nginx。

### 7. 验证

本机验证：

```bash
curl -I http://127.0.0.1:3000/mode
curl -i -X POST http://127.0.0.1:3000/api/network/create-room \
  -H "Content-Type: application/json" \
  -d '{"playerName":"test","playerId":"host_test"}'
```

公网验证：

```bash
curl -I https://yanyan-gomoku.duckdns.org/mode
curl -i -X POST https://yanyan-gomoku.duckdns.org/api/network/create-room \
  -H "Content-Type: application/json" \
  -d '{"playerName":"test","playerId":"host_test"}'
```

WebSocket 地址应保持：

```text
wss://yanyan-gomoku.duckdns.org/api/network/ws
```

## 回滚

如果上线后异常：

```bash
pm2 stop gomoku-fusion
pm2 start gomoku
pm2 save
```

如果旧进程已经删除，就进入备份目录按旧方式恢复。
