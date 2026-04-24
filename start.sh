#!/usr/bin/env bash
# kb-dashboard 一键启动：检查软链 + 装依赖 + 起前后端
set -euo pipefail

cd "$(dirname "$0")"

LEARN_TARGET="$HOME/Desktop/文档/个人学习项目"
OBSIDIAN_TARGET="$HOME/Desktop/文档/个人知识库"
WORK_TARGET="$HOME/work/code/sanwan/notes"

mkdir -p data

ensure_link() {
  local name="$1" target="$2"
  local link="data/$name"
  if [[ ! -e "$target" ]]; then
    echo "❌ 缺失源目录：$target"
    exit 1
  fi
  if [[ -L "$link" ]]; then
    local cur
    cur="$(readlink "$link")"
    if [[ "$cur" != "$target" ]]; then
      echo "🔗 修正软链 $link → $target"
      ln -sfn "$target" "$link"
    fi
  elif [[ -e "$link" ]]; then
    echo "⚠️  $link 已存在但不是软链，跳过"
  else
    echo "🔗 创建软链 $link → $target"
    ln -sfn "$target" "$link"
  fi
}

ensure_link learn    "$LEARN_TARGET"
ensure_link obsidian "$OBSIDIAN_TARGET"
ensure_link work     "$WORK_TARGET"

if [[ ! -d node_modules ]]; then
  echo "📦 安装依赖…"
  npm install
fi

echo "🚀 启动 kb-dashboard（前端:5173 / 后端:5174）"
exec npm run dev
