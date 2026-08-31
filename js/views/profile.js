/* FORMA — profile: level, streak, monthly volume and achievements.

   Every tile reads from real logged work (see domain-gamification.js). Where a
   number can't be computed honestly — bodyweight change with only one reading —
   the tile says so instead of showing a confident zero. */

FORMA_VIEWS.profile = {
  render(params, container) {
    const profile = FORMA_DB.getProfile();
    const lvl = levelState();
    const streak = weekStreak();
    const month = sessionsThisMonth();
    const weight = weightDelta();
    const badges = achievementState();
    const unlocked = badges.filter(b => b.unlocked).length;

    container.innerHTML = `
      <div class="view">
        <div class="row row--between">
          <div>
            <p class="eyebrow">הפרופיל שלך</p>
            <h1 class="h1">היי ${esc(profile.displayName || '')}</h1>
          </div>
          <button class="icon-btn" id="settings-btn" title="הגדרות">${ICONS.settings}</button>
        </div>

        <div class="level-card mt-4">
          <div class="row row--between">
            <span style="font-weight:800;font-size:17px">רמה <span class="ltr-num">${lvl.level}</span></span>
            <span class="mono ltr-num" style="font-weight:700">${lvl.pct}%</span>
          </div>
          <div class="xp-track mt-3"><span class="xp-fill" style="width:${lvl.pct}%"></span></div>
          <p class="body-sm mt-2" style="color:inherit;opacity:.78">
            <span class="ltr-num">${lvl.intoLevel}</span> מתוך <span class="ltr-num">${lvl.levelSpan}</span> נקודות לרמה הבאה ·
            סה״כ <span class="ltr-num">${lvl.xp}</span>
          </p>
        </div>

        <div class="grid-2 mt-3">
          <div class="stat-tile">
            <div class="tile-icon">🔥</div>
            <div class="tile-value ltr-num">${streak.weeks}</div>
            <div class="tile-label">שבועות ברצף${!streak.activeThisWeek && streak.weeks > 0 ? ' (השבוע עוד פתוח)' : ''}</div>
          </div>
          <div class="stat-tile">
            <div class="tile-icon">💪</div>
            <div class="tile-value ltr-num">${month.total}</div>
            <div class="tile-label">אימונים החודש · ${month.strength} כוח, ${month.cardio} ריצה</div>
          </div>
          <div class="stat-tile">
            <div class="tile-icon">⚖️</div>
            <div class="tile-value ltr-num">${weight.latest != null ? weight.latest : '—'}</div>
            <div class="tile-label">${weight.latest != null ? 'ק״ג — משקל אחרון' : 'עוד לא נרשם משקל'}</div>
          </div>
          <div class="stat-tile">
            <div class="tile-icon">📈</div>
            <div class="tile-value ltr-num">${weight.hasDelta ? (weight.deltaKg > 0 ? '+' : '') + weight.deltaKg : '—'}</div>
            <div class="tile-label">${weight.hasDelta ? 'ק״ג מאז המדידה הראשונה' : 'צריך שתי מדידות להשוואה'}</div>
          </div>
        </div>

        <div class="row row--between mt-6">
          <p class="h3">ההישגים שלך</p>
          <span class="body-sm mono ltr-num">${unlocked}/${badges.length}</span>
        </div>
        <div class="badge-grid mt-3">
          ${badges.map(b => `<div class="badge ${b.unlocked ? 'unlocked' : 'locked'}">
            <div class="badge-icon">${b.icon}</div>
            <div class="badge-label">${esc(b.labelHe)}</div>
          </div>`).join('')}
        </div>

        <p class="body-sm mt-4 muted">רמות והישגים נגזרים מהאימונים שנרשמו בפועל — אין נקודות על פתיחת האפליקציה.</p>

        <button class="btn btn--outline w-full mt-6" id="measure-btn">${ICONS.ruler} מדידה חדשה</button>
      </div>
    `;

    container.querySelector('#settings-btn').addEventListener('click', () => FORMA_ROUTER.navigate('/settings'));
    container.querySelector('#measure-btn').addEventListener('click', () => FORMA_ROUTER.navigate('/progress/measure'));
  }
};
