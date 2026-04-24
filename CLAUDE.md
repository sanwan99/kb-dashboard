# kb-dashboard · 个人知识库看板

## 这是什么

**本地 Markdown 三源聚合看板**。把分布在三个完全不同风格的笔记仓聚合成一个可浏览/搜索/路由的 Web 应用（Electron 包装成桌面 App）。

三个源通过 `data/` 下的软链接入，只读：

| 源 id | 软链 | 真实路径 | 风格 |
|---|---|---|---|
| `learn` | `data/learn` | `~/Desktop/文档/个人学习项目/` | AI Agent 阶段化学习（带 `progress.md` / `knowledge/` / `review/` 专题） |
| `obsidian` | `data/obsidian` | `~/Desktop/文档/个人知识库/` | Obsidian vault，PARA 方法论（00-/05-/10-.../99-） |
| `work` | `data/work` | `~/work/code/sanwan/notes/` | 公司多项目外挂笔记仓，每个子目录是一个项目（带 `md/codex/current/` 活跃任务） |

## 动机 / 背景

项目主人是 Java 后端开发，有三个风格差异大的笔记仓散落在不同路径：
1. 学习项目（阶段化 progress、知识点、复习专题）
2. Obsidian 个人知识库（PARA + `[[wikilink]]`）
3. 公司项目外挂笔记（`md/codex/current/` 活跃任务）

之前找东西要在三个地方来回切，不同结构还不好统一浏览。这个看板目标：
- **统一浏览**：三源共用一个 UI，但每源保留自己的视觉语言（学习=蓝 / Obsidian=紫 / 公司=橙）
- **跨源搜索**：minisearch 全文索引，⌘K 从任何页面呼出浮层搜索
- **学习状态一眼看到**：解析 `progress.md` 头部表格 + "当前断点"段，做成 6 阶段进度条 + 断点卡
- **活跃任务聚合**：扫全部 `work/<project>/md/codex/current/*.md` 列在右栏，点击直达
- **Obsidian 反链**：vault 级 `[[wikilink]]` 索引，开一篇笔记右栏看谁引用了它

## 启动

```bash
cd /Users/fanhaolin/work/sanwan/kb-dashboard

./start.sh        # 推荐：自动建软链 + 装依赖 + 起前后端（浏览器模式）
npm run app       # Electron 桌面窗口模式（像原生 App）
npm run dev       # 只起前后端，浏览器访问 http://localhost:5173
```

端口：
- **5173** Vite 前端（带 `/api` 代理到后端）
- **5174** Fastify 后端（`127.0.0.1` 限本机）

## 技术栈

前端：
- Vite 5 + React 18 + React Router 6
- 纯 JSX（无 TypeScript）
- 样式：原 CSS 变量 + 内联 style（从 Claude design 的设计稿继承）
- 无 UI 库依赖，图标全是手写 SVG（见 `src/components/primitives.jsx` 的 `Icon` 组件）

后端：
- Fastify 5（`server/index.js`）
- `fast-glob` 扫描 md 文件
- `gray-matter` 解析 frontmatter
- `marked` 渲染 md → HTML（带自写的 Obsidian `[[wikilink]]` / `![[embed]]` 预处理）
- `minisearch` 全文索引（中英混合分词：英文按词前缀+模糊，中文按字 AND）

桌面：
- Electron 41（`electron/main.cjs` CommonJS 主进程）
- 加载 `http://localhost:5173`（dev 模式），未来 prod 打包改 `loadFile`

## 目录

