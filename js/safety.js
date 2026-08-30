/* FORMA — safety boundaries (PRD 9.5, 5.6, 14.3).
   FORMA is a coach, not a doctor: certain signals always stop recommendations
   and point to a professional, no matter what else is happening. */

const SAFETY_REDFLAG_TERMS = [
  { re: /כאב.{0,6}חזה|לחץ בחזה/, labelHe: 'כאב או לחץ בחזה' },
  { re: /קוצר נשימה/, labelHe: 'קוצר נשימה חריג' },
  { re: /סחרחורת/, labelHe: 'סחרחורת' },
  { re: /התעלף|איבוד הכרה|הכרה/, labelHe: 'אובדן הכרה' },
  { re: /נימול|חוסר תחושה|חולשה בצד|לא מרגיש (יד|רגל)/, labelHe: 'חולשה נוירולוגית או נימול' }
];

const DISORDERED_EATING_TERMS = [
  /לא אוכל(ת)? בכלל/, /מפחד(ת)? מאוכל/, /שונא(ת)? את הגוף שלי/, /מרגיש(ה)? אשמה כשאוכל/, /מקיא(ה)?/, /רעב(ה)? את עצמי/
];

function checkTextSafety(text) {
  if (!text) return { stopWorkout: false, seekProfessionalHelp: false, message: null };
  const hit = SAFETY_REDFLAG_TERMS.find(t => t.re.test(text));
  if (hit) {
    return {
      stopWorkout: true, seekProfessionalHelp: true,
      message: `זיהינו תיאור שקשור ל${hit.labelHe}. זה מעבר למה ש-FORMA יכולה להעריך. אם התסמין נמשך או חמור, יש לפנות מיד לטיפול רפואי מתאים.`
    };
  }
  if (DISORDERED_EATING_TERMS.some(re => re.test(text))) {
    return {
      stopWorkout: false, seekProfessionalHelp: true,
      message: 'זה נשמע כמו יחס קשה למזון או לגוף, ולא כמו משהו ש-FORMA צריכה "לתקן" בשבילך. מומלץ לדבר עם איש מקצוע — זה לא כישלון, זו הדרך הנכונה לטפל בזה.'
    };
  }
  return { stopWorkout: false, seekProfessionalHelp: false, message: null };
}

function checkPainSafety(painLevel) {
  if (painLevel === 'sharp') {
    return {
      stopWorkout: true, seekProfessionalHelp: true,
      message: 'כאב חד עוצר את המלצת ההעמסה בתרגיל הזה. אם הכאב נמשך, מומלץ לבדוק אצל איש מקצוע לפני שממשיכים.'
    };
  }
  return { stopWorkout: false, seekProfessionalHelp: false, message: null };
}
