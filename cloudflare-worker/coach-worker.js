/* FORMA Coach — Cloudflare Worker (Gemini API).

   The ONLY job of this worker is to hold the Gemini API key server-side and
   forward a request to the model. It never invents or looks up data itself —
   the frontend (coach-engine.js) does all the real computation (recovery
   score, progression, trends) via the existing domain-*.js modules and sends
   the already-computed facts as plain text. The model's job is only to reason
   over those facts and phrase a natural, grounded answer — never to guess a
   number that wasn't handed to it.

   It returns exactly the same JSON shape the old Anthropic worker did, so
   coach-engine.js needs no changes: { direct_answer, reasoning_summary,
   actions, confidence, missing_data, safety }.

   Deploy: paste this whole file into a new Cloudflare Worker (dashboard —
   no CLI/Node needed), then add two variables under Settings → Variables:
     GEMINI_API_KEY   — from aistudio.google.com/apikey  (add as a SECRET)
     ALLOWED_ORIGIN   — e.g. https://eliav38-sys.github.io  (plain text)
   Click Deploy, then give the resulting *.workers.dev URL to FORMA
   (js/ai-config.js → FORMA_AI_WORKER_URL). */

// Free-tier model with enough reasoning for the grounding rules below.
const MODEL = 'gemini-3.7-flash';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const API_REVISION = '2026-05-20';

const SYSTEM_PROMPT = `אתה FORMA, המאמן האישי החכם של אליאב באפליקציית כושר אישית.

איך לדבר:
- עברית טבעית, ישירה וחמה. לא שפה צבאית, לא מוגזמת.
- פנה אליו בשם אליאב במינון טבעי, לא בכל משפט.
- תשובה מעשית: משפט ישיר אחד, הסיבה על בסיס הנתונים, פעולה ברורה אחת או שתיים, ואזהרה/שאלה רק אם נדרש.

כללים שאסור לשבור:
- התייחס אך ורק לנתונים שסופקו לך בהקשר (context) שבהודעה. אל תמציא משקל, היקף, תרגיל, RIR, RPE או כל נתון אחר שלא נמסר לך במפורש.
- כשנתון חסר כדי לענות בביטחון, אמור זאת בפירוש ואל תנחש, ורשום אותו ב-missing_data.
- התוכנית מגדירה עצימות ב-RIR (חזרות ברזרבה). קומפאונד: RIR 1–2. בידוד: קרוב לכשל. בטן: שליטה מלאה. דבר בשפה הזו.
- אל תציג הערכה מתמונה כמדידה מדויקת.
- אל תשנה את התוכנית בפועל — רק תציע (המשתמש תמיד מאשר בעצמו).
- אל תוסיף תרגילים כשאפשר לפתור בטכניקה, מנוחה או תזמון.
- העדף עקביות על מורכבות.
- אל תשתמש בשפה שיפוטית על גוף, משקל או מזון. אין "נכשלת", אין אשמה.
- אינך רופא: אין אבחון רפואי, אין קביעת אחוז שומן מתמונה, אין המלצה להמשיך דרך כאב חד, אין הבטחות לזמן/היקף תוצאה, אין קיצוץ קלורי אגרסיבי.
- אם מתואר כאב חזה, קוצר נשימה חריג, סחרחורת, אובדן הכרה או חולשה נוירולוגית — הפעל עצירה (safety.stop_workout=true, safety.seek_professional_help=true) והפנה מיד לטיפול מתאים, ואל תיתן שום עצה אימונית אחרת בתשובה הזו.
- אם מתואר דפוס אכילה מדאיג או מצוקה סביב הגוף — ניסוח תומך, לא שיפוטי, והמלצה להתייעץ עם איש מקצוע (safety.seek_professional_help=true).

ענה תמיד ב-JSON בלבד, לפי הסכימה שניתנה לך.`;

