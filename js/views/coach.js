/* FORMA — Coach hub: chat, goals, Body Atlas, nutrition (PRD section 9, 6, 8). */

const MUSCLE_DESCRIPTIONS = {
  chest: 'דחיפה אופקית וקירוב הזרוע; משפיע על עובי ורוחב חזותי של פלג הגוף העליון.',
  lats: 'משיכה של הזרוע מטה ואחורה; תורם למראה V וליציבה.',
  'mid-back': 'קירוב השכמות ויציבות; מסייע לכתפיים וללחיצות.',
  'front-delts': 'הראש הקדמי של הכתף תורם לדחיפה.',
  'side-delts': 'הראש הצדי של הכתף תורם לרוחב החזותי.',
  'rear-delts': 'הראש האחורי תורם לאיזון וליציבה.',
  biceps: 'מרפקים ומשיכות; נפח היד נבנה משילוב עבודה ישירה ועקיפה.',
  triceps: 'פשיטת מרפק ודחיפות; נפח היד נבנה משילוב עבודה ישירה ועקיפה.',
  quads: 'פשיטת ברך ובסיס כוח; יש לנהל את העומס יחד עם ריצה.',
  hamstrings: 'כיפוף ברך והרחקת ירך; קריטי לדדליפט רומני ולריצה.',
  calves: 'פשיטת קרסול; נפח נבנה בהדרגה עם טווח תנועה מלא.',
  core: 'העברת כוח וייצוב, לא רק "קוביות".'
};

FORMA_VIEWS.coachHub = {
  render(params, container) {
    const messages = FORMA_DB.getCoachMessages();
    const last = messages[messages.length - 1];
    container.innerHTML = `
      <div class="view">
        <p class="eyebrow">Coach</p>
        <h1 class="h1">המאמן שלך</h1>

        <div class="card mt-4 clickable" id="open-chat">
          <p class="body-lg">${last ? esc(last.content).slice(0, 90) : 'שאל אותי מה לעשות היום, למה תרגיל בתוכנית, או מה כדאי לאכול אחרי אימון.'}</p>
          <p class="body-sm mt-2" style="color:var(--accent);font-weight:700">פתח שיחה ${ICONS.chevronStart}</p>
        </div>

        <div class="stack mt-5">
          <button class="option" data-go="/coach/goals" aria-pressed="false"><div class="flex-1"><p class="body-lg" style="font-weight:700">יעדים</p><p class="body-sm">המטרה המרכזית והמשנית שלך</p></div>${ICONS.chevronStart}</button>
          <button class="option" data-go="/coach/body-atlas" aria-pressed="false"><div class="flex-1"><p class="body-lg" style="font-weight:700">מפת גוף</p><p class="body-sm">מה עבד השבוע ומה לא</p></div>${ICONS.chevronStart}</button>
          <button class="option" data-go="/coach/nutrition" aria-pressed="false"><div class="flex-1"><p class="body-lg" style="font-weight:700">תזונה</p><p class="body-sm">אבני ארוחה מותאמות לצמחונות</p></div>${ICONS.chevronStart}</button>
        </div>
      </div>
    `;
    container.querySelector('#open-chat').addEventListener('click', () => FORMA_ROUTER.navigate('/coach/chat'));
    container.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => FORMA_ROUTER.navigate(el.dataset.go)));
  }
};

