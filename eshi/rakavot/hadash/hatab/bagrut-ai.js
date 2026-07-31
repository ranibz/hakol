// netlify/functions/bagrut-ai.js
// שכבת ה-AI של בונה המבחנים: הפקת קטע גירוי והתאמת ניסוחים לקטע.
// גרסה: 1.1.0 | 2026-07-27 | נוספה פעולת check — בדיקת עצמאות כתיבה עם משוב מעצב
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
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, version: '1.1.0' }) };

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
 "summary": "משפט אחד על הרושם הכללי",
 "ai_signs": [{"sign":"הסימן שזיהית","quote":"ציטוט קצר מהטקסט"}],
 "human_signs": ["סימנים שמרמזים שהטקסט אכן של התלמיד"],
 "questions": ["חמש שאלות ספציפיות לטקסט הזה שמורה יכול לשאול כדי לבחון הבנה"],
 "fixes": ["הנחיות תיקון"]
}

כללים לשדה fixes:
- **אל תנסח את התיקון עבור התלמיד.** דרוש ממנו לעשות, אל תכתוב במקומו.
- מעל 30% — לכל סימן AI, דרוש לכתוב את הקטע מחדש במילים שלו, ולהוסיף דוגמה אישית ממשית ולהסביר איך היא מתקשרת.
- מעל 50% — דרוש לכתוב את הפסקה מחדש מהזיכרון בלי להסתכל על מקור.
- מתחת ל-30% — fixes יכול להיות מערך ריק.
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
        generationConfig: { temperature: 0.75, maxOutputTokens: 2048, responseMimeType: 'application/json' }
      })
    });
    if (!res.ok) {
      const t = await res.text();
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Gemini ' + res.status + ' ' + t.slice(0, 200) }) };
    }
    const data = await res.json();
    let txt = '';
    try { txt = data.candidates[0].content.parts[0].text; }
    catch (e) { return { statusCode: 500, headers, body: JSON.stringify({ error: 'תשובה ריקה מהמודל' }) }; }

    let out;
    try { out = JSON.parse(String(txt).replace(/```json|```/g, '').trim()); }
    catch (e) { return { statusCode: 500, headers, body: JSON.stringify({ error: 'תשובת המודל אינה JSON תקין' }) }; }

    // הגנה: אם המודל בכל זאת הכניס מקור מומצא — מסירים את השורה
    if (out.text) out.text = String(out.text).replace(/\(?\s*מעובד על פי[^)]*\)?/g, '').trim();
    if (body.action === 'check') {
      out.pct = Math.max(0, Math.min(100, Math.round(Number(out.pct) || 0)));
      ['ai_signs', 'human_signs', 'questions', 'fixes'].forEach(function (k) {
        if (!Array.isArray(out[k])) out[k] = [];
      });
      out.verdict = String(out.verdict || '').trim() || (out.pct < 30 ? 'סביר אנושי' : out.pct < 60 ? 'שילוב' : 'סביר AI');
    }

    return { statusCode: 200, headers, body: JSON.stringify(out) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(e.message || e).slice(0, 200) }) };
  }
};
