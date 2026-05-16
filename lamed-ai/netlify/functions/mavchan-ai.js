// netlify/functions/mavchan-ai.js
// פונקציה לבניית ובדיקת מבחני בקרה + שיעורי לייב עם Gemini
// גרסה: 3.0.1 | תאריך: 2026-05-16 — הגדלת maxTokens ל-quiz מ-1024 ל-2048 (בעיה שתשובות נחתכו)

exports.handler = async function(event, context) {
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

    const action = body.action;
    if (!action) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing action' }) };
    }

    let prompt = '';

    if (action === 'generate_test') {
        const { topic, num_choice, num_open, level } = body;
        if (!topic || topic.length < 10) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרש נושא או טקסט (לפחות 10 תווים)' }) };
        }
        const totalQ = (num_choice || 0) + (num_open || 0);
        if (totalQ === 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרשת לפחות שאלה אחת' }) };
        }

        prompt = `אתה מורה בתיכון בישראל הבונה מבחן בדיקת הבנה לתלמידים.

נושא או טקסט המבחן:
"""
${topic}
"""

המשימה: בנה מבחן בעברית עם בדיוק:
- ${num_choice || 0} שאלות בחירה מרובה (4 אפשרויות, תשובה נכונה אחת)
- ${num_open || 0} שאלות פתוחות (הסבר במילים שלך)

הנחיות חשובות:
1. השאלות צריכות לבדוק הבנה אמיתית של הנושא, לא שינון
2. השאלות צריכות להיות ספציפיות לנושא שהוצג
3. השאלות הפתוחות צריכות לחייב את התלמיד להסביר ולנמק
4. בבחירה מרובה - הסחות הדעת חייבות להיות סבירות אבל לא נכונות
5. כתוב את הכל בעברית
${level ? `6. רמת קושי: ${level}` : ''}

החזר JSON תקין בלבד (ללא טקסט נוסף, ללא backticks, ללא הסברים) בדיוק בפורמט הזה:
{
  "questions": [
    {
      "type": "choice",
      "text": "השאלה כאן?",
      "options": ["אופציה 1", "אופציה 2", "אופציה 3", "אופציה 4"],
      "correct_answer": "אופציה 1",
      "points": 5
    },
    {
      "type": "text",
      "text": "השאלה הפתוחה?",
      "points": 10,
      "expected_answer": "תיאור קצר במשפט אחד של מה תשובה טובה אמורה לכלול"
    }
  ]
}`;

    } else if (action === 'grade_answer') {
        const { question, expected_answer, student_answer, max_points } = body;
        if (!question || !student_answer) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'חסרים פרטים' }) };
        }

        prompt = `אתה מורה בתיכון בישראל הבודק תשובה של תלמיד.

השאלה: ${question}
${expected_answer ? `מה התשובה אמורה לכלול: ${expected_answer}` : ''}
תשובת התלמיד:
"""
${student_answer}
"""

המשימה: תן ציון מ-0 עד ${max_points || 10} לתשובת התלמיד והערכה מילולית קצרה.

הנחיות:
1. ציון 0 = לא ענה / תשובה לא קשורה / מוטעית לחלוטין
2. ציון מלא = תשובה מלאה, מדויקת, מנומקת
3. ציון אמצעי = תשובה חלקית - מבין משהו אבל חסר/לא מדויק
4. ההערכה צריכה להיות 1-2 משפטים בעברית
5. תהיה הוגן אבל קפדן - לא לתת ציון מלא לתשובה שטחית

החזר JSON תקין בלבד (ללא טקסט נוסף, ללא backticks):
{
  "score": <מספר>,
  "feedback": "<הערכה מילולית>"
}`;

    } else if (action === 'generate_lesson') {
        const { title, description, duration_minutes } = body;
        if (!title || title.length < 2) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרשת כותרת לשיעור' }) };
        }
        const duration = duration_minutes || 45;
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
  "lesson_title": "כותרת ראשית לשיעור",
  "intro": "פסקת פתיחה של 2-3 משפטים",
  "blocks": [
    {"type": "concept", "title": "כותרת המושג", "content": "הסבר מעמיק של 2-3 פסקאות"},
    {"type": "example", "title": "דוגמה: שם", "content": "תיאור מפורט של דוגמה"},
    {"type": "task", "title": "משימה: כותרת", "question": "השאלה", "guidance": "הנחיה קצרה"}
  ],
  "closing": "פסקה מסכמת"
}`;

    } else if (action === 'generate_quiz_question') {
        // v3.0.1 - שאלת בדיקת הבנה אמריקאית על בלוק
        const { block_content, block_title, block_type, previous_attempts } = body;
        if (!block_content || block_content.length < 20) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרש תוכן בלוק (לפחות 20 תווים)' }) };
        }

        const attemptsNote = previous_attempts && previous_attempts.length 
            ? '\nתלמיד זה כבר ענה על שאלות קודמות וטעה. שאל שאלה אחרת מאלה:\n' + previous_attempts.map(function(q, i){ return (i+1) + '. ' + q; }).join('\n') + '\n'
            : '';

        prompt = `אתה מורה בתיכון. בנה שאלה אמריקאית קצרה (1 בלבד) שבודקת הבנה של הבלוק שהתלמיד קרא.

