/* FORMA — Training hub, day detail, exercise detail, cardio log. */

FORMA_VIEWS.training = {
  render(params, container) {
    const days = FORMA_DB.getWorkoutDays();
    const sessions = FORMA_DB.getSessions();
    const since = new Date(); since.setDate(since.getDate() - 7);
    const sinceIso = since.toISOString().slice(0, 10);
    const completedThisWeek = new Set(sessions.filter(s => s.status === 'completed' && s.endedAt >= sinceIso).map(s => s.dayId));
    const todayIdx = new Date().getDay();
    const block = currentBlockWeek();
    const nextDayId = findNextStrengthDayId(todayIdx, completedThisWeek);

    container.innerHTML = `
      <div class="view">
        <div class="row row--between">
          <div>
            <p class="eyebrow">התוכנית שלי</p>
            <h1 class="h1">אימון</h1>
          </div>
          <button class="icon-btn" id="edit-schedule-btn" title="ערוך לוח שבועי">${ICONS.settings}</button>
        </div>

        ${blockIndicator(block)}

        <div class="week-strip mt-5" id="week-strip">
          ${weekActivityList().map(d => weekChip(d, d.dayIndex === todayIdx)).join('')}
        </div>

        <div class="stack mt-5">
          ${days.map(d => dayCard(d, completedThisWeek.has(d.id), d.id === nextDayId)).join('')}
        </div>

        <div class="card mt-4">
          <p class="h3">ריצה קלה</p>
          <p class="body-sm mt-1">${FORMA_SEED.runningProgram.easy.durationMinLow}–${FORMA_SEED.runningProgram.easy.durationMinHigh} דקות · RPE ${FORMA_SEED.runningProgram.easy.rpeLow}–${FORMA_SEED.runningProgram.easy.rpeHigh}</p>
          <p class="body-sm mt-1 muted">${esc(FORMA_SEED.runningProgram.easy.note)}</p>
        </div>
        <div class="card mt-3">
          <p class="h3">ריצת איכות מבוקרת</p>
          <p class="body-sm mt-1">חימום ${FORMA_SEED.runningProgram.quality.warmupMin} דק׳ · ${FORMA_SEED.runningProgram.quality.repsLow}–${FORMA_SEED.runningProgram.quality.repsHigh} חזרות של ${FORMA_SEED.runningProgram.quality.workMin} דק׳ ב-RPE ${FORMA_SEED.runningProgram.quality.rpe}, מנוחה ${FORMA_SEED.runningProgram.quality.restMin} דק׳ בין חזרות · שחרור ${FORMA_SEED.runningProgram.quality.cooldownMin} דק׳</p>
          <p class="body-sm mt-1 muted">${esc(FORMA_SEED.runningProgram.quality.note)}</p>
        </div>

        <div class="row row--between mt-6">
          <p class="h3">ספריית תרגילים</p>
        </div>
        <div class="stack stack--sm mt-3">
          ${FORMA_EXERCISES.map(e => `
            <button class="option" data-ex="${e.id}" aria-pressed="false" style="cursor:pointer">
              <div class="flex-1">
                <p class="body-lg" style="font-weight:700">${esc(e.nameHe)}</p>
                <p class="body-sm ltr" style="direction:ltr;text-align:right">${esc(e.nameEn)}</p>
              </div>
              ${ICONS.chevronStart}
            </button>`).join('')}
        </div>

        <button class="btn btn--outline w-full mt-6" id="log-cardio-btn">${ICONS.plus} רישום ריצה</button>
      </div>
    `;
    container.querySelectorAll('[data-day]').forEach(el => el.addEventListener('click', () => FORMA_ROUTER.navigate(`/training/day/${el.dataset.day}`)));
    container.querySelectorAll('[data-ex]').forEach(el => el.addEventListener('click', () => FORMA_ROUTER.navigate(`/training/exercise/${el.dataset.ex}`)));
    container.querySelector('#log-cardio-btn').addEventListener('click', () => FORMA_ROUTER.navigate('/training/cardio/new'));
    container.querySelector('#edit-schedule-btn').addEventListener('click', () => FORMA_ROUTER.navigate('/training/schedule'));
  }
};

