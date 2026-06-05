// videocast-id-lookup.js
// VERSION 1.0.0 - 05/06/2026 - זיהוי תלמיד לפי ת"ז בצד השרת (פרויקט lamed).
// מקבל ת"ז, מחזיר רק את הזהות של אותו תלמיד (שם/כיתה/מורה/בית ספר) — לעולם לא את רשימת הת"ז.
// משתמש במפתח הסודי של lamed דרך משתנה סביבה (env var) — לעולם לא בקוד.
// | פיתוח: רני בן זאב

const SUPABASE_URL = 'https://hykpagdgaeulhghyvcqw.supabase.co';
const SECRET = process.env.LAMED_SECRET_KEY;   // מוגדר ב-Netlify, לא בקוד

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function reply(statusCode, obj) {
  return { statusCode, headers: CORS, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(200, {});
  if (event.httpMethod !== 'POST')   return reply(405, { ok: false, error: 'method' });
  if (!SECRET)                        return reply(500, { ok: false, error: 'server not configured' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return reply(400, { ok: false, error: 'bad request' }); }

  const nid = String(body.national_id || '').trim();
  if (!nid) return reply(200, { ok: false, error: 'הכנס תעודת זהות' });

  try {
    const url = SUPABASE_URL + '/rest/v1/videocast_roster'
      + '?national_id=eq.' + encodeURIComponent(nid)
      + '&select=school_name,teacher_name,student_class,student_name';
    const r = await fetch(url, { headers: { apikey: SECRET, Authorization: 'Bearer ' + SECRET } });
    if (!r.ok) throw new Error('db ' + r.status);
    const rows = await r.json();
    if (!rows.length) return reply(200, { ok: false, error: 'תעודת זהות לא נמצאה' });
    const s = rows[0];
    return reply(200, { ok: true, student: {
      school_name: s.school_name, teacher_name: s.teacher_name,
      student_class: s.student_class, student_name: s.student_name
    }});
  } catch (e) {
    return reply(500, { ok: false, error: 'server error' });
  }
};
