/* FORMA — Progress dashboard, guided measurements, weekly report (PRD section 7). */

FORMA_VIEWS.progress = {
  render(params, container) {
    const measurements = FORMA_DB.getMeasurements();
    const sessions = FORMA_DB.getSessions();
    const cardio = FORMA_DB.getCardio();
    const recovery = FORMA_DB.getRecoveryLogs();
    const bw = FORMA_DB.getBodyweightLogs();

    const since = new Date(); since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString().slice(0, 10);
    const completed30 = sessions.filter(s => s.status === 'completed' && s.endedAt >= sinceIso);
    const runs30 = cardio.filter(c => c.type === 'run' && c.date >= sinceIso);
    const rec30 = recovery.filter(r => r.createdAt >= sinceIso);
    const avgRecovery = rec30.length ? Math.round(rec30.reduce((a, r) => a + r.score, 0) / rec30.length) : null;

    const chestTrend = trendSummary(measurements, 'chest_cm', 'חזה');
    const navelTrend = trendSummary(measurements, 'navel_cm', 'טבור');
    const symmetryFlexed = armSymmetry(measurements, 'arm_flexed');

    const pressHistory = FORMA_DB.exerciseHistory('flat-dumbbell-press');
    const anchorProg = evaluateProgression('flat-dumbbell-press', pressHistory, FORMA_DB.findAnyDayExercise('flat-dumbbell-press'));

    container.innerHTML = `
      <div class="view">
        <p class="eyebrow">30 הימים האחרונים</p>
        <h1 class="h1">התקדמות</h1>

        <div class="card mt-4">
          <p class="body-lg">${meaningSentence(chestTrend, navelTrend, anchorProg)}</p>
        </div>

        <div class="grid-3 mt-4">
          <div class="stat"><span class="value ltr-num">${completed30.length}</span><span class="label">אימונים הושלמו</span></div>
          <div class="stat"><span class="value ltr-num">${runs30.length}</span><span class="label">ריצות</span></div>
          <div class="stat"><span class="value ltr-num">${avgRecovery ?? '—'}</span><span class="label">התאוששות ממוצעת</span></div>
        </div>

        <button class="btn btn--outline w-full mt-4" id="weekly-report-btn">דוח שבועי</button>

        <div class="card mt-5">
          <div class="row row--between"><p class="h3">חזה וטבור</p></div>
          ${renderLineChart({ seriesList: [{ label: 'חזה', colorVar: '--accent', points: chestTrend.points }, { label: 'טבור', colorVar: '--go-strong', points: navelTrend.points }], unit: ' ס"מ' })}
          <div class="chart-legend"><span class="item"><i class="swatch" style="background:var(--accent)"></i>חזה</span><span class="item"><i class="swatch" style="background:var(--go-strong)"></i>טבור</span></div>
          <p class="body-sm mt-2">${esc(chestTrend.message)}</p>
          <p class="body-sm">${esc(navelTrend.message)}</p>
        </div>

        <div class="card mt-4">
          <p class="h3">היקף זרוע (מכווצת)</p>
          ${renderLineChart({ seriesList: [{ label: 'שמאל', colorVar: '--accent', points: seriesFor(measurements, 'left_arm_flexed_cm') }, { label: 'ימין', colorVar: '--go-strong', points: seriesFor(measurements, 'right_arm_flexed_cm') }], unit: ' ס"מ' })}
          <div class="chart-legend"><span class="item"><i class="swatch" style="background:var(--accent)"></i>שמאל</span><span class="item"><i class="swatch" style="background:var(--go-strong)"></i>ימין</span></div>
          ${symmetryFlexed.hasEnoughData ? `<p class="body-sm mt-2">${esc(symmetryFlexed.message)}</p>` : `<p class="body-sm mt-2">אין עדיין מספיק מדידות עקביות לבדוק סימטריה.</p>`}
        </div>

        <div class="card mt-4">
          <div class="row row--between"><p class="h3">משקל גוף</p><button class="btn btn--ghost btn--sm" id="add-weight-btn">${ICONS.plus} עדכן</button></div>
          ${renderBodyweightChart(bw)}
        </div>

        <div class="card mt-4">
          <p class="h3">לחיצת חזה — ${esc(FORMA_EXERCISE_INDEX['flat-dumbbell-press'].nameHe)}</p>
          ${renderExerciseVolumeChart('flat-dumbbell-press')}
          <p class="body-sm mt-2">${esc(anchorProg.message)}</p>
        </div>

        <div class="card mt-4">
          <p class="h3">ריצות</p>
          ${renderRunChart(cardio)}
        </div>

        <div class="card mt-4">
          <p class="h3">נפח שבועי ישיר — מתוכנן</p>
          <p class="body-sm mt-1 muted">מחושב מסכום הסטים בתוכנית הנוכחית.</p>
          <div class="muscle-target-grid mt-3">
            ${Object.values(FORMA_DB.getMuscleWeeklyTargets()).map(t => `
              <div class="muscle-target-cell">
                <span class="value ltr-num">${t.targetSets}</span>
                <span class="label">${esc(t.labelHe)}</span>
              </div>`).join('')}
          </div>
        </div>

        ${renderMilestones(completed30, symmetryFlexed, chestTrend, navelTrend)}

        <div class="card mt-4">
          <div class="row row--between"><p class="h3">תמונות התקדמות</p><button class="btn btn--ghost btn--sm" id="add-photo-btn">${ICONS.camera} הוסף</button></div>
          <input type="file" accept="image/*" capture="environment" id="photo-input" style="display:none" />
          <div id="photo-grid" class="mt-2"></div>
        </div>
      </div>
    `;

    container.querySelector('#weekly-report-btn').addEventListener('click', () => FORMA_ROUTER.navigate('/progress/report'));
    container.querySelector('#add-weight-btn').addEventListener('click', () => promptBodyweight(container));
    container.querySelector('#add-photo-btn').addEventListener('click', () => container.querySelector('#photo-input').click());
    container.querySelector('#photo-input').addEventListener('change', (e) => handlePhotoUpload(e, container));
    renderPhotoGrid(container);
  }
};

