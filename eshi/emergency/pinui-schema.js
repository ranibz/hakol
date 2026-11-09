/* eshi/emergency/pinui-schema.js · v1.0.0 · 09/11/2026 · פיתוח: רני בן זאב
   מבנה "נוהל פינוי בית הספר בחירום" — משותף לדף התיק (pinui.html) ולטופס העדכון (pinui-update.html).
   כאן רק המבנה. הנתונים (דרכי הפעולה, הקווים והמלווים) נמצאים בשרת, בטבלה סגורה (pn_data),
   ונפתחים רק עם קוד צפייה או עריכה שנבדק בשרת (pn_get).

   סוגי שדות:  fields — שורות "תווית: ערך"        list  — רשימת שורות (ol:1 = ממוספרת)
               text   — פסקה חופשית                  table — טבלה עם עמודות קבועות ושורות להוספה
               areas  — אזורים, ולכל אזור טבלת קווים (מס' · שם הקו · מלווה 1 · מלווה 2 · מגורי מורה)
               flow   — תרשים מסלול הפינוי (קבוע, מצויר בדף) */

window.PN_LINE_COLS = [{k:'line', l:'שם הקו'}, {k:'esc1', l:'מלווה 1'}, {k:'esc2', l:'מלווה 2'}, {k:'home', l:'מגורי מורה'}];

window.PN_SCHEMA = [
  {n:'1', t:'צוות צל"ח וחדר המצב', parts:[
    {type:'fields', k:'hq', fields:[
      ['room', 'חדר המצב — צוות צל"ח'],
      ['transport', 'אחראי הסעות'],
      ['guardStaff', 'איש צוות ליד השומר'],
      ['group', 'קבוצת הוואטסאפ של מלווי ההסעות']]},
    {type:'flow', t:'מסלול הפינוי במבט אחד'}
  ]},
  {n:'2', t:'דרכי פעולה - פינוי בית הספר', parts:[
    {n:'2.1', t:'מחנכים', type:'list', k:'actTeachers', ol:1},
    {n:'2.2', t:'במקביל — צוות צל"ח', type:'list', k:'actTzalach', ol:1},
    {n:'2.3', t:'מלווי הסעות', type:'list', k:'actEscorts', ol:1},
    {n:'2.4', t:'שומר', type:'list', k:'actGuard'},
    {n:'2.5', t:'תלמידים שמתפנים עצמאית או ע"י הורים', type:'list', k:'actParents'}
  ]},
  {n:'3', t:'מלווי הסעות בזמן חירום', parts:[
    {type:'areas', k:'areas'}
  ]},
  {n:'4', t:'אישור/עדכון התיק', parts:[
    {type:'table', k:'approvals', num:1,
      cols:[{k:'date',l:'תאריך'}, {k:'name',l:'שם'}, {k:'role',l:'תפקיד'}, {k:'what',l:'אישור / עדכון'}, {k:'sign',l:'חתימה'}]}
  ]}
];

/* חיבור לשרת — טבלאות סגורות, רק דרך פונקציות עם קוד */
window.PN_SB = {url:'https://skfriefqnoxfzmamcokd.supabase.co', key:'sb_publishable_Qx7EDPbdyYE9iv7uMQBKhQ_Aeojd_Q0'};
window.pnRpc = async function(fn, body){
  const r = await fetch(`${PN_SB.url}/rest/v1/rpc/${fn}`, {method:'POST',
    headers:{apikey:PN_SB.key, Authorization:'Bearer '+PN_SB.key, 'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const t = await r.text();
  if(!r.ok){ let m = t; try{ m = JSON.parse(t).message || t; }catch(e){} throw new Error(m); }
  return t ? JSON.parse(t) : null;
};
window.pnEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
