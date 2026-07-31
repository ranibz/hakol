/* ===== paste-guard.js · v2.3.0 · 2026-07-27 =====
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

   שינוי הודעה, סף או כיבוי: ראו PG_CONFIG למטה.
*/
(function(){
  'use strict';
  if(window.__PASTE_GUARD__)return;

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

