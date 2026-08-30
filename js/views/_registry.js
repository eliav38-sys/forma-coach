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

/* Facade pattern: show YouTube's thumbnail + a play button, only load the
   real iframe (and YouTube's tracking JS) once the user actually taps it. */
function renderVideoFrame(youtubeId, labelHe) {
  if (!youtubeId) {
    return `<div class="media-frame"><div class="text-center muted"><div style="margin-bottom:8px">${ICONS.play}</div><p class="body-sm">אין עדיין סרטון הדגמה</p></div></div>`;
  }
  return `<div class="media-frame video-frame" data-yt="${esc(youtubeId)}" data-label="${esc(labelHe || '')}" role="button" tabindex="0" aria-label="הפעל סרטון הדגמה${labelHe ? ' — ' + esc(labelHe) : ''}">
    <img src="https://i.ytimg.com/vi/${esc(youtubeId)}/hqdefault.jpg" alt="" loading="lazy" />
    <span class="video-play-btn">${ICONS.play}</span>
  </div>`;
}
/* In-app modals — replace native confirm()/prompt() dialogs, which render
   as unstyled OS chrome and instantly break the illusion of a real app. */
function openModalShell() {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const sheet = document.createElement('div');
  sheet.className = 'atlas-sheet app-modal';
  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
  const close = () => { backdrop.remove(); sheet.remove(); };
  return { backdrop, sheet, close };
}

function showConfirmModal({ title, message, confirmLabel = 'אישור', cancelLabel = 'ביטול', danger = false }) {
  return new Promise((resolve) => {
    const { backdrop, sheet, close } = openModalShell();
    sheet.innerHTML = `
      <p class="h2">${esc(title)}</p>
      ${message ? `<p class="body-lg mt-2">${esc(message)}</p>` : ''}
      <div class="decision-actions mt-5">
        <button class="btn ${danger ? 'btn--danger' : 'btn--outline'}" id="modal-cancel">${esc(cancelLabel)}</button>
        <button class="btn ${danger ? 'btn--primary' : 'btn--primary'}" id="modal-confirm">${esc(confirmLabel)}</button>
      </div>`;
    let done = false;
    const finish = (val) => { if (done) return; done = true; close(); resolve(val); };
    sheet.querySelector('#modal-cancel').addEventListener('click', () => finish(false));
    sheet.querySelector('#modal-confirm').addEventListener('click', () => finish(true));
    backdrop.addEventListener('click', () => finish(false));
  });
}

function showInputModal({ title, label, placeholder = '', inputType = 'text', confirmLabel = 'שמור', initialValue = '' }) {
  return new Promise((resolve) => {
    const { backdrop, sheet, close } = openModalShell();
    sheet.innerHTML = `
      <p class="h2">${esc(title)}</p>
      <div class="field mt-3">
        ${label ? `<label>${esc(label)}</label>` : ''}
        <input class="input" id="modal-input" type="${inputType}" placeholder="${esc(placeholder)}" value="${esc(initialValue)}" inputmode="${inputType === 'number' ? 'decimal' : 'text'}" />
      </div>
      <div class="decision-actions mt-4">
        <button class="btn btn--outline" id="modal-cancel">ביטול</button>
        <button class="btn btn--primary" id="modal-confirm">${esc(confirmLabel)}</button>
      </div>`;
    const input = sheet.querySelector('#modal-input');
    setTimeout(() => input.focus(), 60);
    let done = false;
    const finish = (val) => { if (done) return; done = true; close(); resolve(val); };
    sheet.querySelector('#modal-confirm').addEventListener('click', () => finish(input.value || null));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(input.value || null); });
    sheet.querySelector('#modal-cancel').addEventListener('click', () => finish(null));
    backdrop.addEventListener('click', () => finish(null));
  });
}

function wireVideoFrames(container) {
  container.querySelectorAll('.video-frame[data-yt]').forEach(frame => {
    const play = () => {
      const id = frame.dataset.yt;
      const label = frame.dataset.label || 'סרטון הדגמה';
      frame.outerHTML = `<div class="media-frame video-frame video-frame--playing">
        <iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}?autoplay=1&rel=0" title="${esc(label)}"
          frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>`;
    };
    frame.addEventListener('click', play);
    frame.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  });
}
