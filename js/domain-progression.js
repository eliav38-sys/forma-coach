/* FORMA domain — double progression & plateau detection, RPE-based.
   Follows Eliav's exact progression law:
   1) pick a weight that allows bottom-of-range reps at target RPE:
   2) each exposure, try to add a rep or improve quality without exceeding RPE.
   3) top of range on all work sets + RPE still fits -> propose +2.5%-5% load.
   4) below range, or RPE over target by 1+, -> hold or reduce. Pain always
      blocks a load recommendation, regardless of performance. */

const EXERCISE_INCREMENTS_KG = {
  'incline-dumbbell-press': 2, 'chest-supported-row': 2.5, 'lat-pulldown': 2.5, 'lateral-raises': 1,
  'pec-deck-fly': 2.5, 'preacher-curl': 1, 'overhead-cable-triceps-extension': 1, 'rear-delt-fly': 1,
  'leg-press-squat': 5, 'romanian-deadlift': 2.5, 'leg-curl': 2.5, 'leg-extension': 2.5, 'calf-raise': 5,
  'shoulder-press': 2, 'straight-arm-pulldown': 2.5, 'decline-reverse-crunch': 0,
  'incline-chest-press': 2.5, 'seated-cable-row': 2.5, 'flat-dumbbell-press': 2,
  'cable-biceps-curl': 1, 'hammer-curl': 1, 'triceps-pushdown': 1,
  'chest-press-machine': 2.5, 'one-arm-machine-row': 2.5, 'dumbbell-curl': 1
};

function suggestedIncrementKg(exerciseId, currentWeight) {
  const fixed = EXERCISE_INCREMENTS_KG[exerciseId];
  if (!currentWeight) return fixed || 1;
  const pctBased = Math.round(currentWeight * 0.035 * 2) / 2; // ~3.5%, middle of 2.5%-5%
  return Math.max(fixed ? Math.min(fixed, 1) : 1, pctBased || fixed || 1);
}

/** Groups flat set-log rows (newest first) into sessions, most recent first. */
function groupBySession(history) {
  const bySession = {};
  history.forEach(s => { (bySession[s.sessionId] = bySession[s.sessionId] || []).push(s); });
  return Object.values(bySession).sort((a, b) => (a[0].createdAt < b[0].createdAt ? 1 : -1));
}

/** Did this session hit the top of the rep range at/under target RPE on (most) work sets? */
function sessionMetTop(sets, repHigh, rpeHigh) {
  const work = sets.filter(s => !s.warmup);
  if (!work.length) return false;
  const hits = work.filter(s => s.reps >= repHigh && Number(s.rpe) <= rpeHigh);
  return hits.length / work.length >= 0.6;
}

function sessionBelowRange(sets, repLow) {
  const work = sets.filter(s => !s.warmup);
  if (!work.length) return false;
  const misses = work.filter(s => s.reps < repLow);
  return misses.length / work.length >= 0.5;
}

function sessionOverRpe(sets, rpeHigh) {
  const work = sets.filter(s => !s.warmup);
  if (!work.length) return false;
  return work.some(s => Number(s.rpe) >= rpeHigh + 1);
}

function sessionHasPain(sets) {
  return sets.some(s => s.pain && s.pain !== 'none');
}

function evaluateProgression(exerciseId, history, prescription) {
  const sessions = groupBySession(history);
  if (!sessions.length || !prescription) {
    return { status: 'insufficient_data', message: 'עוד אין נתונים בתרגיל הזה כדי להציע שינוי משקל.' };
  }

  const last = sessions[0];
  const currentWeight = last.find(s => !s.warmup)?.weight ?? null;

  if (sessionHasPain(last)) {
    return {
      status: 'needs_review',
      message: 'דווח כאב באימון האחרון בתרגיל הזה. אין להעלות עומס — כדאי לבדוק טכניקה או להחליף וריאציה לפני שממשיכים.'
    };
  }

  const metTop = sessionMetTop(last, prescription.repHigh, prescription.rpeHigh);
  if (metTop) {
    const inc = suggestedIncrementKg(exerciseId, currentWeight);
    return {
      status: 'propose_increase',
      incrementKg: inc,
      fromWeight: currentWeight,
      toWeight: currentWeight != null ? Math.round((currentWeight + inc) * 10) / 10 : null,
      message: `הגעת לחלק העליון של טווח החזרות ב-RPE ${prescription.rpeLow === prescription.rpeHigh ? prescription.rpeHigh : prescription.rpeLow + '–' + prescription.rpeHigh} היעד. אפשר להעלות כ-2.5%–5% (בערך ${inc} ק"ג) באימון הבא.`
    };
  }

  const belowRange = sessionBelowRange(last, prescription.repLow);
  const overRpe = sessionOverRpe(last, prescription.rpeHigh);
  if (belowRange || overRpe) {
    return {
      status: 'needs_review',
      message: overRpe
        ? 'ה-RPE באימון האחרון היה גבוה מהיעד ביותר מנקודה. שומרים על אותו משקל, ואם זה חוזר — כדאי להוריד מעט.'
        : 'הביצועים ירדו מתחת לטווח החזרות. שומרים על אותו משקל בפעם הבאה במקום להוריד אוטומטית.'
    };
  }

  return { status: 'hold', message: 'ממשיכים באותו משקל — עדיין יש מקום להוסיף חזרה בתוך הטווח לפני שמעלים.' };
}

/** Plateau needs >=2 co-occurring signals across the last 2-3 exposures to the exercise. */
function evaluatePlateau(exerciseId, history, recentRecoveryLogs, prescription) {
  const sessions = groupBySession(history).slice(0, 3);
  if (sessions.length < 2) return { flagged: false };

  const signals = [];
  const [last, prev] = sessions;
  const avgReps = arr => arr.filter(s => !s.warmup).reduce((a, s) => a + s.reps, 0) / Math.max(1, arr.filter(s => !s.warmup).length);
  const sameWeight = last[0]?.weight === prev[0]?.weight;
  if (sameWeight && avgReps(last) < avgReps(prev)) signals.push('ירידה בחזרות באותו משקל');

  if (prescription) {
    const lastHard = last.filter(s => !s.warmup && Number(s.rpe) >= prescription.rpeHigh).length / Math.max(1, last.length);
    const prevHard = prev.filter(s => !s.warmup && Number(s.rpe) >= prescription.rpeHigh).length / Math.max(1, prev.length);
    if (lastHard > prevHard + 0.2) signals.push('RPE גבוה יותר מהרגיל');
  }

  const avgRecovery = recentRecoveryLogs.length
    ? recentRecoveryLogs.reduce((a, r) => a + r.score, 0) / recentRecoveryLogs.length : 100;
  if (avgRecovery < 55) signals.push('התאוששות נמוכה לאורך התקופה');

  const painCount = sessions.filter(sess => sessionHasPain(sess)).length;
  if (painCount >= 2) signals.push('כאב או חוסר נוחות חוזרים');

  if (signals.length >= 2) return { flagged: true, signals, suggestion: pickPlateauResponse(signals) };
  return { flagged: false, signals };
}

function pickPlateauResponse(signals) {
  if (signals.includes('כאב או חוסר נוחות חוזרים')) return { type: 'swap_exercise', labelHe: 'החלפת וריאציה לתרגיל דומה' };
  if (signals.includes('התאוששות נמוכה לאורך התקופה')) return { type: 'deload_week', labelHe: 'שבוע הורדת עומס' };
  return { type: 'extend_rest', labelHe: 'הארכת זמן מנוחה בין סטים' };
}
