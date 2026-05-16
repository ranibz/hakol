// netlify/functions/mavchan-ai.js
// פונקציה לבניית ובדיקת מבחני בקרה + שיעורי לייב עם Gemini
// גרסה: 3.3.0 | תאריך: 2026-05-16 — תיקון JSON שבור: cleanGeminiJson + קיצור prompt

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

    // ============================================
    // פונקציה לניקוי JSON שבור מ-Gemini
    // ============================================
    function cleanGeminiJson(text) {
        if (!text || typeof text !== 'string') return text;
        
        // ניקוי backticks אם יש
        text = text.trim();
        if (text.indexOf('```') === 0) {
            text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        }
        
        // הליכה דמוית סורק על הטקסט - בתוך string החלף newline/tab אמיתיים
        var result = '';
        var inString = false;
        var prevChar = '';
        for (var i = 0; i < text.length; i++) {
            var c = text[i];
            
            // זיהוי כניסה/יציאה מ-string
            if (c === '"' && prevChar !== '\\') {
                inString = !inString;
                result += c;
            } else if (inString) {
                // בתוך string - החלף תווים בעייתיים
                if (c === '\n') {
                    result += '\\n';
                } else if (c === '\r') {
                    result += '\\r';
                } else if (c === '\t') {
                    result += '\\t';
                } else if (c.charCodeAt(0) < 32) {
                    // תווי בקרה אחרים - דלג
                    result += ' ';
                } else {
                    result += c;
                }
            } else {
                result += c;
            }
            prevChar = c;
        }
        
        return result;
    }
    
    function parseAndClean(text) {
        // נסיון 1: ישיר
        try { return JSON.parse(text); } catch(e) {}
        
        // נסיון 2: עם ניקוי
        try { return JSON.parse(cleanGeminiJson(text)); } catch(e) {}
        
        // נסיון 3: חילוץ JSON מהטקסט
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

חשוב: בתוך string ב-JSON, אל תכניס שורה חדשה אמיתית. השתמש ברווחים בלבד.

החזר JSON בלבד:
{"questions":[{"type":"choice","text":"?","options":["א","ב","ג","ד"],"correct_answer":"א","points":5}]}`;

    } else if (action === 'grade_answer') {
        const { question, expected_answer, student_answer, max_points } = body;
        if (!question || !student_answer) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'חסרים פרטים' }) };
        }

        prompt = `אתה מורה בודק תשובה.

השאלה: ${question}
${expected_answer ? `תשובה אמורה לכלול: ${expected_answer}` : ''}
תשובת התלמיד: ${student_answer}

תן ציון 0-${max_points || 10} והערכה מילולית קצרה (משפט 1-2).
החזר JSON: {"score":<מספר>,"feedback":"<טקסט קצר>"}`;

    } else if (action === 'generate_lesson') {
        const { title, description, duration_minutes } = body;
        if (!title || title.length < 2) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרשת כותרת' }) };
        }
        const duration = duration_minutes || 45;
        // צמצום מספרים לקיצור התשובה
        const numTasks = duration <= 30 ? 2 : 3;
        const numConcepts = duration <= 30 ? 2 : 2;

        prompt = `אתה מורה. בנה שיעור לייב קצר בעברית לתלמידי תיכון.

נושא: "${title}"
${description ? 'הנחיות: ' + description + '\n' : ''}משך: ${duration} דקות

מבנה בלוקים (סדר חשוב):
1. concept - הסבר מושג (1-2 פסקאות בלבד)
2. example - דוגמה (1-2 פסקאות בלבד)  
3. task - שאלה לתלמיד
חזור על המבנה עד ל-${numConcepts + numTasks + 1} בלוקים סה"כ.

⚠️ חשוב מאוד - כללי JSON:
- אל תשתמש בשורה חדשה אמיתית בתוך value של string
- במקום שורה חדשה, השתמש ברווח רגיל
- כל string ב-JSON חייב להיות שורה אחת בלבד
- אל תוסיף backticks (\`\`\`) מסביב

החזר JSON תקין:
{"lesson_title":"כותרת","intro":"פתיחה במשפט אחד","blocks":[{"type":"concept","title":"שם","content":"הסבר ברצף אחד ללא שורות חדשות"},{"type":"example","title":"דוגמה","content":"הסבר ברצף אחד"},{"type":"task","title":"משימה","question":"שאלה?","guidance":"הנחיה קצרה"}],"closing":"סיכום קצר"}`;

    } else if (action === 'generate_block_quiz') {
        const { block_content, block_title, block_type } = body;
        if (!block_content || block_content.length < 20) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרש תוכן בלוק' }) };
        }

        prompt = `בנה 3 שאלות אמריקאיות שונות לבדיקת הבנה:

${block_title ? 'כותרת: ' + block_title : ''}
תוכן:
"""
${block_content}
"""

⚠️ חוקי JSON: אל תשתמש בשורה חדשה אמיתית בתוך string. רק רווח רגיל.

החזר JSON: {"questions":[{"question":"?","options":["א","ב","ג","ד"],"correct_answer":"ב","explanation":"הסבר קצר"},{"question":"?","options":["א","ב","ג","ד"],"correct_answer":"ג","explanation":"הסבר"},{"question":"?","options":["א","ב","ג","ד"],"correct_answer":"א","explanation":"הסבר"}]}`;

    } else if (action === 'generate_quiz_question') {
        const { block_content, block_title, block_type, previous_attempts } = body;
        if (!block_content || block_content.length < 20) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרש תוכן בלוק' }) };
        }

        const attemptsNote = previous_attempts && previous_attempts.length 
            ? '\nתלמיד טעה, שאל שונה.\n'
            : '';

        prompt = `בנה שאלה אמריקאית 1:

${block_title ? 'כותרת: ' + block_title : ''}
תוכן:
"""
${block_content}
"""
${attemptsNote}
⚠️ חוקי JSON: אל תשתמש בשורה חדשה אמיתית בתוך string.

החזר JSON: {"question":"?","options":["א","ב","ג","ד"],"correct_answer":"ב","explanation":"הסבר"}`;

    } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    // קריאה ל-Gemini
    try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const temperature = action === 'generate_lesson' ? 0.75 : 0.6;
        // v3.3.0 - הקטנה משמעותית כדי לעמוד ב-10 שניות
        let maxTokens;
        if (action === 'generate_lesson') maxTokens = 3072;
        else if (action === 'generate_block_quiz') maxTokens = 2048;
        else if (action === 'generate_quiz_question') maxTokens = 1024;
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
            console.error('Gemini error:', errText);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'שגיאה בקריאה ל-Gemini', details: errText.substring(0, 500) }) };
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!text) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'תגובה ריקה מ-Gemini' }) };
        }

        // v3.3.0 - שימוש בפונקציית הניקוי
        const parsed = parseAndClean(text);
        
        if (!parsed) {
            console.error('All parse attempts failed. Raw:', text.substring(0, 1000));
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'לא ניתן לפרסר את התגובה', raw: text.substring(0, 500) }) };
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
