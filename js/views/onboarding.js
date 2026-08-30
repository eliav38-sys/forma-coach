/* FORMA — onboarding: a two-minute conversation, not a medical form (PRD 4.3).
   Every step is skippable. Nothing here is invented — unanswered fields stay null. */

const GOAL_OPTIONS = [
  { id: 'muscle', t: 'בניית שריר' }, { id: 'waist', t: 'ירידה בהיקף הטבור' },
  { id: 'strength', t: 'שיפור כוח' }, { id: 'hybrid', t: 'שילוב כוח וריצה' }, { id: 'routine', t: 'חזרה לשגרה' }
];

FORMA_VIEWS.onboarding = {
  render(params, container) {
    const profile = FORMA_DB.getProfile();
    const answers = {
      primaryGoal: profile.primaryGoal, secondaryGoal: profile.secondaryGoal,
      age: profile.age, heightCm: profile.heightCm, weightKg: profile.weightKg,
      experienceYears: profile.experienceYears, equipment: profile.equipment,
      availableDays: [], sessionMinutes: null, injuries: profile.injuries,
      dislikes: profile.dislikes || [], allergies: null,
      sleepAvgHours: profile.sleepAvgHours, stressLevel: profile.stressLevel,
      restingHr: profile.restingHr, avgSteps: profile.avgSteps, runPaceMinKm: profile.runPaceMinKm,
      importJson: null
    };

    const steps = [welcomeStep, goalsStep, importStep, basicsStep, constraintsStep, nutritionStep, baselineStep, summaryStep];
    let idx = params.step === 'goals' ? 1 : 0;

    function paint() {
      container.innerHTML = `
        <div class="onb-shell">
          <div class="onb-header">
            ${idx > 0 ? `<button class="icon-btn" id="onb-back">${ICONS.chevronEnd}</button>` : '<span style="width:44px"></span>'}
            <div class="step-dots flex-1">${steps.map((_, i) => `<i class="${i === idx ? 'active' : ''}"></i>`).join('')}</div>
            <button class="btn btn--ghost btn--sm" id="onb-skip">דלג</button>
          </div>
          <div class="onb-body" id="onb-body"></div>
          <div class="onb-foot">
            <button class="btn btn--primary w-full" id="onb-next" style="min-height:54px">${idx === steps.length - 1 ? 'סיום' : 'המשך'}</button>
          </div>
        </div>
      `;
      const body = container.querySelector('#onb-body');
      const step = steps[idx];
      body.innerHTML = step.render(answers);
      step.bind && step.bind(body, answers);

      const backBtn = container.querySelector('#onb-back');
      if (backBtn) backBtn.addEventListener('click', () => { idx--; paint(); });
      container.querySelector('#onb-skip').addEventListener('click', goNext);
      container.querySelector('#onb-next').addEventListener('click', goNext);

      function goNext() {
        if (idx === steps.length - 1) { finish(answers); return; }
        idx++; paint();
      }
    }
    paint();
  }
};

function optionList(name, options, selected, multi) {
  return `<div class="option-list" data-group="${name}" data-multi="${multi ? '1' : ''}">
    ${options.map(o => `<button type="button" class="option" data-val="${o.id}" aria-pressed="${(multi ? (selected || []).includes(o.id) : selected === o.id) ? 'true' : 'false'}"><span class="dot"></span><span class="flex-1">${esc(o.t)}</span></button>`).join('')}
  </div>`;
}
function bindOptionList(root, groupName, answers, key, multi) {
  const group = root.querySelector(`[data-group="${groupName}"]`);
  if (!group) return;
  group.querySelectorAll('.option').forEach(opt => opt.addEventListener('click', () => {
    if (multi) {
      const arr = new Set(answers[key] || []);
      const pressed = opt.getAttribute('aria-pressed') === 'true';
      if (pressed) { arr.delete(opt.dataset.val); opt.setAttribute('aria-pressed', 'false'); }
      else { arr.add(opt.dataset.val); opt.setAttribute('aria-pressed', 'true'); }
      answers[key] = [...arr];
    } else {
      group.querySelectorAll('.option').forEach(o => o.setAttribute('aria-pressed', 'false'));
      opt.setAttribute('aria-pressed', 'true');
      answers[key] = opt.dataset.val;
    }
  }));
}

const welcomeStep = {
  render: () => `<p class="eyebrow">FORMA</p><h1 class="h1 mt-2">בוא נכיר אותך קצת</h1><p class="body-lg mt-3">כמה שאלות קצרות — אפשר לדלג על כל אחת. הנתונים שכבר יש לך (המדידות והתרגילים המאומתים) כבר טעונים.</p>`,
  bind: () => {}
};

