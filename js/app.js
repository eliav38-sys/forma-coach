/* FORMA — app bootstrap: shell chrome (nav + FAB), theme, vibration, toast. */

const FORMA_APP = (() => {
  const NAV_ITEMS = [
    { id: 'today', path: '/today', label: 'היום', icon: 'today' },
    { id: 'training', path: '/training', label: 'אימון', icon: 'training' },
    { id: 'progress', path: '/progress', label: 'התקדמות', icon: 'progress' },
    { id: 'coach', path: '/coach', label: 'Coach', icon: 'coach' }
  ];

  function renderNav(activePath) {
    const root = document.getElementById('nav-root');
    const activeId = NAV_ITEMS.find(n => activePath.startsWith(n.path))?.id || (activePath.startsWith('/onboarding') ? null : 'today');
    if (activePath.startsWith('/workout/live') || activePath.startsWith('/onboarding')) { root.innerHTML = ''; root.style.display = 'none'; return; }
    root.style.display = 'flex';
    root.innerHTML = NAV_ITEMS.map(n => `
      <button class="nav-item" data-nav="${n.path}" ${n.id === activeId ? 'aria-current="page"' : ''}>
        ${ICONS[n.icon]}<span>${n.label}</span>
      </button>`).join('');
    root.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => FORMA_ROUTER.navigate(btn.dataset.nav)));
  }

  function fabForPath(path) {
    if (path.startsWith('/workout/live') || path.startsWith('/onboarding')) return null;
    if (path.startsWith('/progress')) return { label: 'מדוד היקפים', icon: 'ruler', action: () => FORMA_ROUTER.navigate('/progress/measure') };
    if (path.startsWith('/coach/nutrition')) return { label: 'צלם ארוחה', icon: 'camera', action: () => FORMA_ROUTER.navigate('/coach/nutrition/log') };
    if (path.startsWith('/coach')) return { label: 'דבר עם המאמן', icon: 'chat', action: () => FORMA_ROUTER.navigate('/coach/chat') };
    const today = todaysActivity();
    if (today.kind === 'run-easy') return { label: 'רשום ריצה קלה', icon: 'bolt', action: () => FORMA_ROUTER.navigate('/training/cardio/new?type=easy') };
    if (today.kind === 'run-quality') return { label: 'רשום ריצת איכות', icon: 'flame', action: () => FORMA_ROUTER.navigate('/training/cardio/new?type=quality') };
    if (today.kind === 'recovery') return { label: 'רשום התאוששות פעילה', icon: 'heart', action: () => FORMA_ROUTER.navigate('/training/cardio/new') };
    if (today.kind === 'rest') return null;
    return { label: 'התחל אימון', icon: 'play', action: () => beginTodayWorkout() };
  }

  function renderFab(path) {
    const root = document.getElementById('fab-root');
    const cfg = fabForPath(path);
    if (!cfg) { root.innerHTML = ''; return; }
    root.innerHTML = `<button class="fab" id="global-fab">${ICONS[cfg.icon]}<span>${cfg.label}</span></button>`;
    document.getElementById('global-fab').addEventListener('click', cfg.action);
  }

  function beginTodayWorkout() {
    const today = todaysActivity();
    if (today.kind !== 'strength') { FORMA_ROUTER.navigate('/today'); return; }
    beginWorkout(today.dayId);
  }

  function beginWorkout(dayId) {
    const day = FORMA_DB.getWorkoutDays().find(d => d.id === dayId);
    if (!day || day.status === 'missing') { FORMA_ROUTER.navigate(`/training/day/${dayId}`); return; }
    const sessions = FORMA_DB.getSessions();
    let active = sessions.find(s => s.status === 'active' && s.dayId === dayId);
    if (!active) {
      const rec = FORMA_DB.latestRecovery();
      active = FORMA_DB.startSession({ dayId, exerciseIds: [...day.exerciseIds], recoveryId: rec ? rec.id : null });
    }
    FORMA_ROUTER.navigate(`/workout/live/${active.id}`);
  }

  function afterRouteChange(path) {
    renderNav(path);
    renderFab(path);
  }

  function toast(msg, ms = 2600) {
    const existing = document.getElementById('forma-toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'forma-toast';
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  function vibrate(pattern) {
    const settings = FORMA_DB.getSettings();
    if (settings.vibration === false) return;
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { } }
  }

  function applyTheme() {
    const settings = FORMA_DB.getSettings();
    if (settings.theme === 'dark' || settings.theme === 'light') {
      document.documentElement.setAttribute('data-theme', settings.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function greeting() {
    const h = new Date().getHours();
    const name = FORMA_DB.getProfile().displayName || '';
    if (h < 5) return `לילה טוב, ${name}`;
    if (h < 12) return `בוקר טוב, ${name}`;
    if (h < 18) return `צהריים טובים, ${name}`;
    return `ערב טוב, ${name}`;
  }

  function init() {
    FORMA_DB.seedIfNeeded();
    applyTheme();
    FORMA_ROUTER.add('/onboarding', FORMA_VIEWS.onboarding);
    FORMA_ROUTER.add('/today', FORMA_VIEWS.today);
    FORMA_ROUTER.add('/training', FORMA_VIEWS.training);
    FORMA_ROUTER.add('/training/day/:dayId', FORMA_VIEWS.trainingDay);
    FORMA_ROUTER.add('/training/exercise/:exerciseId', FORMA_VIEWS.exerciseDetail);
    FORMA_ROUTER.add('/training/cardio/new', FORMA_VIEWS.cardioForm);
    FORMA_ROUTER.add('/training/schedule', FORMA_VIEWS.trainingSchedule);
    FORMA_ROUTER.add('/workout/live/:sessionId', FORMA_VIEWS.workoutLive);
    FORMA_ROUTER.add('/workout/summary/:sessionId', FORMA_VIEWS.workoutSummary);
    FORMA_ROUTER.add('/progress', FORMA_VIEWS.progress);
    FORMA_ROUTER.add('/progress/measure', FORMA_VIEWS.measureFlow);
    FORMA_ROUTER.add('/progress/report', FORMA_VIEWS.weeklyReport);
    FORMA_ROUTER.add('/coach', FORMA_VIEWS.coachHub);
    FORMA_ROUTER.add('/coach/chat', FORMA_VIEWS.coachChat);
    FORMA_ROUTER.add('/coach/goals', FORMA_VIEWS.goals);
    FORMA_ROUTER.add('/coach/body-atlas', FORMA_VIEWS.bodyAtlas);
    FORMA_ROUTER.add('/coach/nutrition', FORMA_VIEWS.nutrition);
    FORMA_ROUTER.add('/coach/nutrition/log', FORMA_VIEWS.nutritionLog);
    FORMA_ROUTER.add('/settings', FORMA_VIEWS.settings);
    FORMA_ROUTER.add('/recovery-check', FORMA_VIEWS.recoveryCheck);

    const onboardingDone = FORMA_DB.getSettings().onboardingDone;
    if (!onboardingDone && !location.hash.startsWith('#/onboarding')) location.hash = '#/onboarding';

    FORMA_ROUTER.init(document.getElementById('view-root'));

    if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  return { init, afterRouteChange, toast, vibrate, greeting, beginWorkout, beginTodayWorkout, applyTheme, NAV_ITEMS };
})();

document.addEventListener('DOMContentLoaded', FORMA_APP.init);
