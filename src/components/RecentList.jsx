import React from 'react';
import { Icon } from './primitives.jsx';

// 展示"最近打开"的 md 列表
// props:
//   recent         — string[]，路径数组（首项是当前）
//   currentPath    — 当前高亮项
//   onSelect(path) — 点击跳转
//   accent         — 色（通常是当前源色）
export default function RecentList({ recent = [], currentPath, onSelect, accent = 'var(--ink-sub)' }) {
  if (recent.length === 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '6px 14px' }}>
        还没有最近记录
      </div>
    );
  }
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {recent.map((p) => {
        const name = p.split('/').pop();
        const dir = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
        const active = currentPath === p;
        return (
          <li key={p}>
            <button
              type="button"
              onClick={() => onSelect?.(p)}
              title={p}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                textAlign: 'left',
                padding: '4px 12px',
                background: active ? 'var(--bg-raised)' : 'transparent',
                border: 0,
                borderLeft: `2px solid ${active ? accent : 'transparent'}`,
                cursor: 'pointer',
                color: active ? 'var(--ink)' : 'var(--ink-sub)',
                fontSize: 11.5,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Icon name="file" size={11} color={active ? accent : 'var(--ink-muted)'} />
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {name}
              </span>
              {dir && (
                <span
                  className="kb-mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--ink-muted)',
                    maxWidth: '50%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {dir}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
