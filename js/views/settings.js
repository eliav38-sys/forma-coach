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
          <p class="body-sm mt-2">${FORMA_COACH.liveAvailable() ? `${statusChip('good', 'Coach מחובר ל-Gemini')} כשיש רשת. שאלה חופשית בצ׳אט נשלחת יחד עם תקציר נתונים לצורך התשובה בלבד.` : `${statusChip('neutral', 'Coach במצב מקומי')} עדיין לא חובר מודל חי — התשובות מבוססות-נתונים אמיתיים, רק בלי ניסוח חופשי של מודל.`}</p>
        </div>

        <p class="eyebrow mt-6">מאמן חכם (Gemini)</p>
        <div class="card mt-2">
          ${hasGeminiKey() ? `
            <div class="row row--between">
              <div class="flex-1">
                <p class="body-lg" style="font-weight:700">מחובר</p>
                <p class="body-sm mono ltr mt-1" style="direction:ltr;text-align:start">${esc(maskedGeminiKey())}</p>
              </div>
              ${statusChip('good', 'פעיל')}
            </div>
            <div class="field mt-4">
              <label>מודל</label>
              <select class="select" id="gemini-model">
                ${GEMINI_MODELS.map(m => `<option value="${esc(m.id)}" ${getGeminiModel() === m.id ? 'selected' : ''}>${esc(m.labelHe)}</option>`).join('')}
              </select>
            </div>
            <div class="decision-actions mt-4">
              <button class="btn btn--outline" id="gemini-test">בדוק חיבור</button>
              <button class="btn btn--danger" id="gemini-disconnect">נתק</button>
            </div>
            <div id="gemini-result"></div>
          ` : `
            <p class="body-sm">כרגע המאמן עונה ממנוע מקומי מבוסס-נתונים. אפשר לחבר מודל אמיתי של Google שינסח תשובות חופשיות — יש לזה שכבה חינמית.</p>
            <ol class="body-sm mt-3" style="padding-inline-start:18px;line-height:1.9">
              <li>פתח <span style="color:var(--accent)">aistudio.google.com/apikey</span></li>
              <li>לחץ Create API key והעתק אותו</li>
              <li>הדבק אותו כאן למטה</li>
            </ol>
            <button class="btn btn--primary w-full mt-4" id="gemini-connect">${ICONS.bolt} חבר מפתח</button>
            <div id="gemini-result"></div>
            <p class="body-sm mt-3 muted">המפתח נשמר רק במכשיר הזה, לא נכנס לקוד של האפליקציה ולא נשלח לאף אחד חוץ מ-Google. מי שיש לו גישה למכשיר הפתוח שלך יכול לחלץ אותו — אם זה מפריע לך, יש דרך מאובטחת יותר ב-README (Cloudflare Worker).</p>
          `}
        </div>

        <p class="eyebrow mt-6">תוכנית</p>
        <button class="option mt-2" id="schedule-link" style="width:100%">
          <div class="flex-1" style="text-align:start">
            <p class="body-lg" style="font-weight:700">לוח ימי אימונים</p>
            <p class="body-sm mt-1 muted">בחר לאיזה יום בשבוע משויך כל אימון — תוכן האימונים לא משתנה</p>
          </div>
          ${ICONS.chevronStart}
        </button>

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
    container.querySelector('#schedule-link').addEventListener('click', () => FORMA_ROUTER.navigate('/training/schedule'));
    wireGeminiSettings(container);

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

/* The key is typed by the user, on their own device, and goes straight to
   localStorage. It is never sent anywhere except to Google's own API. */
function wireGeminiSettings(container) {
  const result = container.querySelector('#gemini-result');
  const show = (tone, text) => {
    result.innerHTML = `<div class="card card--flat mt-3" style="background:var(--${tone === 'good' ? 'status-good-bg' : 'status-low-bg'})">
      <p class="body-sm" style="color:var(--${tone === 'good' ? 'status-good-ink' : 'status-low-ink'})">${esc(text)}</p></div>`;
  };

  const connectBtn = container.querySelector('#gemini-connect');
  if (connectBtn) connectBtn.addEventListener('click', async () => {
    const key = await showInputModal({
      title: 'מפתח Gemini',
      label: 'הדבק כאן את המפתח מ-Google AI Studio',
      placeholder: 'AIza...',
      confirmLabel: 'חבר'
    });
    if (!key) return;
    setGeminiKey(key);
    FORMA_ROUTER.render();
    // Verify immediately: a key that silently doesn't work is worse than none,
    // because the Coach would just keep falling back without saying why.
    const el = document.querySelector('#gemini-result');
    if (el) el.innerHTML = `<p class="body-sm mt-3 muted">בודק את החיבור…</p>`;
    const res = await testGeminiConnection();
    const el2 = document.querySelector('#gemini-result');
    if (!el2) return;
    if (res.ok) {
      el2.innerHTML = `<div class="card card--flat mt-3" style="background:var(--status-good-bg)"><p class="body-sm" style="color:var(--status-good-ink)">מחובר. תשובת בדיקה: ${esc(res.sample)}</p></div>`;
    } else {
      el2.innerHTML = `<div class="card card--flat mt-3" style="background:var(--status-low-bg)"><p class="body-sm" style="color:var(--status-low-ink)">${esc(res.message)}</p></div>`;
    }
  });

  const testBtn = container.querySelector('#gemini-test');
  if (testBtn) testBtn.addEventListener('click', async () => {
    testBtn.disabled = true;
    result.innerHTML = `<p class="body-sm mt-3 muted">בודק…</p>`;
    const res = await testGeminiConnection();
    testBtn.disabled = false;
    if (res.ok) show('good', `עובד. תשובת בדיקה: ${res.sample}`);
    else show('low', res.message);
  });

  const disconnectBtn = container.querySelector('#gemini-disconnect');
  if (disconnectBtn) disconnectBtn.addEventListener('click', async () => {
    const ok = await showConfirmModal({
      title: 'לנתק את Gemini?',
      message: 'המפתח יימחק מהמכשיר. המאמן יחזור למנוע המקומי.',
      confirmLabel: 'נתק', danger: true
    });
    if (!ok) return;
    clearGeminiKey();
    FORMA_APP.toast('נותק');
    FORMA_ROUTER.render();
  });

  const modelSelect = container.querySelector('#gemini-model');
  if (modelSelect) modelSelect.addEventListener('change', () => {
    setGeminiModel(modelSelect.value);
    FORMA_APP.toast('המודל עודכן');
  });
}

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
