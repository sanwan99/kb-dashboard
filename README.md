# 个人知识库看板 · kb-dashboard

三源聚合的本地 Markdown 看板：**学习项目** / **Obsidian 知识库** / **公司项目笔记**。

## 当前状态：v1.0 — 完整可用

- 前端：Vite 5 + React 18 + React Router 6
- 后端：Fastify 5 @ 127.0.0.1:5174，9 个端点
- **6 个页面全接真实数据**（含 Search 全文 / Obsidian 反链）
- 搜索：**minisearch 索引 794 篇 md**，中英混合分词，结果点击直接跳到对应页打开文件
- Obsidian：反向链接面板 + 标签面板（vault 级索引）
- 一键启动：`./start.sh`（自动建软链 / 装依赖 / 起前后端）

## 启动

最快：
```bash
cd /Users/fanhaolin/work/sanwan/kb-dashboard
./start.sh       # 自动软链 + npm install + npm run dev
```

手动：
```bash
npm install      # 首次
npm run dev      # 同时起前后端
```

- **前端** http://localhost:5173 （Vite + HMR）
- **后端** http://127.0.0.1:5174 （Fastify，`node --watch` 自动重启）
- 前端 `/api/*` 请求由 Vite proxy 转到后端

命令：
- `npm run dev` — 并发启动前后端（concurrently）
- `npm run dev:api` — 只跑后端
- `npm run dev:web` — 只跑前端
- `npm run build` — 前端生产构建到 `dist/`
- `npm run preview` — 预览生产构建
- `npm run preview-design` — 5180 端口看归档的原始设计稿（`design-preview/`）

## 路由

| 路径 | 页面 | 状态 |
|---|---|---|
| `/` | 首页（上下三段） | ✅ 已迁 |
| `/learn` | 学习项目（呼吸感） | ✅ 已迁 |
| `/obsidian` | Obsidian 浏览 | ✅ 已迁 |
| `/work` | 公司笔记 | ✅ 已迁 |
| `/search` | 全局搜索 | ✅ 已迁 |
| `/prefs` | 首选项 | ✅ 已迁 |

## 目录

```
kb-dashboard/
├── index.html              # Vite 入口
├── vite.config.js          # React + /api proxy → :5174
├── package.json
├── data/                   # 🔗 三个源的软链（只读）
│   ├── learn     → /Users/fanhaolin/Desktop/文档/个人学习项目
│   ├── obsidian  → /Users/fanhaolin/Desktop/文档/个人知识库
│   └── work      → /Users/fanhaolin/work/code/sanwan/notes
├── server/                 # 后端（Fastify）
│   ├── index.js                # 入口 + 3 个路由
│   └── lib/
│       ├── sources.js          # 源表 + safeResolve 路径穿透防护
│       ├── tree.js             # 单级目录列表 + 忽略规则
│       └── markdown.js         # marked + gray-matter + wikilink/embed 占位渲染
├── src/
│   ├── main.jsx            # React 根 + Router
│   ├── App.jsx             # 路由表
│   ├── components/
│   │   └── primitives.jsx  # Icon / Frame / TopBar / SourcePill / SectionHeader / VaultCard / MOCK
│   ├── pages/
│   │   ├── Home.jsx            # 首页（上下三段）
│   │   ├── LearnSpacious.jsx   # 学习项目（呼吸感）
│   │   ├── Obsidian.jsx        # PARA 树 + Markdown + 反链 + 局部图谱
│   │   ├── Work.jsx            # 公司笔记（codex/current 高亮）
│   │   ├── Search.jsx          # 跨源全文搜索
│   │   └── Prefs.jsx           # 首选项 / 组件清单 / 技术栈
│   ├── styles/
│   │   └── theme.css       # Claude 风主题
│   └── lib/
│       └── api.js          # /api/* 薄客户端：getSources / getTree / getFile
├── design-preview/         # 📦 归档：原 Claude design 产出的静态稿
│   ├── index.html          # 画板展示器（CDN + Babel standalone）
│   ├── design-canvas.jsx
│   ├── pages/*.jsx         # 9 个页面变体（含未选中的 3 个首页和 1 个紧凑学习页）
│   ├── components/primitives.jsx
│   └── styles/theme.css
├── screenshots/
└── uploads/
```

## API 端点

| 端点 | 返回 |
|---|---|
| `GET /api/health` | `{ ok, sources, search }` |
| `GET /api/sources` | 三源元信息（id/label/color/root/exists） |
| `GET /api/tree?source=xx&path=xx` | 单级目录列表，dir 在前 + 名字排序 |
| `GET /api/file?source=xx&path=xx` | md → frontmatter + 渲染 HTML + raw |
| `GET /api/learn/progress` | 解析 `progress.md` → 阶段表格 + 当前断点 + 进度百分比 |
| `GET /api/home/overview` | 首页聚合：三源 md 总数 / 近 7 天编辑数 / PARA 分组 / 项目分组 |
| `GET /api/search?q=...&source=...&limit=N` | minisearch 全文检索，按源分组 + 高亮 snippet |
| `GET /api/search/stats` | `{ ready, docCount, lastBuilt }` |
| `GET /api/obsidian/backlinks?path=...` | 谁引用了这篇笔记（`[[wikilink]]` 反向索引） |
| `GET /api/obsidian/tags` | vault 全部 `#tag` 及使用频次 |
| `GET /api/obsidian/stats` | `{ ready, fileCount, tagCount, backlinkTargets, lastBuilt }` |

