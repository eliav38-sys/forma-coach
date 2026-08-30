/* FORMA — 20-second recovery check-in (PRD 5.7). Six quick taps, one score. */

FORMA_VIEWS.recoveryCheck = {
  render(params, container) {
    const answers = { sleepBucket: null, energy: null, soreness: null, stress: null, jointPain: null, hardEffort24h: null };

    const fields = [
      { key: 'sleepBucket', title: 'שינה', options: RECOVERY_SLEEP_BUCKETS.map(b => ({ v: b.id, t: b.labelHe })) },
      { key: 'energy', title: 'אנרגיה כללית', options: SCALE_5.map((t, i) => ({ v: i + 1, t })) },
      { key: 'soreness', title: 'כאבי שרירים', options: SOREN_5.map((t, i) => ({ v: i + 1, t })) },
      { key: 'stress', title: 'סטרס', options: STRESS_5.map((t, i) => ({ v: i + 1, t })) },
      { key: 'jointPain', title: 'כאב מפרקי או חריג', options: [{ v: 'none', t: 'ללא' }, { v: 'mild', t: 'קל' }, { v: 'sharp', t: 'חד / מחמיר' }] },
      { key: 'hardEffort24h', title: 'ריצה או אימון קשה ב-24 שעות האחרונות', options: [{ v: 'none', t: 'לא' }, { v: 'moderate', t: 'בינוני' }, { v: 'hard', t: 'קשה' }] }
    ];

    container.innerHTML = `
      <div class="view">
        ${topbar('בדיקת התאוששות', { back: true })}
        <p class="body-sm">שש שאלות מהירות, כדי להתאים את האימון של היום.</p>
        <div class="stack mt-5" id="fields"></div>
        <button class="btn btn--primary mt-6" id="save-recovery" disabled>שמור והמשך</button>
      </div>
    `;
    wireTopbarBack(container, '/today');

    const fieldsRoot = container.querySelector('#fields');
    fields.forEach(f => {
      const block = document.createElement('div');
      block.innerHTML = `<p class="h3">${esc(f.title)}</p><div class="chip-row mt-2">${f.options.map(o => `<button class="chip" data-key="${f.key}" data-val="${o.v}">${esc(o.t)}</button>`).join('')}</div>`;
      fieldsRoot.appendChild(block);
    });

    fieldsRoot.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const key = chip.dataset.key;
        fieldsRoot.querySelectorAll(`.chip[data-key="${key}"]`).forEach(c => c.setAttribute('aria-pressed', 'false'));
        chip.setAttribute('aria-pressed', 'true');
        answers[key] = isNaN(chip.dataset.val) ? chip.dataset.val : Number(chip.dataset.val);
        const saveBtn = container.querySelector('#save-recovery');
        saveBtn.disabled = Object.values(answers).some(v => v === null);
      });
    });

    container.querySelector('#save-recovery').addEventListener('click', () => {
      const rec = computeRecoveryScore(answers);
      FORMA_DB.addRecoveryLog({ raw: answers, score: rec.score, band: rec.band, reasons: rec.reasons });
      FORMA_APP.vibrate(20);
      FORMA_APP.toast(`ציון התאוששות: ${rec.score}`);
      FORMA_ROUTER.navigate('/today');
    });
  }
};