// ---------------------------------------------------------------------------
FORMA_VIEWS.coachChat = {
  render(params, container) {
    const pendingContext = JSON.parse(sessionStorage.getItem('forma:coach:context') || 'null');
    sessionStorage.removeItem('forma:coach:context');

    container.innerHTML = `
      <div class="view" style="padding-bottom:140px">
        ${topbar('שיחה עם המאמן', { back: true })}
        <div class="chat-scroll" id="chat-scroll"></div>
        <div class="suggested-row" id="suggested-row">
          ${FORMA_COACH.QUICK_PROMPTS.map(p => `<button class="chip" data-prompt="${p.id}">${esc(p.textHe)}</button>`).join('')}
        </div>
      </div>
      <div class="chat-input-bar">
        <input class="input" id="chat-input" placeholder="שאל משהו..." />
        <button id="chat-send">${ICONS.send}</button>
      </div>
    `;
    wireTopbarBack(container, '/coach');

    const scroll = container.querySelector('#chat-scroll');
    FORMA_DB.getCoachMessages().forEach(m => scroll.appendChild(renderMsg(m)));
    scroll.scrollTop = scroll.scrollHeight;

    container.querySelectorAll('[data-prompt]').forEach(chip => chip.addEventListener('click', () => sendToCoach(null, chip.dataset.prompt)));
    container.querySelector('#chat-send').addEventListener('click', () => {
      const input = container.querySelector('#chat-input');
      if (input.value.trim()) { sendToCoach(input.value.trim()); input.value = ''; }
    });
    container.querySelector('#chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') container.querySelector('#chat-send').click();
    });

    if (pendingContext) sendToCoach(null, null, pendingContext);

    async function sendToCoach(text, intentId, contextOverride) {
      const userText = text || FORMA_COACH.QUICK_PROMPTS.find(p => p.id === intentId)?.textHe || 'שאלה';
      const userMsg = FORMA_DB.addCoachMessage({ role: 'user', content: userText });
      scroll.appendChild(renderMsg(userMsg));
      scroll.scrollTop = scroll.scrollHeight;

      const typingEl = document.createElement('div');
      typingEl.className = 'msg msg--coach msg--typing';
      typingEl.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>`;
      scroll.appendChild(typingEl);
      scroll.scrollTop = scroll.scrollHeight;

      const res = await FORMA_COACH.askSmart(userText, contextOverride || { intentId });
      typingEl.remove();

      const coachMsg = FORMA_DB.addCoachMessage({ role: 'coach', content: res.direct_answer, referencedData: res.reasoning_summary, confidence: res.confidence, actions: res.actions, safety: res.safety, source: res.source || 'local' });
      scroll.appendChild(renderMsg(coachMsg));
      scroll.scrollTop = scroll.scrollHeight;
    }

    function renderMsg(m) {
      const el = document.createElement('div');
      if (m.role === 'user') {
        el.className = 'msg msg--user';
        el.textContent = m.content;
      } else {
        el.className = 'msg msg--coach';
        el.innerHTML = `
          ${m.source === 'live' ? `<span class="live-badge">${ICONS.bolt} Gemini</span>` : ''}
          <p>${esc(m.content)}</p>
          ${m.referencedData?.length ? `<p class="reason">${m.referencedData.map(esc).join(' · ')}</p>` : ''}
          ${m.safety?.message && m.safety.message !== m.content ? `<p class="reason" style="color:var(--status-low-ink)">${esc(m.safety.message)}</p>` : ''}
          ${m.confidence ? `<p class="confidence">רמת ביטחון: ${confidenceHe(m.confidence)}</p>` : ''}
          ${m.actions?.filter(a => a.type !== 'none').length ? `<div class="suggested-row">${m.actions.filter(a => a.type !== 'none').map((a, i) => `<button class="chip" data-action-idx="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}
        `;
        const realActions = (m.actions || []).filter(a => a.type !== 'none');
        if (realActions.length) {
          setTimeout(() => {
            el.querySelectorAll('[data-action-idx]').forEach(btn => btn.addEventListener('click', () => runCoachAction(realActions[Number(btn.dataset.actionIdx)])));
          }, 0);
        }
      }
      return el;
    }
  }
};

function confidenceHe(c) { return { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' }[c] || c; }

function runCoachAction(action) {
  action = action || {};
  action.parameters = action.parameters || {};
  // Live (model-generated) actions carry a type/label but no internal IDs —
  // resolve today's actual scheduled day rather than trust a guessed one.
  if (!action.parameters.dayId && ['reduce_volume', 'reduce_load', 'keep', 'import_day'].includes(action.type)) {
    const today = todaysActivity();
    if (today.dayId) action.parameters.dayId = today.dayId;
  }
  switch (action.type) {
    case 'import_day':
      if (action.parameters.dayId) FORMA_ROUTER.navigate(`/training/day/${action.parameters.dayId}`);
      break;
    case 'schedule_measurement': FORMA_ROUTER.navigate('/progress/measure'); break;
    case 'nutrition_suggestion': FORMA_ROUTER.navigate('/coach/nutrition'); break;
    case 'swap_exercise':
      if (action.parameters?.exerciseId) FORMA_ROUTER.navigate(`/training/exercise/${action.parameters.exerciseId}`);
      else FORMA_APP.toast('אפשר לשאול על תרגיל ספציפי מתוך מסך התרגיל שלו.');
      break;
    case 'reduce_volume':
    case 'reduce_load':
    case 'keep':
      if (action.parameters?.dayId) {
        const day = FORMA_DB.getWorkoutDays().find(d => d.id === action.parameters.dayId);
        if (day) {
          const session = FORMA_DB.startSession({ dayId: day.id, exerciseIds: [...day.exerciseIds], adjustment: { action: action.type, message: 'התאמה לפי הבקשה שלך בצ׳אט.' } });
          FORMA_ROUTER.navigate(`/workout/live/${session.id}`);
        }
      }
      break;
    default: FORMA_APP.toast('נרשם.');
  }
}

// ---------------------------------------------------------------------------
FORMA_VIEWS.goals = {
  render(params, container) {
    const profile = FORMA_DB.getProfile();
    container.innerHTML = `
      <div class="view">
        ${topbar('יעדים', { back: true })}
        <div class="card">
          <p class="eyebrow">יעד מרכזי</p>
          <p class="h3 mt-1">${goalLabel(profile.primaryGoal) || 'עוד לא נבחר'}</p>
        </div>
        <div class="card mt-4">
          <p class="eyebrow">יעד משני</p>
          <p class="h3 mt-1">${goalLabel(profile.secondaryGoal) || 'עוד לא נבחר'}</p>
        </div>
        <button class="btn btn--outline w-full mt-5" id="edit-goals">ערוך יעדים</button>
      </div>
    `;
    wireTopbarBack(container, '/coach');
    container.querySelector('#edit-goals').addEventListener('click', () => FORMA_ROUTER.navigate('/onboarding?step=goals'));
  }
};

function goalLabel(id) {
  const map = { muscle: 'בניית שריר', waist: 'ירידה בהיקף הטבור', strength: 'שיפור כוח', hybrid: 'שילוב כוח וריצה', routine: 'חזרה לשגרה' };
  return id ? map[id] : null;
}

// ---------------------------------------------------------------------------
FORMA_VIEWS.bodyAtlas = {
  render(params, container) {
    let view = 'front';
    container.innerHTML = `
      <div class="view">
        ${topbar('מפת גוף', { back: true })}
        <div class="chip-row" style="justify-content:center">
          <button class="chip" data-view="front" aria-pressed="true">קדמי</button>
          <button class="chip" data-view="back" aria-pressed="false">אחורי</button>
        </div>
        <div class="atlas-figure mt-4" id="atlas-figure"></div>
        <p class="body-sm text-center mt-2 muted">הצבעים מציינים מצב, לא ציון — גע באזור לפרטים.</p>
      </div>
    `;
    wireTopbarBack(container, '/coach');

    function paint() {
      container.querySelector('#atlas-figure').innerHTML = renderAtlasSvg(view);
      container.querySelectorAll('.muscle-zone').forEach(z => z.addEventListener('click', () => openZoneSheet(z.dataset.zone, view)));
    }
    container.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
      container.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true'); view = btn.dataset.view; paint();
    }));
    paint();
  }
};

function openZoneSheet(zoneKey, view) {
  const zones = view === 'back' ? ATLAS_ZONES_BACK : ATLAS_ZONES_FRONT;
  const zone = zones.find(z => z.key === zoneKey);
  const st = getZoneStatus(zone.muscles);
  const meta = ATLAS_STATUS_META[st.status];
  const exercises = FORMA_EXERCISES.filter(ex => zone.muscles.includes(ex.primary) || (ex.secondary || []).some(m => zone.muscles.includes(m)));

  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const sheet = document.createElement('div');
  sheet.className = 'atlas-sheet';
  sheet.innerHTML = `
    <div class="row row--between">
      <p class="h2">${esc(zone.labelHe)}</p>
      <button class="icon-btn" id="close-sheet">${ICONS.close}</button>
    </div>
    ${statusChip(meta.tone, meta.labelHe)}
    <p class="body-lg mt-3">${esc(zone.muscles.map(m => MUSCLE_DESCRIPTIONS[m] || '').filter(Boolean).join(' '))}</p>
    ${st.plannedSets != null ? `<p class="body-sm mt-2">${st.doneSets} מתוך ${st.plannedSets} סטים שבועיים בוצעו.</p>` : ''}
    ${exercises.length ? `<div class="stack stack--sm mt-3">${exercises.map(e => `<button class="option" data-open-ex="${e.id}"><span class="flex-1 body-lg">${esc(e.nameHe)}</span>${ICONS.chevronStart}</button>`).join('')}</div>` : `<p class="body-sm mt-3">אין עדיין תרגילים בתוכנית לאזור הזה.</p>`}
  `;
  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
  const close = () => { backdrop.remove(); sheet.remove(); };
  backdrop.addEventListener('click', close);
  sheet.querySelector('#close-sheet').addEventListener('click', close);
  sheet.querySelectorAll('[data-open-ex]').forEach(b => b.addEventListener('click', () => { close(); FORMA_ROUTER.navigate(`/training/exercise/${b.dataset.openEx}`); }));
}

// ---------------------------------------------------------------------------
/* The nutrition dashboard itself now lives in views/nutrition.js. This screen
   stays as the "what should I eat" idea list, separate from calorie tracking. */
FORMA_VIEWS.nutritionIdeas = {
  render(params, container) {
    container.innerHTML = `
      <div class="view">
        ${topbar('רעיונות לארוחות', { back: true })}
        <p class="body-sm">כל הרעיונות כאן צמחוניים ולא חריפים, לפי ההעדפות שלך.</p>
        <div class="stack mt-4">
          ${NUTRITION_STONES.map(s => `
            <div class="card">
              <p class="h3">${esc(s.nameHe)}</p>
              <p class="body-sm mt-1">${s.optionsHe.map(esc).join(' · ')}</p>
            </div>`).join('')}
        </div>
      </div>
    `;
    wireTopbarBack(container, '/coach/nutrition');
  }
};

FORMA_VIEWS.nutritionLog = {
  render(params, container) {
    container.innerHTML = `
      <div class="view">
        ${topbar('רישום ארוחה', { back: true })}
        <div class="media-frame">
          <input type="file" accept="image/*" capture="environment" id="meal-photo" style="display:none" />
          <button class="btn btn--outline" id="meal-photo-btn">${ICONS.camera} צלם ארוחה</button>
        </div>
        <div class="card mt-4">
          <p class="body-sm">זיהוי אוטומטי מתמונה עדיין לא מחובר בגרסה הזו — כדי לא להציג הערכה מזויפת. אפשר לתייג ידנית מה אכלת:</p>
        </div>
        <div class="chip-row mt-3" id="stone-chips">
          ${NUTRITION_STONES.map(s => `<button class="chip" data-stone="${s.id}">${esc(s.nameHe)}</button>`).join('')}
        </div>
        <textarea class="input mt-3" id="meal-note" placeholder="מה בדיוק אכלת?"></textarea>
        <button class="btn btn--primary w-full mt-4" id="save-meal">שמור</button>
      </div>
    `;
    wireTopbarBack(container, '/coach/nutrition');

    let photoFile = null, stone = null;
    container.querySelector('#meal-photo-btn').addEventListener('click', () => container.querySelector('#meal-photo').click());
    container.querySelector('#meal-photo').addEventListener('change', (e) => {
      photoFile = e.target.files[0];
      if (photoFile) FORMA_APP.toast('התמונה נשמרת מקומית, ללא ניתוח אוטומטי');
    });
    container.querySelectorAll('#stone-chips .chip').forEach(c => c.addEventListener('click', () => {
      container.querySelectorAll('#stone-chips .chip').forEach(x => x.setAttribute('aria-pressed', 'false'));
      c.setAttribute('aria-pressed', 'true'); stone = c.dataset.stone;
    }));
    container.querySelector('#save-meal').addEventListener('click', async () => {
      const id = FORMA_DB.uid('meal');
      if (photoFile) await FORMA_MEDIA.put(id, photoFile);
      FORMA_DB.addMeal({ id, date: new Date().toISOString().slice(0, 10), stone, note: container.querySelector('#meal-note').value || null, hasPhoto: !!photoFile });
      FORMA_APP.toast('נשמר');
      FORMA_ROUTER.navigate('/coach/nutrition');
    });
  }
};
