# Repository Guidelines

## Project Structure & Module Organization

This repository is a local knowledge-base dashboard built with React, Vite, Fastify, and Electron. Frontend code lives in `src/`: pages in `src/pages/`, shared UI in `src/components/`, client helpers in `src/lib/`, and theme styles in `src/styles/theme.css`. Backend API code lives in `server/`, with route registration in `server/index.js` and source, search, Markdown, watcher, and stats logic in `server/lib/`. Electron entry points are in `electron/`. `design-preview/` is an archived design reference, not disposable scratch space. `data/learn`, `data/obsidian`, and `data/work` are local symlinks and must stay out of Git.

## Build, Test, and Development Commands

- `./start.sh`: create expected data symlinks, install dependencies, and start development services.
- `npm run dev`: run Fastify on `127.0.0.1:5174` and Vite on `5173`.
- `npm run app`: run the API, web app, and Electron shell together.
- `npm run build`: build the Vite frontend into `dist/`.
- `npm run dist`: build the frontend and package the Electron app into `release/`.
- `npm run preview-design`: serve the archived design preview on port `5180`.

## Coding Style & Naming Conventions

Use ESM JavaScript and JSX for app code; Electron main/preload files remain CommonJS `.cjs`. Follow existing two-space indentation, semicolons, single quotes, and function-component style. Keep page components in PascalCase (`LearnSpacious.jsx`) and helpers/hooks in camelCase (`usePrefs.js`, `safeResolve`). Prefer existing primitives from `src/components/primitives.jsx` before adding new UI patterns.

## Testing Guidelines

No automated test suite is currently defined. For changes, run `npm run build` as the minimum verification. For API or indexing changes, run `npm run dev` and check `/api/health`, affected endpoints, and the relevant UI route. Do not write to files behind `data/*`; those are user knowledge sources.

## Commit & Pull Request Guidelines

History uses Conventional Commits with concise Chinese summaries, for example `feat: 初始化 kb-dashboard v1` and `docs: 拆分 CLAUDE.md 和 README.md 职责`. Keep that style. PRs should include a short change summary, verification commands, screenshots for visible UI changes, and notes for any Electron packaging or local data-source assumptions.

## 项目记忆与文档入口

Repository navigation starts at `md/00-文档导航.md`. Long-term project knowledge belongs under `md/memory/knowledge/`, anti-repeat notes under `md/memory/anti-repeat/`, and active Codex task state under `md/codex/current/`.
