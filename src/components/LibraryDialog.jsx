import { useEffect, useRef } from 'react';
import { Icon } from './primitives.jsx';

export default function LibraryDialog({ title, onClose, returnFocus, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = returnFocus || document.activeElement;
    (ref.current?.querySelector('input, textarea') || ref.current?.querySelector('button'))?.focus();
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const targets = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea, select, a[href]')].filter((element) => element.getClientRects().length);
    const first = targets[0];
    const last = targets[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return <div className="library-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={ref} className={`library-dialog ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={onKeyDown}>
      <header><h2>{title}</h2><button type="button" className="library-icon-button" aria-label="关闭弹窗" onClick={onClose}><Icon name="x" size={20} /></button></header>
      {children}
    </section>
  </div>;
}
