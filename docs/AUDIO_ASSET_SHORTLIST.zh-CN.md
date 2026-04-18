# 五子棋音频素材清单

本次先筛选一组可直接进项目的免费音频素材，放在：

- [public/audio/gomoku](E:/GPT/gomoku-game/public/audio/gomoku)

当前选择偏向“轻、短、克制”，优先适配手机棋盘类游戏，不做过强的街机化反馈。

## 已整理文件

| 文件 | 用途建议 | 时长 | 备注 |
| --- | --- | ---: | --- |
| `place-stone-primary.ogg` | 主落子声 | 0.385s | 木质触感更清楚，适合正式落子 |
| `place-stone-soft.ogg` | 轻落子 / 预落子 | 0.308s | 比主落子更柔和 |
| `ui-toggle.ogg` | 开关切换 / 音效开关 | 0.139s | 非常短，适合设置项 |
| `ui-tap.ogg` | 普通点击 / 菜单进入 | 0.191s | 比 click 更饱满一点 |
| `friend-join.ogg` | 好友加入房间 | 0.322s | 正向提示，存在感适中 |
| `hint.ogg` | 提示一手 / 可交互提醒 | 0.332s | 轻问询感，适合提示 |
| `rank-up.ogg` | 升段 / 赛季奖励 | 1.944s | 最长的一条，适合重大正反馈 |
| `defeat.ogg` | 失败 / 无效操作 | 0.500s | 下行、收束感更强 |

## 来源与映射

### 1. 木质落子类

来源包：

- `public/assets/sfx-candidates/100-CC0-wood-metal-SFX.zip`
- 解压目录：`public/assets/sfx-candidates/100-CC0-wood-metal-SFX`

映射：

- `place-stone-primary.ogg` <- `wood_hit_02.ogg`
- `place-stone-soft.ogg` <- `wood_hit_05.ogg`

选择原因：

- 都是短音频，没有多余尾音
- 比合成音更像“棋子落在木板上”
- 适合与 15×15 棋盘的木质语义统一

### 2. UI / 提示 / 结算类

来源包：

- `public/assets/sfx-candidates/kenney_interfaceSounds.zip`
- 解压目录：`public/assets/sfx-candidates/kenney_interfaceSounds`

映射：

- `ui-toggle.ogg` <- `toggle_002.ogg`
- `ui-tap.ogg` <- `drop_002.ogg`
- `friend-join.ogg` <- `confirmation_003.ogg`
- `hint.ogg` <- `question_003.ogg`
- `rank-up.ogg` <- `select_006.ogg`
- `defeat.ogg` <- `error_006.ogg`

选择原因：

- 命名和语义比较清楚，后续替换成本低
- 时长都控制在移动端可接受范围
- `rank-up.ogg` 是目前最适合“段位提升”的一条，明显比普通按钮音更有奖励感

## 授权

### Kenney Interface Sounds

- 本地授权文件：`public/assets/sfx-candidates/kenney_interfaceSounds/License.txt`
- 授权：CC0

### 100 CC0 wood / metal SFX

- 下载来源：OpenGameArt 页面标注为 CC0 包
- 当前作为候选来源保留在 `public/assets/sfx-candidates`

## 下一步建议

1. 先把这 8 个文件接入独立预览页，替换当前 WebAudio 合成音。
2. 落子声建议保留双版本：
   - 普通落子用 `place-stone-primary.ogg`
   - AI 自动落子或回放可用 `place-stone-soft.ogg`
3. `rank-up.ogg` 适合配合奖牌徽章动效一起播放，不建议用于普通胜利结算。
4. 如果后面觉得失败声太重，可以把 `defeat.ogg` 只用于认输/掉段，把普通输局改成更短的 `error_004` 或重新挑一条 softer 版本。
