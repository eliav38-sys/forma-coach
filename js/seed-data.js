/* FORMA — seed data.
   Measurements: copied verbatim from Eliav's original PRD. Missing fields
   stay `null`, never 0 or guessed. FORMA_SEED.isSeed marks rows the app must
   never claim were freshly entered.

   Workout program: the Upper / Legs / Upper split, transcribed verbatim from
   Eliav's three program infographics (אימון A / B / C). Exercise order, sets,
   rep ranges, rest ranges, the short cue ("הכוונה קצרה"), the day goal
   ("מטרה"), the key points ("דגשים") and the work note ("הערת עבודה") are all
   stored exactly as given.

   Intensity: this revision specifies RIR (reps in reserve), not RPE —
   "קומפאונד: RIR 1–2", "בידוד: קרוב לכשל", "בטן: שליטה מלאה". RIR is stored as
   the source of truth on each exercise; rpeLow/rpeHigh are DERIVED for the
   progression engine using the standard identity RPE = 10 − RIR, and are never
   shown as if the program had declared them. Core work carries no RIR because
   the source assigns it none. */

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

  workoutPlan: {
    id: 'plan-upper-legs-upper',
    name: 'Upper / Legs / Upper',
    version: 3,
    daysPerWeek: 3,
    active: true,
    rationale: 'דחיפה + משיכה פעמיים בשבוע, אימון רגליים איכותי אחד, וריצות במהלך השבוע.'
  },

  weeklySchedule: {
    0: 'strength-a',  // יום ראשון — עליון 1
    1: 'run-easy',    // יום שני
    2: 'recovery',    // יום שלישי
    3: 'strength-b',  // יום רביעי — רגליים + בטן
    4: 'rest',        // יום חמישי
    5: 'strength-c',  // יום שישי — עליון 2
    6: 'run-quality'  // שבת
  },

  workoutDays: [
    {
      id: 'day-a', order: 1, name: 'אימון A — פלג גוף עליון 1',
      subtitle: 'דחיפה + משיכה פעמיים בשבוע',
      focus: 'חזה, גב, כתפיים וידיים',
      goal: 'יותר תדירות, פחות נפח בכל אימון, עבודה קרוב לכשל',
      keyPoints: ['חזה + גב בכל אימון עליון', 'סטים איכותיים, לא נפח מיותר', 'קומפאונד: RIR 1–2', 'בידוד: קרוב לכשל'],
      dayCue: 'המטרה באימון הזה היא לתת דחיפה ומשיכה באותו אימון, עם איכות גבוהה בכל סט.',
      status: 'verified', expectedDurationMin: 55,
      exercises: [
        { exerciseId: 'incline-dumbbell-press', sets: 3, repLow: 6, repHigh: 10, rirLow: 1, rirHigh: 2, restSecLow: 120, restSecHigh: 120, shortCue: 'שיפוע 20–30°' },
        { exerciseId: 'lat-pulldown', sets: 3, repLow: 6, repHigh: 10, rirLow: 1, rirHigh: 2, restSecLow: 120, restSecHigh: 120, shortCue: 'מרפקים מטה' },
        { exerciseId: 'chest-press-machine', sets: 2, repLow: 8, repHigh: 12, rirLow: 1, rirHigh: 2, restSecLow: 90, restSecHigh: 120, shortCue: 'שליטה מלאה' },
        { exerciseId: 'seated-cable-row', sets: 2, repLow: 8, repHigh: 12, rirLow: 1, rirHigh: 2, restSecLow: 90, restSecHigh: 120, shortCue: 'חזה פתוח' },
        { exerciseId: 'lateral-raises', sets: 3, repLow: 12, repHigh: 20, rirLow: 0, rirHigh: 1, restSecLow: 60, restSecHigh: 90, shortCue: 'בלי תנופה' },
        { exerciseId: 'triceps-pushdown', sets: 2, repLow: 10, repHigh: 15, rirLow: 0, rirHigh: 1, restSecLow: 60, restSecHigh: 90, shortCue: 'מרפקים צמודים' },
        { exerciseId: 'cable-biceps-curl', sets: 2, repLow: 10, repHigh: 15, rirLow: 0, rirHigh: 1, restSecLow: 60, restSecHigh: 90, shortCue: 'טווח מלא' }
      ]
    },
    {
      id: 'day-b', order: 2, name: 'אימון B — רגליים + בטן',
      subtitle: 'אימון רגליים אחד איכותי אחד בשבוע',
      focus: 'רגליים, ליבה ויציבה',
      goal: 'רגליים חזקות, ליבה יציבה, התאוששות טובה לריצות',
      keyPoints: ['רגליים פעם בשבוע — זה מספיק כרגע', 'ריצות מוסיפות עומס לרגליים', 'קומפאונד: RIR 1–2', 'בטן: שליטה מלאה'],
      dayCue: 'אימון רגליים אחד איכותי מספיק כרגע, במיוחד כשיש גם ריצות במהלך השבוע.',
      status: 'verified', expectedDurationMin: 60,
      exercises: [
        { exerciseId: 'leg-press-squat', sets: 4, repLow: 6, repHigh: 10, rirLow: 1, rirHigh: 2, restSecLow: 120, restSecHigh: 180, shortCue: 'עומק נשלט' },
        { exerciseId: 'romanian-deadlift', sets: 3, repLow: 8, repHigh: 12, rirLow: 1, rirHigh: 2, restSecLow: 120, restSecHigh: 120, shortCue: 'אגן לאחור' },
        { exerciseId: 'leg-curl', sets: 3, repLow: 10, repHigh: 15, rirLow: 0, rirHigh: 1, restSecLow: 60, restSecHigh: 90, shortCue: 'כיווץ מלא' },
        { exerciseId: 'leg-extension', sets: 2, repLow: 10, repHigh: 15, rirLow: 0, rirHigh: 1, restSecLow: 60, restSecHigh: 90, shortCue: 'שליטה מלאה' },
        { exerciseId: 'calf-raise', sets: 3, repLow: 12, repHigh: 20, rirLow: 0, rirHigh: 1, restSecLow: 60, restSecHigh: 90, shortCue: 'מתיחה מלאה' },
        { exerciseId: 'reverse-crunch', sets: 3, repLow: 12, repHigh: 15, rirLow: null, rirHigh: null, restSecLow: 60, restSecHigh: 60, shortCue: 'גלגול אגן' },
        // The source gives Side Plank as "30–40 שנ׳ לכל צד" with no set count.
        // sets: 2 is read as one hold per side — the smallest faithful reading,
        // not an invented prescription.
        { exerciseId: 'side-plank', sets: 2, holdSecLow: 30, holdSecHigh: 40, perSide: true, rirLow: null, rirHigh: null, restSecLow: 45, restSecHigh: 60, shortCue: 'גוף ישר' }
      ]
    },
    {
      id: 'day-c', order: 3, name: 'אימון C — פלג גוף עליון 2',
      subtitle: 'דחיפה + משיכה בפעם השנייה השבוע',
      focus: 'חזה, גב, כתפיים וידיים — וריאציות שונות',
      goal: 'עוד גירוי איכותי לחזה, גב, כתפיים וידיים',
      keyPoints: ['חזה + גב שוב באותו אימון', 'וריאציות שונות מאימון A', 'קומפאונד: RIR 1–2', 'בידוד: קרוב לכשל'],
      dayCue: 'אימון עליון שני משלים את השבוע ונותן תדירות מצוינת בלי להעמיס יותר מדי נפח בכל אימון.',
      status: 'verified', expectedDurationMin: 55,
      exercises: [
        { exerciseId: 'incline-chest-press', sets: 3, repLow: 8, repHigh: 12, rirLow: 1, rirHigh: 2, restSecLow: 90, restSecHigh: 120, shortCue: 'חזה עליון' },
        { exerciseId: 'chest-supported-row', sets: 3, repLow: 8, repHigh: 12, rirLow: 1, rirHigh: 2, restSecLow: 90, restSecHigh: 120, shortCue: 'מרפק לאגן', altExerciseId: 'one-arm-machine-row' },
        { exerciseId: 'pec-deck-fly', sets: 2, repLow: 12, repHigh: 15, rirLow: 0, rirHigh: 1, restSecLow: 60, restSecHigh: 90, shortCue: 'מתיחה מבוקרת' },
        { exerciseId: 'straight-arm-pulldown', sets: 2, repLow: 12, repHigh: 15, rirLow: 0, rirHigh: 1, restSecLow: 60, restSecHigh: 90, shortCue: 'זרועות כמעט ישרות' },
        { exerciseId: 'shoulder-press', sets: 2, repLow: 6, repHigh: 10, rirLow: 1, rirHigh: 2, restSecLow: 90, restSecHigh: 120, shortCue: 'בלי קשת בגב' },
        { exerciseId: 'rope-hammer-curl', sets: 2, repLow: 10, repHigh: 15, rirLow: 0, rirHigh: 1, restSecLow: 60, restSecHigh: 90, shortCue: 'אחיזה ניטרלית' },
        { exerciseId: 'overhead-cable-triceps-extension', sets: 2, repLow: 10, repHigh: 15, rirLow: 0, rirHigh: 1, restSecLow: 60, restSecHigh: 90, shortCue: 'מתיחה לטרייספס' }
      ]
    }
  ].map(d => ({
    ...d,
    exerciseIds: d.exercises.map(e => e.exerciseId),
    // RPE is derived from the declared RIR (RPE = 10 − RIR), never re-declared.
    exercises: d.exercises.map(e => ({
      ...e,
      rpeLow: e.rirHigh == null ? null : 10 - e.rirHigh,
      rpeHigh: e.rirLow == null ? null : 10 - e.rirLow
    }))
  })),

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

  // Computed by summing primary-muscle sets straight from workoutDays above —
  // this revision of the program declares no volume table of its own.
  muscleWeeklyTargets: {
    chest: { targetSets: 10, muscles: ['chest'], labelHe: 'חזה' },
    back: { targetSets: 10, muscles: ['lats', 'mid-back'], labelHe: 'גב' },
    shoulders: { targetSets: 5, muscles: ['front-delts', 'side-delts', 'rear-delts'], labelHe: 'כתפיים' },
    biceps: { targetSets: 4, muscles: ['biceps'], labelHe: 'בייספס' },
    triceps: { targetSets: 4, muscles: ['triceps'], labelHe: 'טרייספס' },
    quads: { targetSets: 6, muscles: ['quads'], labelHe: 'קוואדס' },
    hamstrings: { targetSets: 6, muscles: ['hamstrings'], labelHe: 'המסטרינג' },
    calves: { targetSets: 3, muscles: ['calves'], labelHe: 'תאומים' },
    core: { targetSets: 5, muscles: ['core'], labelHe: 'ליבה' }
  }
};

if (typeof module !== 'undefined') module.exports = { FORMA_SEED };