function meaningSentence(chestTrend, navelTrend, anchorProg) {
  if (anchorProg.status === 'propose_increase' && navelTrend.hasTrend && navelTrend.direction !== 'עלייה') {
    return 'הכוח עולה והטבור לא גדל — כרגע התהליך מתאים לבניית שריר מבוקרת.';
  }
  if (chestTrend.hasTrend) return chestTrend.message;
  return 'ככל שיצטברו יותר אימונים ומדידות, כאן תופיע תמונת מצב משמעותית.';
}

function renderBodyweightChart(bw) {
  if (!bw.length) return `<div class="chart-empty">אין עדיין רישומי משקל. אפשר להוסיף מהכפתור למעלה.</div>`;
  const ma = bodyweightMovingAverage(bw);
  return renderLineChart({
    seriesList: [
      { label: 'משקל', colorVar: '--ink-400', points: ma.map(m => ({ date: m.date, value: m.weightKg, reliable: true })) },
      { label: 'ממוצע נע', colorVar: '--accent', points: ma.map(m => ({ date: m.date, value: m.movingAvg, reliable: true })) }
    ], unit: ' ק"ג'
  });
}

function renderExerciseVolumeChart(exerciseId) {
  const history = FORMA_DB.exerciseHistory(exerciseId).slice().reverse();
  const bySession = {};
  history.forEach(s => { (bySession[s.sessionId] = bySession[s.sessionId] || []).push(s); });
  const points = Object.values(bySession).map(sets => ({
    date: sets[0].createdAt.slice(0, 10),
    value: Math.max(...sets.map(s => s.weight)),
    reliable: true
  }));
  if (!points.length) return `<div class="chart-empty">עוד אין נתונים בתרגיל הזה.</div>`;
  return renderLineChart({ seriesList: [{ label: 'משקל עבודה', colorVar: '--accent', points }], unit: ' ק"ג' });
}

