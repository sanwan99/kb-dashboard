import { useEffect } from 'react';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SURFACES = '.library-rail, .library-search-input, .library-key-hint, .library-dialog';
const STRONG_SURFACES = `${SURFACES}, .library-reader, .library-results-header, .library-result`;
let nextId = 0;

// Encode the normal of a rounded glass rim into the R/G displacement channels.
// The centre is neutral (128); only the curved edge bends the backdrop.
function displacementImage(width, height, radius, rimWidth) {
  const scale = Math.min(1, 512 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) return null;
  const image = context.createImageData(canvas.width, canvas.height);
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const corner = Math.min(radius, halfWidth, halfHeight);
  const rim = Math.min(rimWidth, width / 3, height / 3);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const px = (x + 0.5) / canvas.width * width - halfWidth;
      const py = (y + 0.5) / canvas.height * height - halfHeight;
      const qx = Math.abs(px) - halfWidth + corner;
      const qy = Math.abs(py) - halfHeight + corner;
      const length = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const distance = length + Math.min(Math.max(qx, qy), 0) - corner;
      const edge = distance > 0 ? 0 : (1 - Math.min(1, -distance / rim)) ** 2;
      let nx = 0;
      let ny = 0;
      if (length > 0) {
        nx = Math.sign(px) * Math.max(qx, 0) / length;
        ny = Math.sign(py) * Math.max(qy, 0) / length;
      } else if (qx > qy) nx = Math.sign(px);
      else ny = Math.sign(py);
      const index = (y * canvas.width + x) * 4;
      image.data[index] = Math.round(128 - nx * edge * 127);
      image.data[index + 1] = Math.round(128 - ny * edge * 127);
      image.data[index + 2] = 128;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

export default function useLiquidGlass(rootRef, enabled, glassIntensity = 40) {
  const intensity = Math.max(0, Math.min(100, Number(glassIntensity) || 0));
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return undefined;
    const boost = Math.max(0, (intensity - 40) / 60);
    const selector = intensity >= 70 ? STRONG_SURFACES : SURFACES;
    const displacementScale = Math.round(22 * intensity / 40 + 41 * boost);
    const reducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // SVG backdrop displacement is supported by Chromium (including Electron).
    // Other engines retain the CSS blur/highlight treatment below.
    const svgBackdrop = /Chrome|Chromium|Electron/.test(navigator.userAgent)
      && CSS.supports('backdrop-filter', 'url("#kb-glass")');
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('liquid-glass-defs');
    const defs = document.createElementNS(SVG_NS, 'defs');
    svg.append(defs);
    document.body.append(svg);
    const surfaces = new Map();
    let frame = 0;
    let pointerEvent = null;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) updateMap(entry.target);
    });

    function updateMap(element) {
      const surface = surfaces.get(element);
      if (!surface?.image || reducedTransparency.matches) return;
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (!width || !height) return;
      const size = `${Math.round(width)}:${Math.round(height)}`;
      if (surface.size === size) return;
      surface.size = size;
      const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 12;
      const image = displacementImage(width, height, radius, 18 + 22 * boost);
      if (image) surface.image.setAttribute('href', image);
    }

    function scan() {
      for (const [element, surface] of surfaces) {
        if (root.contains(element)) continue;
        resizeObserver.unobserve(element); surface.filter?.remove(); surfaces.delete(element);
      }
      for (const element of root.querySelectorAll(selector)) {
        if (surfaces.has(element)) continue;
        element.classList.add('liquid-glass-surface');
        const surface = {};
        if (svgBackdrop && !reducedTransparency.matches) {
          const id = `kb-liquid-glass-${++nextId}`;
          const filter = document.createElementNS(SVG_NS, 'filter');
          filter.id = id;
          for (const [key, value] of Object.entries({ x: '0', y: '0', width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' })) filter.setAttribute(key, value);
          const image = document.createElementNS(SVG_NS, 'feImage');
          for (const [key, value] of Object.entries({ x: '0', y: '0', width: '100%', height: '100%', preserveAspectRatio: 'none', result: 'rim' })) image.setAttribute(key, value);
          const displacement = document.createElementNS(SVG_NS, 'feDisplacementMap');
          for (const [key, value] of Object.entries({ in: 'SourceGraphic', in2: 'rim', scale: String(displacementScale), xChannelSelector: 'R', yChannelSelector: 'G' })) displacement.setAttribute(key, value);
          filter.append(image, displacement); defs.append(filter);
          surface.filter = filter; surface.image = image;
          element.style.setProperty('--glass-refraction', `url("#${id}")`);
          element.classList.add('liquid-glass-refractive');
        }
        surfaces.set(element, surface);
        resizeObserver.observe(element); updateMap(element);
      }
    }

    const mutationObserver = new MutationObserver(scan);
    mutationObserver.observe(root, { childList: true, subtree: true });
    scan();

    const onPointerMove = (event) => {
      if (reducedMotion.matches || reducedTransparency.matches) return;
      pointerEvent = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const element = pointerEvent?.target.closest?.('.liquid-glass-surface');
        if (!element || !surfaces.has(element)) return;
        const rect = element.getBoundingClientRect();
        element.style.setProperty('--glass-pointer-x', `${pointerEvent.clientX - rect.left}px`);
        element.style.setProperty('--glass-pointer-y', `${pointerEvent.clientY - rect.top}px`);
      });
    };
    root.addEventListener('pointermove', onPointerMove, { passive: true });

    const onTransparencyChange = () => {
      for (const [element, surface] of surfaces) {
        resizeObserver.unobserve(element); surface.filter?.remove();
        element.classList.remove('liquid-glass-refractive'); element.style.removeProperty('--glass-refraction');
      }
      surfaces.clear(); scan();
    };
    reducedTransparency.addEventListener('change', onTransparencyChange);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      mutationObserver.disconnect(); resizeObserver.disconnect();
      root.removeEventListener('pointermove', onPointerMove);
      reducedTransparency.removeEventListener('change', onTransparencyChange);
      for (const element of surfaces.keys()) {
        element.classList.remove('liquid-glass-surface', 'liquid-glass-refractive');
        for (const property of ['--glass-refraction', '--glass-pointer-x', '--glass-pointer-y']) element.style.removeProperty(property);
      }
      svg.remove();
    };
  }, [rootRef, enabled, intensity]);
}