```
kb-dashboard/
├── CLAUDE.md               # 本文件
├── README.md               # 面向 git 用户的快速入门
├── start.sh                # 一键启动
├── package.json            # type: module（前端 + 后端都 ESM；Electron 主进程用 .cjs）
├── vite.config.js          # Vite + /api proxy → :5174
│
├── data/                   # 🔗 三源软链（.gitignore 了，每台机要重建）
│   ├── learn     → /Users/fanhaolin/Desktop/文档/个人学习项目
│   ├── obsidian  → /Users/fanhaolin/Desktop/文档/个人知识库
│   └── work      → /Users/fanhaolin/work/code/sanwan/notes
│
├── electron/
│   └── main.cjs            # Electron 主进程（BrowserWindow + macOS 菜单）
│
├── server/                 # 后端（Fastify）
│   ├── index.js            # 入口 + 路由定义
│   └── lib/
│       ├── sources.js          # 3 个源的元信息 + safeResolve 路径穿透防护
│       ├── tree.js             # 单级目录扫描 + 忽略规则
│       ├── markdown.js         # marked + gray-matter + wikilink/embed 占位
│       ├── learn.js            # progress.md 解析（阶段表格 + 当前断点段）
│       ├── stats.js            # 首页聚合（fast-glob 递归扫 md + PARA/项目分组）
│       ├── search.js           # minisearch 全文索引
│       └── obsidian-index.js   # vault 级文件名索引 + [[wikilink]] 反链 + #tag
│
├── src/                    # 前端
│   ├── main.jsx            # React 根 + BrowserRouter
│   ├── App.jsx             # 路由表（6 个页面）
│   ├── components/
│   │   ├── primitives.jsx      # Icon / Frame / TopBar / SourcePill / SectionHeader / VaultCard / MOCK
│   │   ├── GlobalSearchBar.jsx # TopBar 中间的浮层搜索（⌘K 聚焦 + 实时下拉）
│   │   └── ReaderPanel.jsx     # 共享 MarkdownView / Empty / Loading / Error
│   ├── pages/
│   │   ├── Home.jsx            # 首页：三源卡片墙（上下三段）
│   │   ├── LearnSpacious.jsx   # 学习项目：6 阶段进度 + knowledge/review 切换
│   │   ├── Obsidian.jsx        # PARA 树 + Markdown + 反链面板
│   │   ├── Work.jsx            # 公司项目：codex/current 高亮 + 活跃任务聚合
│   │   ├── Search.jsx          # 全局搜索详情页（⌘K 之外的入口）
│   │   └── Prefs.jsx           # 首选项 / 组件清单 / 技术栈（纯展示，无数据依赖）
│   ├── lib/
│   │   └── api.js          # /api/* 薄客户端（getSources/getTree/getFile/search/...）
│   └── styles/
│       └── theme.css       # Claude 风主题（暖米白 + Source Serif 4 + Inter Tight）
│
├── design-preview/         # 📦 归档：Claude design 产出的原始静态稿（9 页变体）
│   └── ...                 # npm run preview-design 能看
│
├── screenshots/            # 设计附件
└── uploads/                # 设计附件
```

## API 端点（全部只读，无 POST/PUT/DELETE）

| 端点 | 用途 |
|---|---|
| `GET /api/health` | 健康检查 + 各子系统状态 |
| `GET /api/sources` | 三源元信息（id/label/color/root/exists） |
| `GET /api/tree?source=xx&path=xx` | 单级目录列表（点开再拉下一级） |
| `GET /api/file?source=xx&path=xx` | md → frontmatter + 渲染 HTML + raw |
| `GET /api/learn/progress` | 解析 `progress.md` → 阶段表格 + 当前断点 |
| `GET /api/home/overview` | 首页聚合：三源总数 / 近 7 天 / PARA 分组 / 项目分组 |
| `GET /api/search?q=...&source=...&limit=N` | minisearch 全文检索，按源分组 + 高亮 snippet |
| `GET /api/search/stats` | 索引状态 |
| `GET /api/obsidian/backlinks?path=...` | 谁引用了这篇（反链表） |
| `GET /api/obsidian/tags` | 全部 `#tag` + 频次 |
| `GET /api/obsidian/stats` | Obsidian 索引状态 |

## 硬约束（Claude 做修改前必读）

1. **只读，不碰软链目标**：`data/learn` / `data/obsidian` / `data/work` 指向用户真实笔记，**绝对不要写入**（无论通过 fs API 还是 git）。后端所有路由都是 GET，保持这个不变式。
2. **`safeResolve` 不可绕过**：任何新增使用 `source + path` 的路由都必须走 `server/lib/sources.js` 的 `safeResolve`，防止 `..` 穿透。
3. **不要在公司项目下对 `md/` 跑 git**：这是全局规则（`~/.claude/CLAUDE.md` 第 3.4 节），看板读取 OK，`git status/commit` 要去 notes 仓（`~/work/code/sanwan/notes`）做。
4. **`design-preview/` 是设计稿归档**：保留作为未选中的 9 个变体参考（包括紧凑学习页、两个首页变体等），不要当垃圾删除。`npm run preview-design` 能用 serve 启动看。
5. **前端 Frame 已全屏**：`src/components/primitives.jsx` 的 `Frame` 占 `100vw × 100vh`，没有外边框 / 圆角 / 阴影。不要退回到"画板固定尺寸"模式。
6. **flex 嵌套要写 `minHeight: 0`**：任何 `display: flex; flex-direction: column` 父容器内放 `flex: 1` 子的，都必须给父加 `minHeight: 0`，否则 `overflow: auto` 会失效。这是已经修过一次的坑（见 git 历史）。
7. **中文路径安全**：Vite proxy 能处理中文 query；前端用 `URLSearchParams` 自动 percent-encoding；后端 Fastify 默认解码 OK。curl 测试时要用 `--data-urlencode`。