function renderRunChart(cardio) {
  const runs = cardio.filter(c => c.type === 'run' && c.distanceKm).sort((a, b) => a.date < b.date ? -1 : 1);
  if (!runs.length) return `<div class="chart-empty">עוד אין ריצות מתועדות.</div>`;
  return renderLineChart({ seriesList: [{ label: 'ק"מ', colorVar: '--go-strong', points: runs.map(r => ({ date: r.date, value: r.distanceKm, reliable: true })) }], unit: ' ק"מ' });
}

function renderMilestones(completed30, symmetry, chestTrend, navelTrend) {
  const items = [];
  if (completed30.length >= 4) items.push('רבע שנה של עקביות: השלמת לפחות 4 אימונים ב-30 הימים האחרונים.');
  if (symmetry.hasEnoughData && Math.abs(symmetry.diffCm) < 0.5) items.push('סימטריה טובה בין הידיים.');
  if (navelTrend.hasTrend && navelTrend.direction === 'ירידה' && chestTrend.hasTrend && chestTrend.direction !== 'ירידה') items.push('היקף הטבור יורד בלי ירידה מקבילה בחזה.');
  if (!items.length) return '';
  return `<div class="card mt-4"><p class="h3">אבני דרך</p><div class="stack stack--sm mt-2">${items.map(i => `<p class="body-lg">✓ ${esc(i)}</p>`).join('')}</div></div>`;
}

async function promptBodyweight(container) {
  const val = await showInputModal({ title: 'עדכון משקל', label: 'משקל נוכחי (ק"ג)', inputType: 'number', placeholder: 'למשל 78' });
  const num = Number(val);
  if (!num) return;
  FORMA_DB.addBodyweightLog({ date: new Date().toISOString().slice(0, 10), weightKg: num });
  FORMA_DB.saveProfile({ weightKg: num });
  FORMA_APP.toast('המשקל נשמר');
  FORMA_ROUTER.render();
}

async function handlePhotoUpload(e, container) {
  const file = e.target.files[0];
  if (!file) return;
  const date = new Date().toISOString().slice(0, 10);
  const id = `photo_${FORMA_DB.uid('p')}`;
  const ok = await FORMA_MEDIA.put(id, file);
  if (!ok) { FORMA_APP.toast('לא הצלחנו לשמור את התמונה במכשיר הזה'); return; }
  const list = JSON.parse(localStorage.getItem('forma:v1:photoIndex') || '[]');
  list.push({ id, date });
  localStorage.setItem('forma:v1:photoIndex', JSON.stringify(list));
  FORMA_APP.toast('התמונה נשמרה, פרטית במכשיר זה בלבד');
  renderPhotoGrid(container);
}