安全保障：
- `safeResolve` 在 `source.root` 基础上 resolve，非 root 内路径返回 400
- 忽略目录：`.git`/`.DS_Store`/`node_modules`/`target`/`dist`/`.vite`/`.claude`/`.codex_tmp`/`.obsidian`/`.trash`/`*_副本`
- 纯只读，无任何 POST/PUT/DELETE

## 改动记录

**v1.0（本次）：搜索 + 反链 + 收尾**
- 全文搜索：`server/lib/search.js` 基于 minisearch，**794 篇 md 索引就绪**
  - 中英混合分词（英文按词前缀 + 模糊，中文按字 AND）
  - 启动时后台构建，不阻塞 listen
  - `Search.jsx` 改为受控 input + 180ms debounce + 3 源过滤 checkbox + 按源分组结果
  - 结果条目点击 → 跳到对应页（`/obsidian?path=...` 等），Obsidian/Work/Learn 读 `useSearchParams` 自动展开并选中文件
- Obsidian 反链/标签：`server/lib/obsidian-index.js` 扫 `[[wikilink]]` + `#tag`，两遍扫描（文件名索引 + wikilink/tag 提取）
  - 代码块内不算 tag；严格 tag 正则排除 `##heading` 和纯数字
  - 右栏 `BacklinksPanel` 实时显示当前文件的反链，可点击跳转
  - 左栏底部 tag 栏（0 个时显示"vault 以 PARA 目录组织"兜底）
- 收尾：`start.sh` 一键启动（自动建软链 + install + dev）；`.gitignore` 排除 `data/` 下三个软链

**v0.5：四页全接真实数据**
- 新端点：`/api/learn/progress`（progress.md 结构化解析）、`/api/home/overview`（首页聚合）
- 新模块：`server/lib/learn.js`（表格/阶段正则解析）、`server/lib/stats.js`（fast-glob 递归扫描 + PARA/项目分组）
- 抽共享组件 `src/components/ReaderPanel.jsx`（MarkdownView / Empty / Loading / Error）
- Home / Obsidian / Work / LearnSpacious 全部消费真实 API 数据
- Home 所有卡片变成 `<Link>`，点击即路由到对应页

**v0.4：后端骨架就绪**
- Fastify + CORS + `node --watch` 热重启
- `data/` 下建三个软链，`safeResolve` 防路径穿透
- 核心端点：`/api/sources` `/api/tree` `/api/file` `/api/health`
- Markdown 渲染：`marked` + `gray-matter` + wikilink/embed 占位
- Vite `/api` proxy → :5174
- `npm run dev` 用 `concurrently` 同起前后端
- `src/lib/api.js` 薄客户端就位，下一步给 page 接

**v0.3：剩余 4 页迁移**
- `Obsidian.jsx` / `Work.jsx` / `Search.jsx` / `Prefs.jsx` 全部从 `design-preview/` 迁入
- 删除 `Stub.jsx` 占位
- 路由表 6 条全部接真页面，build 通过（41 modules, 300ms）

**v0.2：工程化改造**
- 脚手架：Vite + React 18 + React Router 6
- 原 `pages/` `components/` `styles/` `design-canvas.jsx` `index.html` 全部搬入 `design-preview/` 归档
- `primitives.jsx` 改造：
  - 去掉 `window` 挂载，全部 `export`
  - TopBar 改用 `NavLink`，active 态由 URL 自动判定
- 页面迁移：`home.jsx` → `src/pages/Home.jsx`，`learn-spacious.jsx` → `src/pages/LearnSpacious.jsx`
- 其他 4 页 Stub 占位

**v0.1（已归档）：静态设计稿**
- 保留在 `design-preview/` 下，`npm run preview-design` 能看

## 未来可选增强

- [ ] WebSocket `/api/changes` + chokidar 监听文件变更热更新（现在改了文件要刷新页面）
- [ ] `/api/blob?source=...&path=...` 图片等二进制代理（Obsidian 内图片引用）
- [ ] Prefs 页接真实 settings.json 读写
- [ ] 学习页打卡串联：扫 `md/codex/ledger/` 统计连续天数
- [ ] Obsidian 局部图谱可视化（现已有反链边，可以画 force-directed graph）

起一个超轻 Node 后端扫三个源，mock 换真数据：

```
/Users/fanhaolin/Desktop/文档/个人学习项目/     # 源 A：学习项目
/Users/fanhaolin/Desktop/文档/个人知识库/         # 源 B：Obsidian（PARA）
/Users/fanhaolin/work/code/sanwan/notes/         # 源 C：公司外挂笔记仓
```

推荐栈：
- 后端：Fastify + `chokidar` 监听 + `gray-matter` 解析 frontmatter
- Markdown：`react-markdown` + `remark-gfm` + `rehype-highlight` + mermaid
- Obsidian 专项：自写 `[[wikilink]]` / `![[embed]]` remark 插件 + vault 级文件名索引 + 反向链接表
- 搜索：前期 `lunr`，量大换 `orama`

### 只读保证

前端不做任何写操作。后端只做：目录扫描、文件读取、`git log` 最近 commit 只读展示。
全局规则要求禁止在公司项目下对 `md/` 跑 git —— 这条由后端白名单保证。