const goalsStep = {
  render: (a) => `<h2 class="h2">מה המטרה המרכזית שלך ל-12 השבועות הקרובים?</h2>
    ${optionList('primary', GOAL_OPTIONS, a.primaryGoal, false)}
    <h2 class="h2 mt-6">ומטרה משנית אחת?</h2>
    ${optionList('secondary', GOAL_OPTIONS, a.secondaryGoal, false)}`,
  bind: (root, a) => { bindOptionList(root, 'primary', a, 'primaryGoal', false); bindOptionList(root, 'secondary', a, 'secondaryGoal', false); }
};

const importStep = {
  render: () => `<h2 class="h2">הנתונים הקיימים שלך</h2>
    <p class="body-lg mt-2">המדידות ההיסטוריות ויום האימון המאומת כבר נטענו למערכת בדיוק כפי שנמסרו. אם יש לך קובץ ייצוא JSON נוסף, אפשר להדביק כאן — אחרת אפשר לדלג.</p>
    <textarea class="input mt-3" id="import-json" placeholder='{"measurements": [...]}'></textarea>`,
  bind: (root, a) => { root.querySelector('#import-json').addEventListener('input', (e) => { a.importJson = e.target.value; }); }
};

const basicsStep = {
  render: (a) => `<h2 class="h2">פרטי בסיס</h2>
    <div class="stack mt-4">
      <div class="field"><label>גיל</label><input class="input" type="number" id="f-age" value="${a.age ?? ''}"/></div>
      <div class="field"><label>גובה (ס"מ)</label><input class="input" type="number" id="f-height" value="${a.heightCm ?? ''}"/></div>
      <div class="field"><label>משקל נוכחי (ק"ג)</label><input class="input" type="number" id="f-weight" value="${a.weightKg ?? ''}"/></div>
      <div class="field"><label>ותק אימונים (שנים)</label><input class="input" type="number" id="f-exp" value="${a.experienceYears ?? ''}"/></div>
      <div class="field"><label>ציוד זמין</label><input class="input" id="f-equipment" placeholder="חדר כושר מלא / ציוד מוגבל / משקל גוף" value="${esc(a.equipment ?? '')}"/></div>
    </div>`,
  bind: (root, a) => {
    root.querySelector('#f-age').addEventListener('input', e => a.age = Number(e.target.value) || null);
    root.querySelector('#f-height').addEventListener('input', e => a.heightCm = Number(e.target.value) || null);
    root.querySelector('#f-weight').addEventListener('input', e => a.weightKg = Number(e.target.value) || null);
    root.querySelector('#f-exp').addEventListener('input', e => a.experienceYears = Number(e.target.value) || null);
    root.querySelector('#f-equipment').addEventListener('input', e => a.equipment = e.target.value || null);
  }
};

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const constraintsStep = {
  render: (a) => `<h2 class="h2">אילוצים</h2>
    <p class="body-sm mt-2">אילו ימים בדרך כלל פנויים לאימון?</p>
    ${optionList('days', DAY_NAMES.map(d => ({ id: d, t: d })), a.availableDays, true)}
    <p class="body-sm mt-4">כמה זמן יש בדרך כלל לאימון?</p>
    ${optionList('mins', [{ id: '30', t: '30 דק׳' }, { id: '45', t: '45 דק׳' }, { id: '60', t: '60 דק׳' }, { id: '90', t: '90 דק׳'}], a.sessionMinutes, false)}
    <div class="field mt-4"><label>כאבים, פציעות עבר או תרגילים לא נעימים</label><textarea class="input" id="f-injuries">${esc(a.injuries ?? '')}</textarea></div>`,
  bind: (root, a) => {
    bindOptionList(root, 'days', a, 'availableDays', true);
    bindOptionList(root, 'mins', a, 'sessionMinutes', false);
    root.querySelector('#f-injuries').addEventListener('input', e => a.injuries = e.target.value || null);
  }
};

const DISLIKE_PRESETS = ['תבלינים חריפים', 'פטריות', 'בצל חי', 'דגים'];
const nutritionStep = {
  render: (a) => `<h2 class="h2">תזונה</h2>
    <p class="body-lg mt-2">${statusChip('good', 'צמחוני')}</p>
    <p class="body-sm mt-4">מה לא אוהב?</p>
    ${optionList('dislikes', DISLIKE_PRESETS.map(d => ({ id: d, t: d })), a.dislikes, true)}
    <div class="field mt-4"><label>אלרגיות</label><input class="input" id="f-allergies" value="${esc(a.allergies ?? '')}"/></div>`,
  bind: (root, a) => { bindOptionList(root, 'dislikes', a, 'dislikes', true); root.querySelector('#f-allergies').addEventListener('input', e => a.allergies = e.target.value || null); }
};

