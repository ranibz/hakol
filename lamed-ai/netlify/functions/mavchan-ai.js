// netlify/functions/mavchan-ai.js
// פונקציה לבניית ובדיקת מבחני בקרה + שיעורי לייב עם Gemini
// גרסה: 3.5.0 | תאריך: 2026-05-18
// MINOR שינויים:
// 1. generate_lesson עכשיו מחזיר 3 שאלות quiz מובנות לכל בלוק concept/example
//    => תלמיד מקבל שאלה ב-0 שניות בלייב, בלי להמתין ל-AI
// 2. תיקון ולידציה ב-generate_quiz_question (וב-quiz של generate_lesson):
//    קבלת correct_answer כאות "א/ב/ג/ד" או כטקסט המלא של האפשרות
//    => פתרון של "תשובה לא ברשימה" שהפיל 500
// 3. פרומפט quiz מחודד שמבקש במפורש את הטקסט המלא של האפשרות הנכונה
// 4. maxOutputTokens ל-generate_lesson הועלה ל-12288 (כי יש עכשיו גם quiz בכל בלוק)

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
    // cleanGeminiJson: מתקן JSON שבור מ-Gemini
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

    // ============================================
    // v3.5.0 - נורמליזציה של correct_answer
    // מקבל: options=["א. רעיון א","ב. רעיון ב",...] ו-correct="ב"
    // מחזיר: correct_answer = "ב. רעיון ב" (הטקסט המלא)
    // אם correct כבר תואם לאחת האפשרויות - מחזיר אותו כמו שהוא.
    // אם לא מצליח להתאים - מחזיר null.
    // ============================================
    function normalizeQuizAnswer(options, correct) {
        if (!Array.isArray(options) || options.length !== 4) return null;
        if (!correct || typeof correct !== 'string') return null;
        var ca = correct.trim();
        // 1. אם זה כבר באפשרויות במדויק - מצוין
        if (options.indexOf(ca) !== -1) return ca;
        // 2. אם זה אות אחת (א/ב/ג/ד או 1/2/3/4 או A/B/C/D) - מצא לפי אינדקס
        var letterMap = {'א':0,'ב':1,'ג':2,'ד':3,'1':0,'2':1,'3':2,'4':3,'A':0,'B':1,'C':2,'D':3,'a':0,'b':1,'c':2,'d':3};
        if (ca.length === 1 && letterMap.hasOwnProperty(ca)) {
            return options[letterMap[ca]];
        }
        // 3. אם זה מתחיל ב"א." או "א)" או "א " - חתוך והשווה
        var prefixMatch = ca.match(/^([אבגד1-4A-Da-d])[\.\)\s]/);
        if (prefixMatch) {
            var idx = letterMap[prefixMatch[1]];
            if (idx !== undefined) return options[idx];
        }
        // 4. אולי correct הוא תת-מחרוזת של אחת האפשרויות (Gemini החזיר רק את הטקסט בלי האות)
        for (var i = 0; i < options.length; i++) {
            if (options[i].indexOf(ca) !== -1 || ca.indexOf(options[i]) !== -1) {
                return options[i];
            }
        }
        return null;
    }

    // ============================================
    // v3.5.0 - ולידציה וניקוי של שאלת quiz בודדת
    // מחזיר אובייקט תקין או null
    // ============================================
    function validateQuizQuestion(q) {
        if (!q || typeof q !== 'object') return null;
        if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4) return null;
        var normalized = normalizeQuizAnswer(q.options, q.correct_answer);
        if (!normalized) return null;
        return {
            question: q.question,
            options: q.options,
            correct_answer: normalized,
            explanation: q.explanation || ''
        };
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

        // v3.5.0 - הפרומפט מחייב יצירת 3 שאלות quiz לכל בלוק concept/example
        prompt = `בנה שיעור לייב בעברית לתלמידי תיכון.

נושא: "${title}"
${description ? 'הנחיות: ' + description + '\n' : ''}משך: ${duration} דקות

⚠️ חשוב מאוד - כל פסקה צריכה להיות קצרה:
- "intro": משפט אחד או שניים בלבד (עד 250 תווים)
- כל "content" של בלוק: 2-3 משפטים קצרים, לא יותר (עד 400 תווים)
- "closing": משפט אחד בלבד

מבנה (סדר חשוב):
- ${numConcepts} בלוקי "concept" (הסבר מושג קצר) - כל אחד עם quiz של 3 שאלות
- 1 בלוק "example" (דוגמה קצרה) - עם quiz של 3 שאלות
- ${numTasks} בלוקי "task" (משימת כתיבה) - בלי quiz
סדר: concept → example → task → concept → task

⚠️ כללי quiz (חובה!):
1. כל בלוק concept ו-example מקבל מערך "quiz" עם בדיוק 3 שאלות שונות זו מזו.
2. כל שאלה היא אמריקאית עם 4 אפשרויות.
3. ב-"correct_answer" החזר את הטקסט המלא של האפשרות הנכונה - בדיוק כפי שמופיע ב-"options". לא רק את האות.
4. השאלות צריכות לבדוק הבנה אמיתית של התוכן, לא שינון של מילים.
5. בלוקי task לא מקבלים quiz.

החזר JSON תקין בלבד במבנה הזה:
{
  "lesson_title":"כותרת",
  "intro":"פתיחה קצרה",
  "blocks":[
    {
      "type":"concept",
      "title":"שם המושג",
      "content":"הסבר קצר",
      "quiz":[
        {"question":"שאלה 1?","options":["טקסט א","טקסט ב","טקסט ג","טקסט ד"],"correct_answer":"טקסט ב","explanation":"הסבר קצר למה ב' נכונה"},
        {"question":"שאלה 2?","options":["...","...","...","..."],"correct_answer":"...","explanation":"..."},
        {"question":"שאלה 3?","options":["...","...","...","..."],"correct_answer":"...","explanation":"..."}
      ]
    },
    {
      "type":"example",
      "title":"דוגמה",
      "content":"תיאור קצר",
      "quiz":[ {"question":"...","options":[...],"correct_answer":"...","explanation":"..."}, ... 3 בסך הכל ... ]
    },
    {
      "type":"task",
      "title":"משימה",
      "question":"שאלה לכתיבה?",
      "guidance":"הנחיה"
    }
  ],
  "closing":"סיכום משפט אחד"
}`;

    } else if (action === 'generate_quiz_question') {
        const { block_content, block_title, block_type, previous_attempts } = body;
        if (!block_content || block_content.length < 20) return { statusCode: 400, headers, body: JSON.stringify({ error: 'נדרש תוכן בלוק' }) };
        const attemptsNote = previous_attempts && previous_attempts.length 
            ? '\nתלמיד טעה ב-' + previous_attempts.length + ' שאלות, שאל שונה.\n'
            : '';
        // v3.5.0 - פרומפט מחודד שדורש correct_answer כטקסט מלא
        prompt = `בנה שאלה אמריקאית 1 לבדיקת הבנה.

${block_title ? 'כותרת: ' + block_title : ''}
תוכן:
"""
${block_content}
"""
${attemptsNote}
⚠️ חשוב: ב-"correct_answer" החזר את הטקסט המלא של האפשרות הנכונה - בדיוק כפי שכתבת אותה ב-"options". לא את האות בלבד.

החזר JSON בלבד: {"question":"?","options":["טקסט אפשרות א","טקסט אפשרות ב","טקסט אפשרות ג","טקסט אפשרות ד"],"correct_answer":"<הטקסט המלא של האפשרות הנכונה>","explanation":"הסבר קצר"}`;

    } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }

    try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const temperature = action === 'generate_lesson' ? 0.8 : 0.65;
        let maxTokens;
        if (action === 'generate_lesson') maxTokens = 12288; // v3.5.0 - יותר tokens כי יש עכשיו quiz בכל בלוק
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

        const parsed = parseAndClean(text);
        
        if (!parsed) {
            console.error('All parse attempts failed. Raw:', text.substring(0, 1000));
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'לא ניתן לפרסר את התגובה', raw: text.substring(0, 500) }) };
        }

        // ============================================
        // ולידציות וניקוי לפי סוג ה-action
        // ============================================
        if (action === 'generate_lesson') {
            if (!parsed.blocks || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'מבנה התוכן לא תקין' }) };
            }
            // v3.5.0 - נקה ונרמל את כל ה-quiz שבבלוקים
            parsed.blocks.forEach(function(block) {
                if ((block.type === 'concept' || block.type === 'example') && Array.isArray(block.quiz)) {
                    var cleanedQuiz = [];
                    block.quiz.forEach(function(q) {
                        var v = validateQuizQuestion(q);
                        if (v) cleanedQuiz.push(v);
                    });
                    block.quiz = cleanedQuiz; // אם נמוך מ-3 - לא קריטי, ה-frontend יוכל ליפול ל-AI כ-fallback
                }
            });
        }
        
        if (action === 'generate_quiz_question') {
            // v3.5.0 - ולידציה סלחנית: מנסה לתקן לפני שזורק 500
            var validated = validateQuizQuestion(parsed);
            if (!validated) {
                console.error('Quiz validation failed:', JSON.stringify(parsed).substring(0, 500));
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'מבנה השאלה לא תקין' }) };
            }
            return { statusCode: 200, headers, body: JSON.stringify(validated) };
        }

        return { statusCode: 200, headers, body: JSON.stringify(parsed) };

    } catch (err) {
        console.error('Error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'שגיאה: ' + err.message }) };
    }
};