function blockIndicator(block) {
  const pct = currentBlockProgressPct();
  return `<div class="card card--accent mt-4 block-indicator">
    <div class="row" style="align-items:flex-start">
      ${blockRing(pct)}
      <div class="flex-1">
        <div class="row row--between">
          <p class="eyebrow" style="color:var(--accent)">בלוק התקדמות — שבוע ${block.week} מתוך 6</p>
          <span class="mono ltr-num" style="font-weight:700;color:var(--accent)">${esc(block.rpeLabel)}</span>
        </div>
        <div class="block-track mt-3">
          ${PROGRAM_BLOCK_WEEKS.map(w => `<span class="block-seg ${w.week === block.week ? 'active' : ''} ${w.volumePct < 100 ? 'deload' : ''}"></span>`).join('')}
        </div>
        <p class="body-sm mt-2">${esc(block.note)}${block.volumePct < 100 ? ` · ${block.volumePct}% מהנפח` : ''}</p>
      </div>
    </div>
  </div>`;
}

function blockRing(pct) {
  const size = 60, stroke = 6, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px;flex:none">
    <svg viewBox="0 0 ${size} ${size}">
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
      <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/>
    </svg>
    <span class="ring-label ltr-num" style="inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--accent)">${pct}%</span>
  </div>`;
}

/** First strength day (in weekday order, starting today) not yet completed this week. */
function findNextStrengthDayId(todayIdx, completedThisWeek) {
  const list = weekActivityList();
  for (let offset = 0; offset < 7; offset++) {
    const act = list[(todayIdx + offset) % 7].activity;
    if (act.kind === 'strength' && !completedThisWeek.has(act.dayId)) return act.dayId;
  }
  return null;
}

function weekChip(d, isToday) {
  const kindIcon = { strength: ICONS.training, 'run-easy': ICONS.bolt, 'run-quality': ICONS.flame, recovery: ICONS.heart, rest: ICONS.moon }[d.activity.kind] || ICONS.dash;
  return `<div class="week-chip ${isToday ? 'today' : ''}">
    <span class="week-chip-day">${d.nameHe}</span>
    <span class="week-chip-icon">${kindIcon}</span>
    <span class="week-chip-label">${esc(d.activity.shortHe)}</span>
  </div>`;
}

function dayCard(d, doneThisWeek, isNext) {
  const heroId = d.exerciseIds.map(id => FORMA_DB.getExercise(id)).find(e => e?.videoYoutubeId)?.videoYoutubeId;
  const thumb = heroId
    ? `<img src="https://i.ytimg.com/vi/${esc(heroId)}/hqdefault.jpg" alt="" loading="lazy" />`
    : `<span class="thumb-fallback">${ICONS.training}</span>`;
  const badge = doneThisWeek
    ? `<span class="day-thumb-badge day-thumb-badge--done" title="הושלם השבוע">${ICONS.check}</span>`
    : '';
  const tag = doneThisWeek ? statusChip('good', 'הושלם השבוע') : isNext ? statusChip('mid', 'האימון הבא') : statusChip('neutral', 'מתוכנן');
  return `<div class="day-thumb-card ${isNext ? 'next' : ''} ${doneThisWeek ? 'done' : ''}" data-day="${d.id}">
    <div class="thumb">${thumb}${badge}</div>
    <div class="day-thumb-body">
      <div class="row row--between">
        <p class="h3">${esc(d.name)}</p>
      </div>
      <p class="body-sm mt-1 muted">${d.expectedDurationMin ? `כ-${d.expectedDurationMin} דקות · ` : ''}${d.exerciseIds.length} תרגילים</p>
      <div class="mt-2">${tag}</div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
FORMA_VIEWS.trainingSchedule = {
  render(params, container) {
    const schedule = { ...getWeeklySchedule() };
    container.innerHTML = `
      <div class="view">
        ${topbar('לוח שבועי', { back: true })}
        <p class="body-sm">אפשר לשנות לאיזה יום בשבוע משויך כל אימון — תוכן האימונים עצמו לא משתנה.</p>
        <div class="stack mt-4" id="schedule-list">
          ${WEEKDAY_NAMES_HE.map((name, i) => `
            <div class="card">
              <p class="h3">יום ${name}</p>
              <div class="chip-row mt-2" data-weekday="${i}">
                ${Object.entries(ACTIVITY_TYPES).map(([key, a]) => `<button class="chip" data-activity="${key}" aria-pressed="${schedule[i] === key ? 'true' : 'false'}">${esc(a.shortHe)}</button>`).join('')}
              </div>
            </div>`).join('')}
        </div>
      </div>
    `;
    wireTopbarBack(container, '/training');
    container.querySelectorAll('[data-weekday]').forEach(group => {
      group.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
        group.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false'));
        chip.setAttribute('aria-pressed', 'true');
        schedule[Number(group.dataset.weekday)] = chip.dataset.activity;
        saveWeeklySchedule(schedule);
        FORMA_APP.toast('הלוח עודכן');
      }));
    });
  }
};

