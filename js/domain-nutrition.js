/* FORMA domain — daily nutrition targets and meal maths.

   FOOD_DB values are standard published per-100g reference values, rounded.
   They are estimates for tracking trends, not lab measurements of the specific
   product in your fridge — the UI says so rather than implying false precision.

   Every food here is vegetarian (Eliav's diet, PRD 2.1) and nothing spicy is
   used as a default. No meat or fish appears in this list at all. */

const FOOD_UNITS = { g: 'גרם', unit: 'יחידה', cup: 'כוס', slice: 'פרוסה', tbsp: 'כף' };

/* per100: { kcal, protein, carbs, fat }. `portion` is a sensible default
   serving so logging is one tap, with grams shown so it stays checkable. */
const FOOD_DB = [
  // --- חלבון ---
  { id: 'egg', nameHe: 'ביצה', group: 'protein', portionG: 55, portionLabel: 'ביצה', per100: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 } },
  { id: 'cottage5', nameHe: 'קוטג׳ 5%', group: 'protein', portionG: 100, portionLabel: 'גביע קטן', per100: { kcal: 103, protein: 11, carbs: 3.4, fat: 5 } },
  { id: 'greek-yogurt', nameHe: 'יוגורט יווני 0%', group: 'protein', portionG: 150, portionLabel: 'גביע', per100: { kcal: 59, protein: 10, carbs: 3.6, fat: 0.4 } },
  { id: 'bulgarian5', nameHe: 'גבינה בולגרית 5%', group: 'protein', portionG: 60, portionLabel: 'פרוסה עבה', per100: { kcal: 130, protein: 14, carbs: 4, fat: 5 } },
  { id: 'yellow-cheese', nameHe: 'גבינה צהובה', group: 'protein', portionG: 30, portionLabel: 'פרוסה', per100: { kcal: 350, protein: 25, carbs: 1.3, fat: 28 } },
  { id: 'tofu', nameHe: 'טופו', group: 'protein', portionG: 150, portionLabel: 'מנה', per100: { kcal: 76, protein: 8, carbs: 1.9, fat: 4.8 } },
  { id: 'edamame', nameHe: 'אדממה', group: 'protein', portionG: 100, portionLabel: 'חופן', per100: { kcal: 121, protein: 12, carbs: 9, fat: 5 } },
  { id: 'lentils', nameHe: 'עדשים מבושלות', group: 'protein', portionG: 200, portionLabel: 'מנה', per100: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 } },
  { id: 'chickpeas', nameHe: 'גרגירי חומוס מבושלים', group: 'protein', portionG: 150, portionLabel: 'מנה', per100: { kcal: 164, protein: 8.9, carbs: 27, fat: 2.6 } },
  { id: 'protein-powder', nameHe: 'אבקת חלבון', group: 'protein', portionG: 30, portionLabel: 'סקופ', per100: { kcal: 380, protein: 80, carbs: 8, fat: 4 } },
  { id: 'milk3', nameHe: 'חלב 3%', group: 'protein', portionG: 250, portionLabel: 'כוס', per100: { kcal: 61, protein: 3.3, carbs: 4.8, fat: 3.3 } },

  // --- פחמימות ---
  { id: 'bread-whole', nameHe: 'לחם מלא', group: 'carbs', portionG: 35, portionLabel: 'פרוסה', per100: { kcal: 247, protein: 13, carbs: 41, fat: 3.4 } },
  { id: 'pita', nameHe: 'פיתה', group: 'carbs', portionG: 70, portionLabel: 'פיתה', per100: { kcal: 275, protein: 9, carbs: 55, fat: 1.2 } },
  { id: 'rice', nameHe: 'אורז מבושל', group: 'carbs', portionG: 200, portionLabel: 'מנה', per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
  { id: 'pasta', nameHe: 'פסטה מבושלת', group: 'carbs', portionG: 200, portionLabel: 'מנה', per100: { kcal: 131, protein: 5, carbs: 25, fat: 1.1 } },
  { id: 'oats', nameHe: 'שיבולת שועל', group: 'carbs', portionG: 50, portionLabel: 'מנה', per100: { kcal: 389, protein: 17, carbs: 66, fat: 7 } },
  { id: 'potato', nameHe: 'תפוח אדמה אפוי', group: 'carbs', portionG: 180, portionLabel: 'בינוני', per100: { kcal: 93, protein: 2.5, carbs: 21, fat: 0.1 } },
  { id: 'banana', nameHe: 'בננה', group: 'carbs', portionG: 120, portionLabel: 'בננה', per100: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
  { id: 'dates', nameHe: 'תמרים', group: 'carbs', portionG: 40, portionLabel: 'חופן', per100: { kcal: 277, protein: 1.8, carbs: 75, fat: 0.2 } },
  { id: 'apple', nameHe: 'תפוח', group: 'carbs', portionG: 180, portionLabel: 'תפוח', per100: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 } },

  // --- שומנים ---
  { id: 'hummus-spread', nameHe: 'ממרח חומוס', group: 'fat', portionG: 50, portionLabel: 'מנה', per100: { kcal: 177, protein: 8, carbs: 14, fat: 10 } },
  { id: 'tahini', nameHe: 'טחינה גולמית', group: 'fat', portionG: 20, portionLabel: 'כף', per100: { kcal: 595, protein: 17, carbs: 21, fat: 54 } },
  { id: 'avocado', nameHe: 'אבוקדו', group: 'fat', portionG: 100, portionLabel: 'חצי', per100: { kcal: 160, protein: 2, carbs: 9, fat: 15 } },
  { id: 'almonds', nameHe: 'שקדים', group: 'fat', portionG: 30, portionLabel: 'חופן', per100: { kcal: 579, protein: 21, carbs: 22, fat: 50 } },
  { id: 'walnuts', nameHe: 'אגוזי מלך', group: 'fat', portionG: 30, portionLabel: 'חופן', per100: { kcal: 654, protein: 15, carbs: 14, fat: 65 } },
  { id: 'olive-oil', nameHe: 'שמן זית', group: 'fat', portionG: 15, portionLabel: 'כף', per100: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },

  // --- ירקות ---
  { id: 'salad', nameHe: 'סלט ירקות', group: 'veg', portionG: 200, portionLabel: 'קערה', per100: { kcal: 30, protein: 1.5, carbs: 6, fat: 0.2 } },
  { id: 'cooked-veg', nameHe: 'ירקות מוקפצים', group: 'veg', portionG: 200, portionLabel: 'מנה', per100: { kcal: 55, protein: 2, carbs: 8, fat: 2 } }
];

