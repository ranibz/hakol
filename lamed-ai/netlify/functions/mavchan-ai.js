// netlify/functions/mavchan-ai.js
// פונקציה לבניית ובדיקת מבחני בקרה + שיעורי לייב עם Gemini
// גרסה: 3.4.1 | תאריך: 2026-05-18 — החזרת cleanGeminiJson שתופס newlines בתוך strings (היה ב-v3.3.0 אבל ירד ב-v3.4.0)

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    const action = body.action;
    if (!action) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing action' }) };

    // ============================================
    // v3.4.1 - cleanGeminiJson: מתקן JSON שבור מ-Gemini
    // (newlines אמיתיים בתוך strings, backticks, וכו')
    // ============================================
    function cleanGeminiJson(text) {
        if (!text || typeof text !== 'string') return text;
        text = text.trim();
        if (text.indexOf('```') === 0) {
            text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        }
        var result = '';
        var inString = false;
        var prevChar = '';
        for (var i = 0; i < text.length; i++) {
            var c = text[i];
            if (c === '"' && prevChar !== '\\') {
                inString = !inString;
                result += c;
            } else if (inString) {
                if (c === '\n') result += '\\n';
                else if (c === '\r') result += '\\r';
                else if (c === '\t') result += '\\t';
                else if (c.charCodeAt(0) < 32) result += ' ';
                else result += c;
            } else {
                result += c;
            }
            prevChar = c;
        }
        return result;
    }

    function parseAndClean(text) {
        try { return JSON.parse(text); } catch(e) {}
        try { return JSON.parse(cleanGeminiJson(text)); } catch(e) {}
        var match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try { return JSON.parse(match[0]); } catch(e) {}
            try { return JSON.parse(cleanGeminiJson(match[0])); } catch(e) {}
        }
        return null;
    }

    let prompt = '';

    if (action === 'generate_test') {
        const { topic, num_choice, num_open, level } = body;
        if (!topic || topic.length < 10) return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרש נושא' }) };
        const totalQ = (num_choice || 0) + (num_open || 0);
        if (totalQ === 0) return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרשת שאלה אחת' }) };
        prompt = `אתה מורה בתיכון בישראל הבונה מבחן בדיקת הבנה.\n\nנושא:\n"""\n${topic}\n"""\n\nבנה מבחן בעברית עם בדיוק:\n- ${num_choice || 0} שאלות בחירה מרובה (4 אפשרויות, תשובה אחת)\n- ${num_open || 0} שאלות פתוחות\n${level ? 'רמה: ' + level : ''}\n\nהחזר JSON תקין: {"questions":[{"type":"choice","text":"?","options":["א","ב","ג","ד"],"correct_answer":"א","points":5},{"type":"text","text":"?","points":10,"expected_answer":"תיאור"}]}`;

    } else if (action === 'grade_answer') {
        const { question, expected_answer, student_answer, max_points } = body;
        if (!question || !student_answer) return { statusCode: 400, headers, body: JSON.stringify({ error: 'חסרים פרטים' }) };
        prompt = `אתה מורה. השאלה: ${question}\n${expected_answer ? 'אמורה לכלול: ' + expected_answer : ''}\nתשובה: ${student_answer}\n\nתן ציון 0-${max_points || 10}. החזר JSON: {"score":<n>,"feedback":"<טקסט>"}`;

    } else if (action === 'generate_lesson') {
        const { title, description, duration_minutes } = body;
        if (!title || title.length < 2) return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרשת כותרת' }) };
        const duration = duration_minutes || 45;
        const numTasks = duration <= 30 ? 2 : 3;
        const numConcepts = duration <= 30 ? 2 : 2;

        prompt = `בנה שיעור לייב בעברית לתלמידי תיכון.

נושא: "${title}"
${description ? 'הנחיות: ' + description + '\n' : ''}משך: ${duration} דקות

מבנה (סדר חשוב):
- ${numConcepts} בלוקי "concept" (הסבר מושג)
- 1-2 בלוקי "example" (דוגמה)
- ${numTasks} בלוקי "task" (משימת כתיבה)
סדר: concept → example → task → concept → task
כל "content" - 2-3 פסקאות אמיתיות עם דוגמאות מוחשיות.

החזר JSON תקין בלבד:
{"lesson_title":"כותרת","intro":"פתיחה","blocks":[{"type":"concept","title":"שם","content":"הסבר"},{"type":"example","title":"דוגמה","content":"תיאור"},{"type":"task","title":"משימה","question":"?","guidance":"הנחיה"}],"closing":"סיכום"}`;

    } else if (action === 'generate_quiz_question') {
        const { block_content, block_title, block_type, previous_attempts } = body;
        if (!block_content || block_content.length < 20) return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרש תוכן בלוק' }) };
        const attemptsNote = previous_attempts && previous_attempts.length 
            ? '\nתלמיד טעה ב-' + previous_attempts.length + ' שאלות, שאל שונה.\n'
            : '';
        prompt = `בנה שאלה אמריקאית 1 לבדיקת הבנה.

${block_title ? 'כותרת: ' + block_title : ''}
תוכן:
"""
${block_content}
"""
${attemptsNote}
החזר JSON בלבד: {"question":"?","options":["א","ב","ג","ד"],"correct_answer":"ב","explanation":"הסבר קצר"}`;

    } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const temperature = action === 'generate_lesson' ? 0.8 : 0.65;
        let maxTokens;
        if (action === 'generate_lesson') maxTokens = 4096;
        else if (action === 'generate_quiz_question') maxTokens = 1536;
        else maxTokens = 2048;
        
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
            console.error('Gemini HTTP error:', response.status, errText.substring(0, 500));
            if (response.status === 429 || errText.indexOf('RESOURCE_EXHAUSTED') !== -1 || errText.indexOf('quota') !== -1) {
                return { statusCode: 429, headers, body: JSON.stringify({ error: 'quota_exceeded: ה-AI עמוס, נסה שוב בעוד 30-60 שניות', details: errText.substring(0, 300) }) };
            }
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'שגיאה בקריאה ל-Gemini: ' + response.status, details: errText.substring(0, 300) }) };
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!text) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'תגובה ריקה מ-Gemini' }) };
        }

        // v3.4.1 - שימוש בפונקציית הניקוי המשופרת
        const parsed = parseAndClean(text);
        
        if (!parsed) {
            console.error('All parse attempts failed. Raw:', text.substring(0, 1000));
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'לא ניתן לפרסר את התגובה', raw: text.substring(0, 500) }) };
        }

        if (action === 'generate_lesson') {
            if (!parsed.blocks || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'מבנה התוכן לא תקין' }) };
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