// ---------------------------------------------------------------------------
FORMA_VIEWS.trainingDay = {
  render(params, container) {
    const days = FORMA_DB.getWorkoutDays();
    const day = days.find(d => d.id === params.dayId);
    if (!day) { container.innerHTML = `<div class="view">${topbar('אימון', { back: true })}<div class="empty-state">${ICONS.empty}<p>היום לא נמצא.</p></div></div>`; wireTopbarBack(container, '/training'); return; }

    const isEditable = day.status === 'missing' || day.status === 'partial';
    container.innerHTML = `
      <div class="view">
        ${topbar(day.name, { back: true })}
        ${day.exerciseIds.length ? `<p class="body-sm">${esc(day.focus || '')}</p>` : ''}
        ${day.dayCue ? `<div class="card card--accent mt-3"><p class="body-sm">${ICONS.bolt}${esc(day.dayCue)}</p></div>` : ''}

        <div class="stack mt-4" id="ex-list">
          ${day.exerciseIds.map((id, i) => exerciseRow(day.id, id, i)).join('') || `<div class="empty-state">${ICONS.empty}<p>עוד לא נוספו תרגילים ליום הזה.</p></div>`}
        </div>

        <div class="stack mt-5">
          ${isEditable ? `
          <div class="card" id="add-ex-card">
            <p class="h3">הוספת תרגיל</p>
            <div class="stack mt-3">
              <input class="input" id="new-ex-name" placeholder="שם התרגיל" />
              <div class="grid-2">
                <input class="input" id="new-ex-sets" placeholder="סטים" inputmode="numeric" />
                <input class="input" id="new-ex-rest" placeholder="מנוחה (שניות)" inputmode="numeric" />
              </div>
              <div class="grid-2">
                <input class="input" id="new-ex-replow" placeholder="חזרות (מ-)" inputmode="numeric" />
                <input class="input" id="new-ex-rephigh" placeholder="חזרות (עד)" inputmode="numeric" />
              </div>
            </div>
            <button class="btn btn--primary w-full mt-4" id="add-ex-btn">הוסף לתוכנית</button>
          </div>` : `
          <button class="btn btn--outline w-full" id="short-version-btn">${ICONS.bolt} בקש גרסה מקוצרת</button>
          `}
        </div>

        <div id="short-result"></div>

        ${day.exerciseIds.length ? `<button class="btn btn--primary w-full mt-6" id="start-day-btn" style="min-height:56px;">${ICONS.play} התחל אימון</button>` : ''}
      </div>
    `;
    wireTopbarBack(container, '/training');

    container.querySelectorAll('[data-ex-open]').forEach(el => el.addEventListener('click', () => FORMA_ROUTER.navigate(`/training/exercise/${el.dataset.exOpen}`)));

    const addBtn = container.querySelector('#add-ex-btn');
    if (addBtn) addBtn.addEventListener('click', () => addCustomExercise(day, container));

    const shortBtn = container.querySelector('#short-version-btn');
    if (shortBtn) shortBtn.addEventListener('click', () => {
      const res = FORMA_COACH.ask('', { intentId: 'only-30' });
      container.querySelector('#short-result').innerHTML = `<div class="card mt-3"><p class="body-lg">${esc(res.direct_answer)}</p><p class="body-sm mt-2">${res.reasoning_summary.map(esc).join('<br/>')}</p></div>`;
    });

    const startBtn = container.querySelector('#start-day-btn');
    if (startBtn) startBtn.addEventListener('click', () => FORMA_APP.beginWorkout(day.id));
  }
};

