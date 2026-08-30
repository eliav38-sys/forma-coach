/* FORMA — Today view. One clean day-axis, one primary action, a recovery
   ring instead of a flat number. What's scheduled today comes from the
   weekly calendar (configurable), workout content never changes with it. */

FORMA_VIEWS.today = {
  render(params, container) {
    const profile = FORMA_DB.getProfile();
    const sessions = FORMA_DB.getSessions();
    const cardio = FORMA_DB.getCardio();
    const recovery = FORMA_DB.getRecoveryLogs();
    const today = todaysActivity();
    const day = today.dayId ? FORMA_DB.getWorkoutDays().find(d => d.id === today.dayId) : null;
    const block = currentBlockWeek();
    const todayIso = new Date().toISOString().slice(0, 10);
    const todaysRecovery = recovery.find(r => r.createdAt.slice(0, 10) === todayIso) || null;

    if (day) ensureDailyDecision(day, todaysRecovery, todayIso);

    const load = weeklyLoadSummary(sessions, cardio);
    const recoveryScoreObj = todaysRecovery ? computeRecoveryScore(todaysRecovery.raw) : null;
    const statusMeta = recoveryScoreObj ? recoveryStatusMeta(recoveryScoreObj.band) : null;

    const decisions = FORMA_DB.getCoachDecisions().filter(d => d.date === todayIso && d.status === 'pending');
    const insight = computeWeeklyInsight();

    container.innerHTML = `
      <div class="view">
        <div class="row row--between">
          <div>
            <p class="eyebrow">FORMA · שבוע ${block.week}/6${block.volumePct < 100 ? ' · Deload' : ''}</p>
            <h1 class="h1">${esc(FORMA_APP.greeting())}</h1>
          </div>
          <button class="icon-btn" id="settings-btn">${ICONS.settings}</button>
        </div>

        <div class="card mt-5 hero-card">
          <div class="row" style="align-items:flex-start;gap:16px">
            ${recoveryScoreObj ? renderRing(recoveryScoreObj.score, statusMeta.tone) : renderRing(null, 'neutral')}
            <div class="flex-1">
              <p class="eyebrow">${activityEyebrow(today)}</p>
              ${statusLine(today, day, recoveryScoreObj)}
            </div>
          </div>
          ${heroCta(today, day)}
        </div>

        ${decisions.map(d => decisionCard(d)).join('')}

        ${(!todaysRecovery && today.kind !== 'rest') ? `
        <div class="card card--accent mt-4 row row--between">
          <div>
            <p class="h3">בדיקת התאוששות של 20 שניות</p>
            <p class="body-sm mt-1">עוזר להתאים את האימון של היום.</p>
          </div>
          <button class="btn btn--sm btn--outline" id="do-recovery-btn">למלא</button>
        </div>` : ''}

        <div class="grid-2 mt-5">
          <div class="stat">
            <span class="value ltr-num">${load.strengthSessions}/${profile.weeklyTargets?.strength_sessions ?? 3}</span>
            <span class="label">אימוני כוח השבוע</span>
          </div>
          <div class="stat">
            <span class="value ltr-num">${load.runsCount}/${profile.weeklyTargets?.runs ?? 2}</span>
            <span class="label">ריצות השבוע</span>
          </div>
        </div>

        <div class="card mt-4">
          <p class="eyebrow">תובנה מהשבוע</p>
          <p class="body-lg mt-1">${insight}</p>
        </div>

        <div class="mt-6">
          <p class="h3">מה חשוב לי היום?</p>
          <div class="chip-row mt-3" id="mood-chips">
            <button class="chip" data-mood="energy">${ICONS.bolt} אנרגיה</button>
            <button class="chip" data-mood="strength">${ICONS.flame} כוח</button>
            <button class="chip" data-mood="stress">${ICONS.moon} שחרור סטרס</button>
            <button class="chip" data-mood="short">${ICONS.play} אימון קצר</button>
          </div>
          <div id="mood-result"></div>
        </div>
      </div>
    `;

    container.querySelector('#settings-btn').addEventListener('click', () => FORMA_ROUTER.navigate('/settings'));
    const startBtn = container.querySelector('#hero-cta-btn');
    if (startBtn) startBtn.addEventListener('click', () => handleHeroCta(today, day));
    const recBtn = container.querySelector('#do-recovery-btn');
    if (recBtn) recBtn.addEventListener('click', () => FORMA_ROUTER.navigate('/recovery-check'));

    container.querySelectorAll('.decision-actions [data-decision]').forEach(btn => {
      btn.addEventListener('click', () => handleDecisionAction(btn.dataset.decision, btn.dataset.action, container));
    });

    container.querySelectorAll('#mood-chips .chip').forEach(chip => {
      chip.addEventListener('click', () => handleMoodChip(chip.dataset.mood, container, day));
    });
  }
};

