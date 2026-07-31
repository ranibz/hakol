/* ===== paste-guard.js · v2.8.0 · 2026-07-31 =====
   שומר על כתיבה עצמאית בשדות הפתוחים.

   מה מותר:  העתקה מהקטע שבדף אל התשובה · גזור־הדבק בתוך התשובה עצמה
   מה חסום:  הדבקת טקסט שמקורו מחוץ לדף (AI, ויקיפדיה, מסמך, צ׳אט)

   איך זה מבחין: כל העתקה שנעשית *בתוך הדף* נרשמת. בהדבקה, הטקסט מושווה
   למה שנרשם. טקסט חיצוני לא ייתכן שיתאים — ולכן ייחסם.

   התקנה: <script src="paste-guard.js"></script> לפני סוף ה-body. זהו.
   הקובץ מתקין את עצמו על כל שדות הכתיבה, כולל כאלה שנוצרים אחר כך.

   דיווח: מספר הניסיונות נשלח אוטומטית עם ההגשה, תחת answers._paste
   בנוסף (v2.2.0): הבדיקה דו-ממדית — עצמאות הכתיבה **וגם** מענה למטלה.
   תשובה עצמאית לגמרי שאינה עונה על השאלה נחסמת גם היא.

   בודק עצמאות כתיבה. התלמיד יכול ללחוץ "בדיקת התשובה" בכל עת,
   ובהגשה מתבצעת בדיקה אוטומטית. תשובה מעל הסף חוסמת הגשה עד לתיקון.

   כלל בטיחות: תקלה טכנית לעולם אינה חוסמת הגשה. חוסמים רק על תוצאה אמיתית מעל הסף.
   וכשהבדיקה אינה זמינה (אין רשת / הפונקציה נפלה) — במקום לעבור בשקט, מוצגת לתלמיד
   רשימת בדיקה עצמית לפני השליחה. אישור אחד וההגשה ממשיכה.

   בנוסף (v2.4.0): מצב מפתח. כפתורי הפיתוח בדפים (class="dev" / "dev-skip")
   מוסתרים מכולם כברירת מחדל. להפעלה במכשיר שלכם — הוסיפו פעם אחת ?dev=1 לכתובת;
   ההגדרה נשמרת במכשיר. לכיבוי — ?dev=0.

   בנוסף (v2.8.0): הסיסמה חלה גם על talmid.html — גם בבחירה ראשונה וגם
   בכניסה אוטומטית של תלמיד שנזכר במכשיר.

   בנוסף (v2.7.0): סיסמת תלמיד. אחרי בחירת השם מרשימת הכיתה נדרשת סיסמה.
   ברירת המחדל לכולם 1234, וכל תלמיד יכול לשנות לעצמו. דורש את הטבלה lms_student_pw.
   כיבוי: PG_CONFIG.studentPw=false · שינוי ברירת המחדל: PG_CONFIG.defaultPw

   בנוסף (v2.6.0): מורה בלי כיתות מקבלת חלון מפורש שמפנה אותה ליצירת כיתה,
   והשלמה אוטומטית של הדפדפן מנוטרלת בשדה הכיתה כדי שלא תציע כיתות של מורה אחרת.

   בנוסף (v2.5.0): תיקון בורר הכיתה בכניסת המורה. הקוד בקבצים בונה את הרשימה פעם
   אחת בלבד, ולכן החלפת טלפון השאירה את הכיתות של המורה הקודמת. כאן הרשימה נבנית
   מחדש בכל שינוי טלפון, ומורה בלי כיתות מקבלת הודעה מפורשת במקום שדה ריק.

   שינוי הודעה, סף או כיבוי: ראו PG_CONFIG למטה.
*/
(function(){
  'use strict';
  if(window.__PASTE_GUARD__)return;

  /* ---------- מצב מפתח ----------
     רץ ראשון בכוונה: מזריק את ה-CSS לפני שהדפדפן מספיק לצייר את הכפתור. */
  var DEVKEY='pg_dev';
  (function(){
    try{
      var q=String(location.search||'');
      var m=/[?&]dev=([01])/.exec(q);
      if(m){
        if(m[1]==='1')localStorage.setItem(DEVKEY,'1');
        else localStorage.removeItem(DEVKEY);
      }
    }catch(e){}
    var on=false;
    try{ on=localStorage.getItem(DEVKEY)==='1'; }catch(e){}
    var st=document.createElement('style');
    st.id='pgDev';
    st.textContent = on
      ? '.pg-devtag{position:fixed;top:12px;right:12px;z-index:99997;background:#111827;color:#fff;'+
        'border-radius:20px;padding:4px 13px;font:700 11px/1.6 system-ui,sans-serif;opacity:.85}'
      : '.dev,.dev-skip{display:none!important}';
    (document.head||document.documentElement).appendChild(st);
    if(on){
      var tag=function(){
        try{
          if(document.getElementById('pgDevTag'))return;
          var d=document.createElement('div');d.id='pgDevTag';d.className='pg-devtag';
          d.textContent='מצב מפתח';d.title='כיבוי: הוסיפו ?dev=0 לכתובת';
          (document.body||document.documentElement).appendChild(d);
        }catch(e){}
      };
      if(document.body)tag(); else document.addEventListener('DOMContentLoaded',tag);
    }
  })();

  var CFG=window.PG_CONFIG||{};
  var ON       = CFG.enabled!==false;
  var MSG      = CFG.msg||'כאן כותבים במילים שלכם. אפשר לצטט מהקטע שבדף, אבל לא להדביק טקסט מבחוץ.';
  var SHOW_ME  = CFG.showStudentCount!==false;   /* התלמיד רואה את המונה שלו */
  var MEMORY   = 8;                              /* כמה העתקות אחרונות לזכור */
  var CHECK_ON = CFG.check!==false;              /* בודק עצמאות הכתיבה */
  var LIMIT    = typeof CFG.threshold==='number'?CFG.threshold:40;  /* אחוז AI מרבי מותר */
  var TASKMIN  = typeof CFG.taskMin==='number'?CFG.taskMin:55;      /* מענה מזערי למטלה */
  var MINW     = CFG.minWords||25;               /* מתחת לזה לא בודקים */
  var API      = CFG.api||'https://lamedproject.netlify.app/.netlify/functions/bagrut-ai';

  var blocked=0, allowed=0, recent=[];
  window.__PASTE_GUARD__={get blocked(){return blocked;},get allowed(){return allowed;}};
  if(!ON)return;

  var norm=function(s){return String(s==null?'':s).replace(/\s+/g,' ').trim();};

  /* ---------- רישום העתקות שנעשו בתוך הדף ---------- */
  function remember(){
    try{
      var t=norm(String(window.getSelection?window.getSelection():''));
      if(!t)return;
      recent.unshift(t);
      if(recent.length>MEMORY)recent.pop();
    }catch(e){}
  }
  document.addEventListener('copy',remember,true);
  document.addEventListener('cut',remember,true);

  /* טקסט שהודבק — האם הוא מוכר מתוך הדף? */
  function known(txt){
    var t=norm(txt);
    if(!t)return true;                       /* הדבקה ריקה — לא מעניינת */
    for(var i=0;i<recent.length;i++){
      if(recent[i]===t)return true;          /* בדיוק מה שהועתק */
      if(recent[i].length>40&&recent[i].indexOf(t)===0)return true; /* חלק מתחילתו */
    }
    return false;
  }

  /* ---------- חיווי ליד השדה ---------- */
  function css(){
    if(document.getElementById('pgCss'))return;
    var st=document.createElement('style');
    st.id='pgCss';
    st.textContent=
      '.pg-note{font-size:.79rem;font-weight:700;line-height:1.5;margin-top:5px;'+
      'border-radius:9px;padding:7px 11px;background:#fdf3e2;color:#8a5a08;'+
      'display:none;animation:pgIn .18s ease-out}'+
      '.pg-note.on{display:block}'+
      '.pg-note b{display:block;font-size:.75rem;opacity:.85;font-weight:800;margin-top:3px}'+
      '@keyframes pgIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}'+
      '.pg-flash{outline:2px solid #e0a92a!important;outline-offset:1px;transition:outline .2s}';
    (document.head||document.documentElement).appendChild(st);
  }

  function noteFor(ta){
    var n=ta.__pgNote;
    if(n&&n.parentNode)return n;
    n=document.createElement('div');
    n.className='pg-note';
    ta.__pgNote=n;
    if(ta.parentNode)ta.parentNode.insertBefore(n,ta.nextSibling);
    return n;
  }
  var hideT=null;
  function warn(ta){
    css();
    var n=noteFor(ta);
    n.innerHTML=MSG+(SHOW_ME&&blocked>1?'<b>ניסיונות הדבקה עד כה: '+blocked+'</b>':'');
    n.classList.add('on');
    ta.classList.add('pg-flash');
    clearTimeout(hideT);
    hideT=setTimeout(function(){
      n.classList.remove('on');
      ta.classList.remove('pg-flash');
    },5200);
  }

  /* ---------- החסימה ---------- */
  function isField(el){
    if(!el||!el.tagName)return false;
    if(el.tagName==='TEXTAREA')return true;
    if(el.tagName==='INPUT'){
      var t=(el.type||'text').toLowerCase();
      return t==='text'||t==='search'||t==='';
    }
    return !!el.isContentEditable;
  }
  function grab(e){
    try{
      var d=e.clipboardData||window.clipboardData;
      return d?d.getData('text')||d.getData('Text')||'':'';
    }catch(err){return '';}
  }

  document.addEventListener('paste',function(e){
    var el=e.target;
    if(!isField(el))return;
    if(el.hasAttribute&&el.hasAttribute('data-pg-allow'))return;  /* פטור מפורש */
    if(known(grab(e))){allowed++;return;}
    e.preventDefault();
    e.stopPropagation();
    blocked++;
    warn(el);
  },true);

  /* גרירת טקסט לתוך שדה — אותו כלל */
  document.addEventListener('drop',function(e){
    var el=e.target;
    if(!isField(el))return;
    var t='';
    try{t=e.dataTransfer?e.dataTransfer.getData('text'):'';}catch(err){}
    if(known(t)){allowed++;return;}
    e.preventDefault();
    e.stopPropagation();
    blocked++;
    warn(el);
  },true);

  /* ---------- דיווח אוטומטי עם ההגשה ----------
     במקום לגעת בקוד ההגשה של 21 קבצים, מתלבשים על fetch ומוסיפים
     את המונה לכל שורה שנשלחת ל-lms_submissions. כל תקלה — ממשיכים כרגיל. */
  var _fetch=window.fetch;
  if(typeof _fetch==='function'){
    window.fetch=async function(u,o){
      var isSub=false, body=null;
      try{
        var url=(typeof u==='string')?u:(u&&u.url)||'';
        isSub = !!(o&&o.body&&String(o.method||'').toUpperCase()==='POST'&&url.indexOf('lms_submissions')>-1);
        if(isSub)body=JSON.parse(o.body);
      }catch(err){isSub=false;}
      if(!isSub)return _fetch.call(window,u,o);

      /* שער: בדיקה אוטומטית לפני שההגשה יוצאת.
         כל תקלה כאן נבלעת ומאפשרת הגשה — לעולם לא חוסמים בגלל באג. */
      if(CHECK_ON&&typeof window.__PG_GATE__==='function'){
        var bad=0;
        try{ bad=await window.__PG_GATE__(); }catch(e){ bad=0; }
        if(bad<0){
          var e1=new Error('ההגשה בוטלה. השלימו את מה שחסר ונסו שוב.');
          e1.__pg=true; throw e1;
        }
        if(bad>0){
          var e2=new Error('יש '+bad+' תשובות שלא עברו את הבדיקה — בעצמאות הכתיבה או במענה על השאלה. תקנו לפי ההנחיות שמתחת לכל תשובה ונסו שוב.');
          e2.__pg=true;
          throw e2;
        }
      }
      try{
        var rows=Array.isArray(body)?body:[body];
        var touched=false;
        rows.forEach(function(r){
          if(r&&typeof r==='object'){
            if(!r.answers||typeof r.answers!=='object')r.answers={};
            r.answers._paste={blocked:blocked,allowed:allowed};
            var chk=[];
            for(var k in results){ if(results[k]&&!results[k].skip)
              chk.push({pct:results[k].pct,verdict:results[k].verdict,pass:!!results[k].pass}); }
            if(chk.length)r.answers._check=chk;
            touched=true;
          }
        });
        if(touched){
          var o2={};for(var k2 in o)o2[k2]=o[k2];
          o2.body=JSON.stringify(body);
          return _fetch.call(window,u,o2);
        }
      }catch(err){}
      return _fetch.call(window,u,o);
    };
  }

  /* ================= בורר הכיתה בכניסת המורה =================
     מתקן שני ליקויים בקוד שבקבצים: הרשימה לא נבנתה מחדש בהחלפת טלפון,
     ומורה בלי כיתות לא קיבלה שום חיווי. */
  try{(function(){
    var SUPA='', KEYA='';
    try{ SUPA=(typeof SUP!=='undefined'&&SUP)||''; }catch(e){}
    try{ KEYA=(typeof SKEY!=='undefined'&&SKEY)||''; }catch(e){}
    if(!SUPA||!KEYA)return;                      /* לא דף עם כניסת מורה */

    var TCH=CFG.teacherHome||'/eshi/shioor/teacher-central.html';
    function nrm(v){var p=String(v||'').replace(/\D/g,'').replace(/^00+/,'');
      if(p.indexOf('972')===0)p=p.slice(3);p=p.replace(/^0+/,'');return p?('0'+p):'';}
    function get(q){ return fetch(SUPA+'/rest/v1/'+q,
      {headers:{apikey:KEYA,Authorization:'Bearer '+KEYA}}).then(function(r){return r.json();}); }

    function note(msg,bad){
      var n=document.getElementById('pgClsNote');
      if(!msg){ if(n&&n.parentNode)n.parentNode.removeChild(n); return; }
      if(!n){
        var f=document.getElementById('lgClass'); if(!f||!f.parentNode)return;
        n=document.createElement('div'); n.id='pgClsNote';
        n.style.cssText='font-size:.82rem;font-weight:700;border-radius:9px;padding:8px 12px;margin-top:6px;line-height:1.55';
        f.parentNode.insertBefore(n,f.nextSibling);
      }
      n.style.background=bad?'#fdf3e2':'#f2f7f4';
      n.style.color=bad?'#8a5a08':'#0f7a4d';
      n.innerHTML=msg;
    }

    /* מחליף את שדה הכיתה בשדה חדש, ושומר על העיצוב הקיים */
    function swap(tag){
      var cur=document.getElementById('lgClass'); if(!cur)return null;
      var el=document.createElement(tag);
      el.id='lgClass'; el.className=cur.className||'';
      try{ el.style.cssText=cur.style.cssText||''; }catch(e){}
      if(tag==='input'){
        el.placeholder="שם הכיתה (למשל י'3)";
        /* הדפדפן זוכר ערכים לפי שם השדה ומציע כיתות של מורה אחרת.
           שם אקראי + autocomplete מנטרלים את זה בפועל. */
        el.setAttribute('autocomplete','off');
        el.setAttribute('name','cls_'+Math.random().toString(36).slice(2,9));
        el.setAttribute('autocorrect','off');
        el.setAttribute('spellcheck','false');
      }
      cur.parentNode.replaceChild(el,cur);
      return el;
    }
    /* גם השדה המקורי שבדף — לפני שהוחלף */
    function killAutofill(){
      var f=document.getElementById('lgClass');
      if(!f||f.__pgAf)return;
      f.__pgAf=1;
      try{
        f.setAttribute('autocomplete','off');
        f.setAttribute('name','cls_'+Math.random().toString(36).slice(2,9));
      }catch(e){}
    }

    /* חלון מפורש למורה בלי כיתות */
    var warned=false;
    function noClassModal(name){
      if(warned)return; warned=true;
      ccss();
      var ov=document.createElement('div'); ov.className='pg-ov';
      ov.innerHTML='<div class="pg-md">'+
        '<h3>עדיין אין לכם כיתה</h3>'+
        '<p class="lead">'+esc(name||'')+', כדי להשתמש בשיעור מול כיתה צריך קודם ליצור אותה '+
        'ולהזין את רשימת התלמידים.</p>'+
        '<div class="pg-ck"><i>1</i><span>היכנסו ל<b>סביבת המורה</b> וצרו כיתה חדשה.</span></div>'+
        '<div class="pg-ck"><i>2</i><span>הדביקו את שמות התלמידים — שם בכל שורה.</span></div>'+
        '<div class="pg-ck"><i>3</i><span>חזרו לכאן, והכיתה תופיע ברשימה.</span></div>'+
        '<p class="lead" style="margin:12px 0 0">בלי כיתה אפשר לשלוח קישור, אבל <b>לא תדעו מי הגיש ומי לא</b> — '+
        'התלמידים לא יוכלו לבחור את שמם מרשימה.</p>'+
        '<div class="acts">'+
          '<button class="no" data-a="0">המשך בלי כיתה</button>'+
          '<button class="yes" data-a="1">ליצירת כיתה ←</button>'+
        '</div></div>';
      ov.addEventListener('click',function(e){
        var a=e.target&&e.target.getAttribute&&e.target.getAttribute('data-a');
        if(a===null||a===undefined){ if(e.target===ov)close(); return; }
        close();
        if(a==='1'){ try{ window.open(TCH,'_blank'); }catch(err){ location.href=TCH; } }
      });
      function close(){ try{ ov.parentNode&&ov.parentNode.removeChild(ov); }catch(e){} }
      (document.body||document.documentElement).appendChild(ov);
    }

    var last=null, busy=false;
    async function refresh(){
      var ph=document.getElementById('lgPhone'); if(!ph)return;
      var p=nrm(ph.value);
      if(p===last||busy)return;
      last=p; busy=true;
      try{
        if(!p){ note(''); return; }
        var t=await get('lms_teachers?select=id,name&phone=eq.'+encodeURIComponent(p));
        if(!t||!t[0]){ note('לא נמצא מורה עם הטלפון הזה.',true); return; }
        var c=await get('lms_classes?select=name&teacher_id=eq.'+encodeURIComponent(t[0].id)+'&order=name.asc');
        var list=(c||[]).map(function(x){return x.name;}).filter(Boolean);
        if(!list.length){
          var inp=swap('input');
          if(inp)inp.value='';
          note('⚠ עדיין לא יצרתם כיתה. אפשר להקליד שם כיתה ולהמשיך, אבל <b>לא תדעו מי הגיש ומי לא</b>. '+
               '<a href="'+TCH+'" target="_blank" style="color:inherit;font-weight:800;text-decoration:underline">'+
               'ליצירת כיתה בסביבת המורה ←</a>',true);
          noClassModal(t[0].name);
          return;
        }
        warned=false;
        var sel=swap('select'); if(!sel)return;
        sel.innerHTML='<option value="">— בחרו כיתה —</option>'+
          list.map(function(n){return '<option>'+esc(n)+'</option>';}).join('')+
          '<option value="__free">כיתה אחרת — הקלדה חופשית</option>';
        sel.addEventListener('change',function(){
          if(sel.value!=='__free')return;
          var inp2=swap('input'); if(inp2){inp2.value='';inp2.focus();}
          note('');
        });
        note('נמצאו '+list.length+' כיתות עבור '+esc(t[0].name||'המורה')+'.',false);
      }catch(e){ note(''); }
      finally{ busy=false; }
    }

    function bind(){
      killAutofill();
      var ph=document.getElementById('lgPhone');
      if(!ph||ph.__pgCls)return;
      ph.__pgCls=1;
      ph.addEventListener('blur',refresh);
      ph.addEventListener('change',refresh);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
    else bind();
    try{ new MutationObserver(bind).observe(document.body||document.documentElement,{childList:true,subtree:true}); }catch(e){}
  })();}catch(e){if(window.console)console.warn("paste-guard: מודול נכשל ודולג",e);}


  /* ================= סיסמת תלמיד =================
     התלמיד בוחר את שמו מרשימת הכיתה ואז מזין סיסמה.
     ברירת המחדל לכולם היא 1234, וכל תלמיד יכול לשנות אותה לעצמו.
     נשמר בטבלה lms_student_pw כערך מעורבל — לא כטקסט גלוי. */
  try{(function(){
    if(CFG.studentPw===false)return;
    var SUPB='',KEYB='';
    try{ SUPB=(typeof SUP!=='undefined'&&SUP)||''; }catch(e){}
    try{ KEYB=(typeof SKEY!=='undefined'&&SKEY)||''; }catch(e){}
    if(!SUPB||!KEYB)return;

    var DEF=CFG.defaultPw||'1234';
    var TID='',CLS='';
    try{ var P=new URLSearchParams(location.search||''); TID=P.get('code')||''; CLS=P.get('class')||''; }
    catch(e){
      var q=String(location.search||'');
      var a=/[?&]code=([^&]*)/.exec(q), b=/[?&]class=([^&]*)/.exec(q);
      TID=a?decodeURIComponent(a[1]):''; CLS=b?decodeURIComponent(b[1]):'';
    }
    if(!TID||!CLS)return;                 /* לא מסלול תלמיד */

    function api(q,m,b,x){
      return fetch(SUPB+'/rest/v1/'+q,{method:m||'GET',
        headers:Object.assign({apikey:KEYB,Authorization:'Bearer '+KEYB,'Content-Type':'application/json'},x||{}),
        body:b?JSON.stringify(b):undefined})
        .then(function(r){ if(!r.ok)return r.text().then(function(t){throw new Error(r.status+' '+t.slice(0,120));});
          return r.text().then(function(t){return t?JSON.parse(t):[];}); });
    }
    /* ערבול קל: מונע קריאה של סיסמאות דרך ה-API. אינו הצפנה. */
    function mix(pw,key){
      var s=String(pw)+'|'+String(key), h1=5381, h2=52711;
      for(var i=0;i<s.length;i++){ var c=s.charCodeAt(i); h1=((h1*33)^c)>>>0; h2=((h2*39)^c)>>>0; }
      return h1.toString(36)+h2.toString(36);
    }
    var okKey=function(name){ return 'pgstu_'+TID+'_'+CLS+'_'+norm(name); };
    function verified(name){ try{ return sessionStorage.getItem(okKey(name))==='1'; }catch(e){ return false; } }
    function markOk(name){ try{ sessionStorage.setItem(okKey(name),'1'); }catch(e){} }

    function row(name){
      return api('lms_student_pw?select=pw&teacher_id=eq.'+encodeURIComponent(TID)+
        '&class_name=eq.'+encodeURIComponent(CLS)+
        '&student_key=eq.'+encodeURIComponent(norm(name)))
        .then(function(r){ return (r&&r[0])?r[0]:null; })
        .catch(function(){ return null; });
    }
    function save(name,pw){
      return api('lms_student_pw?on_conflict=teacher_id,class_name,student_key','POST',
        [{teacher_id:TID,class_name:CLS,student_key:norm(name),pw:mix(pw,norm(name)),
          updated_at:new Date().toISOString()}],
        {Prefer:'resolution=merge-duplicates'});
    }

    function ask(name,onOk,onCancel){
      ccss();
      var ov=document.createElement('div'); ov.className='pg-ov';
      var mode='login';
      function draw(){
        ov.innerHTML='<div class="pg-md">'+(mode==='login'
          ? '<h3>שלום '+esc(name)+'</h3>'+
            '<p class="lead">הזינו סיסמה כדי להמשיך.</p>'+
            '<input id="pgPw" type="password" inputmode="numeric" placeholder="סיסמה" '+
              'style="width:100%;font-family:inherit;font-size:1.05rem;border:1px solid #d5d7e4;'+
              'border-radius:10px;padding:11px 13px;text-align:center;letter-spacing:3px">'+
            '<p class="lead" style="margin:9px 0 0;font-size:.83rem">אם לא שיניתם סיסמה, היא <b>'+esc(DEF)+'</b>.</p>'+
            '<div id="pgPwErr"></div>'+
            '<div class="acts">'+
              (onCancel?'<button class="no" data-a="cancel">לא אני</button>':'')+
              '<button class="no" data-a="chg">שינוי סיסמה</button>'+
              '<button class="yes" data-a="go">כניסה ←</button>'+
            '</div>'
          : '<h3>שינוי סיסמה</h3>'+
            '<p class="lead">'+esc(name)+', בחרו סיסמה חדשה. זכרו אותה — בלעדיה לא תוכלו להיכנס.</p>'+
            '<input id="pgOld" type="password" placeholder="הסיסמה הנוכחית" '+
              'style="width:100%;font-family:inherit;border:1px solid #d5d7e4;border-radius:10px;padding:10px 13px;margin-bottom:8px">'+
            '<input id="pgNew" type="password" placeholder="סיסמה חדשה (4 תווים לפחות)" '+
              'style="width:100%;font-family:inherit;border:1px solid #d5d7e4;border-radius:10px;padding:10px 13px;margin-bottom:8px">'+
            '<input id="pgNew2" type="password" placeholder="שוב, לוודא" '+
              'style="width:100%;font-family:inherit;border:1px solid #d5d7e4;border-radius:10px;padding:10px 13px">'+
            '<div id="pgPwErr"></div>'+
            '<div class="acts">'+
              '<button class="no" data-a="back">חזרה</button>'+
              '<button class="yes" data-a="savepw">שמירה ←</button>'+
            '</div>')+'</div>';
        var f=document.getElementById(mode==='login'?'pgPw':'pgOld');
        if(f)try{f.focus();}catch(e){}
      }
      function err(m){
        var e=document.getElementById('pgPwErr');
        if(e)e.innerHTML='<div style="background:#fdecea;color:#9f1239;border-radius:9px;padding:8px 12px;'+
          'margin-top:9px;font-size:.86rem;font-weight:700">'+esc(m)+'</div>';
      }
      function close(){ try{ov.parentNode&&ov.parentNode.removeChild(ov);}catch(e){} }

      ov.addEventListener('click',async function(e){
        var a=e.target&&e.target.getAttribute&&e.target.getAttribute('data-a');
        if(!a){ return; }
        if(a==='cancel'){ close(); onCancel&&onCancel(); return; }
        if(a==='chg'){ mode='change'; draw(); return; }
        if(a==='back'){ mode='login'; draw(); return; }
        if(a==='go'){
          var pw=(document.getElementById('pgPw')||{}).value||'';
          if(!pw){ err('נא להזין סיסמה.'); return; }
          var r=await row(name);
          var want=r?r.pw:mix(DEF,norm(name));
          if(mix(pw,norm(name))!==want){ err('סיסמה שגויה. אם לא שיניתם — נסו '+DEF+'.'); return; }
          markOk(name); close(); onOk&&onOk(); return;
        }
        if(a==='savepw'){
          var o=(document.getElementById('pgOld')||{}).value||'';
          var n1=(document.getElementById('pgNew')||{}).value||'';
          var n2=(document.getElementById('pgNew2')||{}).value||'';
          var r2=await row(name);
          var want2=r2?r2.pw:mix(DEF,norm(name));
          if(mix(o,norm(name))!==want2){ err('הסיסמה הנוכחית שגויה.'); return; }
          if(n1.length<4){ err('הסיסמה החדשה חייבת להיות באורך 4 תווים לפחות.'); return; }
          if(n1!==n2){ err('שתי הסיסמאות אינן זהות.'); return; }
          try{ await save(name,n1); }catch(e2){ err('השמירה נכשלה: '+e2.message.slice(0,90)); return; }
          markOk(name); close(); onOk&&onOk(); return;
        }
      });
      ov.addEventListener('keydown',function(e){ if(e.key==='Enter'){
        var b=ov.querySelector('.yes'); if(b)b.click(); } });
      (document.body||document.documentElement).appendChild(ov);
      draw();
    }

    function hook(){
      /* מסלול השיעורים: בחירת שם מרשימה */
      var el=document.getElementById('sName');
      if(el&&el.tagName==='SELECT'&&!el.__pgPw){
        el.__pgPw=1;
        el.addEventListener('change',function(){
          var v=norm(el.value);
          if(!v||verified(v))return;
          ask(v,null,function(){ el.value=''; });
        });
      }
      /* מסלול האזור האישי (talmid.html): כפתור "כניסה" אחרי בחירה ברשימה */
      if(typeof window.pick==='function'&&!window.pick.__pgPw){
        var _pick=window.pick;
        var wrapped=function(){
          var sel=document.getElementById('who');
          var v=norm(sel?sel.value:'');
          if(!v||verified(v))return _pick.apply(this,arguments);
          ask(v,function(){ _pick(); },function(){ if(sel)sel.value=''; });
        };
        wrapped.__pgPw=1;
        window.pick=wrapped;
      }
      /* אותו קובץ, אבל תלמיד שנזכר במכשיר ונכנס בלי לבחור */
      if(typeof window.showTasks==='function'&&!window.showTasks.__pgPw){
        var _show=window.showTasks;
        var wrap2=function(){
          var nm='';
          try{ nm=norm(typeof me!=='undefined'?me:''); }catch(e){ nm=''; }
          if(!nm||verified(nm))return _show.apply(this,arguments);
          ask(nm,function(){ _show(); },function(){
            try{ if(typeof switchMe==='function')switchMe(); }catch(e){}
          });
          return undefined;
        };
        wrap2.__pgPw=1;
        window.showTasks=wrap2;
      }
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);
    else hook();
    try{ new MutationObserver(hook).observe(document.body||document.documentElement,{childList:true,subtree:true}); }catch(e){}
  })();}catch(e){if(window.console)console.warn("paste-guard: מודול נכשל ודולג",e);}

  /* ================= בודק עצמאות הכתיבה ================= */
  if(!CHECK_ON)return;

  var results={};        /* מפתח: טביעת הטקסט -> תוצאה */
  var busy=false;
  function fp(t){var x=norm(t);var h=0;for(var i=0;i<x.length;i++){h=(h*31+x.charCodeAt(i))|0;}return x.length+'_'+h;}
  function wc(t){var x=norm(t);return x?x.split(' ').length:0;}

  function ccss(){
    if(document.getElementById('pgCss2'))return;
    var st=document.createElement('style');st.id='pgCss2';
    st.textContent=
     '.pg-bar{display:flex;gap:7px;align-items:center;margin-top:6px;flex-wrap:wrap}'+
     '.pg-btn{background:#eef1fb;color:#1e40af;border:0;border-radius:9px;padding:6px 14px;'+
       'font-family:inherit;font-weight:800;font-size:.79rem;cursor:pointer}'+
     '.pg-btn:hover{background:#dde4f7}.pg-btn:disabled{opacity:.5;cursor:default}'+
     '.pg-res{border-radius:12px;padding:12px 14px;margin-top:7px;font-size:.85rem;line-height:1.65;'+
       'border:1px solid #e4e5f0;background:#fff}'+
     '.pg-res.ok{border-color:#bfe8d2;background:#f4fbf7}'+
     '.pg-res.no{border-color:#f6cfcb;background:#fdf6f5}'+
     '.pg-hd{display:flex;gap:9px;align-items:center;margin-bottom:7px;flex-wrap:wrap}'+
     '.pg-pct{font-family:inherit;font-weight:800;font-size:1.15rem;border-radius:9px;padding:2px 12px}'+
     '.pg-pct.ok{background:#e7f7ee;color:#0f7a4d}.pg-pct.no{background:#fdecea;color:#9f1239}'+
     '.pg-vd{font-weight:800}'+
     '.pg-res h5{margin:9px 0 3px;font-size:.82rem;font-weight:800;color:#4b5170}'+
     '.pg-res ul{margin:0;padding-inline-start:19px}.pg-res li{margin-bottom:3px}'+
     '.pg-q{color:#6a6f8a;font-size:.82rem}'+
     '.pg-fix{background:#fdf3e2;border-radius:9px;padding:8px 12px;margin-top:7px}'+
     '.pg-fix h5{color:#8a5a08;margin-top:0}'+
     '.pg-sp{display:inline-block;width:13px;height:13px;border:2px solid #cfd4e8;'+
       'border-top-color:#1e40af;border-radius:50%;animation:pgSpin .7s linear infinite;vertical-align:-2px}'+
     '@keyframes pgSpin{to{transform:rotate(360deg)}}'+
     '.pg-ov{position:fixed;inset:0;background:rgba(20,22,40,.55);z-index:99999;display:flex;'+
       'align-items:center;justify-content:center;padding:18px;animation:pgIn .18s ease-out}'+
     '.pg-md{background:#fff;border-radius:18px;max-width:520px;width:100%;padding:24px 26px;'+
       'font-family:inherit;max-height:88vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.3);'+
       'direction:rtl;text-align:right}'+
     '.pg-md h3{margin:0 0 5px;font-size:1.2rem;color:#1f2340}'+
     '.pg-md .lead{color:#6a6f8a;font-size:.88rem;margin:0 0 15px}'+
     '.pg-ck{display:flex;gap:10px;align-items:flex-start;background:#fafbff;border-radius:11px;'+
       'padding:11px 13px;margin-bottom:8px;font-size:.9rem;line-height:1.6}'+
     '.pg-ck i{font-style:normal;font-size:1.1rem;line-height:1.3}'+
     '.pg-md .acts{display:flex;gap:9px;margin-top:16px;flex-wrap:wrap}'+
     '.pg-md button{flex:1;min-width:130px;border:0;border-radius:11px;padding:12px 16px;'+
       'font-family:inherit;font-weight:800;font-size:.92rem;cursor:pointer}'+
     '.pg-md .yes{background:#12b76a;color:#fff}.pg-md .no{background:#f1f2f8;color:#1f2340}'+
     '.pg-prog{display:flex;gap:8px;align-items:center;background:#eef1fb;border-radius:10px;'+
       'padding:8px 12px;margin-top:6px;font-size:.82rem;font-weight:700;color:#1e40af}'+
     '.pg-steps{display:flex;gap:4px;margin-inline-start:auto}'+
     '.pg-steps i{width:6px;height:6px;border-radius:50%;background:#c3cdea;display:block}'+
     '.pg-steps i.on{background:#1e40af}'+
     '.pg-toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:99998;'+
       'background:#1f2340;color:#fff;border-radius:13px;padding:11px 20px;font-family:inherit;'+
       'font-weight:700;font-size:.88rem;box-shadow:0 10px 30px rgba(0,0,0,.28);display:flex;gap:10px;align-items:center}'+
     '.pg-miss{background:#fdf3e2;border-radius:9px;padding:8px 12px;margin-top:6px;font-size:.83rem;color:#8a5a08}'+
     '.pg-miss b{font-weight:800}';
    (document.head||document.documentElement).appendChild(st);
  }

  function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  /* ---------- בדיקות מקומיות, בלי שרת ----------
     קוראות את מה שכבר קיים בדף: רשימת המושגים שהמטלה דורשת. */
  function conceptsNear(ta){
    try{
      var n=ta.parentNode;
      for(var d=0;d<4&&n;d++){
        var box=n.querySelector&&n.querySelector('.con');
        if(box){
          var out=[],bs=box.querySelectorAll('b');
          for(var i=0;i<bs.length;i++){var t=norm(bs[i].textContent);if(t)out.push(t);}
          if(out.length)return out;
        }
        n=n.parentNode;
      }
    }catch(e){}
    return [];
  }
  /* התאמה סלחנית: מתעלמת מו' החיבור, מה' הידיעה ומריבוי */
  function loose(t){return norm(t).replace(/["'׳״]/g,'').replace(/^[והבלכמש]/,'');}
  function usedConcepts(txt,list){
    var body=loose(txt),hit=[];
    list.forEach(function(c){
      var k=loose(c);
      if(!k)return;
      if(body.indexOf(k)>-1){hit.push(c);return;}
      var stem=k.length>6?k.slice(0,k.length-2):k;   /* ייצוג / ייצוגים */
      if(stem.length>4&&body.indexOf(stem)>-1)hit.push(c);
    });
    return hit;
  }
  function localCheck(ta){
    var list=conceptsNear(ta);
    if(!list.length)return null;
    var hit=usedConcepts(ta.value||'',list);
    return {list:list,hit:hit,miss:list.filter(function(c){return hit.indexOf(c)<0;})};
  }
  function localHtml(lc){
    if(!lc)return '';
    if(lc.hit.length)
      return '<div class="pg-miss" style="background:#f2f7f4;color:#0f7a4d">נמצאו בתשובה: <b>'+
        lc.hit.map(esc).join('، ')+'</b></div>';
    return '<div class="pg-miss">המטלה מציעה לשלב מושגים מקצועיים, ולא זיהיתי אף אחד מהם בתשובה: <b>'+
      lc.list.map(esc).join(' · ')+'</b></div>';
  }

  /* ההקשר של השדה: השאלה שמעליו, לשיפור דיוק הבדיקה */
  function contextOf(ta){
    try{
      var n=ta.parentNode,txt='';
      for(var d=0;d<3&&n;d++){
        txt=norm(n.innerText||n.textContent||'');
        if(txt.length>40)break;
        n=n.parentNode;
      }
      return txt.replace(norm(ta.value),'').slice(0,600);
    }catch(e){return '';}
  }

  var STEPS=['שולח את התשובה לבדיקה…','בוחן את עצמאות הכתיבה…','בודק אם התשובה עונה על השאלה…','מנסח המלצות לתיקון…'];
  function progress(ta,onto){
    ccss();
    var box=onto||resBox(ta);
    var i=0;
    function draw(){
      box.className='pg-res';
      box.innerHTML='<div class="pg-prog"><span class="pg-sp"></span><span>'+STEPS[i]+'</span>'+
        '<span class="pg-steps">'+STEPS.map(function(_,k){return '<i class="'+(k<=i?'on':'')+'"></i>';}).join('')+
        '</span></div>';
    }
    draw();
    var t=setInterval(function(){ if(i<STEPS.length-1){i++;draw();} },1500);
    return function(){ clearInterval(t); };
  }

  async function runCheck(ta){
    var t=ta.value||'';
    if(wc(t)<MINW)return {skip:true,why:'צריך לפחות '+MINW+' מילים כדי לבדוק.'};
    var k=fp(t);
    if(results[k])return results[k];
    /* עומס בכיתה שלמה מייצר 429/503 — מנסים שוב עם המתנה גדלה */
    var r=null,j=null,last='';
    for(var att=0;att<3;att++){
      if(att)await new Promise(function(res){setTimeout(res,700*att*att);});
      try{
        r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'check',text:t,question:contextOf(ta)})});
      }catch(e){ last=e.message||'אין קשר לשרת'; r=null; continue; }
      try{ j=await r.json(); }catch(e){ j=null; }
      if(r.ok)break;
      last=(j&&j.error)?j.error:('שרת '+r.status);
      if(r.status!==429&&r.status!==503&&r.status!==500)break;
      j=null;
    }
    if(!r||!r.ok)throw new Error(last||'הבדיקה נכשלה');
    if(!j)throw new Error('תשובה ריקה מהשרת');
    if(j.error)throw new Error(j.error);
    j.local=localCheck(ta);
    var tk=(typeof j.task==='number')?j.task:-1;
    j.okAi   = (Number(j.pct)||0)<LIMIT;
    j.okTask = (tk<0) || (tk>=TASKMIN);   /* אין שאלה בהקשר — לא שופטים מענה */
    j.pass   = j.okAi && j.okTask;
    results[k]=j;
    return j;
  }

  function resBox(ta){
    var b=ta.__pgRes;
    if(b&&b.parentNode)return b;
    b=document.createElement('div');b.className='pg-res';ta.__pgRes=b;
    var bar=ta.__pgBar;
    if(bar&&bar.parentNode)bar.parentNode.insertBefore(b,bar.nextSibling);
    return b;
  }
  function paint(ta,j){
    ccss();
    var b=resBox(ta);
    if(j.skip){b.className='pg-res';b.innerHTML='<span class="pg-q">'+esc(j.why)+'</span>';return;}
    var ok=j.pass, hasTask=(typeof j.task==='number'&&j.task>=0);
    b.className='pg-res '+(ok?'ok':'no');
    var h='<div class="pg-hd">'+
      '<span class="pg-pct '+(j.okAi?'ok':'no')+'">'+j.pct+'%</span>'+
      '<span class="pg-vd">'+esc(j.verdict)+'</span>'+
      '<span class="pg-q">'+(j.okAi?'עצמאות תקינה':'מעל '+LIMIT+'% — נראה לא עצמאי')+'</span></div>';
    if(hasTask){
      h+='<div class="pg-hd" style="margin-top:-2px">'+
        '<span class="pg-pct '+(j.okTask?'ok':'no')+'">'+j.task+'%</span>'+
        '<span class="pg-vd">'+esc(j.task_verdict||'')+'</span>'+
        '<span class="pg-q">'+(j.okTask?'עונה על השאלה':'מתחת ל-'+TASKMIN+'% — התשובה אינה עונה על מה שנשאל')+'</span></div>';
    }
    if(j.summary)h+='<div>'+esc(j.summary)+'</div>';
    if(j.missing&&j.missing.length){
      h+='<h5>מה שנדרש בשאלה וחסר בתשובה</h5><ul>'+
        j.missing.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>';
    }
    if(j.local)h+=localHtml(j.local);
    if(j.ai_signs&&j.ai_signs.length){
      h+='<h5>מה שנראה לא עצמאי</h5><ul>'+j.ai_signs.map(function(x){
        return '<li>'+esc(x.sign||x)+(x.quote?' <span class="pg-q">— "'+esc(x.quote)+'"</span>':'')+'</li>';}).join('')+'</ul>';
    }
    if(j.human_signs&&j.human_signs.length){
      h+='<h5>מה שנשמע כמוכם</h5><ul>'+j.human_signs.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>';
    }
    if(j.fixes&&j.fixes.length){
      h+='<div class="pg-fix"><h5>מה לעשות עכשיו</h5><ul>'+
        j.fixes.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div>';
    }
    if(j.questions&&j.questions.length){
      h+='<h5>שאלות שהמורה עשוי לשאול</h5><ul class="pg-q">'+
        j.questions.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>';
    }
    b.innerHTML=h;
  }

  function attach(ta){
    if(ta.__pgBar||ta.hasAttribute&&ta.hasAttribute('data-pg-nocheck'))return;
    ccss();
    var bar=document.createElement('div');bar.className='pg-bar';
    var btn=document.createElement('button');btn.type='button';btn.className='pg-btn';
    btn.textContent='🔍 בדיקת התשובה';
    btn.onclick=function(){
      if(busy)return;
      busy=true;btn.disabled=true;btn.textContent='בודק…';
      var stop=progress(ta);
      runCheck(ta).then(function(j){stop();paint(ta,j);})
        .catch(function(e){stop();ccss();
          var lc=localCheck(ta);
          resBox(ta).className='pg-res';
          resBox(ta).innerHTML='<span class="pg-q">הבדיקה המלאה לא זמינה כרגע ('+esc(e.message)+'). '+
            'אפשר להגיש, אבל כדאי לעבור על התשובה בעצמכם.</span>'+localHtml(lc);})
        .then(function(){busy=false;btn.disabled=false;btn.textContent='🔍 בדיקת התשובה';});
    };
    bar.appendChild(btn);
    ta.__pgBar=bar;
    if(ta.parentNode)ta.parentNode.insertBefore(bar,(ta.__pgNote&&ta.__pgNote.parentNode?ta.__pgNote:ta).nextSibling);
  }
  function scan(){
    try{
      var list=document.querySelectorAll('textarea');
      for(var i=0;i<list.length;i++)attach(list[i]);
    }catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);
  else scan();
  try{ new MutationObserver(scan).observe(document.body||document.documentElement,{childList:true,subtree:true}); }catch(e){}

  /* ---------- רשימת בדיקה עצמית כשהבדיקה אינה זמינה ---------- */
  var SELF = CFG.selfCheck || [
    'נתתי בתשובה <b>דוגמה</b> — ורצוי דוגמה מהעולם שלי: משהו שראיתי, שקרה לי או שאני צורך.',
    'הסברתי <b>למה הדוגמה רלוונטית</b> ואיך היא מתחברת למה שכתבתי, ולא רק הזכרתי אותה.',
    'לתשובה יש <b>מבנה</b> — פתיחה שמציגה את הרעיון, גוף עם דוגמאות ממחישות, וסיום שסוגר אותו.'
  ];
  function selfCheckModal(){
    ccss();
    return new Promise(function(done){
      var ov=document.createElement('div');ov.className='pg-ov';
      ov.innerHTML='<div class="pg-md">'+
        '<h3>רגע לפני ששולחים</h3>'+
        '<p class="lead">הבדיקה האוטומטית אינה זמינה כרגע, אז נעבור על זה בעצמנו. ' +
        'קראו את התשובות שלכם ובדקו:</p>'+
        SELF.map(function(t){return '<div class="pg-ck"><i>☐</i><span>'+t+'</span></div>';}).join('')+
        '<div class="acts">'+
          '<button class="no" data-a="0">חזרה לעריכה</button>'+
          '<button class="yes" data-a="1">בדקתי — שלחו</button>'+
        '</div></div>';
      function pick(v){ try{ov.parentNode&&ov.parentNode.removeChild(ov);}catch(e){} done(v); }
      ov.addEventListener('click',function(e){
        var b=e.target&&e.target.getAttribute&&e.target.getAttribute('data-a');
        if(b!==null&&b!==undefined)pick(b==='1');
        else if(e.target===ov)pick(false);
      });
      (document.body||document.documentElement).appendChild(ov);
    });
  }

  /* ---------- שער ההגשה ---------- */
  window.__PG_GATE__=async function(){
    var tas=[],list=document.querySelectorAll('textarea');
    for(var i=0;i<list.length;i++){ if(wc(list[i].value)>=MINW)tas.push(list[i]); }
    var failed=[], offline=0;
    var toast=null;
    function say(msg){
      try{
        ccss();
        if(!toast){toast=document.createElement('div');toast.className='pg-toast';
          (document.body||document.documentElement).appendChild(toast);}
        toast.innerHTML='<span class="pg-sp"></span><span>'+msg+'</span>';
      }catch(e){}
    }
    function hush(){ try{ toast&&toast.parentNode&&toast.parentNode.removeChild(toast); }catch(e){} toast=null; }

    for(var j=0;j<tas.length;j++){
      var ta=tas[j],k=fp(ta.value),r=results[k];
      if(!r){
        say('בודק תשובה '+(j+1)+' מתוך '+tas.length+'…');
        var stop=progress(ta);
        try{ r=await runCheck(ta); stop(); }
        catch(e){ stop(); offline++;
          try{ resBox(ta).className='pg-res';
               resBox(ta).innerHTML='<span class="pg-q">הבדיקה לא זמינה ('+esc(e.message)+')</span>'+
                 localHtml(localCheck(ta)); }catch(e2){}
          continue; }
      }
      if(r&&!r.skip&&!r.pass){ paint(ta,r); failed.push(ta); }
    }
    hush();
    if(failed.length){
      try{ failed[0].scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){}
      return failed.length;
    }
    /* הבדיקה לא רצה על חלק מהתשובות — בדיקה עצמית לפני שליחה */
    if(offline>0&&tas.length){
      var ok=true;
      try{ ok=await selfCheckModal(); }catch(e){ ok=true; }
      if(!ok)return -1;          /* התלמיד בחר לחזור לעריכה */
    }
    return 0;
  };
})();

