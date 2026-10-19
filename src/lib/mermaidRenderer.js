let nextRenderId = 0;

export function createMermaidRenderer(loadMermaid) {
  let queue = Promise.resolve();

  return (source, config, { isCurrent = () => true, document: ownerDocument = globalThis.document } = {}) => {
    const run = async () => {
      if (!isCurrent()) return null;
      const mermaid = await loadMermaid();
      if (ownerDocument.fonts?.ready) await ownerDocument.fonts.ready;
      if (!isCurrent()) return null;

      const id = `mermaid-${++nextRenderId}`;
      const host = ownerDocument.createElement('div');
      host.className = 'md-mermaid-render-host';
      host.style.cssText = 'position:absolute;left:-99999px;top:-99999px;width:0;height:0;overflow:hidden;visibility:hidden;';
      ownerDocument.body.appendChild(host);
      try {
        mermaid.initialize(config);
        const result = await mermaid.render(id, source, host);
        return isCurrent() ? result : null;
      } finally {
        host.remove();
      }
    };

    const result = queue.then(run);
    queue = result.catch(() => {});
    return result;
  };
}