function renderRing(score, tone) {
  const size = 84, stroke = 9, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = score == null ? 0 : score / 100;
  const toneVarMap = { good: '--status-good-ink', mid: '--status-mid-ink', low: '--status-low-ink', neutral: '--ink-400' };
  const color = `var(${toneVarMap[tone] || '--accent'})`;
  return `<div class="ring" style="width:${size}px;height:${size}px;flex:none">
    <svg viewBox="0 0 ${size} ${size}">
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" ${score == null ? 'stroke-dasharray="3 5"' : ''}/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none" stroke="${color}" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" style="transition:stroke-dashoffset .7s ease"/>
    </svg>
    <span class="ring-label ltr-num" style="inset:0;display:flex;align-items:center;justify-content:center;color:${color}">${score ?? '—'}</span>
  </div>`;
}

function activityEyebrow(today) {
  return { strength: 'אימון כוח', 'run-easy': 'ריצה קלה', 'run-quality': 'ריצת איכות', recovery: 'התאוששות', rest: 'מנוחה' }[today.kind] || '';
}

function statusLine(today, day, recoveryScoreObj) {
  if (today.kind === 'strength') {
    if (!day) return `<p class="body-lg">התוכנית לא נמצאה.</p>`;
    if (!recoveryScoreObj) return `<p class="body-lg"><b>${esc(day.name)}</b>. עדיין לא מולאה בדיקת התאוששות הבוקר.</p>`;
    const adj = recommendAdjustment(recoveryScoreObj);
    const statusMeta = recoveryStatusMeta(recoveryScoreObj.band);
    return `<p class="body-lg"><b>${esc(day.name)}</b> ${statusChip(statusMeta.tone, statusMeta.labelHe)}</p><p class="body-sm mt-2">${esc(adj.message)}</p>`;
  }
  if (today.kind === 'run-easy') {
    const p = FORMA_SEED.runningProgram.easy;
    return `<p class="body-lg">${p.durationMinLow}–${p.durationMinHigh} דקות ב-RPE ${p.rpeLow}–${p.rpeHigh}.</p><p class="body-sm mt-2">${esc(p.note)}</p>`;
  }
  if (today.kind === 'run-quality') {
    const p = FORMA_SEED.runningProgram.quality;
    return `<p class="body-lg">${p.repsLow}–${p.repsHigh}×${p.workMin} דק׳ ב-RPE ${p.rpe}, מנוחה ${p.restMin} דק׳.</p><p class="body-sm mt-2">${esc(p.note)}</p>`;
  }
  if (today.kind === 'recovery') {
    return `<p class="body-lg">הליכה קלה או מוביליטי, לפי הצורך.</p><p class="body-sm mt-2">לא חובה למדוד — היום נועד לתת לגוף להתאושש.</p>`;
  }
  return `<p class="body-lg">יום מנוחה.</p><p class="body-sm mt-2">בחירה ביום מנוחה היא החלטה חכמה, לא ויתור.</p>`;
}

function heroCta(today, day) {
  if (today.kind === 'strength') {
    return `<button class="btn btn--primary mt-5" id="hero-cta-btn" style="min-height:56px;font-size:17px;">${ICONS.play}התחל אימון</button>`;
  }
  if (today.kind === 'run-easy' || today.kind === 'run-quality') {
    return `<button class="btn btn--primary mt-5" id="hero-cta-btn" style="min-height:56px;font-size:17px;">${ICONS.play}רשום ריצה</button>`;
  }
  if (today.kind === 'recovery') {
    return `<button class="btn btn--outline mt-5" id="hero-cta-btn" style="min-height:52px;">רשום פעילות קלה</button>`;
  }
  return '';
}

function handleHeroCta(today, day) {
  if (today.kind === 'strength' && day) FORMA_APP.beginWorkout(day.id);
  else if (today.kind === 'run-easy') FORMA_ROUTER.navigate('/training/cardio/new?type=easy');
  else if (today.kind === 'run-quality') FORMA_ROUTER.navigate('/training/cardio/new?type=quality');
  else if (today.kind === 'recovery') FORMA_ROUTER.navigate('/training/cardio/new');
}

