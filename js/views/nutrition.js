/* FORMA — nutrition dashboard: daily macro targets, meal-by-meal logging,
   swap suggestions, and an optional photo per meal.

   Every number on this screen is either logged by the user or computed from
   published per-100g values. Nothing is estimated from a photo — there is no
   vision model wired in, and the UI says so rather than inventing macros. */

FORMA_VIEWS.nutrition = {
  render(params, container) {
    const selected = params.date || todayKey();
    const targets = nutritionTargets();
    const totals = dayTotals(selected);
    const meals = mealsForDate(selected);
    const bySlot = Object.fromEntries(meals.map(m => [m.slot, m]));

    container.innerHTML = `
      <div class="view">
        ${topbar('תזונה', { back: true })}

        <div class="day-strip mt-2" id="day-strip">
          ${last7Days().map(d => dayDot(d, d.iso === selected)).join('')}
        </div>

        ${kcalHero(totals, targets)}

        <div class="grid-3 mt-3">
          ${macroTile('חלבון', totals.protein, targets.proteinTarget, 'ג׳')}
          ${macroTile('פחמימה', totals.carbs, targets.carbTarget, 'ג׳')}
          ${macroTile('שומן', totals.fat, targets.fatTarget, 'ג׳')}
        </div>

        ${!targets.hasKcalTarget ? `<div class="card mt-4">
          <p class="body-sm">כדי להראות אחוזים אמיתיים צריך יעד קלוריות. אין באפליקציה גובה וגיל, ולכן היא לא מחשבת לך מספר בעצמה — עדיף שתקבע אותו מול מי שמלווה אותך.</p>
          <button class="btn btn--outline w-full mt-3" id="set-kcal">קבע יעד קלוריות</button>
        </div>` : ''}
        ${!targets.hasProteinTarget ? `<div class="card mt-3">
          <p class="body-sm">יעד החלבון מחושב לפי משקל גוף (1.4–2.0 גרם לק״ג). עוד לא נרשם משקל, ולכן אין כאן יעד.</p>
        </div>` : ''}

        <p class="h3 mt-6">הארוחות שלך</p>
        <div class="mt-3">
          ${MEAL_SLOTS.map(s => mealCard(s, bySlot[s.id])).join('')}
        </div>

        <p class="body-sm mt-4 muted">ערכי המזון הם ערכי ייחוס תקניים ל-100 גרם, מעוגלים — הם טובים למעקב מגמה, לא מדידה מדויקת של המוצר הספציפי.</p>
      </div>
    `;
    wireTopbarBack(container, '/coach');

    container.querySelectorAll('[data-date]').forEach(el => el.addEventListener('click',
      () => FORMA_ROUTER.navigate(`/coach/nutrition?date=${el.dataset.date}`)));

    container.querySelectorAll('[data-add-slot]').forEach(el => el.addEventListener('click',
      () => FORMA_ROUTER.navigate(`/coach/nutrition/add?date=${selected}&slot=${el.dataset.addSlot}`)));

    container.querySelectorAll('[data-remove]').forEach(el => el.addEventListener('click', (e) => {
      e.stopPropagation();
      removeItem(selected, el.dataset.slot, Number(el.dataset.remove));
    }));

    container.querySelectorAll('[data-swap]').forEach(el => el.addEventListener('click', async (e) => {
      e.stopPropagation();
      await openSwapSheet(selected, el.dataset.slot, Number(el.dataset.swap));
    }));

    const kcalBtn = container.querySelector('#set-kcal');
    if (kcalBtn) kcalBtn.addEventListener('click', async () => {
      const v = await showInputModal({ title: 'יעד קלוריות יומי', placeholder: 'לדוגמה 2400', inputType: 'number' });
      const n = Number(v);
      if (n > 0) { saveCalorieTarget(Math.round(n)); FORMA_ROUTER.render(); }
    });
  }
};

function last7Days() {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    out.push({ iso: localDateKey(d), dayNum: d.getDate(), nameHe: WEEKDAY_NAMES_HE[d.getDay()].slice(0, 2) });
  }
  return out;
}

function dayDot(d, active) {
  return `<button class="day-dot" data-date="${d.iso}" aria-pressed="${active ? 'true' : 'false'}">
    <div class="dd-name">${esc(d.nameHe)}</div>
    <div class="dd-num ltr-num">${d.dayNum}</div>
  </button>`;
}

function kcalHero(totals, targets) {
  const pct = targets.hasKcalTarget ? Math.min(100, Math.round((totals.kcal / targets.kcalTarget) * 100)) : 0;
  return `<div class="card mt-4 text-center">
    <p class="eyebrow">קלוריות היום</p>
    <p class="mono ltr-num" style="font-size:40px;font-weight:800;color:var(--accent);line-height:1.15">${totals.kcal}</p>
    ${targets.hasKcalTarget
      ? `<p class="body-sm">מתוך <span class="ltr-num">${targets.kcalTarget}</span> · נותרו <span class="ltr-num">${Math.max(0, targets.kcalTarget - totals.kcal)}</span></p>
         <div class="macro-bar ${totals.kcal > targets.kcalTarget ? 'over' : ''}"><span style="width:${pct}%"></span></div>`
      : `<p class="body-sm muted">לא הוגדר יעד יומי</p>`}
  </div>`;
}

function macroTile(label, value, target, unit) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return `<div class="stat-tile">
    <div class="tile-label">${esc(label)}</div>
    <div class="tile-value ltr-num">${Math.round(value)}<span style="font-size:12px;color:var(--ink-400)"> ${esc(unit)}</span></div>
    ${target
      ? `<div class="tile-label ltr-num">מתוך ${target}</div><div class="macro-bar ${value > target ? 'over' : ''}"><span style="width:${pct}%"></span></div>`
      : `<div class="tile-label muted">אין יעד</div>`}
  </div>`;
}