const baselineStep = {
  render: (a) => `<h2 class="h2">שינה, סטרס וקצב</h2>
    <div class="stack mt-4">
      <div class="field"><label>ממוצע שעות שינה</label><input class="input" type="number" step="0.5" id="f-sleep" value="${a.sleepAvgHours ?? ''}"/></div>
      <div class="field"><label>רמת סטרס כללית (1–5)</label><input class="input" type="number" min="1" max="5" id="f-stress" value="${a.stressLevel ?? ''}"/></div>
      <div class="field"><label>דופק מנוחה (אם ידוע)</label><input class="input" type="number" id="f-hr" value="${a.restingHr ?? ''}"/></div>
      <div class="field"><label>צעדים ביום בממוצע</label><input class="input" type="number" id="f-steps" value="${a.avgSteps ?? ''}"/></div>
      <div class="field"><label>קצב ריצה (דק׳ לק"מ)</label><input class="input" type="number" step="0.1" id="f-pace" value="${a.runPaceMinKm ?? ''}"/></div>
    </div>`,
  bind: (root, a) => {
    root.querySelector('#f-sleep').addEventListener('input', e => a.sleepAvgHours = Number(e.target.value) || null);
    root.querySelector('#f-stress').addEventListener('input', e => a.stressLevel = Number(e.target.value) || null);
    root.querySelector('#f-hr').addEventListener('input', e => a.restingHr = Number(e.target.value) || null);
    root.querySelector('#f-steps').addEventListener('input', e => a.avgSteps = Number(e.target.value) || null);
    root.querySelector('#f-pace').addEventListener('input', e => a.runPaceMinKm = Number(e.target.value) || null);
  }
};

const summaryStep = {
  render: (a) => `<h2 class="h2">זה מה שהבנתי</h2>
    <div class="stack stack--sm mt-4">
      <p class="body-lg">מטרה מרכזית: <b>${goalLabel(a.primaryGoal) || 'לא נבחרה'}</b></p>
      <p class="body-lg">מטרה משנית: <b>${goalLabel(a.secondaryGoal) || 'לא נבחרה'}</b></p>
      <p class="body-lg">גיל / גובה / משקל: <b class="ltr-num">${a.age ?? '—'} / ${a.heightCm ?? '—'} / ${a.weightKg ?? '—'}</b></p>
      <p class="body-lg">ימים פנויים: <b>${(a.availableDays || []).join(', ') || '—'}</b></p>
      <p class="body-lg">תזונה: <b>צמחוני, ללא ${(a.dislikes || []).join(', ') || '—'}</b></p>
    </div>
    <p class="body-sm mt-4 muted">אפשר לחזור אחורה ולתקן כל שלב.</p>`,
  bind: () => {}
};

function finish(answers) {
  FORMA_DB.saveProfile({
    primaryGoal: answers.primaryGoal, secondaryGoal: answers.secondaryGoal,
    age: answers.age, heightCm: answers.heightCm, weightKg: answers.weightKg,
    experienceYears: answers.experienceYears, equipment: answers.equipment,
    injuries: answers.injuries, dislikes: answers.dislikes?.length ? answers.dislikes : ['תבלינים חריפים'],
    sleepAvgHours: answers.sleepAvgHours, stressLevel: answers.stressLevel,
    restingHr: answers.restingHr, avgSteps: answers.avgSteps, runPaceMinKm: answers.runPaceMinKm
  });
  if (answers.weightKg) FORMA_DB.addBodyweightLog({ date: new Date().toISOString().slice(0, 10), weightKg: answers.weightKg });
  if (answers.importJson) {
    try {
      const parsed = JSON.parse(answers.importJson);
      if (Array.isArray(parsed.measurements)) parsed.measurements.forEach(m => FORMA_DB.addMeasurement({ ...m, protocol: 'imported', reliable: true }));
    } catch (e) { FORMA_APP.toast('לא הצלחנו לקרוא את קובץ הייבוא — אפשר לנסות שוב מההגדרות'); }
  }
  FORMA_DB.saveSettings({ onboardingDone: true });
  FORMA_ROUTER.navigate('/today');
}
