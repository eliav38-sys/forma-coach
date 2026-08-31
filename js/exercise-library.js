/* FORMA — exercise library content.
   Names and cues for the full 3-day program come verbatim from Eliav's
   program message. Where the same exercise appears on more than one day
   with a differently-worded cue, both cues are kept (deduped when identical)
   rather than picking one and discarding the other. Fields not given by
   Eliav (feel / tempo / breathing / rom / substitutes for the new exercises)
   are left empty — not invented.

   videoYoutubeId: a real, verified YouTube video (found via live search, not
   guessed) demonstrating the movement — picked for a clear title match and a
   reputable-looking source. These are third-party videos, not FORMA's own;
   if one ever goes private/removed, the embed just shows YouTube's own
   "video unavailable" state rather than breaking the app. */

const MUSCLES = {
  chest:        { he: 'חזה', en: 'Chest' },
  'front-delts':{ he: 'כתף קדמית', en: 'Front Delts' },
  'side-delts': { he: 'כתף צדית', en: 'Side Delts' },
  'rear-delts': { he: 'כתף אחורית', en: 'Rear Delts' },
  triceps:      { he: 'טרייספס', en: 'Triceps' },
  biceps:       { he: 'בייספס', en: 'Biceps' },
  lats:         { he: 'גב רחב', en: 'Lats' },
  'mid-back':   { he: 'גב אמצעי', en: 'Mid Back' },
  forearms:     { he: 'אמות', en: 'Forearms' },
  core:         { he: 'ליבה', en: 'Core' },
  quads:        { he: 'קוואדריספס', en: 'Quads' },
  hamstrings:   { he: 'המסטרינג', en: 'Hamstrings' },
  calves:       { he: 'תאומים', en: 'Calves' }
};