function exerciseRow(dayId, id, i) {
  const ex = FORMA_DB.getExercise(id);
  const presc = FORMA_DB.getDayExercise(dayId, id);
  if (!ex) return '';
  return `<button class="option" data-ex-open="${id}" aria-pressed="false">
    <span class="mono" style="color:var(--ink-400);min-width:20px">${i + 1}</span>
    <div class="flex-1">
      <p class="body-lg" style="font-weight:700">${esc(ex.nameHe)}</p>
      <p class="body-sm">${presc ? `<span class="ltr-num">${presc.sets}×${presc.repLow}–${presc.repHigh} · RPE ${presc.rpeLow === presc.rpeHigh ? presc.rpeHigh : presc.rpeLow + '–' + presc.rpeHigh}</span>` : ''} ${MUSCLES[ex.primary] ? '· ' + MUSCLES[ex.primary].he : ''}</p>
    </div>
    ${ICONS.chevronStart}
  </button>`;
}

function addCustomExercise(day, container) {
  const name = container.querySelector('#new-ex-name').value.trim();
  const sets = Number(container.querySelector('#new-ex-sets').value) || 3;
  const rest = Number(container.querySelector('#new-ex-rest').value) || 90;
  const repLow = Number(container.querySelector('#new-ex-replow').value) || 8;
  const repHigh = Number(container.querySelector('#new-ex-rephigh').value) || 12;
  if (!name) { FORMA_APP.toast('צריך שם לתרגיל'); return; }

  const id = FORMA_DB.uid('ex');
  const overrides = FORMA_DB.getExerciseOverrides();
  overrides[id] = {
    id, nameHe: name, nameEn: name, primary: null, secondary: [], feel: '', cues: [], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: null, custom: true
  };
  localStorage.setItem('forma:v1:exercisesOverride', JSON.stringify(overrides));

  const days = FORMA_DB.getWorkoutDays();
  const idx = days.findIndex(d => d.id === day.id);
  days[idx].exercises = [...(days[idx].exercises || []), { exerciseId: id, sets, repLow, repHigh, rpeLow: 7, rpeHigh: 8, restSecLow: rest, restSecHigh: rest }];
  days[idx].exerciseIds = days[idx].exercises.map(e => e.exerciseId);
  days[idx].status = 'partial';
  if (!days[idx].focus) days[idx].focus = 'בעריכה';
  FORMA_DB.saveWorkoutDays(days);

  FORMA_APP.toast('התרגיל נוסף');
  FORMA_ROUTER.render();
}

