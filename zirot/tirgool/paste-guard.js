/* ===== paste-guard.js · v1.0.0 · 2026-07-27 =====
   שומר על כתיבה עצמאית בשדות הפתוחים.

   מה מותר:  העתקה מהקטע שבדף אל התשובה · גזור־הדבק בתוך התשובה עצמה
   מה חסום:  הדבקת טקסט שמקורו מחוץ לדף (AI, ויקיפדיה, מסמך, צ׳אט)

   איך זה מבחין: כל העתקה שנעשית *בתוך הדף* נרשמת. בהדבקה, הטקסט מושווה
   למה שנרשם. טקסט חיצוני לא ייתכן שיתאים — ולכן ייחסם.

   התקנה: <script src="paste-guard.js"></script> לפני סוף ה-body. זהו.
   הקובץ מתקין את עצמו על כל שדות הכתיבה, כולל כאלה שנוצרים אחר כך.

   דיווח: מספר הניסיונות נשלח אוטומטית עם ההגשה, תחת answers._paste
   שינוי הודעה או כיבוי: ראו PG_CONFIG למטה.
*/
(function(){
  'use strict';
  if(window.__PASTE_GUARD__)return;

  var CFG=window.PG_CONFIG||{};
  var ON       = CFG.enabled!==false;
  var MSG      = CFG.msg||'כאן כותבים במילים שלכם. אפשר לצטט מהקטע שבדף, אבל לא להדביק טקסט מבחוץ.';
  var SHOW_ME  = CFG.showStudentCount!==false;   /* התלמיד רואה את המונה שלו */
  var MEMORY   = 8;                              /* כמה העתקות אחרונות לזכור */

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
    window.fetch=function(u,o){
      try{
        var url=(typeof u==='string')?u:(u&&u.url)||'';
        if(o&&o.body&&String(o.method||'').toUpperCase()==='POST'&&url.indexOf('lms_submissions')>-1){
          var body=JSON.parse(o.body);
          var rows=Array.isArray(body)?body:[body];
          var touched=false;
          rows.forEach(function(r){
            if(r&&typeof r==='object'){
              if(!r.answers||typeof r.answers!=='object')r.answers={};
              r.answers._paste={blocked:blocked,allowed:allowed};
              touched=true;
            }
          });
          if(touched){
            var o2={};for(var k in o)o2[k]=o[k];
            o2.body=JSON.stringify(body);
            return _fetch.call(window,u,o2);
          }
        }
      }catch(err){}
      return _fetch.call(window,u,o);
    };
  }
})();