async function renderPhotoGrid(container) {
  const grid = container.querySelector('#photo-grid');
  if (!grid) return;
  const list = JSON.parse(localStorage.getItem('forma:v1:photoIndex') || '[]').slice(-6).reverse();
  if (!list.length) { grid.innerHTML = `<p class="body-sm">אין עדיין תמונות. הן נשמרות מקומית בלבד ולא מנותחות ללא הסכמה.</p>`; return; }
  grid.innerHTML = `<div class="grid-3" id="photo-thumbs"></div>`;
  const thumbs = grid.querySelector('#photo-thumbs');
  for (const p of list) {
    const blob = await FORMA_MEDIA.get(p.id);
    const cell = document.createElement('div');
    cell.style.cssText = 'aspect-ratio:3/4;border-radius:12px;overflow:hidden;background:var(--bg-sunken)';
    if (blob) { const url = URL.createObjectURL(blob); cell.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover"/>`; }
    thumbs.appendChild(cell);
  }
}

// ---------------------------------------------------------------------------
FORMA_VIEWS.weeklyReport = {
  render(params, container) {
    const ctx = FORMA_COACH.buildContext();
    const summary = FORMA_COACH.buildPeriodSummary(ctx, 7);
    container.innerHTML = `
      <div class="view">
        ${topbar('דוח שבועי', { back: true })}
        <div class="card mt-4">
          <p class="body-lg">${esc(summary.headline)}</p>
          <div class="stack stack--sm mt-3">${summary.bullets.map(b => `<p class="body-lg">• ${esc(b)}</p>`).join('')}</div>
        </div>
        <div class="card mt-4">
          <p class="h3">מה הרגיש טוב? מה הפריע?</p>
          <textarea class="input mt-2" id="report-note" placeholder="כמה מילים על השבוע..."></textarea>
          <button class="btn btn--primary w-full mt-3" id="save-report-note">שמור</button>
        </div>
      </div>
    `;
    wireTopbarBack(container, '/progress');
    container.querySelector('#save-report-note').addEventListener('click', () => {
      const text = container.querySelector('#report-note').value.trim();
      if (!text) return;
      FORMA_DB.addUserFeedback({ targetFeature: 'weekly_report', rating: null, reason: text });
      FORMA_APP.toast('נשמר, תודה');
    });
  }
};

// ---------------------------------------------------------------------------
FORMA_VIEWS.measureFlow = {
  render(params, container) {
    const fields = MEASUREMENT_FIELDS;
    let selected = null;
    let readings = [];

    container.innerHTML = `
      <div class="view">
        ${topbar('מדידת היקפים', { back: true })}
        <p class="body-sm">למדוד בבוקר, באותו מצב ובאותו צד. שתי מדידות; אם ההפרש גדול מ-0.7 ס"מ נבקש מדידה שלישית.</p>
        <p class="h3 mt-4">איזה אזור מודדים?</p>
        <div class="chip-row mt-2" id="field-chips">
          ${fields.map(f => `<button class="chip" data-field="${f.key}">${f.labelHe}</button>`).join('')}
        </div>
        <div id="reading-area" class="mt-5"></div>
      </div>
    `;
    wireTopbarBack(container, '/progress');

    container.querySelectorAll('#field-chips .chip').forEach(chip => chip.addEventListener('click', () => {
      container.querySelectorAll('#field-chips .chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      selected = fields.find(f => f.key === chip.dataset.field);
      readings = [];
      renderReadingStep();
    }));

    function renderReadingStep() {
      const area = container.querySelector('#reading-area');
      area.innerHTML = `
        <div class="card">
          <p class="h3">${selected.labelHe} — מדידה ${readings.length + 1}</p>
          <input class="input mt-3" type="number" step="0.1" id="reading-input" placeholder="ס\"מ" />
          <button class="btn btn--primary w-full mt-3" id="reading-next">הבא</button>
        </div>
      `;
      area.querySelector('#reading-next').addEventListener('click', () => {
        const v = Number(area.querySelector('#reading-input').value);
        if (!v) return;
        readings.push(v);
        const result = consolidateReadings(readings);
        if (result.needsThirdReading && readings.length === 2) { renderReadingStep(); return; }
        if (readings.length < 2) { renderReadingStep(); return; }
        finalize(result);
      });
    }

    function finalize(result) {
      const today = new Date().toISOString().slice(0, 10);
      const measurements = FORMA_DB.getMeasurements();
      const todays = measurements.find(m => m.date === today);
      const patch = { [selected.key]: result.value, isSeed: false, protocol: 'guided', reliable: true, rawReadings: { ...(todays?.rawReadings || {}), [selected.key]: result.readings } };
      if (todays) FORMA_DB.updateMeasurement(todays.id, patch);
      else FORMA_DB.addMeasurement({ date: today, ...patch });
      FORMA_APP.toast('המדידה נשמרה');
      FORMA_ROUTER.navigate('/progress');
    }
  }
};
