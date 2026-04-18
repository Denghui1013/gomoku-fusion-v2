# Gomoku Fusion VPS 上线手册（当前基线）

更新时间：2026-04-18  
适用场景：服务器上**已经有域名 + SSL**，本次只上线 `gomoku-fusion-v2` 最新版本。

---

## 1. 统一约定（请按此执行）

- 仓库：`https://github.com/Denghui1013/gomoku-fusion-v2`
- 服务器目录：`/opt/gomoku-fusion-v2`
- 应用端口：`3010`
- PM2 进程名：`gomoku-fusion-v2`
- Nginx：保持原有域名与证书，只把反代目标指向 `127.0.0.1:3010`

> 说明：不要再混用 3000/3010。本文档默认生产新版本走 3010。

---

## 2. 首次部署 / 拉取最新版

```bash
cd /opt
[ -d gomoku-fusion-v2 ] || git clone https://github.com/Denghui1013/gomoku-fusion-v2.git
cd /opt/gomoku-fusion-v2
git pull
```

---

## 3. 安装依赖并构建

```bash
cd /opt/gomoku-fusion-v2
npm ci
npm run build
```

说明：

- 仓库已包含 `.npmrc`：`legacy-peer-deps=true`
- 遇到 peer dependency 冲突时，不需要额外手工加参数

---

## 4. 用 PM2 启动（或重启）新版本

```bash
cd /opt/gomoku-fusion-v2
PORT=3010 pm2 start npm --name gomoku-fusion-v2 -- run start:multiplayer || PORT=3010 pm2 restart gomoku-fusion-v2 --update-env
pm2 save
pm2 status
pm2 logs gomoku-fusion-v2 --lines 80
```

---

## 5. 本机健康检查（必须先过）

```bash
curl -I http://127.0.0.1:3010/mode
```

期望：`HTTP/1.1 200 OK`

---

## 6. Nginx 切流（已有域名+SSL场景）

只改你的现有 `443 server` 中 `location /` 的转发目标：

```nginx
location / {
    proxy_pass http://127.0.0.1:3010;
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

应用配置：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. 域名健康检查

```bash
curl -I https://yanyan-gomoku.duckdns.org/mode
curl -i -X POST https://yanyan-gomoku.duckdns.org/api/network/create-room \
  -H "Content-Type: application/json" \
  -d '{"playerName":"test","playerId":"ecs-check"}'
```

WebSocket 地址应为：

```text
wss://yanyan-gomoku.duckdns.org/api/network/ws
```

---

## 8. 联机冒烟清单（手机 + 浏览器）

1. A 端创建房间  
2. B 端加入房间  
3. 文字聊天互发  
4. 表情聊天互发  
5. 正常对局至胜负  
6. 认输结算  
7. 再来一局邀请 / 接受 / 拒绝

---

## 9. 回滚（秒级）

只改 Nginx `proxy_pass` 回旧端口（例如 `127.0.0.1:3000`），然后：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

如需同时回滚 PM2：

```bash
pm2 stop gomoku-fusion-v2
pm2 start 旧进程名
pm2 save
```
