/* FORMA — keeping local data alive.

   THE RISK
   Everything FORMA knows — logged sets, measurements, recovery, meals, and the
   Gemini key — lives in this browser's localStorage/IndexedDB. WebKit clears a
   site's script-writable storage after 7 days of browser use without visiting
   the site (iOS 13.4+ / Safari 13.1+). For an app you might not open for a week
   between training blocks, that is a real risk of losing real history.

   THE MITIGATIONS, strongest first
   1. Install to the home screen. A home-screen web app is not Safari: it keeps
      its own days-of-use counter and Apple states first-party data there is not
      subject to the deletion. This is the actual fix on iOS.
   2. navigator.storage.persist(). On Chromium/Firefox this marks the origin as
      persistent so it survives eviction. Safari does not honour it the same way,
      which is why (1) matters most on iPhone.
   3. Export a JSON backup. Already in Settings; the only mitigation that
      survives losing the device entirely.

   Nothing here deletes or writes user data — it only asks the browser to keep
   what is already there, and reports honestly on whether it worked. */

const FORMA_STORAGE = (() => {

  /** Is the app running as an installed/home-screen app rather than a tab? */
  function isInstalled() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) return true;
      // iOS Safari's own, non-standard flag for home-screen web apps.
      if (navigator.standalone === true) return true;
    } catch (e) { /* matchMedia can throw in odd embeddings */ }
    return false;
  }

  function isIOS() {
    const ua = navigator.userAgent || '';
    // iPadOS 13+ reports as Mac; the touch-point check separates it from a desktop.
    return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }

  /** Has the browser already marked this origin's storage as persistent? */
  async function isPersisted() {
    try {
      if (!navigator.storage?.persisted) return null; // unsupported — unknown, not false
      return await navigator.storage.persisted();
    } catch (e) { return null; }
  }

  /** Ask the browser to keep this origin's data. Safe to call repeatedly:
      once granted it is a no-op, and a refusal is not an error condition. */
  async function requestPersistence() {
    try {
      if (!navigator.storage?.persist) return null;
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    } catch (e) { return null; }
  }

  /** Rough usage figures, for the settings screen. Null when unsupported. */
  async function usage() {
    try {
      if (!navigator.storage?.estimate) return null;
      const { usage: used, quota } = await navigator.storage.estimate();
      return { usedMb: Math.round((used || 0) / 1048576 * 10) / 10, quotaMb: Math.round((quota || 0) / 1048576) };
    } catch (e) { return null; }
  }

  /** A single honest verdict for the UI, plus what the user can do about it.
      `signals` exists so the branches can be exercised without a real iPhone;
      production callers pass nothing and get the live detectors. */
  async function status(signals) {
    const persisted = signals && 'persisted' in signals ? signals.persisted : await isPersisted();
    const installed = signals && 'installed' in signals ? signals.installed : isInstalled();
    const ios = signals && 'ios' in signals ? signals.ios : isIOS();

    // On iOS, installing is what actually protects the data; persist() is not
    // honoured the same way, so don't claim safety it can't deliver.
    if (ios && !installed) {
      return {
        tone: 'low',
        titleHe: 'הנתונים בסיכון',
        detailHe: 'ב-iPhone, ספארי מוחק נתונים של אתר שלא ביקרת בו שבוע. הוסף את FORMA למסך הבית כדי שזה לא יקרה.',
        actionHe: 'שתף → הוסף למסך הבית'
      };
    }
    if (ios && installed) {
      return {
        tone: 'good',
        titleHe: 'הנתונים מוגנים',
        detailHe: 'האפליקציה מותקנת במסך הבית, ולכן היא לא כפופה למחיקה האוטומטית של ספארי אחרי שבוע.',
        actionHe: null
      };
    }
    if (persisted === true) {
      return {
        tone: 'good',
        titleHe: 'הנתונים מוגנים',
        detailHe: 'הדפדפן סימן את האחסון כקבוע — הוא לא יימחק אוטומטית כשנגמר מקום.',
        actionHe: null
      };
    }
    if (persisted === false) {
      return {
        tone: 'mid',
        titleHe: 'אחסון רגיל',
        detailHe: 'הדפדפן עלול לפנות נתונים במצב לחץ אחסון. התקנה למסך הבית מקטינה את הסיכון, וייצוא JSON הוא גיבוי אמיתי.',
        actionHe: 'התקן למסך הבית'
      };
    }
    return {
      tone: 'mid',
      titleHe: 'לא ניתן לוודא',
      detailHe: 'הדפדפן הזה לא מדווח על מצב האחסון. כדאי לייצא גיבוי JSON מדי פעם.',
      actionHe: null
    };
  }

  /** Called once at boot. Never blocks the UI and never throws. */
  function init() {
    requestPersistence().catch(() => {});
  }

  return { init, status, usage, isInstalled, isIOS, isPersisted, requestPersistence };
})();