// ---------------------------------------------------------------------------
FORMA_VIEWS.exerciseDetail = {
  render(params, container) {
    const ex = FORMA_DB.getExercise(params.exerciseId);
    if (!ex) { container.innerHTML = `<div class="view">${topbar('תרגיל', { back: true })}</div>`; wireTopbarBack(container); return; }
    const appearances = FORMA_DB.findAllDayExercises(ex.id);
    const presc = appearances[0]?.prescription || { sets: 3, repLow: 8, repHigh: 12, rpeLow: 7, rpeHigh: 8, restSecLow: 90, restSecHigh: 90 };
    const history = FORMA_DB.exerciseHistory(ex.id);
    const prog = evaluateProgression(ex.id, history, presc);
    const recentRecovery = FORMA_DB.getRecoveryLogs().slice(-6);
    const plateau = evaluatePlateau(ex.id, history, recentRecovery, presc);
    const sessionsGrouped = groupHistoryBySession(history).slice(0, 5);

    container.innerHTML = `
      <div class="view">
        ${topbar('תרגיל', { back: true })}
        ${renderVideoFrame(ex.videoYoutubeId, ex.nameHe)}

        <h2 class="h1 mt-4">${esc(ex.nameHe)}</h2>
        <p class="body-sm ltr" style="direction:ltr">${esc(ex.nameEn)}</p>

        <div class="chip-row mt-3">
          ${ex.primary ? statusChip('neutral', MUSCLES[ex.primary]?.he || ex.primary) : ''}
          ${(ex.secondary || []).map(m => statusChip('neutral', MUSCLES[m]?.he || m)).join('')}
        </div>

        ${ex.feel ? `<div class="card mt-5"><p class="eyebrow">מה אתה אמור להרגיש</p><p class="body-lg mt-1">${esc(ex.feel)}</p></div>` : ''}

        ${ex.cues?.length ? `<div class="card mt-4"><p class="eyebrow">דגשים</p><div class="stack stack--sm mt-2">${ex.cues.map(c => `<p class="body-lg">• ${esc(c)}</p>`).join('')}</div></div>` : ''}
        ${ex.mistakes?.length ? `<div class="card mt-4"><p class="eyebrow">טעויות שכיחות</p><div class="stack stack--sm mt-2">${ex.mistakes.map(c => `<p class="body-lg">• ${esc(c)}</p>`).join('')}</div></div>` : ''}

        <div class="card mt-4">
          <p class="eyebrow">מופיע בתוכנית</p>
          <div class="stack stack--sm mt-2">
            ${appearances.map(a => `<div class="row row--between"><span class="body-lg">${esc(a.day.name)}</span><span class="body-sm ltr-num">${a.prescription.sets}×${a.prescription.repLow}–${a.prescription.repHigh} · RPE ${a.prescription.rpeLow === a.prescription.rpeHigh ? a.prescription.rpeHigh : a.prescription.rpeLow + '–' + a.prescription.rpeHigh}</span></div>`).join('') || '<p class="body-sm">לא חלק מהתוכנית הפעילה כרגע — נשאר כאן בשביל ההיסטוריה שלך.</p>'}
          </div>
        </div>

        <div class="card mt-4">
          <p class="eyebrow">התקדמות</p>
          <p class="body-lg mt-1">${esc(prog.message)}</p>
        </div>

        ${plateau.flagged ? `<div class="card card--accent mt-4">
          <p class="eyebrow" style="color:var(--accent)">סימני תקיעות</p>
          <p class="body-sm mt-1">${plateau.signals.map(esc).join(' · ')}</p>
          <p class="body-lg mt-2">הצעה: ${esc(plateau.suggestion.labelHe)}</p>
        </div>` : ''}

        <div class="card mt-4">
          <p class="eyebrow">היסטוריה</p>
          ${sessionsGrouped.length ? `<div class="stack stack--sm mt-2">${sessionsGrouped.map(s => `<div class="row row--between"><span class="body-sm">${new Date(s[0].createdAt).toLocaleDateString('he-IL')}</span><span class="mono body-sm ltr-num">${s.map(x => `${x.weight}×${x.reps} (RPE ${x.rpe})`).join(' · ')}</span></div>`).join('')}</div>` : `<p class="body-sm mt-2">עוד אין היסטוריה בתרגיל הזה.</p>`}
        </div>

        ${ex.substitutes?.length ? `<div class="card mt-4"><p class="eyebrow">חלופות</p><p class="body-lg mt-1">${ex.substitutes.map(esc).join(' · ')}</p></div>` : ''}

        <button class="btn btn--ghost w-full mt-5" id="unclear-btn">הדגש הזה לא ברור לי</button>
      </div>
    `;
    wireTopbarBack(container, '/training');
    wireVideoFrames(container);
    container.querySelector('#unclear-btn').addEventListener('click', () => {
      sessionStorage.setItem('forma:coach:context', JSON.stringify({ intentId: 'why-exercise', exerciseId: ex.id }));
      FORMA_ROUTER.navigate('/coach/chat');
    });
  }
};