function computeWeeklyInsight() {
  const days = FORMA_DB.getWorkoutDays();
  const allIds = [...new Set(days.flatMap(d => d.exerciseIds))];
  for (const id of allIds) {
    const history = FORMA_DB.exerciseHistory(id);
    const presc = FORMA_DB.findAnyDayExercise(id);
    const prog = evaluateProgression(id, history, presc);
    if (prog.status === 'propose_increase') {
      const ex = FORMA_DB.getExercise(id);
      return `ב${ex.nameHe} הגעת לחלק העליון של הטווח באימון האחרון — סימן להתקדם.`;
    }
  }
  const chestTrend = trendSummary(FORMA_DB.getMeasurements(), 'chest_cm', 'חזה');
  if (chestTrend.hasTrend) return chestTrend.message;
  return 'עוד מעט, ככל שיצטברו יותר אימונים, כאן יופיעו תובנות אמיתיות מהנתונים שלך.';
}

function decisionCard(d) {
  return `<div class="decision-card mt-4">
    <p class="tag">למה זה השתנה</p>
    <p class="h3 mt-1">${esc(d.message)}</p>
    <div class="why">${(d.reasons || []).map(r => `• ${esc(r)}`).join('<br/>')}</div>
    <div class="decision-actions">
      <button class="btn btn--primary btn--sm" data-decision="${d.id}" data-action="accept">קבל</button>
      <button class="btn btn--outline btn--sm" data-decision="${d.id}" data-action="change">שנה</button>
      <button class="btn btn--ghost btn--sm" data-decision="${d.id}" data-action="mute">אל תשאל שוב</button>
    </div>
  </div>`;
}

function ensureDailyDecision(day, todaysRecovery, todayIso) {
  if (!day || !todaysRecovery) return;
  const settings = FORMA_DB.getSettings();
  if (settings.suppressRecoveryDecisions) return;
  const existing = FORMA_DB.getCoachDecisions().find(d => d.date === todayIso && d.kind === 'recovery');
  if (existing) return;
  const rec = computeRecoveryScore(todaysRecovery.raw);
  const adj = recommendAdjustment(rec);
  if (adj.action === 'keep') return;
  FORMA_DB.addCoachDecision({
    date: todayIso, kind: 'recovery', dayId: day.id,
    action: adj.action, magnitudePct: adj.magnitudePct, reasons: adj.reasons, message: adj.message
  });
}

function handleDecisionAction(id, action, container) {
  if (action === 'accept') { FORMA_DB.updateCoachDecision(id, { status: 'accepted' }); FORMA_APP.toast('קיבלנו — נתחשב בזה באימון של היום.'); }
  else if (action === 'mute') { FORMA_DB.updateCoachDecision(id, { status: 'muted' }); FORMA_DB.saveSettings({ suppressRecoveryDecisions: true }); FORMA_APP.toast('לא נשאל שוב על התאמות התאוששות.'); }
  else { FORMA_DB.updateCoachDecision(id, { status: 'dismissed' }); FORMA_ROUTER.navigate('/coach/chat'); return; }
  FORMA_ROUTER.render();
}

function handleMoodChip(mood, container, day) {
  const resultEl = container.querySelector('#mood-result');
  if (mood === 'short') {
    if (!day) { resultEl.innerHTML = `<div class="card mt-3"><p class="body-lg">אין אימון כוח מתוכנן היום.</p></div>`; return; }
    const res = FORMA_COACH.ask('', { intentId: 'only-30' });
    resultEl.innerHTML = `<div class="card mt-3"><p class="body-lg">${esc(res.direct_answer)}</p><p class="body-sm mt-2">${res.reasoning_summary.map(esc).join(' ')}</p>
      ${res.actions.length ? `<button class="btn btn--accent mt-3" id="mood-action">${esc(res.actions[0].label)}</button>` : ''}</div>`;
    const btn = resultEl.querySelector('#mood-action');
    if (btn) btn.addEventListener('click', () => FORMA_APP.beginWorkout(day.id));
  } else if (mood === 'stress') {
    resultEl.innerHTML = `<div class="card mt-3"><p class="body-lg">אימון היום יכול להיות גם שחרור: קצב נשימה קבוע, פחות מיקוד בהעמסה, יותר במעבר נעים בין תרגילים.</p></div>`;
  } else if (mood === 'strength') {
    resultEl.innerHTML = `<div class="card mt-3"><p class="body-lg">נשמור היום על תרגילי העוגן במיקוד מלא ונדייק ב-RPE.</p></div>`;
  } else {
    resultEl.innerHTML = `<div class="card mt-3"><p class="body-lg">מעולה — יש היום אנרגיה לעבוד לפי התוכנית כרגיל.</p></div>`;
  }
}
