// netlify/functions/bagrut-ai.js
// שכבת ה-AI של בונה המבחנים: הפקת קטע גירוי והתאמת ניסוחים לקטע.
// גרסה: 1.3.0 | נוסף ציר שני: מענה למטלה (task/missing), נפרד מעצמאות הכתיבה | 2026-07-27 | תיקון: מכסת הטוקנים הועלתה ל-8192 (2.5-flash גורע טוקני חשיבה מאותה מכסה), ושגיאות מדווחות במדויק במקום '500' סתמי
// מבנה זהה ל-mavchan-ai.js: action-based, מפתח מ-process.env.GEMINI_API_KEY

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  // ping — הבונה משתמש בזה כדי לדעת אם הפונקציה נפרסה באתר הזה
  if (body.action === 'ping')
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, version: '1.3.0' }) };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'GEMINI_API_KEY לא מוגדר באתר הזה' }) };

  const RULES = `אתה עוזר למורה לתקשורת וחברה בתיכון בישראל לבנות מבחן במבנה בגרות.

כללי ברזל:
1. אסור לך להמציא מקורות. אל תכתוב שם של עיתונאי, כלי תקשורת, תאריך פרסום או ציטוט המיוחס לאדם אמיתי.
2. הקטע שאתה כותב הוא קטע תרגול כללי המתאר תופעה, ולא ידיעה חדשותית מצוטטת.
3. אל תשתמש בשמות של אנשים אמיתיים, פוליטיקאים או חברות ממשיות. אפשר לתאר "ערוץ מסחרי", "רשת חברתית", "עמותה".
4. עברית תקנית, גוף שלישי, סגנון ענייני כמו בשאלוני בגרות.
5. החזר JSON בלבד, בלי טקסט לפני או אחרי, ובלי סימוני קוד.`;

  let prompt = '';

  if (body.action === 'stimulus') {
    const concepts = Array.isArray(body.concepts) ? body.concepts.filter(Boolean) : [];
    if (!concepts.length)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'חסרים מושגים' }) };
    prompt = `${RULES}

כתוב קטע גירוי קצר לשאלה במבחן. הקטע צריך לאפשר לתלמיד לדון במושגים האלה:
${concepts.map(c => '- ' + c).join('\n')}

דרישות: 80 עד 130 מילים. תיאור תופעה או מקרה מייצג, בלי ציטוטים ובלי מקור.
הקטע צריך להיות עשיר מספיק כדי שאפשר יהיה לשאול עליו שאלות הסבר, הדגמה ודילמה.

החזר בדיוק:
{"title":"כותרת קצרה לשאלה, עד 5 מילים","text":"הקטע"}`;

  } else if (body.action === 'phrase') {
    const stim = String(body.stimulus || '').slice(0, 4000);
    const parts = Array.isArray(body.parts) ? body.parts : [];
    if (!stim || !parts.length)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'חסר קטע או סעיפים' }) };
    prompt = `${RULES}

לפניך קטע גירוי, ורשימת סעיפים עם ניסוח כללי שנוצר מתבנית.
המשימה: לנסח כל סעיף מחדש כך שיתייחס לקטע באופן ספציפי — אבל בלי לשנות את סוג המשימה, את מספר הפריטים הנדרשים ואת המושגים.

הקטע:
"""
${stim}
"""

הסעיפים:
${parts.map((p, i) => `${i}. [${p.pts} נק׳] מושגים: ${(p.concepts || []).join(', ')}
   ניסוח נוכחי: ${String(p.q || '').replace(/<[^>]+>/g, '')}`).join('\n')}

כללים: שמור על אותה דרישה בדיוק (אם ביקשו שני הבדלים — שניים; אם דילמה — דילמה).
מותר להשתמש בתגיות <b> להדגשה. אל תוסיף סעיפים ואל תשמיט.

החזר בדיוק:
{"parts":[{"i":0,"q":"הניסוח החדש"}, ...]}`;

  } else if (body.action === 'check') {
    // בדיקת עצמאות הכתיבה. ההיגיון והכיול לקוחים מהפרומפט שעבד ב-tiklamed:
    // שימוש במושגים מקצועיים אינו סימן ל-AI, והתיקון נדרש מהתלמיד ולא מנוסח עבורו.
    const text = String(body.text || '').slice(0, 8000);
    if (text.trim().split(/\s+/).length < 25)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'הטקסט קצר מדי לבדיקה' }) };
    const ctxq = String(body.question || '').replace(/<[^>]+>/g, '').slice(0, 600);
    const cons = Array.isArray(body.concepts) ? body.concepts.filter(Boolean).slice(0, 8) : [];

    prompt = `אתה בודק עצמאות כתיבה של תלמיד תקשורת וחברה בתיכון בישראל.

הקשר מכריע — קרא לפני שאתה מנתח:
התלמיד **חייב** להשתמש במושגים מקצועיים מתחום התקשורת (מסגור, הבניית מציאות, ספירלת השתיקה, סדר יום, דנוטציה, קונוטציה, סטריאוטיפ, אושיית רשת וכדומה).
שימוש במושגים אלה הוא **דרישת המטלה ואינו סימן לכתיבת AI**. אדרבה — תלמיד שאינו משתמש בהם חשוד יותר.
כמו כן, עברית תקנית וכתיבה מסודרת אינן כשלעצמן סימן ל-AI.

התמקד בסימנים האמיתיים:
- סגנון אחיד מדי לאורך כל הטקסט
- היעדר מוחלט של קול אישי, דעה או התלבטות
- מבנה משפטים "מושלם" מדי שאינו נשמע כמו תלמיד תיכון
- היעדר דוגמאות קונקרטיות מהחיים, מהכיתה או מהתקשורת שהתלמיד צורך
- חזרתיות וניסוחים כלליים שמתאימים לכל נושא
- פסקאות ממוסגרות מדי, בנויות כמו תשובת מודל

${ctxq ? 'השאלה שעליה התלמיד ענה:\n' + ctxq + '\n' : ''}${cons.length ? 'מושגים שהמטלה דרשה לשלב: ' + cons.join(', ') + '\n' : ''}
הטקסט של התלמיד:
"""
${text}
"""

החזר JSON בלבד, בלי טקסט לפני או אחרי ובלי סימוני קוד:
{
 "pct": מספר בין 0 ל-100 — ההסתברות שהטקסט נכתב או נערך על ידי AI,
 "verdict": אחד מ: "סביר אנושי" | "שילוב" | "סביר AI" | "כמעט בוודאות AI",
 "task": מספר בין 0 ל-100 — עד כמה התשובה באמת עונה על מה שנשאל,
 "task_verdict": אחד מ: "עונה במלואה" | "עונה חלקית" | "כמעט אינה עונה" | "אינה עונה",
 "missing": ["מה נדרש בשאלה ולא נמצא בתשובה"],
 "summary": "משפט אחד על הרושם הכללי",
 "ai_signs": [{"sign":"הסימן שזיהית","quote":"ציטוט קצר מהטקסט"}],
 "human_signs": ["סימנים שמרמזים שהטקסט אכן של התלמיד — קול אישי, דוגמה מהחיים, ניסוח לא חלק"],
 "questions": ["חמש שאלות ספציפיות לטקסט הזה שמורה יכול לשאול כדי לבחון הבנה"],
 "fixes": ["הנחיות תיקון"]
}

שני צירים נפרדים — אל תערבב ביניהם:

**ציר 1 — pct: עצמאות הכתיבה.** האם התלמיד כתב בעצמו.
**ציר 2 — task: מענה למטלה.** האם התשובה עושה את מה שהשאלה ביקשה.
תשובה יכולה להיות עצמאית לגמרי (pct נמוך) ובכל זאת לא לענות (task נמוך) — למשל תלמיד
שרק מצטט או מתאר דוגמה בלי לנתח, בלי להשתמש במושגים ובלי להסביר. זהו מקרה שכיח ועליך לזהותו.

כללים לשדה task ולשדה missing:
- פרק את השאלה לדרישות שלה. אם נדרשו שני דברים והתלמיד עשה אחד — task אינו יכול לעבור 50.
- ציטוט, סיפור או דוגמה בלי הסבר וניתוח — task נמוך, גם אם הכתיבה עצמאית לחלוטין.
- אם המטלה דרשה מושגים מקצועיים ואין אף אחד מהם — task אינו יכול לעבור 40.
- missing הוא רשימת הדברים שנדרשו ולא נמצאו, בניסוח קונקרטי. ריק רק אם באמת הכול נענה.
- אם לא סופקה שאלה, החזר task=-1 ו-missing ריק. אל תנחש מה נשאל.

**אל תכניס לשדה human_signs ביקורת על התוכן.** שם רק סימנים לכך שהטקסט נכתב בידי התלמיד.
כל טענה על חוסר בתשובה שייכת ל-missing ול-fixes.

כללים לשדה fixes:
- **אל תנסח את התיקון עבור התלמיד.** דרוש ממנו לעשות, אל תכתוב במקומו.
- מעל 30% — לכל סימן AI, דרוש לכתוב את הקטע מחדש במילים שלו, ולהוסיף דוגמה אישית ממשית ולהסביר איך היא מתקשרת.
- מעל 50% — דרוש לכתוב את הפסקה מחדש מהזיכרון בלי להסתכל על מקור.
- אם task נמוך — התיקון החשוב ביותר הוא להשלים את מה שחסר, ולכן הוא ראשון ברשימה.
- מתחת ל-30% ועם task גבוה — fixes יכול להיות מערך ריק.
- ai_signs ריק אם באמת אין. אל תמציא סימנים כדי למלא.`;

  } else {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 8192,          // 2.5-flash גורע טוקני חשיבה מאותה מכסה
          responseMimeType: 'application/json'
        }
      })
    });
    if (!res.ok) {
      const t = await res.text();
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Gemini ' + res.status + ' ' + t.slice(0, 200) }) };
    }
    const data = await res.json();
    const cand = (data.candidates && data.candidates[0]) || null;
    const why = cand && cand.finishReason;
    let txt = '';
    try { txt = cand.content.parts.map(function (p) { return p.text || ''; }).join(''); }
    catch (e) { txt = ''; }
    if (!txt) {
      const blocked = data.promptFeedback && data.promptFeedback.blockReason;
      return {
        statusCode: 500, headers, body: JSON.stringify({
          error: blocked ? ('הבקשה נחסמה על ידי המודל (' + blocked + ')')
            : why === 'MAX_TOKENS' ? 'התשובה נקטעה — חריגה ממכסת הטוקנים'
              : ('תשובה ריקה מהמודל' + (why ? ' (' + why + ')' : ''))
        })
      };
    }

    let out;
    const raw = String(txt).replace(/```json|```/g, '').trim();
    try { out = JSON.parse(raw); }
    catch (e) {
      // לפעמים חוזר טקסט עוטף — מנסים לחלץ את האובייקט
      const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
      if (a > -1 && b > a) { try { out = JSON.parse(raw.slice(a, b + 1)); } catch (e2) { out = null; } }
      if (!out) return {
        statusCode: 500, headers, body: JSON.stringify({
          error: (why === 'MAX_TOKENS' ? 'התשובה נקטעה באמצע — ' : '') +
            'תשובת המודל אינה JSON תקין', sample: raw.slice(0, 160)
        })
      };
    }

    // הגנה: אם המודל בכל זאת הכניס מקור מומצא — מסירים את השורה
    if (out.text) out.text = String(out.text).replace(/\(?\s*מעובד על פי[^)]*\)?/g, '').trim();
    if (body.action === 'check') {
      out.pct = Math.max(0, Math.min(100, Math.round(Number(out.pct) || 0)));
      ['ai_signs', 'human_signs', 'questions', 'fixes'].forEach(function (k) {
        if (!Array.isArray(out[k])) out[k] = [];
      });
      out.verdict = String(out.verdict || '').trim() || (out.pct < 30 ? 'סביר אנושי' : out.pct < 60 ? 'שילוב' : 'סביר AI');
      var tk = Number(out.task);
      out.task = (isNaN(tk) || tk < 0) ? -1 : Math.max(0, Math.min(100, Math.round(tk)));
      if (!Array.isArray(out.missing)) out.missing = [];
      out.task_verdict = String(out.task_verdict || '').trim() ||
        (out.task < 0 ? '' : out.task >= 80 ? 'עונה במלואה' : out.task >= 55 ? 'עונה חלקית'
          : out.task >= 25 ? 'כמעט אינה עונה' : 'אינה עונה');
    }

    return { statusCode: 200, headers, body: JSON.stringify(out) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(e.message || e).slice(0, 200) }) };
  }
};
