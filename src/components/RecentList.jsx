import React from 'react';

// 展示"最近打开"的 md 列表，卡片式样（与活跃任务视觉一致）
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
    <div style={{ padding: '4px 12px 0' }}>
      {recent.map((p) => {
        const segs = p.split('/');
        const name = segs[segs.length - 1];
        const proj = segs[0] || '';
        const midSegs = segs.length > 2 ? segs.slice(1, -1) : [];
        const midTail = midSegs.length ? midSegs[midSegs.length - 1] : '';
        const active = currentPath === p;
        return (
          <div
            key={p}
            className="kb-card"
            onClick={() => onSelect?.(p)}
            title={p}
            style={{
              padding: 10,
              marginBottom: 6,
              cursor: 'pointer',
              borderColor: active ? accent : 'var(--border)',
              borderWidth: active ? 1.5 : 1,
              background: active ? 'var(--bg-raised)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: accent,
                  flexShrink: 0,
                }}
              />
              <span
                className="kb-mono"
                style={{
                  fontSize: 10.5,
                  color: accent,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '55%',
                }}
              >
                {proj}
              </span>
              {midTail && (
                <span
                  className="kb-mono"
                  style={{
                    marginLeft: 'auto',
                    fontSize: 10,
                    color: 'var(--ink-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '45%',
                  }}
                >
                  {midSegs.length > 1 ? '…/' : ''}{midTail}
                </span>
              )}
            </div>
            <div
              className="kb-mono"
              style={{
                fontSize: 11.5,
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
