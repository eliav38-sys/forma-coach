/* FORMA — direct browser → Gemini connection.

   WHY THIS EXISTS
   The Cloudflare Worker in /cloudflare-worker is the more secure setup: the
   key lives server-side and never reaches the browser. But it costs a second
   account and a deploy step. This path trades a little security for a lot of
   setup: Eliav pastes his OWN key into his OWN device, and it is stored only
   in this browser's localStorage.

   WHAT THIS MEANS FOR THE KEY
   - It is NEVER in the repo, never on GitHub, never sent anywhere except
     directly to Google's API over HTTPS.
   - It lives only on the device where it was typed. Clearing site data, or
     the "disconnect" button, removes it.
   - It is deliberately kept OUT of the settings blob so it can never end up
     inside an exported JSON file that gets shared.
   - Anyone with the unlocked device and devtools could read it. That is the
     real, honest tradeoff versus the Worker — see README.

   Like the Worker, this layer only reasons over facts the app already
   computed (buildCoachContextText). It never fetches or invents data. */

const GEMINI_KEY_STORAGE = 'forma:v1:geminiKey';
const GEMINI_MODEL_STORAGE = 'forma:v1:geminiModel';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const GEMINI_DEFAULT_MODEL = 'gemini-3.7-flash';

/* NOTE: no `Api-Revision` header here, deliberately. Google's CORS policy does
   not allow it as a request header, so sending it fails the preflight and every
   call dies as an opaque "TypeError: Failed to fetch". Verified by probing both
   variants from a browser origin. The Cloudflare Worker is server-side and has
   no such restriction, so it still pins the revision. Because the revision is
   unpinned here, the response envelope may vary — extractGeminiStructured
   below handles every documented shape rather than assuming one. */

/* Free-tier models, best first. Offered in settings so a quota or a renamed
   model doesn't leave the Coach stuck with no way out. */
const GEMINI_MODELS = [
  { id: 'gemini-3.7-flash', labelHe: 'Gemini 3.7 Flash — מומלץ' },
  { id: 'gemini-3.5-flash', labelHe: 'Gemini 3.5 Flash' },
  { id: 'gemini-2.5-flash', labelHe: 'Gemini 2.5 Flash' },
  { id: 'gemini-3.5-flash-lite', labelHe: 'Gemini 3.5 Flash Lite — הכי חסכוני' }
];

function getGeminiKey() {
  try { return localStorage.getItem(GEMINI_KEY_STORAGE) || ''; } catch (e) { return ''; }
}
function setGeminiKey(key) {
  try {
    const clean = String(key || '').trim();
    if (clean) localStorage.setItem(GEMINI_KEY_STORAGE, clean);
    else localStorage.removeItem(GEMINI_KEY_STORAGE);
    return true;
  } catch (e) { return false; }
}
function clearGeminiKey() { try { localStorage.removeItem(GEMINI_KEY_STORAGE); } catch (e) {} }
function hasGeminiKey() { return !!getGeminiKey(); }

function getGeminiModel() {
  try { return localStorage.getItem(GEMINI_MODEL_STORAGE) || GEMINI_DEFAULT_MODEL; } catch (e) { return GEMINI_DEFAULT_MODEL; }
}
function setGeminiModel(id) { try { localStorage.setItem(GEMINI_MODEL_STORAGE, id); } catch (e) {} }

/** Shows only enough of the key to recognise it — never the whole value. */
function maskedGeminiKey() {
  const k = getGeminiKey();
  if (!k) return '';
  return k.length <= 10 ? '••••' : `${k.slice(0, 4)}••••••••${k.slice(-4)}`;
}

