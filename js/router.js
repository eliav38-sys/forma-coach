/* FORMA — tiny hash router. No build step, so this stays deliberately small:
   route table maps a pattern to a view module's render(params, container). */

const FORMA_ROUTER = (() => {
  const routes = [];
  function add(pattern, view) { routes.push({ pattern, view, keys: [...pattern.matchAll(/:([a-zA-Z]+)/g)].map(m => m[1]) }); }

  function match(hash) {
    const full = hash.replace(/^#/, '') || '/today';
    const [path, queryStr] = full.split('?');
    const query = Object.fromEntries(new URLSearchParams(queryStr || ''));
    for (const r of routes) {
      const re = new RegExp('^' + r.pattern.replace(/:[a-zA-Z]+/g, '([^/]+)') + '$');
      const m = path.match(re);
      if (m) {
        const params = { ...query };
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        return { view: r.view, params, path };
      }
    }
    return null;
  }

  function currentPath() { return (location.hash.replace(/^#/, '') || '/today'); }

  function navigate(path) {
    if (location.hash === '#' + path) { render(); } else { location.hash = path; }
  }
  function back() { history.back(); }

  let container = null;
  function init(el) { container = el; window.addEventListener('hashchange', render); render(); }

  function render() {
    const found = match(location.hash);
    if (!found) { navigate('/today'); return; }
    if (window.FORMA_LIVE_CLEANUP) { try { window.FORMA_LIVE_CLEANUP(); } catch (e) {} window.FORMA_LIVE_CLEANUP = null; }
    document.querySelectorAll('.sheet-backdrop, .atlas-sheet, .rest-overlay').forEach(el => el.remove());
    container.scrollTop = 0;
    window.scrollTo(0, 0);
    container.innerHTML = '';
    try {
      found.view.render(found.params, container);
    } catch (e) {
      console.error('View render error', e);
      container.innerHTML = `<div class="view"><div class="empty-state">${ICONS.empty}<p>קרתה תקלה בטעינת המסך.</p></div></div>`;
    }
    FORMA_APP.afterRouteChange(found.path);
  }

  return { add, navigate, back, currentPath, init, render };
})();
