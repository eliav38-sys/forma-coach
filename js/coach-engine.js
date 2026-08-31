/* FORMA Coach — two-layer engine.
   Layer 1 (this file, always available, offline-safe): `ask()` is a
   deterministic, data-grounded reasoning engine — every sentence is built
   from real local data through the domain modules, never invented.
   Layer 2 (`askSmart`, when FORMA_AI_WORKER_URL is configured and online):
   calls a real model (Gemini) via the Cloudflare Worker in /cloudflare-worker, handing
   it the SAME pre-computed real facts (via buildCoachContextText) so it can
   only reason and phrase — it never computes or invents a number itself.
   Any network/offline/server failure transparently falls back to `ask()`,
   so the Coach never goes silent. */

const FORMA_COACH = (() => {
  const QUICK_PROMPTS = [
    { id: 'what-today', textHe: 'מה לעשות היום?' },
    { id: 'why-exercise', textHe: 'למה התרגיל הזה בתוכנית?' },
    { id: 'shoulder-press', textHe: 'הרגשתי את הכתף בלחיצת חזה' },
    { id: 'only-30', textHe: 'יש לי רק 30 דקות' },
    { id: 'traveling', textHe: 'אני נוסע לשבוע ואין חדר כושר' },
    { id: 'why-chest', textHe: 'למה החזה לא גדל?' },
    { id: 'post-workout-food', textHe: 'מה כדאי לאכול אחרי האימון?' },
    { id: 'running-vs-muscle', textHe: 'האם הריצה פוגעת לי במסת השריר?' },
    { id: 'summarize', textHe: 'תסכם לי את החודש' }
  ];

  const INTENT_KEYWORDS = {
    'what-today': ['מה לעשות היום', 'מה עושים היום', 'מה האימון היום'],
    'why-exercise': ['למה התרגיל', 'למה זה בתוכנית', 'למה יש את התרגיל'],
    'shoulder-press': ['כתף', 'לחיצת חזה', 'כאב בכתף'],
    'only-30': ['30 דקות', 'זמן קצר', 'אין לי זמן', 'רק חצי שעה'],
    'traveling': ['נוסע', 'נסיעה', 'אין חדר כושר', 'מלון'],
    'why-chest': ['למה החזה', 'חזה לא גדל', 'חזה לא גדלה'],
    'post-workout-food': ['לאכול אחרי', 'תזונה אחרי אימון', 'מה לאכול'],
    'running-vs-muscle': ['ריצה פוגעת', 'ריצה ומסת שריר', 'ריצה הורסת שריר'],
    'summarize': ['תסכם', 'סיכום החודש', 'איך הלך']
  };

  function matchIntent(text) {
    const t = (text || '').trim();
    for (const [id, kws] of Object.entries(INTENT_KEYWORDS)) {
      if (kws.some(k => t.includes(k))) return id;
    }
    return 'fallback';
  }

  function buildContext() {
    const profile = FORMA_DB.getProfile();
    const sessions = FORMA_DB.getSessions();
    const setLogs = FORMA_DB.getSetLogs();
    const measurements = FORMA_DB.getMeasurements();
    const cardio = FORMA_DB.getCardio();
    const recovery = FORMA_DB.getRecoveryLogs();
    const days = FORMA_DB.getWorkoutDays();
    return { profile, sessions, setLogs, measurements, cardio, recovery, days };
  }

  /** A bounded, real-data-only Hebrew brief handed to the live model — it
      reasons and phrases over these facts, it never computes or invents them. */
  function buildCoachContextText(ctx) {
    const lines = [];
    const profile = ctx.profile;
    lines.push(`שם: ${profile.displayName || 'אליאב'}. תזונה: ${profile.diet === 'vegetarian' ? 'צמחוני' : profile.diet || 'לא ידוע'}. לא אוהב: ${(profile.dislikes || []).join(', ') || 'לא ידוע'}.`);
    if (profile.weightKg) lines.push(`משקל נוכחי: ${profile.weightKg} ק"ג.`);
    if (profile.primaryGoal) lines.push(`יעד מרכזי: ${profile.primaryGoal}${profile.secondaryGoal ? `, יעד משני: ${profile.secondaryGoal}` : ''}.`);

    const today = todaysActivity();
    const block = currentBlockWeek();
    lines.push(`היום מתוכנן: ${today.labelHe}. בלוק התקדמות: שבוע ${block.week} מתוך 6 (${block.rpeLabel}, ${block.note}, נפח ${block.volumePct}%).`);

    const rec = FORMA_DB.latestRecovery();
    if (rec) {
      const score = computeRecoveryScore(rec.raw);
      lines.push(`בדיקת התאוששות אחרונה: ציון ${score.score}/100 (${recoveryStatusMeta(score.band).labelHe}). סיבות: ${score.reasons.join(', ') || 'ללא'}.`);
    } else {
      lines.push('אין עדיין בדיקת התאוששות היום.');
    }

    const load = weeklyLoadSummary(ctx.sessions, ctx.cardio);
    lines.push(`השבוע עד כה: ${load.strengthSessions} אימוני כוח, ${load.runsCount} ריצות (${load.kmThisWeek} ק"מ)${load.legConservative ? ', עלייה חדה בקילומטראז\' — שמרנות מומלצת ברגליים' : ''}.`);

    const chestTrend = trendSummary(ctx.measurements, 'chest_cm', 'חזה');
    const navelTrend = trendSummary(ctx.measurements, 'navel_cm', 'טבור');
    if (chestTrend.hasTrend) lines.push(`מגמת חזה: ${chestTrend.message}`);
    if (navelTrend.hasTrend) lines.push(`מגמת טבור: ${navelTrend.message}`);
    const sym = armSymmetry(ctx.measurements, 'arm_flexed');
    if (sym.hasEnoughData) lines.push(`סימטריית זרועות: ${sym.message}`);

    const todaysDay = today.dayId ? ctx.days.find(d => d.id === today.dayId) : null;
    if (todaysDay) {
      lines.push(`תרגילי ${todaysDay.name}:`);
      todaysDay.exercises.forEach(presc => {
        const ex = FORMA_DB.getExercise(presc.exerciseId);
        const history = FORMA_DB.exerciseHistory(presc.exerciseId);
        const prog = evaluateProgression(presc.exerciseId, history, presc);
        const volume = presc.holdSecLow != null
          ? `${presc.sets}× החזקה ${presc.holdSecLow}–${presc.holdSecHigh} שנ׳${presc.perSide ? ' לכל צד' : ''}`
          : `${presc.sets}×${presc.repLow}–${presc.repHigh}`;
        lines.push(`- ${ex?.nameHe} (${ex?.nameEn}): ${volume} ${intensityLabel(presc) || ''}. ${prog.message}`);
      });
    }

    return lines.join('\n');
  }

  /** Calls the live model connection when configured; throws on any failure
      so the caller can fall back to the local reasoning engine. */
  async function askLive(userMessage, ctx) {
    if (!FORMA_AI_WORKER_URL) throw new Error('no_worker_configured');
    const contextText = buildCoachContextText(ctx);
    const res = await fetch(FORMA_AI_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, contextText })
    });
    if (!res.ok) throw new Error('worker_http_' + res.status);
    const data = await res.json();
    return {
      direct_answer: data.direct_answer,
      reasoning_summary: data.reasoning_summary || [],
      actions: data.actions || [],
      confidence: data.confidence || 'medium',
      missing_data: data.missing_data || [],
      safety: data.safety || { stop_workout: false, seek_professional_help: false, message: null },
      source: 'live'
    };
  }

  /** Is a live model reachable at all right now? Used by the UI to decide
      whether to show the "thinking" state and the live badge. */
  function liveAvailable() {
    return !!FORMA_AI_WORKER_URL || (typeof hasGeminiKey === 'function' && hasGeminiKey());
  }

  /** Tries the live model first, transparently falling back to the local
      rule-based engine on any network/offline/quota/server failure.

      Order is deliberate: the Worker (key held server-side) is preferred when
      it is configured; the direct browser→Gemini path is the lighter-setup
      alternative. Either way the local engine is the floor, so the Coach is
      never silent and never blocks on the network. */
  async function askSmart(text, context = {}) {
    const safetyHit = checkTextSafety(text);
    if (safetyHit.stopWorkout || safetyHit.seekProfessionalHelp) {
      return respond({ direct: safetyHit.message, confidence: 'high', safety: { stop_workout: safetyHit.stopWorkout, seek_professional_help: true, message: safetyHit.message } });
    }

    if (text && liveAvailable()) {
      const ctx = buildContext();
      if (FORMA_AI_WORKER_URL) {
        try { return await askLive(text, ctx); }
        catch (e) { console.warn('FORMA worker coach unavailable:', e.message); }
      }
      if (typeof askGeminiDirect === 'function' && hasGeminiKey()) {
        try { return await askGeminiDirect(text, buildCoachContextText(ctx)); }
        catch (e) {
          console.warn('FORMA Gemini coach unavailable:', e.message);
          // Surface a quota/key problem once rather than silently degrading
          // forever — the user can't fix what they can't see.
          if (e.userMessage && typeof FORMA_APP !== 'undefined') FORMA_APP.toast(e.userMessage);
        }
      }
    }
    return ask(text, context);
  }

  function respond({ direct, reasons = [], actions = [], confidence = 'medium', missing = [], safety = null }) {
    return {
      direct_answer: direct,
      reasoning_summary: reasons,
      actions,
      confidence,
      missing_data: missing,
      safety: safety || { stop_workout: false, seek_professional_help: false, message: null }
    };
  }

  // ---- intent handlers ----------------------------------------------------

  function handleWhatToday(ctx) {
    const today = todaysActivity();
    if (today.kind !== 'strength') {
      const labelMap = {
        'run-easy': `ריצה קלה: ${FORMA_SEED.runningProgram.easy.durationMinLow}–${FORMA_SEED.runningProgram.easy.durationMinHigh} דקות ב-RPE ${FORMA_SEED.runningProgram.easy.rpeLow}–${FORMA_SEED.runningProgram.easy.rpeHigh}.`,
        'run-quality': `ריצת איכות מבוקרת: ${FORMA_SEED.runningProgram.quality.repsLow}–${FORMA_SEED.runningProgram.quality.repsHigh} חזרות של ${FORMA_SEED.runningProgram.quality.workMin} דק׳ ב-RPE ${FORMA_SEED.runningProgram.quality.rpe}.`,
        'recovery': 'התאוששות — הליכה קלה או מוביליטי לפי הצורך.',
        'rest': 'מנוחה. בחירה ביום מנוחה היא החלטה חכמה, לא ויתור.'
      };
      return respond({ direct: labelMap[today.kind], confidence: 'high' });
    }
    const day = FORMA_DB.getWorkoutDays().find(d => d.id === today.dayId);
    if (!day) return respond({ direct: 'עוד אין תוכנית אימון טעונה.', confidence: 'low', missing: ['יבוא תוכנית אימון'] });
    const rec = FORMA_DB.latestRecovery();
    if (!rec) {
      return respond({
        direct: `היום מתוכנן ${day.name}.`,
        reasons: ['עוד לא מולאה בדיקת התאוששות היום, אז אין התאמת עומס.'],
        actions: [{ type: 'schedule_measurement', label: 'למלא בדיקת התאוששות', parameters: {}, requires_confirmation: false }],
        confidence: 'medium'
      });
    }
    const adj = recommendAdjustment(computeRecoveryScore(rec.raw));
    return respond({
      direct: `היום ${day.name}. ${adj.action === 'keep' ? 'הולכים לפי התוכנית.' : adj.message}`,
      reasons: adj.reasons,
      actions: [{ type: adj.action, label: 'התחל אימון', parameters: { dayId: day.id }, requires_confirmation: false }],
      confidence: 'high'
    });
  }

  function handleWhyExercise(ctx, exerciseId) {
    const ex = exerciseId ? FORMA_DB.getExercise(exerciseId) : null;
    if (!ex) return respond({ direct: 'איזה תרגיל מעניין אותך?', confidence: 'low', missing: ['שם התרגיל'] });
    const primary = MUSCLES[ex.primary]?.he || ex.primary;
    const secondary = (ex.secondary || []).map(m => MUSCLES[m]?.he || m).join(', ');
    return respond({
      direct: `${ex.nameHe} עובד בעיקר על ${primary}${secondary ? `, ומסייע ל${secondary}` : ''}.`,
      reasons: [ex.feel],
      confidence: 'high'
    });
  }

  function handleShoulderPress() {
    const flat = FORMA_EXERCISE_INDEX['flat-dumbbell-press'];
    const incline = FORMA_EXERCISE_INDEX['incline-dumbbell-press'];
    return respond({
      direct: 'אם הרגשת בעיקר את הכתף הקדמית ולא את החזה, כדאי לבדוק את יציבות השכמות והזווית לפני שממשיכים להעמיס.',
      reasons: [incline.cues[0], flat.cues[0]],
      actions: [
        { type: 'swap_exercise', label: 'הצע חלופה עדינה יותר לכתף', parameters: { exerciseId: 'flat-dumbbell-press' }, requires_confirmation: true },
        { type: 'keep', label: 'סמן "לא ברור לי" בתרגיל לפירוט נוסף', parameters: {}, requires_confirmation: false }
      ],
      confidence: 'medium',
      safety: checkPainSafety(null)
    });
  }

  function handleOnly30(ctx) {
    const today = todaysActivity();
    const day = today.dayId ? ctx.days.find(d => d.id === today.dayId) : ctx.days.find(d => d.status === 'verified');
    if (!day || !day.exerciseIds.length) return respond({ direct: 'עוד אין תוכנית טעונה לקצר.', confidence: 'low' });
    const anchors = day.exerciseIds.slice(0, 3);
    const trimmed = day.exerciseIds.slice(3);
    return respond({
      direct: 'שומרים על תרגילי העוגן ומקצרים את השאר.',
      reasons: [`עוגנים: ${anchors.map(id => FORMA_DB.getExercise(id)?.nameHe).join(', ')}.`, trimmed.length ? `מוותרים על סט אחד בכל אחד מ: ${trimmed.map(id => FORMA_DB.getExercise(id)?.nameHe).join(', ')}.` : 'שאר התרגילים כבר קצרים.'],
      actions: [{ type: 'reduce_volume', label: 'התחל גרסה מקוצרת (30 דק׳)', parameters: { dayId: day.id, dropSetFrom: trimmed }, requires_confirmation: true }],
      confidence: 'high'
    });
  }

  function handleTraveling() {
    const subs = FORMA_EXERCISES.map(e => `${e.nameHe} → ${e.substitutes[0] || 'משקל גוף מותאם'}`);
    return respond({
      direct: 'מצב נסיעה אוטומטי עוד לא בנוי בגרסה הזו, אבל הנה חלופות זמניות לתרגילי התוכנית שלך.',
      reasons: subs.slice(0, 4),
      actions: [{ type: 'nutrition_suggestion', label: 'שמור כרשימת חלופות לנסיעה', parameters: {}, requires_confirmation: false }],
      confidence: 'low',
      missing: ['ציוד זמין ביעד']
    });
  }

  function handleWhyChest(ctx) {
    const chestTrend = trendSummary(ctx.measurements, 'chest_cm', 'חזה');
    const navelTrend = trendSummary(ctx.measurements, 'navel_cm', 'טבור');
    const pressHistory = FORMA_DB.exerciseHistory('flat-dumbbell-press');
    const pressProg = evaluateProgression('flat-dumbbell-press', pressHistory, FORMA_DB.findAnyDayExercise('flat-dumbbell-press'));

    const reasons = [chestTrend.message];
    let positive = false;
    if (pressProg.status === 'propose_increase' || pressProg.status === 'hold') {
      reasons.push('נתוני הכוח בלחיצת החזה יציבים או משתפרים.');
      positive = true;
    }
    if (navelTrend.hasTrend && navelTrend.direction !== 'עלייה') {
      reasons.push('היקף הטבור לא עולה, כך שזה לא נראה כמו עודף קלורי גדול.');
    }
    return respond({
      direct: positive
        ? 'היקף החזה עדיין לא מראה מגמת גדילה ברורה, אבל הכוח בתרגילי העוגן כן מתקדם — זה סימן מוקדם חיובי.'
        : 'אין עדיין מספיק נתונים כדי לקבוע בביטחון למה החזה לא גדל.',
      reasons,
      actions: [{ type: 'schedule_measurement', label: 'תזכורת למדידה עוד 4 שבועות', parameters: {}, requires_confirmation: true }],
      confidence: chestTrend.hasTrend ? 'medium' : 'low',
      missing: chestTrend.hasTrend ? [] : ['עוד מדידת חזה עקבית']
    });
  }

  function handlePostWorkoutFood(ctx) {
    const opts = NUTRITION_STONES.find(s => s.id === 'post-workout');
    return respond({
      direct: 'אחרי אימון כדאי לשלב מקור חלבון ברור עם קצת פחמימה.',
      reasons: [`מהמזונות שאתה כבר אוכל: ${opts.optionsHe.slice(0, 3).join(', ')}.`],
      actions: [{ type: 'nutrition_suggestion', label: 'הצג עוד אפשרויות לאחר אימון', parameters: { stone: 'post-workout' }, requires_confirmation: false }],
      confidence: 'high'
    });
  }

  function handleRunningVsMuscle(ctx) {
    const load = weeklyLoadSummary(ctx.sessions, ctx.cardio);
    const reasons = ['בעבר, בתקופות עם ריצות מרובות דיווחת על תחושת ירידה במסת שריר.'];
    if (load.legConservative) reasons.push(`השבוע יש עלייה חדה בקילומטראז׳ (כ-${load.kmSpikePct}%), אז שמרנים עם נפח הרגליים.`);
    reasons.push(`השבוע עד כה: ${load.strengthSessions} אימוני כוח ו-${load.runsCount} ריצות.`);
    return respond({
      direct: 'ריצה מתונה בשילוב מספיק חלבון ואימוני כוח בדרך כלל לא פוגעת משמעותית במסת השריר — אבל קפיצה חדה בנפח הריצה כן דורשת זהירות.',
      reasons,
      actions: load.legConservative ? [{ type: 'reduce_volume', label: 'שמרני עם נפח רגליים השבוע', parameters: {}, requires_confirmation: true }] : [],
      confidence: 'medium'
    });
  }

  function handleSummarize(ctx) {
    const summary = buildPeriodSummary(ctx, 30);
    return respond({
      direct: summary.headline,
      reasons: summary.bullets,
      actions: [],
      confidence: summary.bullets.length >= 2 ? 'medium' : 'low'
    });
  }

  function handleFallback(ctx, text) {
    return respond({
      direct: 'זה עדיין מעבר למה שהמאמן החכם יודע לענות עליו בגרסה הזו.',
      reasons: ['נסה לבחור אחת מהשאלות המוצעות, או נסח מחדש בקצרה.'],
      confidence: 'low',
      missing: ['שאלה ממוקדת יותר']
    });
  }

  function ask(text, context = {}) {
    const safetyHit = checkTextSafety(text);
    if (safetyHit.stopWorkout || safetyHit.seekProfessionalHelp) {
      return respond({ direct: safetyHit.message, confidence: 'high', safety: { stop_workout: safetyHit.stopWorkout, seek_professional_help: true, message: safetyHit.message } });
    }
    const ctx = buildContext();
    const intent = context.intentId || matchIntent(text);
    switch (intent) {
      case 'what-today': return handleWhatToday(ctx);
      case 'why-exercise': return handleWhyExercise(ctx, context.exerciseId);
      case 'shoulder-press': return handleShoulderPress();
      case 'only-30': return handleOnly30(ctx);
      case 'traveling': return handleTraveling();
      case 'why-chest': return handleWhyChest(ctx);
      case 'post-workout-food': return handlePostWorkoutFood(ctx);
      case 'running-vs-muscle': return handleRunningVsMuscle(ctx);
      case 'summarize': return handleSummarize(ctx);
      default: return handleFallback(ctx, text);
    }
  }

  // ---- weekly / monthly report ----------------------------------------------
  function buildPeriodSummary(ctx, windowDays) {
    const since = new Date(); since.setDate(since.getDate() - windowDays);
    const sinceIso = since.toISOString().slice(0, 10);
    const completedSessions = ctx.sessions.filter(s => s.status === 'completed' && s.endedAt >= sinceIso);
    const plannedApprox = Math.round((windowDays / 7) * (ctx.profile.weeklyTargets?.strength_sessions || 3));
    const runs = ctx.cardio.filter(c => c.type === 'run' && c.date >= sinceIso);
    const recentRecovery = ctx.recovery.filter(r => r.createdAt >= sinceIso);
    const avgRecovery = recentRecovery.length ? Math.round(recentRecovery.reduce((a, r) => a + r.score, 0) / recentRecovery.length) : null;

    const bullets = [];
    bullets.push(`${completedSessions.length} מתוך כ-${plannedApprox} אימוני כוח שתוכננו הושלמו.`);
    if (runs.length) bullets.push(`${runs.length} ריצות, סה"כ ${Math.round(runs.reduce((a, r) => a + (r.distanceKm || 0), 0) * 10) / 10} ק"מ.`);
    if (avgRecovery != null) bullets.push(`ציון התאוששות ממוצע: ${avgRecovery}.`);

    const chestTrend = trendSummary(ctx.measurements, 'chest_cm', 'חזה');
    if (chestTrend.hasTrend) bullets.push(chestTrend.message);

    const headline = completedSessions.length === 0
      ? 'אין עדיין מספיק אימונים מתועדים בתקופה הזו כדי לסכם משמעותית.'
      : `בתקופה האחרונה השלמת ${completedSessions.length} אימונים ושמרת על מעקב עקבי.`;

    return { headline, bullets };
  }

  return { QUICK_PROMPTS, matchIntent, ask, askSmart, liveAvailable, buildCoachContextText, buildPeriodSummary, buildContext };
})();
