// netlify/functions/mavchan-ai.js
// פונקציה לבניית ובדיקת מבחני בקרה + שיעורי לייב עם Gemini
// גרסה: 3.1.0 | תאריך: 2026-05-16 — generate_lesson כעת מחזיר גם 3 quiz_questions לכל בלוק concept/example

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
    {"type":"choice","text":"השאלה כאן?","options":["א","ב","ג","ד"],"correct_answer":"א","points":5},
    {"type":"text","text":"שאלה פתוחה?","points":10,"expected_answer":"תיאור קצר של תשובה טובה"}
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
{"score":<מספר>,"feedback":"<הערכה מילולית>"}`;

    } else if (action === 'generate_lesson') {
        // v3.1.0 - כולל 3 שאלות בדיקה מובנות לכל בלוק concept/example
        const { title, description, duration_minutes } = body;
        if (!title || title.length < 2) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרשת כותרת לשיעור' }) };
        }
        const duration = duration_minutes || 45;
        const numTasks = duration <= 20 ? 2 : duration <= 40 ? 3 : duration <= 60 ? 4 : 5;
        const numConcepts = duration <= 20 ? 2 : duration <= 40 ? 3 : 4;

        prompt = `אתה מורה בכיר בתיכון בישראל המכין שיעור לייב אינטראקטיבי לתלמידי תיכון.

נושא השיעור: "${title}"
${description ? `הנחיות / מושגים ללמד:\n${description}\n` : ''}
משך השיעור: ${duration} דקות

המשימה: בנה תוכן שיעור אינטראקטיבי + מאגר שאלות בדיקת הבנה לכל בלוק תוכן.

מבנה השיעור:
- ${numConcepts} בלוקי "concept" (הסבר מושג/רעיון)
- ${numTasks} בלוקי "task" (משימת כתיבה לתלמיד)
- אפשר לשלב 1-2 בלוקי "example" (דוגמה מפורטת)
- סדר: concept ראשון → example → task → concept → task...
- כל "content" צריך להיות 2-4 פסקאות אמיתיות
- כתוב בעברית מצוינת, בגובה העיניים של תלמיד תיכון, עם דוגמאות מוחשיות

חשוב מאוד - לכל בלוק מסוג concept ו-example, חייב להיות שדה "quiz_questions" - **מערך של 3 שאלות אמריקאיות שונות** שבודקות הבנה של הבלוק:
- כל שאלה: 4 אפשרויות, רק 1 נכונה, הסבר קצר
- 3 השאלות צריכות להיות מזוויות שונות / בודקות היבטים שונים של אותו בלוק
- הסחות דעת צריכות להיות סבירות אבל ברורות כלא-נכונות
- בלוקי task לא צריכים quiz_questions

החזר JSON תקין בלבד (ללא backticks, ללא הסברים):

{
  "lesson_title": "כותרת ראשית",
  "intro": "פסקת פתיחה",
  "blocks": [
    {
      "type": "concept",
      "title": "כותרת מושג",
      "content": "הסבר 2-3 פסקאות",
      "quiz_questions": [
        {"question":"שאלה 1?","options":["א","ב","ג","ד"],"correct_answer":"ב","explanation":"הסבר קצר"},
        {"question":"שאלה 2?","options":["א","ב","ג","ד"],"correct_answer":"ג","explanation":"הסבר קצר"},
        {"question":"שאלה 3?","options":["א","ב","ג","ד"],"correct_answer":"א","explanation":"הסבר קצר"}
      ]
    },
    {
      "type": "example",
      "title": "דוגמה: שם",
      "content": "תיאור הדוגמה",
      "quiz_questions": [
        {"question":"...","options":["א","ב","ג","ד"],"correct_answer":"א","explanation":"..."},
        {"question":"...","options":["א","ב","ג","ד"],"correct_answer":"ב","explanation":"..."},
        {"question":"...","options":["א","ב","ג","ד"],"correct_answer":"ג","explanation":"..."}
      ]
    },
    {
      "type": "task",
      "title": "משימה",
      "question": "השאלה",
      "guidance": "הנחיה"
    }
  ],
  "closing": "פסקה מסכמת"
}

חשוב: לבלוקי concept ו-example - מערך quiz_questions חייב להכיל בדיוק 3 שאלות. לבלוקי task - לא צריך quiz_questions.`;

    } else if (action === 'generate_quiz_question') {
        // נשאר למקרי חירום / שיעורים ישנים שלא יש להם quiz_questions מובנות
        const { block_content, block_title, block_type, previous_attempts } = body;
        if (!block_content || block_content.length < 20) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרש תוכן בלוק (לפחות 20 תווים)' }) };
        }

        const attemptsNote = previous_attempts && previous_attempts.length 
            ? '\nתלמיד טעה ב-' + previous_attempts.length + ' שאלות קודמות, שאל אחרת:\n' + previous_attempts.map(function(q, i){ return (i+1) + '. ' + q; }).join('\n') + '\n'
            : '';

        prompt = `בנה שאלה אמריקאית 1 בלבד שבודקת הבנה של הבלוק.

${block_title ? 'כותרת: ' + block_title : ''}
תוכן:
"""
${block_content}
"""
${attemptsNote}
החזר JSON בלבד! ללא הסברים לפניו, ללא backticks. תתחיל ישר עם {

{"question":"השאלה?","options":["א","ב","ג","ד"],"correct_answer":"ב","explanation":"הסבר קצר"}`;

    } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    // קריאה ל-Gemini
    try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const temperature = action === 'generate_lesson' ? 0.8 : (action === 'generate_quiz_question' ? 0.6 : 0.7);
        // v3.1.0 - generate_lesson עם quiz_questions צריך יותר tokens
        let maxTokens;
        if (action === 'generate_lesson') maxTokens = 16384;
        else if (action === 'generate_quiz_question') maxTokens = 2048;
        else maxTokens = 8192;
        
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
            console.error('Empty response from Gemini.');
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'תגובה ריקה מ-Gemini' }) };
        }

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    parsed = JSON.parse(match[0]);
                } catch (e2) {
                    console.error('Cannot parse JSON. Raw:', text.substring(0, 1000));
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
            // v3.1.0 - אזהרה (לא שגיאה) אם quiz_questions חסרות לבלוקי concept/example
            parsed.blocks.forEach(function(block, i){
                if ((block.type === 'concept' || block.type === 'example') && (!block.quiz_questions || !Array.isArray(block.quiz_questions) || block.quiz_questions.length < 3)) {
                    console.warn('Block ' + i + ' (' + block.type + ') missing quiz_questions or has fewer than 3');
                }
            });
        }
        if (action === 'generate_quiz_question') {
            if (!parsed.question || !parsed.options || !Array.isArray(parsed.options) || parsed.options.length !== 4 || !parsed.correct_answer) {
                console.error('Invalid quiz structure');
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'מבנה השאלה לא תקין', raw: text.substring(0, 500) }) };
            }
            if (parsed.options.indexOf(parsed.correct_answer) === -1) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'התשובה הנכונה לא נמצאת ברשימת האפשרויות' }) };
            }
        }

        return { statusCode: 200, headers, body: JSON.stringify(parsed) };

    } catch (err) {
        console.error('Error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'שגיאה: ' + err.message }) };
    }
};
