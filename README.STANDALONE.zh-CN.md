# Gomoku Fusion 独立版（UI迁移验证）

这个目录是从主项目复制出来的独立工程，用于新 UI 风格整合与单独打包测试。  
不会影响主项目代码。

## 目录

- 项目路径：`E:\GPT\gomoku-game\standalone\gomoku-fusion`
- 独立端口：`3010`

## 已整合路由

- `/mode`：新 UI 模式页
- `/game`：新 UI 对局页
- `/multiplayer`：新 UI 好友房与联机对局
- `/rank`：新 UI 排位页

> 以上主路由都已切到新 UI 版本。

## 本地运行

```bash
npm install --legacy-peer-deps
npm run dev
```

打开：

- `http://127.0.0.1:3010/mode`

> 如遇 `next dev` 资源错误（例如 Turbopack 相关错误），可直接使用下方“打包验证”方式进行稳定预览。

## 打包验证

```bash
npm run build
npm run start
```

生产预览地址：

- `http://127.0.0.1:3010/mode`

## 备注

- `next.config.ts` 已设置 `outputFileTracingRoot`，按独立目录进行构建追踪。
- 如需继续做“风格二次精修”，优先顺序建议：`/game` 结算层 -> `/multiplayer` 对局态 -> `/rank` 细节动效。