const FOOD_INDEX = Object.fromEntries(FOOD_DB.map(f => [f.id, f]));

const MEAL_SLOTS = [
  { id: 'breakfast', labelHe: 'ארוחת בוקר', icon: '🌅' },
  { id: 'snack1', labelHe: 'ארוחת ביניים', icon: '⏱️' },
  { id: 'lunch', labelHe: 'ארוחת צהריים', icon: '🍽️' },
  { id: 'snack2', labelHe: 'נשנוש', icon: '🥜' },
  { id: 'dinner', labelHe: 'ארוחת ערב', icon: '🌙' }
];

/** Macros for one logged item: a food id plus grams. */
function itemMacros(item) {
  const food = FOOD_INDEX[item.foodId];
  if (!food) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const f = item.grams / 100;
  return {
    kcal: Math.round(food.per100.kcal * f),
    protein: Math.round(food.per100.protein * f * 10) / 10,
    carbs: Math.round(food.per100.carbs * f * 10) / 10,
    fat: Math.round(food.per100.fat * f * 10) / 10
  };
}

function sumMacros(items) {
  return (items || []).reduce((a, it) => {
    const m = itemMacros(it);
    return { kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat };
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

function roundMacros(m) {
  return { kcal: Math.round(m.kcal), protein: Math.round(m.protein), carbs: Math.round(m.carbs), fat: Math.round(m.fat) };
}

/** All meals logged on one yyyy-mm-dd. */
function mealsForDate(iso) {
  return FORMA_DB.getMeals().filter(m => (m.date || m.createdAt || '').slice(0, 10) === iso);
}

function dayTotals(iso) {
  const meals = mealsForDate(iso);
  return roundMacros(sumMacros(meals.flatMap(m => m.items || [])));
}

/** Latest known bodyweight, or null. Never guessed. */
function currentWeightKg() {
  const logs = FORMA_DB.getBodyweightLogs();
  for (let i = logs.length - 1; i >= 0; i--) if (logs[i].weightKg != null) return logs[i].weightKg;
  return null;
}

/** Daily targets.
    Calories: only ever the user's own saved target. There is no height or age
    in this app, so a real TDEE cannot be computed — the app asks instead of
    inventing a number.
    Protein: the PRD's 1.4–2.0 g/kg range, anchored at 1.6, needs weight only. */
function nutritionTargets() {
  const settings = FORMA_DB.getSettings();
  const weight = currentWeightKg();
  const protein = proteinTargetRange(weight);
  const kcalTarget = settings.calorieTarget || null;

  return {
    weightKg: weight,
    kcalTarget,
    hasKcalTarget: !!kcalTarget,
    proteinTarget: protein.hasTarget ? protein.anchor : null,
    proteinLow: protein.hasTarget ? protein.low : null,
    proteinHigh: protein.hasTarget ? protein.high : null,
    hasProteinTarget: protein.hasTarget,
    // Carb/fat splits are only meaningful once calories are set; derived at a
    // conventional 30% fat / remainder carbs once both calories and protein exist.
    fatTarget: kcalTarget ? Math.round((kcalTarget * 0.30) / 9) : null,
    carbTarget: (kcalTarget && protein.hasTarget)
      ? Math.round((kcalTarget - protein.anchor * 4 - (kcalTarget * 0.30)) / 4)
      : null
  };
}

function saveCalorieTarget(kcal) {
  FORMA_DB.saveSettings({ calorieTarget: kcal || null });
}

/** Swap suggestion: another food in the same group with a similar calorie load. */
function swapOptions(foodId, limit) {
  const food = FOOD_INDEX[foodId];
  if (!food) return [];
  return FOOD_DB
    .filter(f => f.id !== foodId && f.group === food.group)
    .sort((a, b) => Math.abs(a.per100.kcal - food.per100.kcal) - Math.abs(b.per100.kcal - food.per100.kcal))
    .slice(0, limit || 4);
}

/** Last 7 days of calorie totals, oldest first — for the nutrition trend strip.
    Uses local dates so a meal logged just after midnight lands on the right day. */
function recentDayTotals(days) {
  const out = [];
  for (let i = (days || 7) - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = localDateKey(d);
    out.push({ date: iso, ...dayTotals(iso) });
  }
  return out;
}

/** Today, in the user's own timezone. */
function todayKey() { return localDateKey(new Date()); }
