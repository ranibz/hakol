// auth-login.js
// VERSION 1.0.0 - 02/06/2026 - פונקציית התחברות מאובטחת בצד השרת למערכת המטלות.
// בודקת סיסמאות מורה/מנהל בשרת (לא בדפדפן), ומחזירה רק מידע בטוח — לעולם לא סיסמה.
// משתמשת במפתח הסודי של Supabase דרך משתנה סביבה (env var) — לעולם לא בקוד.
// | פיתוח: רני בן זאב

const SUPABASE_URL = 'https://eubgzfkkovxgijhrmnif.supabase.co';
const SECRET = process.env.SUPABASE_SECRET_KEY;              // מוגדר ב-Netlify, לא בקוד
const MASTER_ADMIN_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function reply(statusCode, obj) {
  return { statusCode, headers: CORS, body: JSON.stringify(obj) };
}

async function sbGet(path) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: { apikey: SECRET, Authorization: 'Bearer ' + SECRET }
  });
  if (!r.ok) throw new Error('db ' + r.status);
  return r.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(200, {});
  if (event.httpMethod !== 'POST')   return reply(405, { ok: false, error: 'method' });
  if (!SECRET)                        return reply(500, { ok: false, error: 'server not configured' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return reply(400, { ok: false, error: 'bad request' }); }

  try {
    // ===== תלמיד: כניסה לפי ת"ז =====
    if (body.action === 'student') {
      const id = String(body.id || '').trim();
      if (!id) return reply(200, { ok: false, error: 'הכנס תעודת זהות' });
      const rows = await sbGet('students?id=eq.' + encodeURIComponent(id) + '&select=id,name,class');
      if (!rows.length) return reply(200, { ok: false, error: 'תעודת זהות לא נמצאה' });
      return reply(200, { ok: true, user: { id: rows[0].id, name: rows[0].name, class: rows[0].class } });
    }

    // ===== מורה: שם משתמש + סיסמה (נבדק בשרת) =====
    if (body.action === 'teacher') {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      if (!username || !password) return reply(200, { ok: false, error: 'הכנס שם משתמש וסיסמה' });
      const rows = await sbGet('teachers?username=eq.' + encodeURIComponent(username) + '&select=username,password,name,classes');
      if (!rows.length || rows[0].password !== password) return reply(200, { ok: false, error: 'שם משתמש או סיסמה שגויים' });
      return reply(200, { ok: true, user: { username: rows[0].username, name: rows[0].name, classes: rows[0].classes || '' } });
    }

    // ===== מנהל: שם משתמש + סיסמה (נבדק בשרת) =====
    if (body.action === 'admin') {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      if (!username || !password) return reply(200, { ok: false, error: 'הכנס שם משתמש וסיסמה' });
      // מנהל-על דרך משתנה סביבה — מחליף את הסיסמה הקשיחה הישנה
      if (MASTER_ADMIN_PASSWORD && username === 'admin' && password === MASTER_ADMIN_PASSWORD) {
        return reply(200, { ok: true, user: { username: 'admin' } });
      }
      const rows = await sbGet('admins?username=eq.' + encodeURIComponent(username) + '&select=username,password');
      if (!rows.length || rows[0].password !== password) return reply(200, { ok: false, error: 'שם משתמש או סיסמה שגויים' });
      return reply(200, { ok: true, user: { username: rows[0].username } });
    }

    return reply(200, { ok: false, error: 'unknown action' });
  } catch (e) {
    return reply(500, { ok: false, error: 'server error' });
  }
};