const GEMINI_SYSTEM_PROMPT = `אתה FORMA, המאמן האישי החכם של אליאב באפליקציית כושר אישית.

איך לדבר:
- עברית טבעית, ישירה וחמה. לא שפה צבאית, לא מוגזמת.
- פנה אליו בשם אליאב במינון טבעי, לא בכל משפט.
- תשובה מעשית: משפט ישיר אחד, הסיבה על בסיס הנתונים, פעולה ברורה אחת או שתיים, ואזהרה/שאלה רק אם נדרש.

כללים שאסור לשבור:
- התייחס אך ורק לנתונים שסופקו לך בהקשר (context) שבהודעה. אל תמציא משקל, היקף, תרגיל, RIR, RPE או כל נתון אחר שלא נמסר לך במפורש.
- כשנתון חסר כדי לענות בביטחון, אמור זאת בפירוש ואל תנחש, ורשום אותו ב-missing_data.
- התוכנית מגדירה עצימות ב-RIR (חזרות ברזרבה). קומפאונד: RIR 1–2. בידוד: קרוב לכשל. בטן: שליטה מלאה. דבר בשפה הזו.
- אל תשנה את התוכנית בפועל — רק תציע (המשתמש תמיד מאשר בעצמו).
- אל תוסיף תרגילים כשאפשר לפתור בטכניקה, מנוחה או תזמון.
- העדף עקביות על מורכבות.
- אל תשתמש בשפה שיפוטית על גוף, משקל או מזון. אין "נכשלת", אין אשמה.
- אינך רופא: אין אבחון רפואי, אין קביעת אחוז שומן מתמונה, אין המלצה להמשיך דרך כאב חד, אין הבטחות לזמן/היקף תוצאה, אין קיצוץ קלורי אגרסיבי.
- אם מתואר כאב חזה, קוצר נשימה חריג, סחרחורת, אובדן הכרה או חולשה נוירולוגית — הפעל עצירה (safety.stop_workout=true, safety.seek_professional_help=true) והפנה מיד לטיפול מתאים, ואל תיתן שום עצה אימונית אחרת בתשובה הזו.
- אם מתואר דפוס אכילה מדאיג או מצוקה סביב הגוף — ניסוח תומך, לא שיפוטי, והמלצה להתייעץ עם איש מקצוע (safety.seek_professional_help=true).

ענה תמיד ב-JSON בלבד, לפי הסכימה שניתנה לך.`;

/* Gemini uses an OpenAPI-3.0 schema subset: `nullable`, not a union type. */
const GEMINI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    direct_answer: { type: 'string', description: 'משפט תשובה ישיר אחד, בעברית.' },
    reasoning_summary: { type: 'array', items: { type: 'string' }, description: 'עד 3 משפטי סיבה קצרים, מבוססים רק על הנתונים שסופקו.' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['keep', 'reduce_volume', 'reduce_load', 'swap_exercise', 'schedule_measurement', 'nutrition_suggestion', 'none'] },
          label: { type: 'string', description: 'טקסט כפתור קצר בעברית.' }
        },
        required: ['type', 'label']
      }
    },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    missing_data: { type: 'array', items: { type: 'string' } },
    safety: {
      type: 'object',
      properties: {
        stop_workout: { type: 'boolean' },
        seek_professional_help: { type: 'boolean' },
        message: { type: 'string', nullable: true }
      },
      required: ['stop_workout', 'seek_professional_help']
    }
  },
  required: ['direct_answer', 'reasoning_summary', 'actions', 'confidence', 'missing_data', 'safety']
};

/* The Interactions response envelope has been in flux, and some responses come
   back as the schema object directly. Handle every documented variant. */
function extractGeminiStructured(data) {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.direct_answer === 'string') return data;
  if (typeof data.output_text === 'string') {
    try { return JSON.parse(data.output_text); } catch (e) { /* fall through */ }
  }
  const texts = [];
  for (const step of data.steps || []) {
    for (const block of step.content || []) if (typeof block?.text === 'string') texts.push(block.text);
  }
  for (const cand of data.candidates || []) {
    for (const part of cand.content?.parts || []) if (typeof part?.text === 'string') texts.push(part.text);
  }
  if (!texts.length) return null;
  try { return JSON.parse(texts.join('')); } catch (e) { return null; }
}

