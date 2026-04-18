# VPS 脚本与运维命令（Gomoku）

本文档汇总项目在 VPS（Ubuntu/AWS EC2）上的常用脚本与一键命令。

## 1. 一键巡检脚本

项目内置脚本：

- `scripts/vps-health-check.sh`

用途：

- 检查 PM2 进程是否在线
- 检查服务端口是否监听
- 检查本机 `/mode` 健康页是否 200
- 检查公网地址 `/mode` 是否可访问
- 检查 Nginx 配置与服务状态

用法：

```bash
bash scripts/vps-health-check.sh [pm2_name] [port] [public_base_url]
```

示例：

```bash
bash scripts/vps-health-check.sh gomoku 3000 http://127.0.0.1
bash scripts/vps-health-check.sh gomoku 3000 http://YOUR_DOMAIN_OR_IP
```

返回码：

- `0` = PASS（巡检通过）
- `1` = FAIL（存在异常）

---

## 2. VPS 部署更新（手动标准流程）

在服务器项目目录执行：

```bash
cd /var/www/gomoku-game
git checkout main
git pull origin main
npm install --legacy-peer-deps
npm run build
pm2 restart gomoku --update-env
pm2 save
```

说明：

- 由于依赖含 `@emoji-mart/react`，建议使用 `--legacy-peer-deps`。
- `pm2 save` 用于保存进程列表，重启服务器后自动恢复。

---

## 3. PM2 常用命令

首次启动（项目已 build）：

```bash
cd /var/www/gomoku-game
pm2 start npm --name gomoku -- start
pm2 save
```

查看状态：

```bash
pm2 status
```

查看日志：

```bash
pm2 logs gomoku --lines 100
```

重启：

```bash
pm2 restart gomoku --update-env
```

停止/删除：

```bash
pm2 stop gomoku
pm2 delete gomoku
```

开机自启（仅首次需要）：

```bash
pm2 startup
pm2 save
```

---

## 4. 快速连通性检查

本机检查：

```bash
curl -I http://127.0.0.1:3000/mode
```

公网检查：

```bash
curl -I http://YOUR_DOMAIN_OR_IP/mode
```

端口监听检查：

```bash
ss -ltn | grep :3000
```

---

## 5. Nginx 常用命令

测试配置：

```bash
nginx -t
```

重载配置：

```bash
systemctl reload nginx
```

查看状态：

```bash
systemctl status nginx
```

查看错误日志：

```bash
tail -n 100 /var/log/nginx/error.log
```

---

## 6. 推荐巡检顺序（30 秒）

```bash
pm2 status
curl -I http://127.0.0.1:3000/mode
bash scripts/vps-health-check.sh gomoku 3000 http://YOUR_DOMAIN_OR_IP
```

如果失败，优先看：

```bash
pm2 logs gomoku --lines 100
tail -n 100 /var/log/nginx/error.log
```
