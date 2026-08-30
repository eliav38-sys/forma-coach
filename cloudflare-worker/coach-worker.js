/* FORMA Coach — Cloudflare Worker.
   The ONLY job of this worker is to hold the Anthropic API key server-side
   and forward a request to Claude. It never invents or looks up data itself —
   the frontend (coach-engine.js) does all the real computation (recovery
   score, progression, trends) via the existing domain-*.js modules and sends
   the already-computed facts as plain text. Claude's job is only to reason
   over those facts and phrase a natural, grounded answer — never to guess a
   number that wasn't handed to it.

   Deploy: paste this whole file into a new Cloudflare Worker (dashboard —
   no CLI/Node needed), then add two secrets under Settings → Variables:
     ANTHROPIC_API_KEY   — from console.anthropic.com
     ALLOWED_ORIGIN       — e.g. https://eliav38-sys.github.io
   Click Deploy. Give the resulting *.workers.dev URL back to FORMA. */

const MODEL = 'claude-opus-5';

const SYSTEM_PROMPT = `אתה FORMA, המאמן האישי החכם של אליאב באפליקציית כושר אישית.

איך לדבר:
- עברית טבעית, ישירה וחמה. לא שפה צבאית, לא מוגזמת.
- פנה אליו בשם אליאב במינון טבעי, לא בכל משפט.
- תשובה מעשית: משפט ישיר אחד, הסיבה על בסיס הנתונים, פעולה ברורה אחת או שתיים, ואזהרה/שאלה רק אם נדרש.

כללים שאסור לשבור:
- התייחס אך ורק לנתונים שסופקו לך בהקשר (context) שבהודעה. אל תמציא משקל, היקף, תרגיל, RPE או כל נתון אחר שלא נמסר לך במפורש.
- כשנתון חסר כדי לענות בביטחון, אמור זאת בפירוש ואל תנחש.
- אל תציג הערכה מתמונה כמדידה מדויקת.
- אל תשנה את התוכנית בפועל — רק תציע (המשתמש תמיד מאשר בעצמו).
- אל תוסיף תרגילים כשאפשר לפתור בטכניקה, מנוחה או תזמון.
- העדף עקביות על מורכבות.
- אל תשתמש בשפה שיפוטית על גוף, משקל או מזון. אין "נכשלת", אין אשמה.
- אינך רופא: אין אבחון רפואי, אין קביעת אחוז שומן מתמונה, אין המלצה להמשיך דרך כאב חד, אין הבטחות לזמן/היקף תוצאה, אין קיצוץ קלורי אגרסיבי.
- אם מתואר כאב חזה, קוצר נשימה חריג, סחרחורת, אובדן הכרה או חולשה נוירולוגית — הפעל עצירה (safety.stop_workout=true, safety.seek_professional_help=true) והפנה מיד לטיפול מתאים, ואל תיתן שום עצה אימונית אחרת בתשובה הזו.
- אם מתואר דפוס אכילה מדאיג או מצוקה סביב הגוף — ניסוח תומך, לא שיפוטי, והמלצה להתייעץ עם איש מקצוע (safety.seek_professional_help=true).

עליך תמיד לענות באמצעות הכלי respond_to_athlete בלבד, בפורמט המובנה שלו.`;

const TOOL = {
  name: 'respond_to_athlete',
  description: 'התשובה המובנית של המאמן לאליאב, לפי חוזה הפלט של FORMA.',
  input_schema: {
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
          message: { type: ['string', 'null'] }
        },
        required: ['stop_workout', 'seek_professional_help', 'message']
      }
    },
    required: ['direct_answer', 'reasoning_summary', 'actions', 'confidence', 'missing_data', 'safety']
  }
};

function corsHeaders(origin, allowedOrigin) {
  const allow = origin === allowedOrigin ? origin : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } });
    }
    if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) {
      return new Response(JSON.stringify({ error: 'origin_not_allowed' }), { status: 403, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    let body;
    try { body = await request.json(); } catch (e) {
      return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    const userMessage = String(body.userMessage || '').slice(0, 2000);
    const contextText = String(body.contextText || '').slice(0, 12000);
    if (!userMessage) {
      return new Response(JSON.stringify({ error: 'missing_userMessage' }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        output_config: { effort: 'low' },
        system: SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'respond_to_athlete' },
        messages: [
          { role: 'user', content: `הקשר (נתונים אמיתיים בלבד, אל תמציא מעבר לזה):\n${contextText}\n\nשאלת אליאב: ${userMessage}` }
        ]
      })
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => '');
      return new Response(JSON.stringify({ error: 'anthropic_error', status: anthropicRes.status, detail: errText.slice(0, 500) }), {
        status: 502, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    const data = await anthropicRes.json();
    const toolUse = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'respond_to_athlete');
    if (!toolUse) {
      return new Response(JSON.stringify({ error: 'no_structured_response' }), { status: 502, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(toolUse.input), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
  }
};
