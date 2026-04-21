# Gomoku Fusion VPS 部署手册（强一致版）

更新时间：2026-04-21  
适用环境：已有域名 + SSL 的 Ubuntu VPS（当前项目：`gomoku-fusion-v2`）

---

## 1. 统一约定

- 仓库：`https://github.com/Denghui1013/gomoku-fusion-v2`
- 目录：`/opt/gomoku-fusion-v2`
- 应用端口：`3010`
- PM2 进程名：`gomoku-fusion-v2`
- 对外域名：`https://yanyan-gomoku.duckdns.org`
- Nginx 反代目标：`127.0.0.1:3010`

---

## 2. 推荐部署方式（一次命令）

在 VPS 执行：

```bash
cd /opt/gomoku-fusion-v2
bash scripts/vps-redeploy-consistent.sh /opt/gomoku-fusion-v2 gomoku-fusion-v2 3010 https://yanyan-gomoku.duckdns.org
```

该脚本会自动执行：

1. 拉取最新代码
2. 停旧 PM2 进程
3. 清理 `.next`（避免旧 chunk 残留）
4. 安装依赖并重新构建
5. 启动 PM2
6. 重启 Nginx
7. 健康检查（含 `_next/static/chunks` 资源检查）

---

## 3. 手动部署（分步）

```bash
cd /opt/gomoku-fusion-v2
git checkout main
git pull --ff-only origin main
git rev-parse --short HEAD

pm2 delete gomoku-fusion-v2 || true
rm -rf .next

npm ci --legacy-peer-deps
npm run build

PORT=3010 pm2 start npm --name gomoku-fusion-v2 -- run start:multiplayer
pm2 save

sudo nginx -t
sudo systemctl restart nginx

bash scripts/vps-health-check.sh gomoku-fusion-v2 3010 https://yanyan-gomoku.duckdns.org
```

---

## 4. 验证项（必须通过）

1. `pm2 status` 中 `gomoku-fusion-v2` 为 `online`
2. `curl -I http://127.0.0.1:3010/mode` 返回 `200/304`
3. `curl -I https://yanyan-gomoku.duckdns.org/mode` 返回 `200/304`
4. `scripts/vps-health-check.sh` 输出 `RESULT: PASS`

---

## 5. 常见问题

### 5.1 域名能打开但 chunk 500

典型原因是旧 `.next` 产物和新进程混跑。  
处理方式：执行第 2 节一键命令（强一致重部署）。

### 5.2 npm 依赖冲突

项目已通过 `.npmrc` 配置 `legacy-peer-deps=true`，仍建议使用：

```bash
npm ci --legacy-peer-deps
```

### 5.3 Nginx reload 失败

先测试配置，再看服务状态：

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager -l
```

---

## 6. 回滚

### 6.1 快速回滚到旧端口（仅切流）

把 Nginx `proxy_pass` 改回旧端口（例如 `127.0.0.1:3000`），然后：

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 6.2 回滚代码版本

```bash
cd /opt/gomoku-fusion-v2
git log --oneline -n 20
git checkout <old_commit_hash>
pm2 delete gomoku-fusion-v2 || true
rm -rf .next
npm ci --legacy-peer-deps
npm run build
PORT=3010 pm2 start npm --name gomoku-fusion-v2 -- run start:multiplayer
pm2 save
sudo nginx -t && sudo systemctl restart nginx
```
