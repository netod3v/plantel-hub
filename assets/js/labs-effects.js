(() => {
  const root = document.documentElement;
  const icon = document.querySelector('link[rel~="icon"]');
  const originalFavicon = icon ? icon.getAttribute('href') : null;
  const labsFavicon = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#07130C"/><path d="M24 10h16M27 10v18L14 51c-2 4 1 7 5 7h26c4 0 7-3 5-7L37 28V10" fill="none" stroke="#22C55E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 47c7-4 12 2 19-1 4-2 7-1 10 1l4 7H16z" fill="#22C55E"/></svg>`);
  const syncFavicon = () => { if (icon) icon.setAttribute('href', root.getAttribute('data-labs') === 'true' ? labsFavicon : originalFavicon); };
  const observer = new MutationObserver(syncFavicon);
  observer.observe(root, { attributes:true, attributeFilter:['data-labs'] });
  syncFavicon();

  const finePointer = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  if (!finePointer) return;
  let frame = 0;
  const move = event => {
    if (root.getAttribute('data-labs') !== 'true') return;
    const x = event.clientX; const y = event.clientY;
    const update = () => {
      root.style.setProperty('--labs-x', `${x}px`);
      root.style.setProperty('--labs-y', `${y}px`);
      root.style.setProperty('--labs-glow-opacity', '1');
      frame = 0;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) update();
    else if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('pointermove', move, { passive:true });
  window.addEventListener('pointerleave', () => root.style.setProperty('--labs-glow-opacity','0'), { passive:true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) root.style.setProperty('--labs-glow-opacity','0'); });
})();
