import React, { useCallback, useState } from 'react';
import ContextMenu from '../components/ContextMenu.jsx';

// 调用方：const ctx = useContextMenu();
//   <div onContextMenu={(e) => ctx.open(e, items)}>...</div>
//   {ctx.Element}
export function useContextMenu() {
  const [state, setState] = useState(null);
  const close = useCallback(() => setState(null), []);
  const open = useCallback((e, items) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ x: e.clientX, y: e.clientY, items });
  }, []);
  const Element = state ? <ContextMenu {...state} onClose={close} /> : null;
  return { open, close, Element };
}
