/* FORMA — view registry. Each view file attaches itself: FORMA_VIEWS.today = {...} */
const FORMA_VIEWS = {};

/* Small shared render helpers used across views. */
function h(strings, ...vals) { return strings.reduce((acc, s, i) => acc + s + (vals[i] ?? ''), ''); }
function esc(str) { return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function topbar(title, opts = {}) {
  return `<div class="topbar">
    ${opts.back ? `<button class="icon-btn" id="topbar-back">${ICONS.chevronEnd}</button>` : '<span style="width:44px"></span>'}
    <h1>${esc(title)}</h1>
    ${opts.action ? opts.action : '<span style="width:44px"></span>'}
  </div>`;
}
function wireTopbarBack(container, fallback) {
  const btn = container.querySelector('#topbar-back');
  if (btn) btn.addEventListener('click', () => { if (history.length > 1) FORMA_ROUTER.back(); else FORMA_ROUTER.navigate(fallback || '/today'); });
}
function statusChip(tone, text, icon) {
  return `<span class="status status--${tone}">${icon || ''}${esc(text)}</span>`;
}
