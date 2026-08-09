/* ===================================================================
   school-gate.js · v2.0.0 · 2026-08-09
   שער סמל מוסד — מודול משותף לכל מסך שדורש כניסת מורה.

   שינוי מ-v1.1.0:
   · הסמל אינו נכנס עוד ישירות ל-school_id, אלא ל-school_id_pending וממתין
     לאישור מנהל. הסיבה: 91 מהמורים הועברו מ-Firebase כ-approved בלי שעברו
     השתלמות, ולכן status שלהם אינו מעיד שהם מוכרים. שער הסמל הוא נקודת
     המפגש היחידה שנותרה כדי לתפוס אותם לפני שהם מתחילים לעבוד.
   · הכפתור "לא עכשיו" הוסר — שער שאפשר לדלג עליו אינו שער.
   · מורה שכבר שלח בקשה רואה מסך המתנה עם הסמל שביקש, ואינו ממלא שוב.
   · מורה שבקשתו נדחתה רואה זאת ויכול לשלוח סמל מתוקן.

   דורש שתי עמודות: school_id_pending, school_name_pending

   הרקע: 91 מתוך 94 המורים במערכת נרשמו בלי שיוך לבית ספר, ולכן
   אי אפשר להפריד בין בתי ספר בלי רשימות מזהים קשיחות בקוד.
   סמל מוסד הוא מזהה מספרי ייחודי של משרד החינוך, ולכן אין בו את
   בעיית הווריאציות שיש בשם בית ספר.

   שימוש — אחרי שהמורה אומת מול lms_teachers:
     const t = await requireSchool(teacher);
     if(!t) return;            // אין סמל מאושר — עוצרים
     // מכאן t.school_id מובטח ומאושר

   הקובץ עצמאי ואינו תלוי בשום ספרייה.
   =================================================================== */
