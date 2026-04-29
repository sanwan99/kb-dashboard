# kb-dashboard — 技术结构说明

> Claude 进入此项目时先读本文件。**使用方式、完成度、待办、改动记录都在 [README.md](./README.md)**，这里只讲架构和改代码前必须遵守的约束。

## 定位

**本地 Markdown 三源聚合看板**。把分布在三个完全不同风格的笔记仓聚合成一个可浏览/搜索/路由的 Web 应用，Electron 包装成桌面 App。

## 三个数据源（软链 + 只读）

| 源 id | 软链位置 | 真实路径 | 风格 |
|---|---|---|---|
| `learn` | `data/learn` | `~/Desktop/文档/个人学习项目/` | AI Agent 阶段化学习（`progress.md` / `knowledge/` / `review/` 专题） |
| `obsidian` | `data/obsidian` | `~/Desktop/文档/个人知识库/` | Obsidian vault，PARA 方法论（`00-` / `10-` / ... / `99-`） |
| `work` | `data/work` | `~/work/code/sanwan/notes/` | 公司多项目外挂笔记仓，每子目录是一个项目（`md/codex/current/` 活跃任务） |

## 运行时架构

```
┌────────────── Electron 主进程 (electron/main.cjs, CJS) ──────────────┐
│  dev:  loadURL http://localhost:5173  （Vite + 独立 Fastify 进程）     │
│  prod: loadFile dist/index.html + in-process import server/index.js   │
│        + preload.cjs 注入 window.__KB_API_BASE__='http://127.0.0.1:5174' │
└──────────────────────────────────────────────────────────────────────┘
         ↓                               ↓
   前端  Vite 5 / React 18         后端  Fastify 5 @ 127.0.0.1:5174
   src/lib/api.js 走 apiUrl()      server/index.js 注册路由
   `/api/*` dev 走 Vite proxy      chokidar watch 三源 → SSE /api/events
   prod 走 __KB_API_BASE__         启动异步建：search 索引 + obsidian 索引
```

**端口**：前端 5173（Vite），后端 5174（Fastify，仅 127.0.0.1）。

## 技术栈

**前端**：Vite 5 · React 18 · React Router 6 · 纯 JSX（无 TS）· 手写 SVG 图标（`primitives.jsx` 的 `Icon`）· CSS 变量主题 + 内联 style · `highlight.js` 代码高亮 · `mermaid` 懒加载。

**后端**：Fastify 5 · `fast-glob` 扫 md · `gray-matter` 解 frontmatter · `marked` 渲 HTML（带自写 wikilink/embed 预处理）· `minisearch` 全文索引（中英混合分词：英文按词前缀+模糊，中文按字 AND）· `chokidar` 监听文件变更 · SSE 推送。

**桌面**：Electron 41 + electron-builder 26（asar + asarUnpack）。

## 目录

```
kb-dashboard/
├── CLAUDE.md / README.md       # 本文件 / 用户向文档
├── start.sh                    # 一键启动（建软链 + 装依赖 + 起服务）
├── package.json                # type: module（前后端 ESM；Electron 主进程 .cjs）
├── vite.config.js              # base='./' · manualChunks · /api proxy → :5174
│
├── data/                       # 🔗 三源软链（.gitignore，每台机手建）
│   ├── learn    → ~/Desktop/文档/个人学习项目
│   ├── obsidian → ~/Desktop/文档/个人知识库
│   └── work     → ~/work/code/sanwan/notes
│
├── electron/
│   ├── main.cjs                # 主进程：dev loadURL / prod loadFile + in-process Fastify
│   └── preload.cjs             # prod 注入 window.__KB_API_BASE__
│
├── server/                     # 后端
│   ├── index.js                # 入口 + 所有路由
│   └── lib/
│       ├── sources.js          # 源表 + KB_DATA_DIR 覆盖 + realRoot (realpath) + safeResolve
│       ├── tree.js             # 单级目录扫描 + 忽略规则
│       ├── markdown.js         # marked + gray-matter + wikilink/embed → {source,filePath} 上下文
│       ├── mime.js             # 扩展名 → MIME
│       ├── learn.js            # progress.md 解析（阶段表 / 当前断点 / streak / 30d 活跃）
│       ├── stats.js            # /api/home/overview 聚合（fast-glob 递归 + PARA/项目分组）
│       ├── search.js           # minisearch 索引 + 中英 tokenizer + snippet 高亮
│       ├── obsidian-index.js   # vault 文件名索引 + [[wikilink]] 反链 / outgoing + #tag
│       └── watcher.js          # chokidar 三源监听 + SSE 广播 + 5s 防抖重建索引
│
├── src/                        # 前端
│   ├── main.jsx                # bootstrap theme/prefs + BrowserRouter
│   ├── App.jsx                 # 路由表（6 页）
│   ├── components/
│   │   ├── primitives.jsx      # Icon / Frame / TopBar (+GlobalSearchBar) / SourcePill / SectionHeader
│   │   ├── GlobalSearchBar.jsx # ⌘K 浮层搜索：debounce + 分组 + 键盘导航
│   │   └── ReaderPanel.jsx     # 共享 MarkdownView（TOC+高亮+Mermaid+链接接管）/ Empty / Loading / Error
│   ├── pages/
│   │   ├── Home.jsx            # 三源卡片墙（上下三段）· /api/home/overview
│   │   ├── LearnSpacious.jsx   # 阶段进度 + 断点折叠卡 + knowledge/review 切换 + 30d 热图
│   │   ├── Obsidian.jsx        # PARA 树 + Markdown + 反链 + 局部图谱
│   │   ├── Work.jsx            # 项目列表 + md/codex/current 高亮 + 活跃任务聚合
│   │   ├── Search.jsx          # /search 详情页（⌘K 之外的深链入口）
│   │   └── Prefs.jsx           # 真配置：主题/密度/字号/源开关/行为开关
│   ├── lib/
│   │   ├── api.js              # /api/* 客户端（apiUrl + fetch/EventSource + 缓存 getCachedSources）
│   │   ├── useTheme.js         # light/dark/system 三档，useSyncExternalStore 跨组件共享
│   │   └── usePrefs.js         # 其他 prefs（density/fontSize/sources/behavior），存 kb-prefs
│   └── styles/theme.css        # CSS 变量 + [data-theme="dark"] 覆盖 + md 样式
│
├── design-preview/             # 📦 Claude design 原始静态稿归档（9 个页面变体）
└── screenshots/ uploads/       # 设计附件
```

## API 端点（全部 GET，只读）

| 端点 | 用途 |
|---|---|
| `GET /api/health` | 健康 + 各子系统状态 |
| `GET /api/sources` | 三源元信息（含 `realRoot`：realpath 后的真实路径） |
| `GET /api/tree?source&path` | 单级目录列表 |
| `GET /api/file?source&path` | md → frontmatter + HTML + raw；其他 → 元信息 |
| `GET /api/blob?source&path` | 二进制流（图片等） |
| `GET /api/events` | SSE：文件变更推送 `{type:add|change|unlink, source, path}` |
| `GET /api/learn/progress` | progress.md 解析：阶段 / 断点 / streak / recent30 |
| `GET /api/home/overview` | 首页聚合：三源 md 总数 / 近 7 天 / PARA 分组 / 项目分组 |
| `GET /api/search?q&source&limit` | minisearch 全文检索，按源分组 + `<mark>` 高亮 snippet |
| `GET /api/search/stats` | 搜索索引状态 |
| `GET /api/obsidian/backlinks?path` | 反链表 |
| `GET /api/obsidian/neighbors?path` | 局部图谱：入链 + 出链（direction: in/out/both） |
| `GET /api/obsidian/tags` | 所有 `#tag` + 频次 |
| `GET /api/obsidian/stats` | Obsidian 索引状态 |

## 硬约束（改代码前必读）

1. **只读，不碰软链目标**：`data/{learn,obsidian,work}` 指向用户真实笔记，**绝对不要写入**（fs API / git 都不行）。所有路由必须保持 GET。
2. **`safeResolve` 不可绕过**：任何接收 `source + path` 的路由必须过 `server/lib/sources.js` 的 `safeResolve`，防 `..` 穿透。
3. **不要在公司项目下对 `md/` 跑 git**：全局规则（见 `~/.claude/CLAUDE.md` 第 3.4 节）。看板读取 OK，`git status/commit` 要去 notes 仓（`~/work/code/sanwan/notes`）做。
4. **`design-preview/` 是归档**：保留 9 个未选中的设计变体参考，**不要当垃圾删**。`npm run preview-design` 能用 serve 看。
5. **前端 Frame 已全屏**：`primitives.jsx` 的 `Frame` 占 `100vw × 100vh`，无外边框 / 圆角 / 阴影。不要退回"画板固定尺寸"模式。
6. **flex 嵌套必须 `minHeight: 0`**：`display:flex; flex-direction:column` 的父容器如果内有 `flex:1` 子元素，父**必须** `minHeight: 0`，否则 `overflow:auto` 失效（已踩过一次，改动记录里有）。
7. **打包路径约定**：
   - Vite 必须 `base: './'`（否则 Electron loadFile 时绝对路径 404 → 白屏）
   - electron-builder `directories.output: 'release'`（和 vite 的 `dist/` 分离）
   - `asar: true` + `asarUnpack: [server, 核心 node_modules]`（ESM 加载需要文件系统路径，不能在 asar 内）
8. **中文路径**：前端 `URLSearchParams` 自动 percent-encoding；Fastify 默认解码；curl 测试用 `--data-urlencode`。
9. **Markdown 链接跳转**：`ReaderPanel.jsx` 的 `processLinks` 有 5 档规则（http/锚点/源 realRoot 绝对路径/相对路径 md/镜像仓库 `/xxx/md/codex` 兜底）。新增规则往这里加，不要在其他地方做 navigate。
10. **learn 进度协议**：`data/learn/progress.md` 顶部 ```` ```kb-progress ```` 围栏块（YAML）是机器消费的权威源；后端 `server/lib/learn.js` 走四级 fallback 链 `structured → markdown_fallback → cache_fallback → unavailable`；缓存落 `~/.kb-dashboard/learn-progress-cache.json`（不污染笔记仓）。改解析逻辑必须保留四档降级 + warnings 透出 + 健康徽标。协议字段定义见 [data/learn/AGENTS.md](./data/learn/AGENTS.md) 的"progress.md 修改协议"小节。

## 约定 / 设计决策

- **三源色**：`learn` 蓝 `#3766B8` / `obsidian` 紫 `#7A5AB8` / `work` 橙 `#C77A35`。只做 8px 色点 + 淡底 pill，不做整块背景。
- **设计语言**：Claude 风，暖米白底 `#FAF9F5`；衬线标题 Source Serif 4；无衬线正文 Inter Tight；等宽 JetBrains Mono。深色模式同配色体系。
- **数据优先真实**：首屏所有数字都来自 API，**不要加假数据**。极少数仍 mock 的都明确标"占位"。`MOCK` 常量在 `primitives.jsx` 保留但已无人用。
- **搜索 UX**：TopBar 搜索框是 `GlobalSearchBar` 浮层（非跳页），⌘K 聚焦。`/search` 页作为详情页保留。浮层 `z-index: 100`。
- **学习页顶部折叠**：`StageBar + BreakpointCard` 默认收起单行，`localStorage.learn-progress-open` 记忆，首次默认值走 `prefs.behavior.openBreakpointOnLearn`。
- **URL 即状态**：`selectedPath` 三页（Obsidian/Work/Learn）都从 `useSearchParams` 读，保证浏览器前进后退能恢复选中文件。

## 协作偏好

延续全局 `~/.claude/CLAUDE.md`：中文沟通、直击重点、先分析再动手、高风险操作先确认、质量优先。

**本项目额外**：
- 改前端看效果时**优先用 `./node_modules/.bin/vite build` 校验**（编译错 HMR 有时只在控制台出 error 但不刷屏）
- 改后端 `server/index.js` 会被 `node --watch` 自动重启，**不要**手动 kill / restart
- 搜索 / Obsidian 索引启动时后台异步构建，**改了扫描逻辑要重启后端**触发重建
- 改 `data/*` 里的 md 会通过 chokidar 触发 SSE 推送 + 5s 防抖重建索引，**不要手动重启后端**
