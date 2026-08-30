/* FORMA — nutrition content & calculations (PRD section 8).
   Vegetarian-only suggestion pool built from foods Eliav already eats.
   No meat or fish is ever suggested; no spicy defaults (section 2.1, 8.3). */

const NUTRITION_STONES = [
  { id: 'quick-morning', nameHe: 'בוקר מהיר', optionsHe: ['ביצים מקושקשות עם גבינה', 'יוגורט עשיר בחלבון עם פירות', 'קוטג׳ עם לחם מלא'] },
  { id: 'pre-workout', nameHe: 'לפני אימון', optionsHe: ['חופן תמרים עם חופן אגוזים', 'טוסט עם חומוס', 'בננה ויוגורט קליל'] },
  { id: 'post-workout', nameHe: 'אחרי אימון', optionsHe: ['יוגורט עשיר בחלבון', 'חביתת שלוש ביצים עם גבינה', 'שייק חלבון צמחי/חלבי עם בננה', 'קוטג׳ עם אבוקדו'] },
  { id: 'evening-home', nameHe: 'ערב בבית', optionsHe: ['טופו מוקפץ עם ירקות', 'עדשים עם אורז וירקות', 'חביתה עם סלט וחומוס'] },
  { id: 'restaurant', nameHe: 'פתרון למסעדה', optionsHe: ['סלט עם חומוס וגבינות', 'מנת טופו או קטניות עיקרית', 'ביצה/גבינה עם תוספות ירק'] },
  { id: 'travel', nameHe: 'פתרון לנסיעה או שדה תעופה', optionsHe: ['ביצים קשות ואגוזים', 'חומוס ופיתה', 'אבקת חלבון נודדת עם מים'] },
  { id: 'protein-snack', nameHe: 'נשנוש חלבוני', optionsHe: ['קוטג׳', 'יוגורט עשיר בחלבון', 'חופן אדממה', 'חטיף חלבון צמחי'] }
];

/** Section 8.4 — a range shows only once weight is known; anchors near 1.6 g/kg per the cited meta-analysis. */
function proteinTargetRange(weightKg) {
  if (!weightKg) return { hasTarget: false, message: 'אין עדיין יעד חלבון מדויק — חסר משקל גוף.' };
  const low = Math.round(weightKg * 1.4);
  const high = Math.round(weightKg * 2.0);
  const anchor = Math.round(weightKg * 1.6);
  return { hasTarget: true, low, high, anchor, message: `טווח מקובל: ${low}–${high} גרם חלבון ליום, סביב ${anchor} גרם כעוגן טוב לרוב המתאמנים.` };
}

function calorieGuidance(goalType) {
  const map = {
    muscle: 'לבניית שריר: עודף קטן ומבוקר, עם מעקב אחר טבור ומשקל.',
    fat_loss: 'לירידה בהיקף: גרעון מתון תוך שמירה על כוח וחלבון.',
    performance: 'לשיפור ביצועים ושגרה: תחזוקה, ללא מיקוד יתר במשקל.'
  };
  return map[goalType] || null;
}
