// netlify/functions/lesson-ai.js
// פונקציה ליצירת תוכן שיעור לייב אינטראקטיבי עם Gemini
// גרסה: 1.0.0 | תאריך: 2026-05-15

exports.handler = async function(event, context) {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const action = body.action || 'generate_lesson';
    let prompt = '';

    if (action === 'generate_lesson') {
        // יצירת תוכן שיעור לייב
        const { title, description, duration_minutes } = body;
        if (!title || title.length < 2) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרשת כותרת לשיעור' }) };
        }

        const duration = duration_minutes || 45;
        // חישוב כמות משימות לפי משך השיעור
        const numTasks = duration <= 20 ? 2 : duration <= 40 ? 3 : duration <= 60 ? 4 : 5;
        const numConcepts = duration <= 20 ? 2 : duration <= 40 ? 3 : 4;

        prompt = `אתה מורה בכיר בתיכון בישראל המכין שיעור לייב אינטראקטיבי לתלמידי חטיבת ביניים או תיכון.

נושא השיעור: "${title}"
${description ? `הנחיות / מושגים ללמד:\n${description}\n` : ''}
משך השיעור: ${duration} דקות

המשימה: בנה תוכן שיעור אינטראקטיבי שמשלב הסברים מעמיקים יחד עם משימות פתוחות שמעוררות חשיבה. השיעור יוצג לתלמידים על המסך, והם יקראו, יחשבו ויכתבו תשובות.

הנחיות חשובות:
1. השיעור צריך להיות בעברית מצוינת, בגובה העיניים של תלמיד תיכון
2. ההסברים צריכים להיות עשירים בדוגמאות אמיתיות, אקטואליות ומוחשיות
3. המשימות צריכות לעורר חשיבה ביקורתית, לא רק שינון
4. לבנות הדרגתיות: מהבסיס אל המורכב יותר
5. ${numConcepts} בלוקי "concept" (הסבר מושג/רעיון)
6. ${numTasks} בלוקי "task" (משימת כתיבה לתלמיד)
7. אפשר לשלב 1-2 בלוקי "example" (דוגמה מפורטת)
8. הסדר חשוב: concept ראשון → example → task → concept → task...
9. כל "content" צריך להיות 2-4 פסקאות אמיתיות, לא משפט קצר

מבנה התוכן שעליך להחזיר (JSON תקין בלבד, ללא backticks או הסברים):

{
  "lesson_title": "כותרת ראשית לשיעור (אפשר זהה לכותרת המקורית)",
  "intro": "פסקת פתיחה של 2-3 משפטים שמציגה את חשיבות הנושא ומה התלמידים ילמדו",
  "blocks": [
    {
      "type": "concept",
      "title": "כותרת המושג",
      "content": "הסבר מעמיק של 2-3 פסקאות. השתמש בשבירת שורות לפי הצורך."
    },
    {
      "type": "example",
      "title": "דוגמה: שם הדוגמה",
      "content": "תיאור מפורט של דוגמה אמיתית מהחיים/מהתקשורת/מההיסטוריה"
    },
    {
      "type": "task",
      "title": "משימה: כותרת קצרה",
      "question": "השאלה עצמה - מעוררת חשיבה, פתוחה, דורשת מהתלמיד להפעיל את מה שלמד",
      "guidance": "הנחיה קצרה לתלמיד: על מה להתמקד בתשובה (1 משפט)"
    }
  ],
  "closing": "פסקה מסכמת של 2-3 משפטים שמחברת את הכל ומשאירה את התלמיד עם מחשבה"
}

חשוב מאוד:
- הסדר של blocks חייב להיות הגיוני: ללמד מושג, אחר כך אולי דוגמה, ואז משימה ששואלת עליו
- אל תחזור על הכותרת הראשית בתוכן הבלוקים
- כתוב בסגנון חי וברור, לא יבש
- שאלות במשימות לא צריכות תשובה אחת נכונה, אלא לעורר ניתוח אישי`;

    } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    // קריאה ל-Gemini
    try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 8192,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini error:', errText);
            return { 
                statusCode: 500, 
                headers, 
                body: JSON.stringify({ error: 'שגיאה בקריאה ל-Gemini', details: errText.substring(0, 500) }) 
            };
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!text) {
            return { 
                statusCode: 500, 
                headers, 
                body: JSON.stringify({ error: 'תגובה ריקה מ-Gemini' }) 
            };
        }

        // ניסיון לפרסר את ה-JSON
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            // נסיון לחלץ JSON מתוך טקסט
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    parsed = JSON.parse(match[0]);
                } catch (e2) {
                    return { 
                        statusCode: 500, 
                        headers, 
                        body: JSON.stringify({ error: 'לא ניתן לפרסר את התגובה', raw: text.substring(0, 500) }) 
                    };
                }
            } else {
                return { 
                    statusCode: 500, 
                    headers, 
                    body: JSON.stringify({ error: 'אין JSON בתגובה', raw: text.substring(0, 500) }) 
                };
            }
        }

        // ולידציה בסיסית
        if (!parsed.blocks || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'מבנה התוכן לא תקין', raw: text.substring(0, 500) })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(parsed)
        };

    } catch (err) {
        console.error('Error:', err);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: 'שגיאה: ' + err.message }) 
        };
    }
};