(function(global){
'use strict';

const SUP = 'https://eubgzfkkovxgijhrmnif.supabase.co';
const KEY = 'sb_publishable_vJ768fOwYWiDWeYsBBR45g_4NM4s55p';
const HDR = { apikey:KEY, Authorization:'Bearer '+KEY, 'Content-Type':'application/json' };

/* מנהלים — הרשאה לפי מזהה ולא לפי סיסמה משותפת, כדי שלא יידרש
   להחליף סיסמה כשמורה עוזב */
const ADMINS = ['-OmvKR-JvG0o6e4RuD2k'];

const esc = s => { const d=document.createElement('div'); d.textContent=s==null?'':s; return d.innerHTML; };

function css(){
  if(document.getElementById('sgCss')) return;
  const s=document.createElement('style'); s.id='sgCss';
  s.textContent=`
  #sgOv{position:fixed;inset:0;background:rgba(8,15,30,.78);display:flex;align-items:center;
    justify-content:center;padding:18px;z-index:99999;backdrop-filter:blur(4px);
    font-family:'Heebo','Rubik',sans-serif;direction:rtl}
  #sgBox{background:#fff;border-radius:20px;padding:30px 28px;max-width:430px;width:100%;
    text-align:center;color:#0f172a;box-shadow:0 20px 50px rgba(0,0,0,.3)}
  #sgBox h3{margin:0 0 6px;font-size:1.45rem;font-weight:900}
  #sgBox .s{color:#64748b;font-size:.95rem;line-height:1.6;margin:0 0 18px}
  #sgBox input{width:100%;box-sizing:border-box;font-family:inherit;font-size:1rem;
    padding:12px 14px;margin-bottom:10px;border:2px solid #e2e8f0;border-radius:12px;background:#fafbfc}
  #sgBox input:focus{outline:none;border-color:#0ea5e9;background:#fff}
  #sgBox button{width:100%;border:none;border-radius:12px;padding:13px;cursor:pointer;
    font-family:inherit;font-weight:700;font-size:1rem;background:#0ea5e9;color:#fff;margin-top:4px}
  #sgBox button:hover{background:#0284c7}
  #sgBox .x{background:none;color:#94a3b8;font-size:.9rem;padding:9px;margin-top:2px}
  #sgBox .x:hover{background:none;color:#64748b}
  #sgMsg{font-size:.9rem;font-weight:600;min-height:21px;margin-top:9px}
  #sgBox .note{font-size:.83rem;color:#94a3b8;margin-top:14px;line-height:1.6}
  #sgBox .wait{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;
    padding:13px 15px;font-size:.92rem;line-height:1.6;margin-bottom:6px}
  #sgBox .wait b{font-size:1.1rem;letter-spacing:2px}
  #sgBox .rej{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:12px;
    padding:12px 15px;font-size:.9rem;line-height:1.6;margin-bottom:12px}`;
  document.head.appendChild(s);
}

async function patch(id, body){
  const r = await fetch(SUP+'/rest/v1/lms_teachers?id=eq.'+encodeURIComponent(id),
    { method:'PATCH', headers:Object.assign({Prefer:'return=representation'},HDR),
      body:JSON.stringify(body) });
  if(!r.ok) throw new Error((await r.text()).slice(0,140));
  const t = await r.text(); return t?JSON.parse(t):[];
}

/* מציג את השער ומחזיר את המורה המעודכן, או null אם ויתר */
function ask(teacher, rejected){
  css();
  return new Promise(resolve => {
    const ov=document.createElement('div'); ov.id='sgOv';
    ov.innerHTML=`<div id="sgBox">
      <div style="font-size:2.6rem">🏫</div>
      <h3>סמל מוסד</h3>
      ${rejected?`<div class="rej">הבקשה הקודמת לא אושרה. אפשר לשלוח סמל מתוקן,
        או לפנות למנהל המערכת.</div>`:''}
      <p class="s">שלום ${esc(teacher.name||'')},<br>
        כדי להתחיל להשתמש במערכת נדרש סמל המוסד של בית הספר שלכם.<br>
        הבקשה תועבר לאישור מנהל המערכת, שייצור אתכם קשר.</p>
      <input id="sgId" inputmode="numeric" maxlength="8" placeholder="סמל מוסד — 6 ספרות" dir="ltr"
        style="text-align:center;letter-spacing:3px;font-weight:700">
      <input id="sgName" placeholder="שם בית הספר">
      <button id="sgGo">שליחה לאישור ←</button>
      <div id="sgMsg"></div>
      <p class="note">סמל המוסד מופיע בכל מסמך רשמי של בית הספר,
        ובאתר מוסדות חינוך של משרד החינוך.</p>
    </div>`;
    document.body.appendChild(ov);
    const $=id=>document.getElementById(id);
    $('sgId').focus();

    /* סמל מוכר → שם בית הספר מתמלא לבד, כדי שאותו מוסד לא ייכתב בכמה וריאציות */
    let lookT;
    $('sgId').addEventListener('input',()=>{
      const sid=$('sgId').value.replace(/\D/g,''); $('sgId').value=sid;
      clearTimeout(lookT); if(sid.length<6) return;
      lookT=setTimeout(async()=>{
        try{
          const r=await fetch(SUP+'/rest/v1/lms_teachers?select=school_name&school_id=eq.'+
            encodeURIComponent(sid)+'&school_name=not.is.null&limit=1',{headers:HDR});
          const d=await r.json();
          if(d&&d[0]&&d[0].school_name&&!$('sgName').value) $('sgName').value=d[0].school_name;
        }catch(e){}
      },400);
    });

    async function go(){
      const sid=$('sgId').value.replace(/\D/g,'');
      const nm=$('sgName').value.trim();
      const m=$('sgMsg');
      if(!/^\d{6,8}$/.test(sid)){ m.style.color='#dc2626';
        m.textContent='סמל מוסד הוא מספר בן 6 ספרות'; return; }
      if(nm.length<2){ m.style.color='#dc2626'; m.textContent='הזינו את שם בית הספר'; return; }
      m.style.color='#64748b'; m.textContent='שולח…';
      try{
        /* ל-pending ולא ל-school_id — עד שהמנהל יאשר */
        await patch(teacher.id, { school_id_pending:sid, school_name_pending:nm });
        ov.remove();
        waiting(teacher, sid, nm, resolve);
      }catch(e){ m.style.color='#dc2626'; m.textContent='שגיאה: '+e.message; }
    }
    $('sgGo').onclick=go;
    $('sgId').addEventListener('keyup',e=>{ if(e.key==='Enter')$('sgName').focus(); });
    $('sgName').addEventListener('keyup',e=>{ if(e.key==='Enter')go(); });
  });
}

/* מסך המתנה — אין דרך להמשיך ממנו. זו הנקודה שבה המורה נתפס להשתלמות. */
function waiting(teacher, sid, nm, resolve){
  css();
  const ov=document.createElement('div'); ov.id='sgOv';
  ov.innerHTML=`<div id="sgBox">
    <div style="font-size:2.6rem">⏳</div>
    <h3>הבקשה ממתינה לאישור</h3>
    <p class="s">שלום ${esc(teacher.name||'')},<br>
      הבקשה שלכם התקבלה. מנהל המערכת ייצור אתכם קשר להדרכה קצרה,
      ולאחריה תוכלו להיכנס למערכת.</p>
    <div class="wait"><b>${esc(sid)}</b><br>${esc(nm)}</div>
    <p class="note">כבר עברתם הדרכה? רעננו את הדף.</p>
  </div>`;
  document.body.appendChild(ov);
  resolve(null);
}
/* הפונקציה הראשית. מחזירה את המורה עם school_id, או null */
global.requireSchool = async function(teacher){
  if(!teacher || !teacher.id) return teacher || null;
  /* תמיד נשלף מהמסד — הסטטוס יכול היה להשתנות מאז הכניסה הקודמת */
  let row = null;
  try{
    const r=await fetch(SUP+'/rest/v1/lms_teachers?select=school_id,school_name,'+
      'school_id_pending,school_name_pending&id=eq.'+encodeURIComponent(teacher.id),
      { headers:HDR });
    const d=await r.json(); row=(d&&d[0])||null;
  }catch(e){
    /* תקלת רשת לא אמורה לחסום מורה שכבר מאושר */
    if(teacher.school_id) return teacher;
  }
  const sid = (row&&row.school_id) || teacher.school_id;
  if(sid) return Object.assign({}, teacher, row||{});

  /* בקשה שכבר נשלחה — מסך המתנה, בלי למלא שוב */
  if(row && row.school_id_pending){
    waiting(teacher, row.school_id_pending, row.school_name_pending||'', ()=>{});
    return null;
  }
  /* school_name בלי school_id = בקשה שנדחתה והמנהל ניקה את הסמל */
  return await ask(teacher, !!(row && row.school_name && !row.school_id));
};
/* ===== סשן משותף =====
   כל מסך מנהל כניסה משלו, ולכן מורה שעובר מדף השער לסביבת המורה
   נשאל שוב. sessionStorage משותף לכל הדפים באותו דומיין ונמחק
   בסגירת הדפדפן — ולכן עדיף על העברת מזהה בכתובת, שנשאר
   בהיסטוריה ובסימניות וניתן להעתקה. */
const SKEY_SESSION = 'lmsTeacher';
global.saveTeacherSession = t => {
  try{ sessionStorage.setItem(SKEY_SESSION, JSON.stringify({
    id:t.id, name:t.name, school_id:t.school_id, school_name:t.school_name,
    at: Date.now() })); }catch(e){}
};
global.loadTeacherSession = () => {
  try{
    const s = JSON.parse(sessionStorage.getItem(SKEY_SESSION) || 'null');
    if(!s || !s.id) return null;
    /* תוקף של שמונה שעות — יום לימודים */
    if(Date.now() - (s.at||0) > 8*60*60*1000){ sessionStorage.removeItem(SKEY_SESSION); return null; }
    return s;
  }catch(e){ return null; }
};
global.clearTeacherSession = () => { try{ sessionStorage.removeItem(SKEY_SESSION); }catch(e){} };

global.isAdmin = t => !!t && ADMINS.indexOf(String(t.id)) > -1;
global.SCHOOL_ADMINS = ADMINS;

})(window);
