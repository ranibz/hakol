// netlify/functions/mavchan-ai.js
// פונקציה לבניית ובדיקת מבחני בקרה + שיעורי לייב עם Gemini
// גרסה: 3.2.0 | תאריך: 2026-05-16 — הפרדה: generate_lesson (תוכן בלבד), generate_block_quiz (3 שאלות לבלוק יחיד)

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
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרש נושא או טקסט' }) };
        }
        const totalQ = (num_choice || 0) + (num_open || 0);
        if (totalQ === 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרשת לפחות שאלה אחת' }) };
        }

        prompt = `אתה מורה בתיכון בישראל הבונה מבחן בדיקת הבנה.

נושא:
"""
${topic}
"""

בנה מבחן בעברית עם בדיוק:
- ${num_choice || 0} שאלות בחירה מרובה (4 אפשרויות, תשובה אחת)
- ${num_open || 0} שאלות פתוחות

החזר JSON תקין בלבד:
{"questions":[{"type":"choice","text":"?","options":["א","ב","ג","ד"],"correct_answer":"א","points":5},{"type":"text","text":"?","points":10,"expected_answer":"תיאור"}]}`;

    } else if (action === 'grade_answer') {
        const { question, expected_answer, student_answer, max_points } = body;
        if (!question || !student_answer) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'חסרים פרטים' }) };
        }

        prompt = `אתה מורה בודק תשובה.

השאלה: ${question}
${expected_answer ? `תשובה אמורה לכלול: ${expected_answer}` : ''}
תשובת התלמיד: ${student_answer}

תן ציון 0-${max_points || 10} והערכה מילולית קצרה.
החזר JSON בלבד: {"score":<מספר>,"feedback":"<טקסט>"}`;

    } else if (action === 'generate_lesson') {
        // גרסה קלה - בלי quiz_questions (יוצרים אחרי)
        const { title, description, duration_minutes } = body;
        if (!title || title.length < 2) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרשת כותרת' }) };
        }
        const duration = duration_minutes || 45;
        const numTasks = duration <= 20 ? 2 : duration <= 40 ? 3 : duration <= 60 ? 4 : 5;
        const numConcepts = duration <= 20 ? 2 : duration <= 40 ? 3 : 4;

        prompt = `אתה מורה בכיר בתיכון בישראל המכין שיעור לייב אינטראקטיבי.

נושא: "${title}"
${description ? `הנחיות: ${description}\n` : ''}
משך: ${duration} דקות

בנה תוכן שיעור אינטראקטיבי:
- ${numConcepts} בלוקי "concept" (הסבר מושג)
- ${numTasks} בלוקי "task" (משימת כתיבה)
- אפשר 1-2 בלוקי "example" (דוגמה)
- סדר: concept → example → task → concept → task
- כל "content" - 2-4 פסקאות אמיתיות עם דוגמאות מוחשיות
- עברית מצוינת, בגובה העיניים של תלמיד תיכון

החזר JSON תקין בלבד (ללא backticks):
{
  "lesson_title": "כותרת",
  "intro": "פסקת פתיחה",
  "blocks": [
    {"type":"concept","title":"כותרת","content":"הסבר 2-3 פסקאות"},
    {"type":"example","title":"דוגמה","content":"תיאור"},
    {"type":"task","title":"משימה","question":"שאלה?","guidance":"הנחיה"}
  ],
  "closing": "סיכום"
}`;

    } else if (action === 'generate_block_quiz') {
        // חדש v3.2.0 - יוצר 3 שאלות לבלוק יחיד
        const { block_content, block_title, block_type } = body;
        if (!block_content || block_content.length < 20) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרש תוכן בלוק' }) };
        }

        prompt = `אתה מורה. בנה 3 שאלות אמריקאיות שונות לבדיקת הבנה של הבלוק הבא.

${block_title ? 'כותרת: ' + block_title : ''}
תוכן:
"""
${block_content}
"""

הנחיות:
1. 3 שאלות שונות, מזוויות שונות
2. כל שאלה: 4 אפשרויות, רק 1 נכונה
3. בודקות הבנה אמיתית, לא שינון
4. עברית פשוטה וברורה
5. הוסף הסבר קצר לכל שאלה

החזר JSON בלבד! ללא הסברים, ללא backticks. תתחיל ב-{

{"questions":[
  {"question":"שאלה 1?","options":["א","ב","ג","ד"],"correct_answer":"ב","explanation":"הסבר"},
  {"question":"שאלה 2?","options":["א","ב","ג","ד"],"correct_answer":"ג","explanation":"הסבר"},
  {"question":"שאלה 3?","options":["א","ב","ג","ד"],"correct_answer":"א","explanation":"הסבר"}
]}`;

    } else if (action === 'generate_quiz_question') {
        // נשאר fallback לתאימות אחורה - שאלה אחת
        const { block_content, block_title, block_type, previous_attempts } = body;
        if (!block_content || block_content.length < 20) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרש תוכן בלוק' }) };
        }

        const attemptsNote = previous_attempts && previous_attempts.length 
            ? '\nתלמיד טעה בשאלות:\n' + previous_attempts.map(function(q, i){ return (i+1) + '. ' + q; }).join('\n') + '\nשאל שאלה שונה.\n'
            : '';

        prompt = `בנה שאלה אמריקאית 1 שבודקת הבנה.

${block_title ? 'כותרת: ' + block_title : ''}
תוכן:
"""
${block_content}
"""
${attemptsNote}
החזר JSON בלבד! התחל ישר ב-{

{"question":"?","options":["א","ב","ג","ד"],"correct_answer":"ב","explanation":"הסבר"}`;

    } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    // קריאה ל-Gemini
    try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const temperature = action === 'generate_lesson' ? 0.8 : 0.65;
        let maxTokens;
        if (action === 'generate_lesson') maxTokens = 8192;
        else if (action === 'generate_block_quiz') maxTokens = 3072;
        else if (action === 'generate_quiz_question') maxTokens = 1536;
        else maxTokens = 4096;
        
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
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'תגובה ריקה מ-Gemini' }) };
        }

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                try { parsed = JSON.parse(match[0]); }
                catch (e2) {
                    console.error('Parse failed. Raw:', text.substring(0, 500));
                    return { statusCode: 500, headers, body: JSON.stringify({ error: 'לא ניתן לפרסר', raw: text.substring(0, 300) }) };
                }
            } else {
                console.error('No JSON. Raw:', text.substring(0, 500));
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'אין JSON', raw: text.substring(0, 300) }) };
            }
        }

        // ולידציה
        if (action === 'generate_lesson') {
            if (!parsed.blocks || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'מבנה התוכן לא תקין' }) };
            }
        }
        if (action === 'generate_block_quiz') {
            if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length < 1) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'מבנה השאלות לא תקין' }) };
            }
            // פילטר ולידציה לכל שאלה
            parsed.questions = parsed.questions.filter(function(q){
                return q && q.question && q.options && Array.isArray(q.options) && q.options.length === 4 && q.correct_answer && q.options.indexOf(q.correct_answer) !== -1;
            });
            if (parsed.questions.length === 0) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'אין שאלות תקינות' }) };
            }
        }
        if (action === 'generate_quiz_question') {
            if (!parsed.question || !parsed.options || !Array.isArray(parsed.options) || parsed.options.length !== 4 || !parsed.correct_answer) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'מבנה השאלה לא תקין' }) };
            }
            if (parsed.options.indexOf(parsed.correct_answer) === -1) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'תשובה לא ברשימה' }) };
            }
        }

        return { statusCode: 200, headers, body: JSON.stringify(parsed) };

    } catch (err) {
        console.error('Error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'שגיאה: ' + err.message }) };
    }
};
