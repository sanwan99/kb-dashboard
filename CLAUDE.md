# kb-dashboard — 技术结构说明

使用方式和历史改动见 [README.md](README.md)。当前产品为资料检索台，聚合项目文档与用户主动接入的本地目录。

## 数据来源

| 来源 | 位置 | 用途 |
| --- | --- | --- |
| `work` | `data/work`，默认指向 `~/work/code/sanwan/notes` | 每个顶层目录作为一个项目 |
| `custom` | `~/.kb-dashboard/custom-sources.json` 保存的挂载点 | 用户从界面添加的本地目录 |

`KB_DATA_DIR` 可覆盖数据根目录，`KB_CONFIG_DIR` 可覆盖来源配置目录。测试必须同时隔离这两个目录。

`learn` 与 `obsidian` 已停用：不参与默认扫描、搜索索引和文件监听；相关旧 API 返回 410。原始文件与已有软链保留，旧前端实现未删除且不由默认路由加载。不要恢复其后台索引或扫描退役的 `ai全局管理/` 目录。

## 运行方式

- Web 开发：Vite 5173 → `/api` 代理 → Fastify 127.0.0.1:5174。
- 独立预览：后端设置 `PORT`，前端设置对应的 `KB_API_PORT`，可与已运行的桌面应用并存。
- Electron 开发：加载 Vite URL。
- Electron 打包：`loadFile(dist/index.html)`，HashRouter 管理页面；preload 注入 API 地址，主进程启动 Fastify。
- 搜索按需建索引。文件变化立即标记索引过期，SSE 通知当前预览；下一次查询才重新构建。不要重新引入每次文件变化都全量读取资料的后台循环。

## 实现入口

| 文件 | 职责 |
| --- | --- |
| `src/pages/Library.jsx` | 检索、范围、目录、阅读、最近记录及失败恢复 |
| `src/components/LibrarySplitPane.jsx` | 指针拖动、键盘调宽、比例持久化和响应式切换 |
| `src/components/LibraryTree.jsx` | 懒加载目录树、展开状态记忆、键盘导航及独立预览 |
| `src/components/LibrarySources.jsx` | 真实目录接入、改名和移除 |
| `src/components/LibraryDialog.jsx` | 弹窗焦点、Esc 和焦点恢复 |
| `src/components/ReaderPanel.jsx` | Markdown / SQL、代码复制、Mermaid、图片、目录和文内链接 |
| `src/lib/libraryState.js` | URL 状态、筛选、标题及文件身份 |
| `src/lib/useLibraryRecent.js` | 本机最近阅读记录，兼容已有 work/custom 记录 |
| `src/lib/api.js` | 可取消请求及 SSE 断线重连 |
| `src/styles/library.css` | 检索台布局；主题变量仍由 `theme.css` 提供 |
| `server/lib/search.js` | MiniSearch 索引、分页、项目及挂载点过滤 |
| `server/lib/search-content.js` | 正文标题提取、安全摘要 |
| `server/lib/custom-sources.js` | 挂载元数据管理，不写原目录 |
| `server/lib/watcher.js` | 来源监听、忽略规则和 SSE 广播 |
| `tests/` | Node 原生测试；API 测试启动隔离的本地服务 |

## API

| 端点 | 用途 |
| --- | --- |
| `GET /api/health` | 有效来源、退役来源和索引状态 |
| `GET /api/sources` | 项目文档和自定义挂载点元信息 |
| `GET /api/tree?source&path` | 单级目录 |
| `GET /api/file?source&path` | 文本内容、HTML、frontmatter 或二进制元信息 |
| `GET /api/blob?source&path` | 图片等二进制流 |
| `GET /api/recent?source&project&mount&limit` | 按范围获取最近修改的可读文件 |
| `GET /api/search?q&source&project&mount&limit&offset` | 全文搜索，返回 total / nextOffset / hasMore / lastBuilt |
| `GET /api/search/stats` | 索引就绪、过期状态和跳过的大目录 |
| `GET /api/events` | 文件事件和索引刷新通知 |
| `GET/POST/PATCH/DELETE /api/custom-sources` | 来源配置管理，改名和移除需追加挂载 ID |
| `POST /api/open-with` | 用 Typora 打开或在 Finder 中显示，检查命令结果后响应 |
| `POST /api/file/trash` | 现有受控废纸篓操作 |

`/api/home/overview` 保留兼容，检索台不依赖其聚合。学习进度和 Obsidian 专项接口返回 410。

## 修改约束

1. 默认只读用户资料。不得写入 `data/*` 的软链目标；唯一现有例外是用户确认后的单项废纸篓操作。不得新增永久删除、批量删除或任意绝对路径写入。
2. 接收 `source + path` 的文件路由必须经过 `safeResolve`。自定义路径第一段是挂载 ID，不是真实目录名。
3. `md/` 是 notes-backed 资产，相关 Git 操作在 notes 仓执行。仅维护当前任务要求的文档。
4. 保留 `design-preview/` 历史归档以及开工前已有的未提交修改。
5. Vite 必须保留 `base: './'`；Electron 构建输出仍为 `release/`，不要与前端 `dist/` 混用。ESM 服务依赖保留 `asarUnpack` 配置。
6. 嵌套 flex 的可滚动区域必须设置 `min-height: 0` 和 `min-width: 0`。结果和正文各自滚动，窄窗口使用上下布局。
7. 关键词、来源、目录和选中文档由 URL 驱动。异步结果必须校验当前请求身份；切换关键词不能打开旧查询的首项。
8. Markdown 链接统一由 `ReaderPanel.jsx` 接管。文内锚点不能覆盖 Electron 的 HashRouter 路由。
9. 数据来自实际 API，空态和错误态如实显示；不在正式页面加入示例统计或模拟操作成功。

## 验证

先运行 `npm test` 和 `npm run build`。UI 修改还需在浏览器验证搜索、返回、拖动、预览及窄窗口布局；API / 索引修改需核对实际端点语义。来源增删、磁盘变更和错误恢复使用临时目录，真实资料只做读取验证。

开发模式 `node --watch` 会自动重启 API。手动启动的独立验证进程需自行管理；不要终止其他用户进程或替换正在运行的桌面 App。构建通过与 Electron 打包、安装、运行验证是不同状态，分别报告。