function mealCard(slot, meal) {
  const items = meal?.items || [];
  const m = roundMacros(sumMacros(items));
  return `<div class="meal-card">
    <div class="row row--between">
      <p class="h3">${slot.icon} ${esc(slot.labelHe)}</p>
      <span class="body-sm mono ltr-num">${m.kcal} קק״ל</span>
    </div>
    ${items.length ? `<div class="mt-2">${items.map((it, i) => foodLine(it, i, slot.id)).join('')}</div>` : ''}
    <button class="btn btn--outline btn--sm w-full mt-3" data-add-slot="${slot.id}">${ICONS.plus} הוסף מזון</button>
  </div>`;
}

function foodLine(item, index, slotId) {
  const food = FOOD_INDEX[item.foodId];
  const m = itemMacros(item);
  return `<div class="food-line">
    <span class="fl-name">${esc(food?.nameHe || 'לא ידוע')} <span class="muted ltr-num">${item.grams} ג׳</span></span>
    <span class="fl-kcal ltr-num">${m.kcal}</span>
    <button class="icon-mini" data-swap="${index}" data-slot="${slotId}" title="החלף">${ICONS.swap}</button>
    <button class="icon-mini" data-remove="${index}" data-slot="${slotId}" title="הסר">${ICONS.trash}</button>
  </div>`;
}

function removeItem(dateIso, slotId, index) {
  const meal = mealsForDate(dateIso).find(m => m.slot === slotId);
  if (!meal) return;
  const items = (meal.items || []).filter((_, i) => i !== index);
  FORMA_DB.updateMeal(meal.id, { items });
  FORMA_ROUTER.render();
}

async function openSwapSheet(dateIso, slotId, index) {
  const meal = mealsForDate(dateIso).find(m => m.slot === slotId);
  const item = meal?.items?.[index];
  if (!item) return;
  const options = swapOptions(item.foodId, 5);
  if (!options.length) { FORMA_APP.toast('אין חלופה מתאימה בקבוצה הזו'); return; }

  const picked = await showListModal({
    title: `החלפה ל${FOOD_INDEX[item.foodId]?.nameHe || ''}`,
    options: options.map(f => ({
      value: f.id,
      title: f.nameHe,
      subtitle: `${f.portionG} ג׳ · ${Math.round(f.per100.kcal * (f.portionG / 100))} קק״ל`
    }))
  });
  if (!picked) return;

  const food = FOOD_INDEX[picked];
  const items = meal.items.map((it, i) => i === index ? { foodId: food.id, grams: food.portionG } : it);
  FORMA_DB.updateMeal(meal.id, { items });
  FORMA_ROUTER.render();
}

// ---------------------------------------------------------------------------
FORMA_VIEWS.nutritionAdd = {
  render(params, container) {
    const dateIso = params.date || todayKey();
    const slotId = params.slot || 'breakfast';
    const slot = MEAL_SLOTS.find(s => s.id === slotId) || MEAL_SLOTS[0];
    const groups = [
      { id: 'protein', labelHe: 'חלבון' },
      { id: 'carbs', labelHe: 'פחמימות' },
      { id: 'fat', labelHe: 'שומנים' },
      { id: 'veg', labelHe: 'ירקות' }
    ];

    container.innerHTML = `
      <div class="view">
        ${topbar(`הוספה ל${slot.labelHe}`, { back: true })}
        <input class="input" id="food-search" placeholder="חיפוש מזון" />
        <div id="food-list" class="mt-4">
          ${groups.map(g => `
            <p class="muscle-head">${esc(g.labelHe)}</p>
            ${FOOD_DB.filter(f => f.group === g.id).map(foodPickRow).join('')}
          `).join('')}
        </div>
      </div>
    `;
    wireTopbarBack(container, `/coach/nutrition?date=${dateIso}`);

    container.querySelector('#food-search').addEventListener('input', (e) => {
      const q = e.target.value.trim();
      container.querySelectorAll('[data-food]').forEach(row => {
        const name = row.dataset.name || '';
        row.style.display = !q || name.includes(q) ? '' : 'none';
      });
    });

    container.querySelectorAll('[data-food]').forEach(row => row.addEventListener('click', async () => {
      const food = FOOD_INDEX[row.dataset.food];
      const grams = await showInputModal({
        title: food.nameHe,
        label: `כמות בגרמים (מנה רגילה: ${food.portionG} ג׳)`,
        initialValue: String(food.portionG),
        inputType: 'number',
        confirmLabel: 'הוסף'
      });
      const n = Number(grams);
      if (!(n > 0)) return;
      const meal = mealsForDate(dateIso).find(m => m.slot === slotId);
      const items = [...(meal?.items || []), { foodId: food.id, grams: Math.round(n) }];
      FORMA_DB.upsertMealSlot(dateIso, slotId, items);
      FORMA_APP.toast('נוסף');
      FORMA_ROUTER.navigate(`/coach/nutrition?date=${dateIso}`);
    }));
  }
};

function foodPickRow(f) {
  const kcal = Math.round(f.per100.kcal * (f.portionG / 100));
  const p = Math.round(f.per100.protein * (f.portionG / 100));
  return `<div class="ex-row" data-food="${f.id}" data-name="${esc(f.nameHe)}">
    <div class="ex-body">
      <p class="ex-name">${esc(f.nameHe)}</p>
      <p class="ex-meta ltr-num">${f.portionG} ג׳ · ${kcal} קק״ל · ${p} ג׳ חלבון</p>
    </div>
    ${ICONS.plus}
  </div>`;
}
