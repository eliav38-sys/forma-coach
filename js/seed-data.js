/* FORMA — seed data.
   Measurements: copied verbatim from Eliav's original PRD. Missing fields
   stay `null`, never 0 or guessed. FORMA_SEED.isSeed marks rows the app must
   never claim were freshly entered.

   Workout program: copied verbatim from Eliav's full-program message
   (exercises, sets, rep ranges, RPE, rest, cues). Nothing here is invented —
   set counts, RPE and rest are stored exactly as given, including cases
   where the same exercise carries slightly different numbers on different
   days (e.g. Cable Lateral Raise's RPE is 8 on days A/B but 8–9 on day C). */

const FORMA_SEED = {
  user: {
    display_name: 'אליאב',
    locale: 'he-IL',
    timezone: 'Asia/Jerusalem',
    diet: 'vegetarian',
    dislikes: ['תבלינים חריפים'],
    weekly_targets: { strength_sessions: 3, runs: 2 }
  },

  // Section 2.3 — every unmeasured cell is null, never 0.
  measurements: [
    { date: '2024-10-29', chest_cm: 94.3, navel_cm: 89.5, left_arm_flexed_cm: 31.1, left_arm_relaxed_cm: 27.9, right_arm_flexed_cm: 31.1, right_arm_relaxed_cm: null },
    { date: '2024-12-02', chest_cm: 95.3, navel_cm: 87.5, left_arm_flexed_cm: 32.5, left_arm_relaxed_cm: 28.4, right_arm_flexed_cm: 32.4, right_arm_relaxed_cm: null },
    { date: '2025-01-13', chest_cm: 92.8, navel_cm: 86.5, left_arm_flexed_cm: null, left_arm_relaxed_cm: null, right_arm_flexed_cm: null, right_arm_relaxed_cm: null },
    { date: '2025-03-11', chest_cm: 95.1, navel_cm: 86.4, left_arm_flexed_cm: null, left_arm_relaxed_cm: null, right_arm_flexed_cm: null, right_arm_relaxed_cm: null },
    { date: '2025-07-04', chest_cm: 95.0, navel_cm: 87.3, left_arm_flexed_cm: null, left_arm_relaxed_cm: null, right_arm_flexed_cm: null, right_arm_relaxed_cm: null },
    { date: '2025-09-12', chest_cm: 94.0, navel_cm: 87.9, left_arm_flexed_cm: null, left_arm_relaxed_cm: null, right_arm_flexed_cm: null, right_arm_relaxed_cm: null },
    { date: '2026-08-12', chest_cm: null, navel_cm: null, left_arm_flexed_cm: 36.0, left_arm_relaxed_cm: 29.0, right_arm_flexed_cm: 35.0, right_arm_relaxed_cm: null }
  ].map(m => ({ ...m, isSeed: true, protocol: 'imported', reliable: true })),

  // Full 3-day program, exactly as given: order, sets, rep range, RPE range,
  // rest range and technical cue per exercise, per day.
  workoutPlan: {
    id: 'plan-full-program',
    name: 'תוכנית האימונים המלאה',
    version: 2,
    daysPerWeek: 3,
    active: true,
    rationale: 'התוכנית המלאה שסיפק אליאב: שלושה ימי כוח (A/B/C), ריצה קלה, ריצת איכות ויום התאוששות.'
  },

  weeklySchedule: {
    0: 'strength-a',  // יום ראשון
    1: 'run-easy',    // יום שני
    2: 'recovery',    // יום שלישי
    3: 'strength-b',  // יום רביעי
    4: 'rest',        // יום חמישי
    5: 'strength-c',  // יום שישי
    6: 'run-quality'  // שבת
  },

  workoutDays: [
    {
      id: 'day-a', order: 1, name: 'אימון A — חזה, כתפיים וטרייספס',
      focus: 'חזה עליון, כתף צדית וטרייספס',
      dayCue: 'שליטה בתנועה, טווח מלא, ועלייה הדרגתית במשקל.',
      status: 'verified', expectedDurationMin: 60,
      exercises: [
        { exerciseId: 'incline-dumbbell-press', sets: 4, repLow: 6, repHigh: 10, rpeLow: 7.5, rpeHigh: 8.5, restSecLow: 120, restSecHigh: 120 },
        { exerciseId: 'chest-press-machine', sets: 3, repLow: 8, repHigh: 12, rpeLow: 7.5, rpeHigh: 8.5, restSecLow: 120, restSecHigh: 120 },
        { exerciseId: 'pec-deck-fly', sets: 3, repLow: 10, repHigh: 15, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 },
        { exerciseId: 'lateral-raises', sets: 4, repLow: 12, repHigh: 20, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 },
        { exerciseId: 'triceps-pushdown', sets: 3, repLow: 10, repHigh: 15, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 },
        { exerciseId: 'overhead-cable-triceps-extension', sets: 3, repLow: 10, repHigh: 15, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 }
      ]
    },
    {
      id: 'day-b', order: 2, name: 'אימון B — גב, בייספס וכתף אחורית',
      focus: 'רוחב גב, בייספס וכתף אחורית',
      dayCue: 'חזה פתוח, משיכה מהגב, ושליטה מלאה בחזרה.',
      status: 'verified', expectedDurationMin: 65,
      exercises: [
        { exerciseId: 'lat-pulldown', sets: 4, repLow: 6, repHigh: 10, rpeLow: 7.5, rpeHigh: 8.5, restSecLow: 120, restSecHigh: 120 },
        { exerciseId: 'seated-cable-row', sets: 3, repLow: 8, repHigh: 12, rpeLow: 7.5, rpeHigh: 8.5, restSecLow: 120, restSecHigh: 120 },
        { exerciseId: 'one-arm-machine-row', sets: 3, repLow: 8, repHigh: 12, rpeLow: 7.5, rpeHigh: 8.5, restSecLow: 120, restSecHigh: 120 },
        { exerciseId: 'straight-arm-pulldown', sets: 3, repLow: 12, repHigh: 15, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 },
        { exerciseId: 'rear-delt-fly', sets: 4, repLow: 12, repHigh: 20, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 },
        { exerciseId: 'dumbbell-curl', sets: 3, repLow: 8, repHigh: 12, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 },
        { exerciseId: 'hammer-curl', sets: 3, repLow: 10, repHigh: 15, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 }
      ]
    },
    {
      id: 'day-c', order: 3, name: 'אימון C — רגליים וכתפיים',
      focus: 'רגליים, כתפיים ויציבות',
      dayCue: 'טכניקת יציבה, טווח מלא ושליטה בירידה.',
      status: 'verified', expectedDurationMin: 70,
      exercises: [
        { exerciseId: 'leg-press-squat', sets: 4, repLow: 6, repHigh: 10, rpeLow: 7.5, rpeHigh: 8.5, restSecLow: 120, restSecHigh: 180 },
        { exerciseId: 'romanian-deadlift', sets: 3, repLow: 8, repHigh: 12, rpeLow: 7.5, rpeHigh: 8.5, restSecLow: 120, restSecHigh: 180 },
        { exerciseId: 'leg-curl', sets: 3, repLow: 10, repHigh: 15, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 },
        { exerciseId: 'leg-extension', sets: 3, repLow: 10, repHigh: 15, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 },
        { exerciseId: 'calf-raise', sets: 3, repLow: 12, repHigh: 20, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 },
        { exerciseId: 'shoulder-press', sets: 3, repLow: 6, repHigh: 10, rpeLow: 7.5, rpeHigh: 8.5, restSecLow: 60, restSecHigh: 90 },
        { exerciseId: 'lateral-raises', sets: 4, repLow: 12, repHigh: 20, rpeLow: 8, rpeHigh: 8, restSecLow: 60, restSecHigh: 90 }
      ]
    }
  ].map(d => ({ ...d, exerciseIds: d.exercises.map(e => e.exerciseId) })),

  runningProgram: {
    easy: {
      durationMinLow: 30, durationMinHigh: 45, rpeLow: 4, rpeHigh: 5,
      note: 'הקצב צריך לאפשר ניהול שיחה. המטרה היא בניית בסיס אירובי תוך יצירת עייפות נמוכה יחסית.'
    },
    quality: {
      warmupMin: 8, cooldownMin: 8, repsLow: 4, repsHigh: 6, workMin: 2, rpe: 7, restMin: 2,
      note: 'זו אינה ריצת ספרינט ואין להגיע לכשל. אם ריצת האיכות פוגעת באימון הרגליים או בהתאוששות, יש להפחית תחילה את נפח או עצימות הריצה.'
    }
  },

  // Section: נפח שבועי ישיר מתוכנן — this revision of the program didn't come
  // with its own declared table, so these are computed by summing primary-
  // muscle sets straight from workoutDays above (see progress.js caption).
  muscleWeeklyTargets: {
    chest: { targetSets: 10, muscles: ['chest'], labelHe: 'חזה' },
    back: { targetSets: 13, muscles: ['lats', 'mid-back'], labelHe: 'גב' },
    shoulders: { targetSets: 15, muscles: ['front-delts', 'side-delts', 'rear-delts'], labelHe: 'כתפיים' },
    biceps: { targetSets: 6, muscles: ['biceps'], labelHe: 'בייספס' },
    triceps: { targetSets: 6, muscles: ['triceps'], labelHe: 'טרייספס' },
    quads: { targetSets: 7, muscles: ['quads'], labelHe: 'קוואדס' },
    hamstrings: { targetSets: 6, muscles: ['hamstrings'], labelHe: 'המסטרינג' },
    calves: { targetSets: 3, muscles: ['calves'], labelHe: 'תאומים' },
    core: { targetSets: 0, muscles: ['core'], labelHe: 'ליבה (רק בעקיפין דרך רגליים)' }
  }
};

if (typeof module !== 'undefined') module.exports = { FORMA_SEED };