function groupHistoryBySession(history) {
  const map = {};
  history.forEach(s => { (map[s.sessionId] = map[s.sessionId] || []).push(s); });
  return Object.values(map).sort((a, b) => a[0].createdAt < b[0].createdAt ? 1 : -1);
}

// ---------------------------------------------------------------------------
FORMA_VIEWS.cardioForm = {
  render(params, container) {
    const prefill = params.type || null; // 'easy' | 'quality'
    container.innerHTML = `
      <div class="view">
        ${topbar('רישום ריצה', { back: true })}
        ${prefill ? `<div class="card card--accent"><p class="body-sm">${prefill === 'quality' ? esc(FORMA_SEED.runningProgram.quality.note) : esc(FORMA_SEED.runningProgram.easy.note)}</p></div>` : ''}
        <div class="chip-row mt-3" id="type-chips">
          <button class="chip" data-type="run" aria-pressed="true">ריצה</button>
          <button class="chip" data-type="swim">שחייה</button>
          <button class="chip" data-type="other">אחר</button>
        </div>

        <div class="stack mt-4">
          <div class="field"><label>תאריך</label><input class="input" type="date" id="c-date" value="${new Date().toISOString().slice(0, 10)}" /></div>
          <div class="field" id="distance-field"><label>מרחק (ק"מ)</label><input class="input" type="number" step="0.1" id="c-distance" /></div>
          <div class="field"><label>משך (דקות)</label><input class="input" type="number" id="c-duration" value="${prefill === 'easy' ? FORMA_SEED.runningProgram.easy.durationMinLow : ''}" /></div>
          <div class="field">
            <label>סוג מאמץ</label>
            <div class="chip-row mt-1" id="effort-chips">
              <button class="chip" data-effort="easy">קל</button>
              <button class="chip" data-effort="tempo">קצב</button>
              <button class="chip" data-effort="long">ארוכה</button>
              <button class="chip" data-effort="interval">אינטרוולים (איכות)</button>
              <button class="chip" data-effort="hard">קשה</button>
            </div>
          </div>
          <div class="field"><label>הערות</label><textarea class="input" id="c-notes"></textarea></div>
        </div>
        <button class="btn btn--primary w-full mt-6" id="save-cardio">שמור</button>
      </div>
    `;
    wireTopbarBack(container, '/training');

    let type = 'run', effort = prefill === 'quality' ? 'interval' : prefill === 'easy' ? 'easy' : null;
    container.querySelectorAll('#type-chips .chip').forEach(c => c.addEventListener('click', () => {
      container.querySelectorAll('#type-chips .chip').forEach(x => x.setAttribute('aria-pressed', 'false'));
      c.setAttribute('aria-pressed', 'true'); type = c.dataset.type;
      container.querySelector('#distance-field').style.display = type === 'other' ? 'none' : '';
    }));
    container.querySelectorAll('#effort-chips .chip').forEach(c => {
      if (c.dataset.effort === effort) c.setAttribute('aria-pressed', 'true');
      c.addEventListener('click', () => {
        container.querySelectorAll('#effort-chips .chip').forEach(x => x.setAttribute('aria-pressed', 'false'));
        c.setAttribute('aria-pressed', 'true'); effort = c.dataset.effort;
      });
    });

    container.querySelector('#save-cardio').addEventListener('click', () => {
      const distanceKm = Number(container.querySelector('#c-distance').value) || null;
      const durationMin = Number(container.querySelector('#c-duration').value) || null;
      FORMA_DB.addCardio({
        type, date: container.querySelector('#c-date').value, distanceKm, durationMin,
        paceMinKm: (type === 'run' && distanceKm && durationMin) ? Math.round((durationMin / distanceKm) * 100) / 100 : null,
        effort, notes: container.querySelector('#c-notes').value || null
      });
      FORMA_APP.toast('נשמר');
      FORMA_ROUTER.navigate('/today');
    });
  }
};