/* Gemini uses an OpenAPI-3.0 schema subset: `nullable` rather than a union
   type, and no `additionalProperties`. */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    direct_answer: { type: 'string', description: 'משפט תשובה ישיר אחד, בעברית.' },
    reasoning_summary: {
      type: 'array', items: { type: 'string' },
      description: 'עד 3 משפטי סיבה קצרים, מבוססים רק על הנתונים שסופקו.'
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['keep', 'reduce_volume', 'reduce_load', 'swap_exercise', 'schedule_measurement', 'nutrition_suggestion', 'none'] },
          label: { type: 'string', description: 'טקסט כפתור קצר בעברית.' }
        },
        required: ['type', 'label']
      },
      description: 'עד 2 פעולות מוצעות. מערך ריק אם אין פעולה רלוונטית.'
    },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    missing_data: { type: 'array', items: { type: 'string' }, description: 'נתונים חסרים שהיו עוזרים לענות טוב יותר.' },
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

function corsHeaders(origin, allowedOrigin) {
  const allow = origin === allowedOrigin ? origin : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': allow || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

/* The Interactions API returns an envelope with a `steps` timeline, but the
   exact shape has been in flux and some responses come back as the schema
   object directly. Handle every documented variant rather than assuming one. */
function extractStructured(data) {
  if (!data || typeof data !== 'object') return null;

  // 1. Already the schema object itself.
  if (typeof data.direct_answer === 'string') return data;

  // 2. SDK-style convenience field.
  if (typeof data.output_text === 'string') {
    try { return JSON.parse(data.output_text); } catch (e) { /* fall through */ }
  }

  // 3. steps[] → content[] text blocks, joined then parsed.
  const texts = [];
  for (const step of data.steps || []) {
    for (const block of step.content || []) {
      if (typeof block?.text === 'string') texts.push(block.text);
    }
  }
  // 4. Legacy generateContent shape, in case the endpoint is swapped back.
  for (const cand of data.candidates || []) {
    for (const part of cand.content?.parts || []) {
      if (typeof part?.text === 'string') texts.push(part.text);
    }
  }
  if (!texts.length) return null;
  try { return JSON.parse(texts.join('')); } catch (e) { return null; }
}

/** Coerces the model's object into the exact contract coach-engine.js expects,
    so a missing optional field can never render as `undefined` in the UI. */
function normalize(out) {
  const safety = out.safety || {};
  return {
    direct_answer: String(out.direct_answer || '').trim(),
    reasoning_summary: Array.isArray(out.reasoning_summary) ? out.reasoning_summary.slice(0, 3).map(String) : [],
    // Filter before slicing, so one malformed action doesn't cost a valid one.
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

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, headers);
    if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) return json({ error: 'origin_not_allowed' }, 403, headers);
    if (!env.GEMINI_API_KEY) return json({ error: 'missing_api_key' }, 500, headers);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'invalid_json' }, 400, headers); }

    const userMessage = String(body.userMessage || '').slice(0, 2000);
    const contextText = String(body.contextText || '').slice(0, 12000);
    if (!userMessage) return json({ error: 'missing_userMessage' }, 400, headers);

    let geminiRes;
    try {
      geminiRes = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
          'Api-Revision': API_REVISION
        },
        body: JSON.stringify({
          model: MODEL,
          system_instruction: SYSTEM_PROMPT,
          input: `הקשר (נתונים אמיתיים בלבד, אל תמציא מעבר לזה):\n${contextText}\n\nשאלת אליאב: ${userMessage}`,
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: RESPONSE_SCHEMA
          },
          generation_config: { temperature: 0.4 }
        })
      });
    } catch (e) {
      return json({ error: 'upstream_unreachable' }, 502, headers);
    }

    if (!geminiRes.ok) {
      // Surface status only — the upstream body can echo request details, and
      // this response goes to the browser.
      return json({ error: 'gemini_error', status: geminiRes.status }, 502, headers);
    }

    const data = await geminiRes.json().catch(() => null);
    const out = extractStructured(data);
    if (!out || !out.direct_answer) return json({ error: 'no_structured_response' }, 502, headers);

    return json(normalize(out), 200, headers);
  }
};
