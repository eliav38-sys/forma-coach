/* FORMA — local-first data layer.
   Structured data lives in localStorage (namespaced JSON per entity); binary
   media (progress/meal photos) lives in IndexedDB. No network calls happen
   here — see README for how this repository shape maps onto Supabase later.
   Everything the UI needs goes through FORMA_DB so a real backend can swap
   in behind the same functions without touching views. */

const FORMA_DB = (() => {
  const NS = 'forma:v1:';
  const KEYS = {
    profile: 'profile',
    goals: 'goals',
    workoutPlan: 'workoutPlan',
    workoutDays: 'workoutDays',
    exercises: 'exercisesOverride',
    sessions: 'workoutSessions',
    setLogs: 'setLogs',
    cardio: 'cardioSessions',
    recovery: 'recoveryLogs',
    measurements: 'measurements',
    coachMessages: 'coachMessages',
    coachDecisions: 'coachDecisions',
    userFeedback: 'userFeedback',
    meals: 'meals',
    settings: 'settings',
    meta: 'meta',
    bodyweight: 'bodyweightLogs'
  };

  function uid(prefix) {
    const rnd = Math.random().toString(36).slice(2, 9);
    return `${prefix || 'id'}_${Date.now().toString(36)}${rnd}`;
  }

  function nowIso() { return new Date().toISOString(); }

  function readRaw(key, fallback) {
    try {
      const v = localStorage.getItem(NS + key);
      if (v === null) return fallback;
      return JSON.parse(v);
    } catch (e) {
      console.warn('FORMA_DB read failed for', key, e);
      return fallback;
    }
  }
  function writeRaw(key, value) {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value));
      emit('change', { key });
      return true;
    } catch (e) {
      console.warn('FORMA_DB write failed for', key, e);
      emit('write-error', { key, error: e });
      return false;
    }
  }

  const listeners = {};
  function on(evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); return () => off(evt, cb); }
  function off(evt, cb) { if (listeners[evt]) listeners[evt] = listeners[evt].filter(f => f !== cb); }
  function emit(evt, payload) { (listeners[evt] || []).forEach(cb => { try { cb(payload); } catch (e) { console.error(e); } }); }

  // ---- seed / init -------------------------------------------------------
  // v2: full 3-day program, RPE (not RIR), weekly schedule, 6-week block.
  // v3: revised A/B/C split (chest+delts+tri / back+bi+rear-delt / legs+shoulders).
  // v4: Upper / Legs / Upper split, RIR-based intensity, core & hold work.
  const SCHEMA_VERSION = 4;
  function isSeeded() { return !!readRaw(KEYS.meta, {}).seededAt; }

  function seedIfNeeded() {
    if (!isSeeded()) {
      seedFresh();
      return;
    }
    const meta = readRaw(KEYS.meta, {});
    if ((meta.version || 1) < SCHEMA_VERSION) migrateProgram();
  }

  function seedFresh() {
    writeRaw(KEYS.measurements, FORMA_SEED.measurements);
    writeRaw(KEYS.workoutPlan, FORMA_SEED.workoutPlan);
    writeRaw(KEYS.workoutDays, FORMA_SEED.workoutDays);
    writeRaw(KEYS.sessions, []);
    writeRaw(KEYS.setLogs, []);
    writeRaw(KEYS.cardio, []);
    writeRaw(KEYS.recovery, []);
    writeRaw(KEYS.coachMessages, []);
    writeRaw(KEYS.coachDecisions, []);
    writeRaw(KEYS.userFeedback, []);
    writeRaw(KEYS.meals, []);
    writeRaw(KEYS.goals, []);
    writeRaw(KEYS.bodyweight, []);
    writeRaw(KEYS.settings, {
      theme: 'dark', vibration: true, onboardingDone: false, quietMode: false,
      weeklySchedule: FORMA_SEED.weeklySchedule, programBlockStartDate: nowIso().slice(0, 10)
    });
    writeRaw(KEYS.profile, {
      displayName: FORMA_SEED.user.display_name,
      locale: FORMA_SEED.user.locale,
      timezone: FORMA_SEED.user.timezone,
      diet: FORMA_SEED.user.diet,
      dislikes: FORMA_SEED.user.dislikes,
      weeklyTargets: FORMA_SEED.user.weekly_targets,
      age: null, heightCm: null, weightKg: null, experienceYears: null,
      equipment: null, injuries: null, sleepAvgHours: null, stressLevel: null,
      restingHr: null, avgSteps: null, runPaceMinKm: null, mealsPerDay: null,
      proteinHabit: null, primaryGoal: null, secondaryGoal: null
    });
    writeRaw(KEYS.meta, { seededAt: nowIso(), version: SCHEMA_VERSION });
  }

  /** Replaces the program (workout days/plan/schedule) with the current full
      program, without touching the user's own history — sessions, set logs,
      measurements, recovery logs, cardio and photos all stay exactly as they
      were. Runs every time the stored schema version is behind the app's —
      each program revision (new exercises, split, cues) lands this way. */
  function migrateProgram() {
    writeRaw(KEYS.workoutPlan, FORMA_SEED.workoutPlan);
    writeRaw(KEYS.workoutDays, FORMA_SEED.workoutDays);
    const settings = readRaw(KEYS.settings, {});
    writeRaw(KEYS.settings, {
      ...settings,
      weeklySchedule: settings.weeklySchedule || FORMA_SEED.weeklySchedule,
      programBlockStartDate: settings.programBlockStartDate || nowIso().slice(0, 10)
    });
    const profile = readRaw(KEYS.profile, {});
    writeRaw(KEYS.profile, { ...profile, weeklyTargets: FORMA_SEED.user.weekly_targets });
    localStorage.removeItem(NS + 'prescribed'); // retired in v2 — prescriptions now live on each day's exercises
    const meta = readRaw(KEYS.meta, {});
    writeRaw(KEYS.meta, { ...meta, version: SCHEMA_VERSION, migratedAt: nowIso() });
  }

  // ---- generic list helpers ----------------------------------------------
  function getAll(key) { return readRaw(key, []); }
  function saveAll(key, list) { return writeRaw(key, list); }
  function addItem(key, item) {
    const list = getAll(key);
    const withId = { id: item.id || uid(key), createdAt: nowIso(), ...item };
    list.push(withId);
    saveAll(key, list);
    return withId;
  }
  function updateItem(key, id, patch) {
    const list = getAll(key);
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: nowIso() };
    saveAll(key, list);
    return list[idx];
  }
  function removeItem(key, id) {
    const list = getAll(key).filter(x => x.id !== id);
    saveAll(key, list);
  }

  // ---- profile / settings -------------------------------------------------
  const getProfile = () => readRaw(KEYS.profile, {});
  const saveProfile = (patch) => writeRaw(KEYS.profile, { ...getProfile(), ...patch });
  const getSettings = () => readRaw(KEYS.settings, {});
  const saveSettings = (patch) => writeRaw(KEYS.settings, { ...getSettings(), ...patch });

  // ---- workout plan ---------------------------------------------------------
  const getWorkoutPlan = () => readRaw(KEYS.workoutPlan, null);
  const getWorkoutDays = () => readRaw(KEYS.workoutDays, []);
  const saveWorkoutDays = (days) => writeRaw(KEYS.workoutDays, days);
  const getExerciseOverrides = () => readRaw(KEYS.exercises, {});
  function getExercise(id) {
    const overrides = getExerciseOverrides();
    const base = FORMA_EXERCISE_INDEX[id];
    return base ? { ...base, ...(overrides[id] || {}) } : (overrides[id] || null);
  }
  /** The prescription (sets/reps/RPE/rest) for one exercise within one specific day. */
  function getDayExercise(dayId, exerciseId) {
    const day = getWorkoutDays().find(d => d.id === dayId);
    return day?.exercises?.find(e => e.exerciseId === exerciseId) || null;
  }
  /** Every day (name + prescription) that includes this exercise — an exercise can
      appear in more than one day with a different set count. */
  function findAllDayExercises(exerciseId) {
    return getWorkoutDays()
      .map(day => ({ day, prescription: day.exercises?.find(e => e.exerciseId === exerciseId) }))
      .filter(x => x.prescription);
  }
  /** Any one prescription for this exercise — for generic "what's the target here" lookups. */
  function findAnyDayExercise(exerciseId) {
    return findAllDayExercises(exerciseId)[0]?.prescription || null;
  }
  const getMuscleWeeklyTargets = () => FORMA_SEED.muscleWeeklyTargets;

  // ---- sessions / sets --------------------------------------------------
  const getSessions = () => getAll(KEYS.sessions);
  const startSession = (data) => addItem(KEYS.sessions, { status: 'active', startedAt: nowIso(), endedAt: null, ...data });
  const updateSession = (id, patch) => updateItem(KEYS.sessions, id, patch);
  const getSetLogs = (sessionId) => getAll(KEYS.setLogs).filter(s => !sessionId || s.sessionId === sessionId);
  const addSetLog = (log) => addItem(KEYS.setLogs, log);
  const updateSetLog = (id, patch) => updateItem(KEYS.setLogs, id, patch);
  function exerciseHistory(exerciseId, excludeSessionId) {
    return getAll(KEYS.setLogs)
      .filter(s => s.exerciseId === exerciseId && s.sessionId !== excludeSessionId && !s.warmup)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  // ---- cardio -------------------------------------------------------------
  const getCardio = () => getAll(KEYS.cardio);
  const addCardio = (c) => addItem(KEYS.cardio, c);

  // ---- recovery -----------------------------------------------------------
  const getRecoveryLogs = () => getAll(KEYS.recovery);
  const addRecoveryLog = (r) => addItem(KEYS.recovery, r);
  const latestRecovery = () => { const l = getRecoveryLogs(); return l.length ? l[l.length - 1] : null; };

  // ---- measurements ---------------------------------------------------------
  const getMeasurements = () => getAll(KEYS.measurements).slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const addMeasurement = (m) => addItem(KEYS.measurements, { isSeed: false, protocol: 'app', ...m });
  const updateMeasurement = (id, patch) => updateItem(KEYS.measurements, id, patch);

  // ---- bodyweight ---------------------------------------------------------
  const getBodyweightLogs = () => getAll(KEYS.bodyweight).slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const addBodyweightLog = (row) => addItem(KEYS.bodyweight, row);

  // ---- coach ----------------------------------------------------------------
  const getCoachMessages = () => getAll(KEYS.coachMessages);
  const addCoachMessage = (m) => addItem(KEYS.coachMessages, m);
  const getCoachDecisions = () => getAll(KEYS.coachDecisions);
  const addCoachDecision = (d) => addItem(KEYS.coachDecisions, { status: 'pending', ...d });
  const updateCoachDecision = (id, patch) => updateItem(KEYS.coachDecisions, id, patch);
  const addUserFeedback = (f) => addItem(KEYS.userFeedback, f);
  const getUserFeedback = () => getAll(KEYS.userFeedback);

  // ---- nutrition ----------------------------------------------------------
  const getMeals = () => getAll(KEYS.meals);
  const addMeal = (m) => addItem(KEYS.meals, m);
  const updateMeal = (id, patch) => updateItem(KEYS.meals, id, patch);
  function deleteMeal(id) {
    writeRaw(KEYS.meals, getAll(KEYS.meals).filter(m => m.id !== id));
  }
  /** Upserts the meal for one slot on one date, so a day has at most one
      "breakfast" row that accumulates items rather than many duplicates. */
  function upsertMealSlot(dateIso, slot, items) {
    const existing = getAll(KEYS.meals).find(m => (m.date || '').slice(0, 10) === dateIso && m.slot === slot);
    if (existing) { updateMeal(existing.id, { items }); return existing.id; }
    return addMeal({ date: dateIso, slot, items }).id;
  }

  // ---- export / wipe ----------------------------------------------------
  function exportAll() {
    const dump = {};
    Object.values(KEYS).forEach(k => { dump[k] = readRaw(k, null); });
    dump.exportedAt = nowIso();
    return dump;
  }
  function wipeAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(NS + k));
    emit('change', { key: 'all' });
  }
  function wipeCategory(cat) {
    if (cat === 'photos') { FORMA_MEDIA.clear(); return; }
    if (cat === 'nutrition') { writeRaw(KEYS.meals, []); return; }
    if (cat === 'all') { wipeAll(); }
  }

  return {
    KEYS, uid, nowIso, on, off,
    seedIfNeeded, isSeeded,
    getProfile, saveProfile, getSettings, saveSettings,
    getWorkoutPlan, getWorkoutDays, saveWorkoutDays,
    getDayExercise, findAllDayExercises, findAnyDayExercise, getMuscleWeeklyTargets,
    getExercise, getExerciseOverrides,
    getSessions, startSession, updateSession, getSetLogs, addSetLog, updateSetLog, exerciseHistory,
    getCardio, addCardio,
    getRecoveryLogs, addRecoveryLog, latestRecovery,
    getMeasurements, addMeasurement, updateMeasurement,
    getBodyweightLogs, addBodyweightLog,
    getCoachMessages, addCoachMessage, getCoachDecisions, addCoachDecision, updateCoachDecision,
    addUserFeedback, getUserFeedback,
    getMeals, addMeal, updateMeal, deleteMeal, upsertMealSlot,
    exportAll, wipeAll, wipeCategory
  };
})();

/* Minimal IndexedDB blob store for progress/meal photos. Feature-detected —
   if unavailable (locked-down file:// context) callers get null and the UI
   shows an honest "photo wasn't saved on this device" note instead of failing. */
const FORMA_MEDIA = (() => {
  const DB_NAME = 'forma-media';
  const STORE = 'blobs';
  let dbPromise = null;

  function open() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    return dbPromise;
  }

  async function put(id, blob) {
    const db = await open();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }
  async function get(id) {
    const db = await open();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }
  async function del(id) {
    const db = await open();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }
  async function clear() {
    const db = await open();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  return { put, get, del, clear, available: 'indexedDB' in window };
})();