הבלוק:
${block_title ? 'כותרת: ' + block_title : ''}
תוכן:
"""
${block_content}
"""
${attemptsNote}
הנחיות:
1. שאלה ספציפית לתוכן הבלוק
2. בודקת הבנה אמיתית, לא שינון
3. 4 אפשרויות סבירות, רק אחת נכונה
4. כתוב בעברית פשוטה וברורה
5. הוסף הסבר קצר (משפט) למה התשובה נכונה

חשוב מאוד: החזר JSON בלבד! ללא הסברים לפניו, ללא backticks, ללא שום טקסט אחר. תתחיל ישר עם } { וסיים בסוף.

פורמט:
{"question": "השאלה?", "options": ["א", "ב", "ג", "ד"], "correct_answer": "ב", "explanation": "הסבר"}`;

    } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    // קריאה ל-Gemini
    try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const temperature = action === 'generate_lesson' ? 0.8 : (action === 'generate_quiz_question' ? 0.6 : 0.7);
        // v3.0.1 - הגדלת maxTokens לשאלת בדיקה מ-1024 ל-2048 (תשובות נחתכו)
        const maxTokens = action === 'generate_quiz_question' ? 2048 : 8192;
        
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: temperature,
                    maxOutputTokens: maxTokens,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini error:', errText);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'שגיאה בקריאה ל-Gemini', details: errText.substring(0, 500) }) };
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!text) {
            console.error('Empty response from Gemini. Full data:', JSON.stringify(data).substring(0, 500));
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'תגובה ריקה מ-Gemini' }) };
        }

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
                    console.error('Cannot parse JSON. Raw text:', text.substring(0, 1000));
                    return { statusCode: 500, headers, body: JSON.stringify({ error: 'לא ניתן לפרסר את התגובה', raw: text.substring(0, 500) }) };
                }
            } else {
                console.error('No JSON in response. Raw:', text.substring(0, 1000));
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'אין JSON בתגובה', raw: text.substring(0, 500) }) };
            }
        }

        // ולידציה
        if (action === 'generate_lesson') {
            if (!parsed.blocks || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'מבנה התוכן לא תקין', raw: text.substring(0, 500) }) };
            }
        }
        if (action === 'generate_quiz_question') {
            if (!parsed.question || !parsed.options || !Array.isArray(parsed.options) || parsed.options.length !== 4 || !parsed.correct_answer) {
                console.error('Invalid quiz structure:', JSON.stringify(parsed).substring(0, 500));
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'מבנה השאלה לא תקין', raw: text.substring(0, 500) }) };
            }
            if (parsed.options.indexOf(parsed.correct_answer) === -1) {
                console.error('Correct answer not in options:', parsed.correct_answer, 'options:', parsed.options);
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'התשובה הנכונה לא נמצאת ברשימת האפשרויות' }) };
            }
        }

        return { statusCode: 200, headers, body: JSON.stringify(parsed) };

    } catch (err) {
        console.error('Error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'שגיאה: ' + err.message }) };
    }
};
