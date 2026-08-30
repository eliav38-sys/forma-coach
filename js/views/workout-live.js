/* FORMA — Live Workout Player. Single exercise focus, instant local save,
   auto rest timer. State is always re-derived from saved set logs, so a
   refresh or closed tab never loses a set. Effort is logged as RPE, per
   Eliav's program (not RIR) — weight, reps and actual RPE per set. */

FORMA_VIEWS.workoutLive = {
  render(params, container) {
    const session = FORMA_DB.getSessions().find(s => s.id === params.sessionId);
    if (!session) { FORMA_ROUTER.navigate('/today'); return; }
    const day = FORMA_DB.getWorkoutDays().find(d => d.id === session.dayId);
    const blockWeek = currentBlockWeek();

    let restInterval = null;
    let wakeLock = null;
    let pendingWarmup = false;
    let pendingPain = 'none';

    requestWakeLock();

    container.innerHTML = `<div class="view view--live" id="live-root"></div>`;
    paint();

    window.FORMA_LIVE_CLEANUP = () => {
      if (restInterval) clearInterval(restInterval);
      if (wakeLock) { try { wakeLock.release(); } catch (e) {} }
    };

    async function requestWakeLock() {
      try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* not available, fine */ }
    }

    function currentPlan() {
      const skipped = session.skippedExerciseIds || [];
      const extra = session.extraSets || {};
      const isReduced = session.adjustment?.action === 'reduce_volume';
      return session.exerciseIds
        .map((id, idx) => {
          const presc = FORMA_DB.getDayExercise(session.dayId, id) || FORMA_DB.findAnyDayExercise(id)
            || { sets: 3, repLow: 8, repHigh: 12, rpeLow: 7, rpeHigh: 8, restSecLow: 90, restSecHigh: 90 };
          let targetSets = presc.sets + (extra[id] || 0);
          if (blockWeek.volumePct < 100) targetSets = Math.max(1, Math.round(targetSets * blockWeek.volumePct / 100));
          if (isReduced && idx >= 3) targetSets = Math.max(1, targetSets - 1);
          return { id, idx, presc, targetSets };
        })
        .filter(e => !skipped.includes(e.id));
    }

    function paint() {
      const plan = currentPlan();
      const doneLogs = FORMA_DB.getSetLogs(session.id);
      const current = plan.find(e => doneLogs.filter(l => l.exerciseId === e.id && !l.warmup).length < e.targetSets);

      if (!current) { finishSession(); return; }

      const ex = FORMA_DB.getExercise(current.id);
      const completedForEx = doneLogs.filter(l => l.exerciseId === current.id && !l.warmup);
      const setNumber = completedForEx.length + 1;
      const history = FORMA_DB.exerciseHistory(current.id, session.id);
      const prevSameIndex = history[completedForEx.length] || history[0] || null;

      const defaultWeight = prevSameIndex ? prevSameIndex.weight : '';
      const defaultReps = prevSameIndex ? prevSameIndex.reps : Math.round((current.presc.repLow + current.presc.repHigh) / 2);
      const defaultRpe = Math.round(((current.presc.rpeLow + current.presc.rpeHigh) / 2) * 2) / 2;
      const restLabel = formatRestRange(current.presc.restSecLow, current.presc.restSecHigh);

      const root = document.getElementById('live-root');
      root.innerHTML = `
        <div class="live-head">
          <button class="icon-btn" id="live-close">${ICONS.close}</button>
          <span class="body-sm mono ltr-num">${plan.indexOf(current) + 1} / ${plan.length}</span>
          <button class="icon-btn" id="live-quiet" title="מצב שקט">${ICONS.moon}</button>
        </div>

        ${blockWeek.volumePct < 100 ? `<div class="card card--accent mt-3"><p class="body-sm">שבוע ${blockWeek.week} מתוך 6 — ${esc(blockWeek.note)}. הנפח היום מותאם ל-${blockWeek.volumePct}%.</p></div>` : ''}
        ${session.adjustment && session.adjustment.action !== 'keep' ? `<div class="card card--accent mt-3"><p class="body-sm">${esc(session.adjustment.message || '')}</p></div>` : ''}

        <div class="live-exercise">
          <p class="name-he">${esc(ex.nameHe)}${pendingWarmup ? ' · חימום' : ''}</p>
          <p class="name-en ltr">${esc(ex.nameEn)}</p>
          <p class="body-sm mt-1">סט ${setNumber} מתוך ${current.targetSets} · מנוחה ${restLabel}</p>
          <div class="set-pips">
            ${Array.from({ length: current.targetSets }).map((_, i) => `<span class="set-pip ${i < completedForEx.length ? 'done' : i === completedForEx.length ? 'current' : ''}">${i < completedForEx.length ? '✓' : i + 1}</span>`).join('')}
          </div>
        </div>

        <div class="media-frame">
          <div class="text-center muted"><div style="margin-bottom:8px">${ICONS.play}</div><p class="body-sm">${esc(ex.cues?.[0] || '')}</p></div>
        </div>

        <div class="prev-perf">${prevSameIndex ? `לפני: <b class="ltr-num">${prevSameIndex.weight}</b> ק"ג × <b class="ltr-num">${prevSameIndex.reps}</b> (RPE <span class="ltr-num">${prevSameIndex.rpe}</span>)` : 'אין עדיין היסטוריה בתרגיל הזה'}</div>

        <div class="text-center mt-3">
          <button class="chip" id="warmup-toggle" aria-pressed="${pendingWarmup ? 'true' : 'false'}">סימון כסט חימום (לא נכנס לנפח)</button>
        </div>

        <div class="entry-grid entry-grid--3">
          <div class="entry-box">
            <label>משקל (ק"ג)</label>
            <div class="stepper stepper--sm">
              <button data-step="weight" data-dir="-1">−</button>
              <span class="val ltr-num" id="weight-val">${defaultWeight || 0}</span>
              <button data-step="weight" data-dir="1">+</button>
            </div>
          </div>
          <div class="entry-box">
            <label>חזרות</label>
            <div class="stepper stepper--sm">
              <button data-step="reps" data-dir="-1">−</button>
              <span class="val ltr-num" id="reps-val">${defaultReps}</span>
              <button data-step="reps" data-dir="1">+</button>
            </div>
          </div>
          <div class="entry-box">
            <label>RPE</label>
            <div class="stepper stepper--sm">
              <button data-step="rpe" data-dir="-1">−</button>
              <span class="val ltr-num" id="rpe-val">${defaultRpe}</span>
              <button data-step="rpe" data-dir="1">+</button>
            </div>
          </div>
        </div>
        <p class="body-sm text-center mt-2 muted">יעד: <span class="ltr-num">${current.presc.repLow}–${current.presc.repHigh}</span> חזרות ב-RPE <span class="ltr-num">${current.presc.rpeLow === current.presc.rpeHigh ? current.presc.rpeHigh : current.presc.rpeLow + '–' + current.presc.rpeHigh}</span></p>

        <button class="finish-set-btn" id="finish-set-btn">סיימתי סט</button>

        <div class="live-shortcuts">
          <button data-shortcut="pain">${ICONS.heart}<span>כאב</span></button>
          <button data-shortcut="swap">${ICONS.swap}<span>החלף תרגיל</span></button>
          <button data-shortcut="skip">${ICONS.skip}<span>דלג</span></button>
          <button data-shortcut="addset">${ICONS.plus}<span>הוסף סט</span></button>
          <button data-shortcut="voice">${ICONS.mic}<span>הערה קולית</span></button>
        </div>
        <div id="shortcut-panel"></div>
      `;

      let weight = Number(defaultWeight) || 0;
      let reps = Number(defaultReps) || 0;
      let rpe = defaultRpe;

      root.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => {
        const dir = Number(btn.dataset.dir);
        if (btn.dataset.step === 'weight') { weight = Math.max(0, Math.round((weight + dir * 1.25) * 100) / 100); root.querySelector('#weight-val').textContent = weight; }
        else if (btn.dataset.step === 'reps') { reps = Math.max(0, reps + dir); root.querySelector('#reps-val').textContent = reps; }
        else { rpe = Math.min(10, Math.max(5, Math.round((rpe + dir * 0.5) * 2) / 2)); root.querySelector('#rpe-val').textContent = rpe; }
      }));

      root.querySelector('#warmup-toggle').addEventListener('click', (e) => {
        pendingWarmup = !pendingWarmup;
        e.target.setAttribute('aria-pressed', pendingWarmup ? 'true' : 'false');
      });

      root.querySelector('#live-close').addEventListener('click', () => {
        if (confirm('לצאת מהאימון? הסטים שנשמרו יישארו.')) FORMA_ROUTER.navigate('/today');
      });
      root.querySelector('#live-quiet').addEventListener('click', () => {
        const s = FORMA_DB.getSettings(); FORMA_DB.saveSettings({ quietMode: !s.quietMode });
        FORMA_APP.toast(s.quietMode ? 'יצאת ממצב שקט' : 'מצב אימון שקט פעיל');
      });

      root.querySelector('#finish-set-btn').addEventListener('click', (e) => {
        FORMA_DB.addSetLog({
          sessionId: session.id, exerciseId: current.id, weight, reps, rpe,
          warmup: pendingWarmup, pain: pendingPain
        });
        pendingWarmup = false;
        const painWasSharp = pendingPain === 'sharp';
        pendingPain = 'none';
        FORMA_APP.vibrate(15);
        flashSetComplete(e.currentTarget);
        if (painWasSharp) {
          FORMA_APP.toast(checkPainSafety('sharp').message, 4000);
        }
        startRest(current.presc.restSecLow, ex);
      });

      root.querySelectorAll('[data-shortcut]').forEach(btn => btn.addEventListener('click', () => handleShortcut(btn.dataset.shortcut, current, ex, root)));
    }

    function handleShortcut(kind, current, ex, root) {
      const panel = root.querySelector('#shortcut-panel');
      if (kind === 'pain') {
        panel.innerHTML = `<div class="card mt-3"><p class="h3">רמת כאב</p><div class="chip-row mt-2">
          <button class="chip" data-pain="mild">קל</button>
          <button class="chip" data-pain="sharp">חד</button>
        </div></div>`;
        panel.querySelectorAll('[data-pain]').forEach(b => b.addEventListener('click', () => { pendingPain = b.dataset.pain; FORMA_APP.toast('נרשם — יילקח בחשבון בסט הבא'); panel.innerHTML = ''; }));
      } else if (kind === 'swap') {
        panel.innerHTML = `<div class="card mt-3"><p class="h3">חלופות ל${esc(ex.nameHe)}</p><p class="body-lg mt-2">${(ex.substitutes || []).join(' · ') || 'אין חלופות מתועדות עדיין'}</p></div>`;
      } else if (kind === 'skip') {
        FORMA_DB.updateSession(session.id, { skippedExerciseIds: [...(session.skippedExerciseIds || []), current.id] });
        session.skippedExerciseIds = [...(session.skippedExerciseIds || []), current.id];
        FORMA_APP.toast('דילגנו על התרגיל הזה');
        paint();
      } else if (kind === 'addset') {
        const extra = { ...(session.extraSets || {}) };
        extra[current.id] = (extra[current.id] || 0) + 1;
        FORMA_DB.updateSession(session.id, { extraSets: extra });
        session.extraSets = extra;
        FORMA_APP.toast('נוסף סט');
        paint();
      } else if (kind === 'voice') {
        startVoiceNote(panel);
      }
    }

    function startVoiceNote(panel) {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        panel.innerHTML = `<div class="card mt-3"><p class="body-sm">זיהוי קול לא זמין בדפדפן הזה. אפשר לכתוב הערה:</p><textarea class="input mt-2" id="voice-fallback"></textarea><button class="btn btn--sm btn--primary mt-2" id="voice-save">שמור הערה</button></div>`;
        panel.querySelector('#voice-save').addEventListener('click', () => { saveNote(panel.querySelector('#voice-fallback').value); panel.innerHTML = ''; });
        return;
      }
      panel.innerHTML = `<div class="card mt-3"><p class="body-sm">מקשיב...</p></div>`;
      const rec = new Recognition();
      rec.lang = 'he-IL';
      rec.onresult = (e) => { const text = e.results[0][0].transcript; saveNote(text); panel.innerHTML = `<div class="card mt-3"><p class="body-sm">נשמר: "${esc(text)}"</p></div>`; setTimeout(() => panel.innerHTML = '', 2500); };
      rec.onerror = () => { panel.innerHTML = `<div class="card mt-3"><p class="body-sm">לא הצלחנו לתפוס את זה. נסה שוב.</p></div>`; };
      try { rec.start(); } catch (e) { panel.innerHTML = ''; }
    }
    function saveNote(text) {
      if (!text) return;
      const notes = { ...(session.notes || {}) };
      const key = new Date().toISOString();
      notes[key] = text;
      FORMA_DB.updateSession(session.id, { notes });
      session.notes = notes;
    }

    function startRest(seconds, ex) {
      let remaining = seconds;
      const cue = ex.cues && ex.cues.length ? ex.cues[Math.floor(Math.random() * ex.cues.length)] : '';
      const overlay = document.createElement('div');
      overlay.className = 'rest-overlay';
      overlay.innerHTML = `
        <p class="eyebrow">מנוחה</p>
        <div class="rest-ring">
          <svg viewBox="0 0 120 120"><circle class="ring-track" cx="60" cy="60" r="52"/><circle class="ring-fill" id="rest-ring-fill" cx="60" cy="60" r="52"/></svg>
          <div class="rest-timer ltr-num" id="rest-timer-val">${formatTime(remaining)}</div>
        </div>
        ${cue ? `<div class="rest-cue">${esc(cue)}</div>` : ''}
        <button class="btn btn--outline" id="skip-rest">דלג על המנוחה</button>
      `;
      document.body.appendChild(overlay);
      const timerEl = overlay.querySelector('#rest-timer-val');
      const ringFill = overlay.querySelector('#rest-ring-fill');
      const circumference = 2 * Math.PI * 52;
      ringFill.style.strokeDasharray = `${circumference}`;
      const total = seconds;
      const paintRing = () => { ringFill.style.strokeDashoffset = `${circumference * (1 - remaining / total)}`; };
      paintRing();
      restInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(restInterval); restInterval = null;
          FORMA_APP.vibrate([250, 100, 250]);
          overlay.remove();
          paint();
          return;
        }
        timerEl.textContent = formatTime(remaining);
        paintRing();
      }, 1000);
      overlay.querySelector('#skip-rest').addEventListener('click', () => {
        clearInterval(restInterval); restInterval = null;
        overlay.remove();
        paint();
      });
    }

    function finishSession() {
      if (restInterval) clearInterval(restInterval);
      FORMA_DB.updateSession(session.id, { status: 'completed', endedAt: FORMA_DB.nowIso() });
      FORMA_APP.vibrate([200, 80, 200, 80, 200]);
      FORMA_ROUTER.navigate(`/workout/summary/${session.id}`);
    }
  }
};

function formatTime(s) { const m = Math.floor(s / 60), sec = s % 60; return `${m}:${String(sec).padStart(2, '0')}`; }
function formatRestRange(lowSec, highSec) {
  const toMin = (s) => Math.round((s / 60) * 10) / 10;
  if (lowSec >= 60 && highSec >= 60) {
    const lo = toMin(lowSec), hi = toMin(highSec);
    return lo === hi ? `${lo} דק׳` : `${lo}–${hi} דק׳`;
  }
  return lowSec === highSec ? `${lowSec} שנ׳` : `${lowSec}–${highSec} שנ׳`;
}
function flashSetComplete(btn) {
  btn.classList.add('pulse-once');
  setTimeout(() => btn.classList.remove('pulse-once'), 320);
}

FORMA_VIEWS.workoutSummary = {
  render(params, container) {
    const session = FORMA_DB.getSessions().find(s => s.id === params.sessionId);
    if (!session) { FORMA_ROUTER.navigate('/today'); return; }
    const logs = FORMA_DB.getSetLogs(session.id).filter(l => !l.warmup);
    const durationMin = session.endedAt ? Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 60000) : null;
    const totalVolume = logs.reduce((a, l) => a + (l.weight * l.reps), 0);
    const day = FORMA_DB.getWorkoutDays().find(d => d.id === session.dayId);
    const byExercise = {};
    logs.forEach(l => { (byExercise[l.exerciseId] = byExercise[l.exerciseId] || []).push(l); });

    container.innerHTML = `
      <div class="view">
        <div class="text-center mt-5">
          <p class="eyebrow">אימון הושלם</p>
          <h1 class="h1 mt-1">${esc(day ? day.name : 'אימון')}</h1>
        </div>

        <div class="grid-3 mt-5">
          <div class="stat"><span class="value ltr-num">${durationMin ?? '—'}</span><span class="label">דקות</span></div>
          <div class="stat"><span class="value ltr-num">${logs.length}</span><span class="label">סטים</span></div>
          <div class="stat"><span class="value ltr-num">${Math.round(totalVolume)}</span><span class="label">נפח (ק"ג)</span></div>
        </div>

        <div class="stack mt-5">
          ${Object.entries(byExercise).map(([id, sets]) => {
            const ex = FORMA_DB.getExercise(id);
            return `<div class="card"><p class="h3">${esc(ex?.nameHe || id)}</p><p class="body-sm mt-1 ltr-num">${sets.map(s => `${s.weight}×${s.reps} (RPE ${s.rpe})`).join(' · ')}</p></div>`;
          }).join('')}
        </div>

        <button class="btn btn--primary w-full mt-6" id="back-today">חזרה להיום</button>
      </div>
    `;
    container.querySelector('#back-today').addEventListener('click', () => FORMA_ROUTER.navigate('/today'));
  }
};