## 约定 / 设计决策

- **三源色**：学习 `#3766B8` 蓝 / Obsidian `#7A5AB8` 紫 / 公司 `#C77A35` 橙。只做 8px 色点 + 淡底 pill，不做整块背景。
- **设计语言**：Claude 风，暖米白底 `#FAF9F5`，衬线标题 Source Serif 4，无衬线正文 Inter Tight，等宽 JetBrains Mono。
- **数据优先真实**：首屏所有数字都来自 API（794 md / 143 近 7 天 / 24 活跃任务等），真实感是这个看板的灵魂，**不要加假数据**。极少数位仍 mock 的（连续打卡热图）都明确标注"占位·待 C4 接入"。
- **mock 数据**：`src/components/primitives.jsx` 里的 `MOCK` 常量还在导出但已基本没人用了，保留作类型参考。
- **搜索 UX**：TopBar 搜索框是**浮层下拉**（非跳页），⌘K 任何页面都能聚焦。`/search` 页作为详情页保留。
- **浮层 z-index**：搜索下拉 `z-index: 100`，高于其他内容但低于系统 modal。
- **学习页顶部折叠**：`StageBar + BreakpointCard` 默认收起成单行，`localStorage.learn-progress-open` 记忆。

## 现状完成度

| 页面 | 数据 | 状态 |
|---|---|---|
| `/` Home | 全真 | ✅ 三源卡片墙 · `/api/home/overview` |
| `/learn` LearnSpacious | 全真 | ✅ progress 解析 + knowledge/review 切换 + 折叠顶 |
| `/obsidian` Obsidian | 全真 | ✅ PARA 树 + Markdown + 反链 + 标签 |
| `/work` Work | 全真 | ✅ 项目列表 + codex/current 高亮 + 活跃任务聚合 |
| `/search` Search | 全真 | ✅ minisearch 实时 + 跨源跳转 |
| `/prefs` Prefs | 静态 | ⬜ 纯展示，未接 settings.json 读写 |

## 未来增强路线（按优先级）

1. **Electron 打包成 .app/.dmg**：加 `electron-builder`，处理前端构建 → 主进程 in-process Fastify 或 sidecar node → 代码签名。约半小时～1 小时。
2. **热更新文件变更**：加 `chokidar` 监听三源 + WebSocket 推送，前端自动刷新（现在改了 md 要手动 reload）。
3. **`/api/blob` 图片代理**：Obsidian vault 内的图片引用（`![[xxx.png]]`）能实际显示。
4. **学习打卡串联**：扫 `learn/md/codex/ledger/*.md` 和 `knowledge/*.md` 的 mtime，计算连续学习天数（替换现在的占位卡）。
5. **Obsidian 局部图谱**：基于反链表画 force-directed graph，加到当前文件右栏。
6. **Prefs 接真设置**：`~/.config/kb-board/config.json` 存源配置 / 主题 / 密度。

## 历史沿革（方便未来回顾）

这个项目是从 Claude design 产出的**9 个静态页面稿**开始，分 5 步走到今天：

1. **A**：Vite 脚手架 + 2 个主页面迁入（Home 上下三段 + LearnSpacious 呼吸感版）
2. **B**：迁剩余 4 页（Obsidian / Work / Search / Prefs）
3. **C1**：后端骨架 + 3 个核心端点（sources / tree / file）+ `data/` 软链
4. **C2**：前端接入真实数据（Obsidian → Work → Learn → Home 依次）
5. **C3+**：搜索（minisearch）+ Obsidian 反链/标签 + 收尾（.gitignore / start.sh / Electron）+ 全屏布局修复 + 学习页折叠

变体挑选：**首页 = 上下三段** / **学习页 = 呼吸感**（用户在 A 步骤确定），另 7 个变体在 `design-preview/` 归档可回看。

## 协作偏好

延续全局 `~/.claude/CLAUDE.md`：中文沟通、直击重点、先分析再动手、高风险操作先确认、质量优先。

这个项目额外：
- 改前端看效果时**优先用 build 校验语法**（`./node_modules/.bin/vite build`），HMR 有时报错后需要手刷新
- 改后端 `server/index.js` 会被 `node --watch` 自动重启，无需手动
- 搜索索引 / Obsidian 索引都在启动时后台异步构建（不阻塞 listen），改了扫描逻辑要重启后端触发重建
