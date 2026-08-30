/* FORMA domain — combined weekly load across strength + running + swimming (PRD 5.9). */

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

function weekWindow(sessions, cardio, days = 7) {
  const since = daysAgo(days);
  const strength = sessions.filter(s => s.status === 'completed' && s.endedAt && s.endedAt.slice(0, 10) >= since);
  const cardioRecent = cardio.filter(c => c.date >= since);
  return { strength, cardioRecent };
}

function weeklyLoadSummary(sessions, cardio) {
  const { strength, cardioRecent } = weekWindow(sessions, cardio, 7);
  const prevWindow = weekWindow(sessions, cardio, 14);
  const prevOnlyCardio = prevWindow.cardioRecent.filter(c => !cardioRecent.includes(c));

  const runs = cardioRecent.filter(c => c.type === 'run');
  const swims = cardioRecent.filter(c => c.type === 'swim');
  const prevRuns = prevOnlyCardio.filter(c => c.type === 'run');

  const kmThisWeek = runs.reduce((a, r) => a + (r.distanceKm || 0), 0);
  const kmPrevWeek = prevRuns.reduce((a, r) => a + (r.distanceKm || 0), 0);
  const kmSpikePct = kmPrevWeek > 0 ? Math.round(((kmThisWeek - kmPrevWeek) / kmPrevWeek) * 100) : 0;

  const hardSwimMinutes = swims.filter(s => s.effort === 'hard').reduce((a, s) => a + (s.durationMin || 0), 0);
  const easySwimMinutes = swims.filter(s => s.effort === 'easy').reduce((a, s) => a + (s.durationMin || 0), 0);

  return {
    strengthSessions: strength.length,
    runsCount: runs.length,
    kmThisWeek: Math.round(kmThisWeek * 10) / 10,
    kmSpikePct,
    legConservative: kmSpikePct >= 25 && kmThisWeek > 0,
    hardSwimMinutes, easySwimMinutes,
    swimCountsAsLoad: hardSwimMinutes > 0
  };
}
