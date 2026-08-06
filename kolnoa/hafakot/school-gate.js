/* ===================================================================
   school-gate.js · v1.0.0 · 2026-08-05
   שער סמל מוסד — מודול משותף לכל מסך שדורש כניסת מורה.

   הרקע: 91 מתוך 94 המורים במערכת נרשמו בלי שיוך לבית ספר, ולכן
   אי אפשר להפריד בין בתי ספר בלי רשימות מזהים קשיחות בקוד.
   סמל מוסד הוא מזהה מספרי ייחודי של משרד החינוך, ולכן אין בו את
   בעיית הווריאציות שיש בשם בית ספר.

   שימוש — אחרי שהמורה אומת מול lms_teachers:
     const t = await requireSchool(teacher);
     if(!t) return;            // המורה בחר לא למלא — עוצרים
     // מכאן t.school_id מובטח

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
  #sgBox .note{font-size:.83rem;color:#94a3b8;margin-top:14px;line-height:1.6}`;
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
function ask(teacher){
  css();
  return new Promise(resolve => {
    const ov=document.createElement('div'); ov.id='sgOv';
    ov.innerHTML=`<div id="sgBox">
      <div style="font-size:2.6rem">🏫</div>
      <h3>סמל מוסד</h3>
      <p class="s">שלום ${esc(teacher.name||'')},<br>
        כדי להמשיך נדרש סמל המוסד של בית הספר שלכם.<br>
        הוא מבדיל בין בתי הספר במערכת, כך שתראו רק את הכיתות שלכם.</p>
      <input id="sgId" inputmode="numeric" maxlength="8" placeholder="סמל מוסד — 6 ספרות" dir="ltr"
        style="text-align:center;letter-spacing:3px;font-weight:700">
      <input id="sgName" placeholder="שם בית הספר">
      <button id="sgGo">שמירה והמשך ←</button>
      <button class="x" id="sgSkip">לא עכשיו</button>
      <div id="sgMsg"></div>
      <p class="note">סמל המוסד מופיע בכל מסמך רשמי של בית הספר,
        ובאתר מוסדות חינוך של משרד החינוך.</p>
    </div>`;
    document.body.appendChild(ov);
    const $=id=>document.getElementById(id);
    $('sgId').focus();

    async function go(){
      const sid=$('sgId').value.replace(/\D/g,'');
      const nm=$('sgName').value.trim();
      const m=$('sgMsg');
      if(!/^\d{6,8}$/.test(sid)){ m.style.color='#dc2626';
        m.textContent='סמל מוסד הוא מספר בן 6 ספרות'; return; }
      if(nm.length<2){ m.style.color='#dc2626'; m.textContent='הזינו את שם בית הספר'; return; }
      m.style.color='#64748b'; m.textContent='שומר…';
      try{
        const r=await patch(teacher.id, { school_id:sid, school_name:nm });
        ov.remove();
        resolve(Object.assign({}, teacher, (r&&r[0])||{school_id:sid, school_name:nm}));
      }catch(e){ m.style.color='#dc2626'; m.textContent='שגיאה: '+e.message; }
    }
    $('sgGo').onclick=go;
    $('sgId').addEventListener('keyup',e=>{ if(e.key==='Enter')$('sgName').focus(); });
    $('sgName').addEventListener('keyup',e=>{ if(e.key==='Enter')go(); });
    $('sgSkip').onclick=()=>{ ov.remove(); resolve(null); };
  });
}

/* הפונקציה הראשית. מחזירה את המורה עם school_id, או null */
global.requireSchool = async function(teacher){
  if(!teacher || !teacher.id) return teacher || null;
  if(teacher.school_id) return teacher;
  /* ייתכן שהשדה קיים במסד אך לא נשלף בשאילתת הכניסה */
  try{
    const r=await fetch(SUP+'/rest/v1/lms_teachers?select=school_id,school_name&id=eq.'+
      encodeURIComponent(teacher.id), { headers:HDR });
    const d=await r.json();
    if(d && d[0] && d[0].school_id) return Object.assign({}, teacher, d[0]);
  }catch(e){}
  return await ask(teacher);
};
global.isAdmin = t => !!t && ADMINS.indexOf(String(t.id)) > -1;
global.SCHOOL_ADMINS = ADMINS;

})(window);