/** Coerces the model's object into the exact contract the UI expects, so a
    missing optional field can never render as `undefined`. */
function normalizeGeminiOutput(out) {
  const safety = out.safety || {};
  return {
    direct_answer: String(out.direct_answer || '').trim(),
    reasoning_summary: Array.isArray(out.reasoning_summary) ? out.reasoning_summary.slice(0, 3).map(String) : [],
    actions: Array.isArray(out.actions) ? out.actions.filter(a => a && a.type && a.label).slice(0, 2) : [],
    confidence: ['low', 'medium', 'high'].includes(out.confidence) ? out.confidence : 'medium',
    missing_data: Array.isArray(out.missing_data) ? out.missing_data.map(String) : [],
    safety: {
      stop_workout: safety.stop_workout === true,
      seek_professional_help: safety.seek_professional_help === true,
      message: safety.message ? String(safety.message) : null
    }
  };
}

/** Turns an HTTP failure into something actionable in Hebrew. */
function geminiErrorMessage(status) {
  if (status === 400) return 'המפתח לא תקין, או ששם המודל לא קיים יותר. אפשר לבדוק בהגדרות.';
  if (status === 401 || status === 403) return 'המפתח נדחה. כדאי ליצור מפתח חדש ב-Google AI Studio.';
  if (status === 429) return 'נגמרה המכסה החינמית להיום. מתאפס מחר — עד אז המאמן עובד מקומית.';
  if (status >= 500) return 'שירות Gemini לא זמין כרגע.';
  return `שגיאה ${status} מ-Gemini.`;
}

/**
 * Calls Gemini directly from the browser using the locally stored key.
 * @param {string} userMessage  Eliav's question.
 * @param {string} contextText  Pre-computed real facts (never computed here).
 * @returns {Promise<object>} the structured Coach response.
 */
async function askGeminiDirect(userMessage, contextText) {
  const key = getGeminiKey();
  if (!key) throw new Error('no_gemini_key');

  let res;
  try {
    res = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key
    },
    body: JSON.stringify({
      model: getGeminiModel(),
      system_instruction: GEMINI_SYSTEM_PROMPT,
      input: `הקשר (נתונים אמיתיים בלבד, אל תמציא מעבר לזה):\n${String(contextText || '').slice(0, 12000)}\n\nשאלת אליאב: ${String(userMessage).slice(0, 2000)}`,
      response_format: { type: 'text', mime_type: 'application/json', schema: GEMINI_RESPONSE_SCHEMA },
      generation_config: { temperature: 0.4 }
    })
    });
  } catch (e) {
    // fetch() only throws for network/CORS failures — an HTTP error still
    // resolves. Distinguish them so the message is actually actionable.
    const err = new Error('gemini_unreachable');
    err.userMessage = 'אין חיבור ל-Gemini. בדוק את הרשת — בינתיים המאמן עובד מקומית.';
    throw err;
  }

  if (!res.ok) {
    const err = new Error('gemini_http_' + res.status);
    err.status = res.status;
    err.userMessage = geminiErrorMessage(res.status);
    throw err;
  }

  const data = await res.json().catch(() => null);
  const out = extractGeminiStructured(data);
  if (!out || !out.direct_answer) {
    const err = new Error('gemini_no_structured_response');
    err.userMessage = 'Gemini החזיר תשובה בפורמט לא צפוי. אפשר לנסות מודל אחר בהגדרות.';
    throw err;
  }
  return { ...normalizeGeminiOutput(out), source: 'live' };
}

/** One cheap round-trip to prove the key works, for the settings screen. */
async function testGeminiConnection() {
  try {
    const out = await askGeminiDirect('תגיד שלום במשפט אחד.', 'בדיקת חיבור בלבד. אין נתוני אימון בהקשר הזה.');
    return { ok: true, sample: out.direct_answer };
  } catch (e) {
    return { ok: false, message: e.userMessage || 'לא הצלחתי להתחבר. כדאי לבדוק את המפתח ואת החיבור לרשת.' };
  }
}