const FORMA_EXERCISES = [
  // ---- Day A ------------------------------------------------------------
  {
    id: 'incline-dumbbell-press', nameHe: 'לחיצת דאמבלים בשיפוע', nameEn: 'Incline Dumbbell Press',
    primary: 'chest', secondary: ['front-delts', 'triceps'], feel: '',
    cues: ['שיפוע מתון, שכמות יציבות וטווח תנועה נשלט.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'sK4Rvug6ufo'
  },
  {
    id: 'chest-supported-row', nameHe: 'חתירה עם תמיכת חזה', nameEn: 'Chest-Supported Row',
    primary: 'mid-back', secondary: ['lats', 'rear-delts', 'biceps'], feel: '',
    cues: ['החזה נשאר על התמיכה ומשיכת המרפקים לאחור.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'LuWGKt8B_7o'
  },
  {
    id: 'lat-pulldown', nameHe: 'פולי עליון או מתח מסייע', nameEn: 'Lat Pulldown',
    primary: 'lats', secondary: ['mid-back', 'biceps'], feel: '',
    cues: [
      'כתפיים נמוכות והמרפקים נעים לכיוון האגן.',
      'המרפקים יורדים מטה. אין למשוך את המוט מאחורי העורף.'
    ], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'Z_3xHwuO8Tk'
  },
  {
    id: 'lateral-raises', nameHe: 'הרחקה לצד בכבל', nameEn: 'Cable Lateral Raise',
    primary: 'side-delts', secondary: ['front-delts'], feel: '',
    cues: [
      'ללא תנופה. לעצור לפני שהטרפז משתלט על התנועה.',
      'משקל נשלט והמרפק מוביל את התנועה.',
      'חזרות נקיות. אין צורך להגיע לכשל.'
    ], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'zpbm-xRHB6k'
  },
  {
    id: 'pec-deck-fly', nameHe: 'פרפר או קרוס בכבל', nameEn: 'Pec Deck / Cable Fly',
    primary: 'chest', secondary: [], feel: '',
    cues: ['מתיחה נשלטת ולא "לרדוף" אחרי משקל גבוה.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'ETtXO4FW1EU'
  },
  {
    id: 'preacher-curl', nameHe: 'כפיפת מרפקים פריצ׳ר', nameEn: 'Preacher Curl',
    primary: 'biceps', secondary: [], feel: '',
    cues: ['המרפק נשאר קבוע והירידה מתבצעת באיטיות.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'gSsEC9O6NYU'
  },
  {
    id: 'overhead-cable-triceps-extension', nameHe: 'פשיטת מרפק מעל הראש בכבל', nameEn: 'Overhead Cable Triceps Extension',
    primary: 'triceps', secondary: [], feel: '',
    cues: ['מתיחה עמוקה ונשלטת, כאשר הזרוע העליונה נשארת יציבה.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'W6h3t9mkRrY'
  },
  {
    id: 'rear-delt-fly', nameHe: 'כתף אחורית', nameEn: 'Rear Delt Fly',
    primary: 'rear-delts', secondary: [], feel: '',
    cues: [
      'כתפיים נמוכות והתנועה מגיעה מהכתף.',
      'שליטה בחזרה ושמירה על צוואר משוחרר.'
    ], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'p7YER_nABrI'
  },

  // ---- Day B --------------------------------------------------------------
  {
    id: 'leg-press-squat', nameHe: 'לחיצת רגליים או סקוואט', nameEn: 'Leg Press / Squat',
    primary: 'quads', secondary: ['hamstrings', 'core'], feel: '',
    cues: ['עומק יציב והברכיים נשארות בקו כפות הרגליים.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'cDGOn-yfKJA'
  },
  {
    id: 'romanian-deadlift', nameHe: 'דדליפט רומני', nameEn: 'Romanian Deadlift',
    primary: 'hamstrings', secondary: ['mid-back', 'core'], feel: '',
    cues: ['האגן נע לאחור, הגב נשאר ניטרלי ועוצרים לפני אובדן המנח.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'aa57T45iFSE'
  },
  {
    id: 'leg-curl', nameHe: 'כפיפת ברך', nameEn: 'Leg Curl',
    primary: 'hamstrings', secondary: [], feel: '',
    cues: ['האגן נשאר יציב והירידה מתבצעת בשליטה.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: '14OrOWlM5QU'
  },
  {
    id: 'leg-extension', nameHe: 'פשיטת ברך', nameEn: 'Leg Extension',
    primary: 'quads', secondary: [], feel: '',
    cues: ['כיווץ בחלק העליון, ללא "בעיטה" תנופתית.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'MXvSzXEBOTI'
  },
  {
    id: 'calf-raise', nameHe: 'תאומים', nameEn: 'Calf Raise',
    primary: 'calves', secondary: [], feel: '',
    cues: ['טווח תנועה מלא ועצירה קצרה במצב המתיחה.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'ndQc4mz4mBU'
  },
  {
    id: 'shoulder-press', nameHe: 'לחיצת כתפיים', nameEn: 'Shoulder Press',
    primary: 'front-delts', secondary: ['side-delts', 'triceps'], feel: '',
    cues: ['ליבה אסופה ועבודה בטווח שאינו גורם לכאב.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'fjQdQNjqS1A'
  },
  {
    id: 'straight-arm-pulldown', nameHe: 'משיכת זרועות ישרות', nameEn: 'Straight-Arm Pulldown',
    primary: 'lats', secondary: [], feel: '',
    cues: ['התנועה מגיעה מהכתף. אין להפוך אותה לפשיטת מרפק.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'duHQk2PxNos'
  },
  {
    id: 'decline-reverse-crunch', nameHe: 'כפיפת אגן ובטן', nameEn: 'Decline Reverse Crunch',
    primary: 'core', secondary: [], feel: '',
    cues: ['גלגול אגן נשלט וללא תנופה של הרגליים.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'llBeKBs21Q8'
  },

  // ---- Day C --------------------------------------------------------------
  {
    id: 'incline-chest-press', nameHe: 'לחיצת חזה בשיפוע במכונה', nameEn: 'Incline Chest Press',
    primary: 'chest', secondary: ['front-delts', 'triceps'], feel: '',
    cues: ['שיפוע מתון ושליטה בחלק התחתון של התנועה.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'LiDArz1R2NU'
  },
  {
    id: 'seated-cable-row', nameHe: 'חתירה בכבל', nameEn: 'Seated Cable Row',
    primary: 'mid-back', secondary: ['lats', 'biceps'], feel: '',
    cues: ['גב ניטרלי וללא משיכה באמצעות תנופה של הגוף.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'EU7bOadUsNI'
  },
  {
    id: 'flat-dumbbell-press', nameHe: 'לחיצת חזה שטוחה בדאמבלים', nameEn: 'Flat Dumbbell Press',
    primary: 'chest', secondary: ['front-delts', 'triceps'], feel: '',
    cues: ['שכמות יציבות וטווח תנועה שאינו גורם לכאב.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'YKbAPKcDIq0'
  },
  {
    id: 'cable-biceps-curl', nameHe: 'כפיפת מרפקים בכבל', nameEn: 'Cable Biceps Curl',
    primary: 'biceps', secondary: ['forearms'], feel: '',
    cues: ['מרפקים קבועים וללא תנופה.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'pEVXvlVKm80'
  },
  {
    id: 'hammer-curl', nameHe: 'כפיפת פטיש', nameEn: 'Hammer Curl',
    primary: 'biceps', secondary: ['forearms'], feel: '',
    cues: ['אחיזה ניטרלית וירידה איטית.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: '4BRAf2BajWw'
  },
  {
    id: 'triceps-pushdown', nameHe: 'פשיטת מרפק בכבל', nameEn: 'Triceps Pushdown',
    primary: 'triceps', secondary: [], feel: '',
    cues: ['המרפקים נשארים קבועים והפתיחה מתבצעת בשליטה.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'i14hrj7l7CI'
  },

  // ---- Added for the revised A/B/C split (chest+delts+tri / back+bi+rear-delt / legs+shoulders) ---
  {
    id: 'chest-press-machine', nameHe: 'לחיצת חזה במכונה', nameEn: 'Chest Press',
    primary: 'chest', secondary: ['front-delts', 'triceps'], feel: '',
    cues: [], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'pLofEAcfsO8'
  },
  {
    id: 'one-arm-machine-row', nameHe: 'חתירה במכשיר ביד אחת', nameEn: 'One Arm Machine Row',
    primary: 'mid-back', secondary: ['lats', 'biceps'], feel: '',
    cues: [], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'z11jNvj5hH0'
  },
  {
    id: 'dumbbell-curl', nameHe: 'כפיפת מרפקים עם דאמבלים', nameEn: 'Dumbbell Curl',
    primary: 'biceps', secondary: ['forearms'], feel: '',
    cues: [], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: '6DeLZ6cbgWQ'
  },

  // ---- Added for the Upper / Legs / Upper split ----------------------------
  {
    id: 'rope-hammer-curl', nameHe: 'האמר בכבל — פולי תחתון', nameEn: 'Rope Hammer Curl',
    primary: 'biceps', secondary: ['forearms'], feel: '',
    cues: ['אחיזה ניטרלית.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'VY4walmoM-I'
  },
  {
    id: 'reverse-crunch', nameHe: 'רברס קראנץ׳', nameEn: 'Reverse Crunch',
    primary: 'core', secondary: [], feel: '',
    cues: ['גלגול אגן.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'ue6j6k0Vgbc'
  },
  {
    id: 'side-plank', nameHe: 'פלאנק צדי', nameEn: 'Side Plank',
    primary: 'core', secondary: [], feel: '',
    cues: ['גוף ישר.'], mistakes: [],
    tempo: '', breathing: '', rom: '', substitutes: [], videoYoutubeId: 'iNbH7_edNI8',
    isHold: true
  }
];

const FORMA_EXERCISE_INDEX = Object.fromEntries(FORMA_EXERCISES.map(e => [e.id, e]));

if (typeof module !== 'undefined') module.exports = { FORMA_EXERCISES, FORMA_EXERCISE_INDEX, MUSCLES };
