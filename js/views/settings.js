/* FORMA — settings: theme, vibration, export/import, and full data control (PRD 10.8, 15.3). */

FORMA_VIEWS.settings = {
  render(params, container) {
    const settings = FORMA_DB.getSettings();
    const profile = FORMA_DB.getProfile();
    container.innerHTML = `
      <div class="view">
        ${topbar('הגדרות', { back: true })}

        <div class="card">
          <p class="h3">${esc(profile.displayName || '')}</p>
          <p class="body-sm mt-1">כל הנתונים האישיים (סטים, מדידות, התאוששות) נשמרים מקומית במכשיר הזה בלבד ולא נשלחים לשום מקום.</p>
          <p class="body-sm mt-2">${FORMA_AI_WORKER_URL ? `${statusChip('good', 'Coach מחובר ל-Claude')} כשיש רשת. שאלה חופשית בצ׳אט נשלחת יחד עם תקציר נתונים לצורך התשובה בלבד.` : `${statusChip('neutral', 'Coach במצב מקומי')} עדיין לא חובר מודל חי — התשובות מבוססות-נתונים אמיתיים, רק בלי ניסוח חופשי של Claude.`}</p>
        </div>

        <p class="eyebrow mt-6">תצוגה</p>
        <div class="chip-row mt-2">
          <button class="chip" data-theme="system" aria-pressed="${(!settings.theme || settings.theme === 'system') ? 'true' : 'false'}">אוטומטי</button>
          <button class="chip" data-theme="light" aria-pressed="${settings.theme === 'light' ? 'true' : 'false'}">בהיר</button>
          <button class="chip" data-theme="dark" aria-pressed="${settings.theme === 'dark' ? 'true' : 'false'}">כהה</button>
        </div>

        <div class="card mt-5 row row--between">
          <p class="body-lg">רטט</p>
          <button class="chip" id="vibration-toggle" aria-pressed="${settings.vibration !== false ? 'true' : 'false'}">${settings.vibration !== false ? 'פעיל' : 'כבוי'}</button>
        </div>

        <div class="card mt-4 row row--between">
          <p class="body-lg">התאמות התאוששות אוטומטיות</p>
          <button class="chip" id="recovery-decisions-toggle" aria-pressed="${!settings.suppressRecoveryDecisions ? 'true' : 'false'}">${!settings.suppressRecoveryDecisions ? 'פעיל' : 'מושתק'}</button>
        </div>

        <p class="eyebrow mt-6">נתונים</p>
        <div class="stack mt-2">
          <button class="btn btn--outline w-full" id="export-json">ייצוא JSON מלא</button>
          <button class="btn btn--outline w-full" id="export-csv">ייצוא CSV — סטים</button>
        </div>

        <p class="eyebrow mt-6">מחיקה</p>
        <div class="stack mt-2">
          <button class="btn btn--danger w-full" id="wipe-photos">מחק תמונות בלבד</button>
          <button class="btn btn--danger w-full" id="wipe-nutrition">מחק תזונה בלבד</button>
          <button class="btn btn--danger w-full" id="wipe-all">מחק את כל החשבון</button>
        </div>
      </div>
    `;
    wireTopbarBack(container, '/today');

    container.querySelectorAll('[data-theme]').forEach(btn => btn.addEventListener('click', () => {
      FORMA_DB.saveSettings({ theme: btn.dataset.theme });
      FORMA_APP.applyTheme();
      FORMA_ROUTER.render();
    }));
    container.querySelector('#vibration-toggle').addEventListener('click', () => {
      FORMA_DB.saveSettings({ vibration: settings.vibration === false });
      FORMA_ROUTER.render();
    });
    container.querySelector('#recovery-decisions-toggle').addEventListener('click', () => {
      FORMA_DB.saveSettings({ suppressRecoveryDecisions: !settings.suppressRecoveryDecisions });
      FORMA_ROUTER.render();
    });
    container.querySelector('#export-json').addEventListener('click', () => downloadFile('forma-export.json', JSON.stringify(FORMA_DB.exportAll(), null, 2), 'application/json'));
    container.querySelector('#export-csv').addEventListener('click', () => downloadFile('forma-sets.csv', setsToCsv(FORMA_DB.getSetLogs()), 'text/csv'));

    container.querySelector('#wipe-photos').addEventListener('click', async () => {
      const ok = await showConfirmModal({ title: 'למחוק את כל התמונות?', confirmLabel: 'מחק', danger: true });
      if (ok) { FORMA_DB.wipeCategory('photos'); localStorage.removeItem('forma:v1:photoIndex'); FORMA_APP.toast('התמונות נמחקו'); }
    });
    container.querySelector('#wipe-nutrition').addEventListener('click', async () => {
      const ok = await showConfirmModal({ title: 'למחוק את כל נתוני התזונה?', confirmLabel: 'מחק', danger: true });
      if (ok) { FORMA_DB.wipeCategory('nutrition'); FORMA_APP.toast('נתוני התזונה נמחקו'); }
    });
    container.querySelector('#wipe-all').addEventListener('click', async () => {
      const ok = await showConfirmModal({ title: 'למחוק את כל החשבון?', message: 'פעולה זו בלתי הפיכה.', confirmLabel: 'מחק הכל', danger: true });
      if (ok) { FORMA_DB.wipeAll(); location.hash = '#/onboarding'; location.reload(); }
    });
  }
};

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function setsToCsv(logs) {
  const header = 'date,sessionId,exerciseId,weight,reps,rpe,warmup,pain';
  const rows = logs.map(l => [l.createdAt, l.sessionId, l.exerciseId, l.weight, l.reps, l.rpe, l.warmup, l.pain].join(','));
  return [header, ...rows].join('\n');
}
