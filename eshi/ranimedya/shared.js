/**
 * shared.js — מערכת מטלות דיגיטלית, גליל מערבי
 * shioor/new/shared.js
 *
 * טוען: <script src="../shared.js"></script>
 * דורש: supabase-js טעון לפני
 */

// ===== SUPABASE =====
const SUPA_URL = 'https://seuskpyofhkvejyooghk.supabase.co';
const SUPA_KEY = 'sb_publishable_qrLorZwzfmjFh9S3iRa1sQ_u6DVP29b';
const sb = supabase.createClient(SUPA_URL, SUPA_KEY);


// ===== STUDENT.HTML =====

let _teacherID = '', _classCode = '';

/**
 * initStudentPage(worksheetFile)
 * קורא ב-student.html
 * בודק ?code= ומציג banner מורה
 */
function initStudentPage(worksheetFile) {
  const _code = new URLSearchParams(location.search).get('code');
  if (_code) {
    // סגור מודל יצירת קישור
    const modal = document.getElementById('link-modal');
    if (modal) modal.style.display = 'none';

    // עדכן קישורים
    const wsLink = document.getElementById('link-worksheet');
    if (wsLink) wsLink.href = worksheetFile + '?code=' + encodeURIComponent(_code);

    // שלוף מורה לפי קוד
    _loadTeacherFromCode(_code);
  }
}

async function _loadTeacherFromCode(code) {
  // code = classCode_teacherID
  const parts = code.split('_');
  const teacherID = parts[parts.length - 1];
  const classCode = parts.slice(0, -1).join('_');

  // בדוק שהקוד קיים ב-class_codes
  const { data } = await sb.from('class_codes')
    .select('teacher_id')
    .eq('code', classCode)
    .eq('teacher_id', teacherID)
    .single();

  if (!data) return;

  // שלוף שם מורה
  const { data: teacher } = await sb.from('teachers')
    .select('name')
    .eq('id_number', teacherID)
    .single();

  if (teacher?.name) {
    const bn = document.getElementById('banner-name');
    const bc = document.getElementById('banner-code');
    const bb = document.getElementById('teacher-banner');
    if (bn) bn.textContent = teacher.name;
    if (bc) bc.textContent = classCode;
    if (bb) bb.style.display = 'block';
  }
}

/**
 * createLink()
 * יצירת קישור לתלמידים ב-student.html
 */
async function createLink() {
  const phone = (document.getElementById('lm-phone')?.value || '').trim();
  const classCode = (document.getElementById('lm-class')?.value || '').trim().toLowerCase();
  const err = document.getElementById('lm-err');
  if (err) err.style.display = 'none';

  if (!phone || !classCode) {
    if (err) { err.textContent = 'נא למלא טלפון וקוד כיתה'; err.style.display = 'block'; }
    return;
  }

  // מצא מורה
  const { data: teachers } = await sb.from('teachers')
    .select('id_number')
    .eq('phone', phone)
    .eq('status', 'approved');

  if (!teachers?.length) {
    if (err) { err.textContent = 'טלפון לא נמצא או לא מאושר'; err.style.display = 'block'; }
    return;
  }

  const teacherID = teachers[0].id_number;

  // שמור ב-class_codes
  await sb.from('class_codes')
    .upsert({ code: classCode, teacher_id: teacherID }, { onConflict: 'code,teacher_id' });

  const url = location.origin + location.pathname + '?code=' + encodeURIComponent(classCode + '_' + teacherID);

  // הצג קישור
  const urlEl = document.getElementById('link-url-text') || document.getElementById('gen-url') || document.getElementById('lm-url');
  if (urlEl) {
    if (urlEl.tagName === 'INPUT') urlEl.value = url;
    else urlEl.textContent = url;
  }
  const result = document.getElementById('link-result');
  if (result) result.style.display = 'block';
}

function copyLink() {
  const urlEl = document.getElementById('link-url-text') || document.getElementById('gen-url') || document.getElementById('lm-url');
  const text = urlEl ? (urlEl.value || urlEl.textContent) : '';
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    if (btn) { btn.textContent = '✅ הועתק!'; setTimeout(() => btn.textContent = '📋 העתק קישור', 2000); }
    const note = document.getElementById('copy-note') || document.getElementById('lm-copied');
    if (note) { note.textContent = '✅ הועתק!'; setTimeout(() => note.textContent = 'לחץ להעתקה', 2000); }
  });
}

function closeModal() {
  const m = document.getElementById('link-modal');
  if (m) m.style.display = 'none';
}
// aliases
function generateLink() { createLink(); }
function closeLinkModal() { closeModal(); }
function copyURL() { copyLink(); }


// ===== WORKSHEET.HTML =====

let _student = {};

/**
 * initWorksheet()
 * קורא ב-worksheet.html
 */
function initWorksheet() {
  const _urlCode = new URLSearchParams(location.search).get('code');
  if (_urlCode) {
    const codeInput = document.getElementById('inp-code');
    const codeField = document.getElementById('field-code');
    if (codeInput) codeInput.value = _urlCode;
    if (codeField) codeField.style.display = 'none';
  }
  document.addEventListener('keydown', e => {
    const modal = document.getElementById('modal');
    if (e.key === 'Enter' && modal && modal.style.display !== 'none') enterPage();
  });
}

/**
 * enterPage()
 * כניסת תלמיד + אימות קוד
 */
async function enterPage() {
  const fn = (document.getElementById('inp-fn') || document.getElementById('inp-firstname'))?.value.trim() || '';
  const ln = (document.getElementById('inp-ln') || document.getElementById('inp-lastname'))?.value.trim() || '';
  const email = document.getElementById('inp-email')?.value.trim().toLowerCase() || '';
  const grade = (document.getElementById('inp-grade') || document.getElementById('inp-cls'))?.value || '';
  const code = document.getElementById('inp-code')?.value.trim() || '';
  const errEl = document.getElementById('m-err') || document.getElementById('modal-err');

  if (!fn || !ln || !email || !grade || !code) {
    if (errEl) { errEl.textContent = 'נא למלא את כל השדות'; errEl.style.display = 'block'; }
    return;
  }

  // פענח קוד
  const parts = code.split('_');
  const teacherID = parts[parts.length - 1];
  const classCode = parts.slice(0, -1).join('_');

  // בדוק שהקוד תקין
  const { data } = await sb.from('class_codes')
    .select('id')
    .eq('code', classCode)
    .eq('teacher_id', teacherID)
    .single();

  if (!data) {
    if (errEl) { errEl.textContent = 'קוד מורה לא תקין — בקש קישור חדש מהמורה'; errEl.style.display = 'block'; }
    return;
  }

  _student = { name: fn + ' ' + ln, firstName: fn, lastName: ln, email, class: grade, classCode, teacherID };

  // עדכן banner
  const bName = document.getElementById('b-name') || document.getElementById('bname');
  const bClass = document.getElementById('b-class') || document.getElementById('bcls');
  const bEmail = document.getElementById('b-email') || document.getElementById('bemail');
  if (bName) bName.textContent = fn + ' ' + ln;
  if (bClass) bClass.textContent = grade;
  if (bEmail) bEmail.textContent = email;

  // סגור מודל
  const modal = document.getElementById('modal');
  const main = document.getElementById('mainpage') || document.getElementById('main-page');
  if (modal) modal.style.display = 'none';
  if (main) main.style.display = 'block';

  if (typeof onStudentEntered === 'function') onStudentEntered(_student);
}

/**
 * submitWork(topic, answers)
 * שמירת הגשה ל-Supabase
 */
async function submitWork(topic, answers) {
  const btn = document.getElementById('sub-btn');
  const msg = document.getElementById('sub-msg');
  if (btn) { btn.disabled = true; btn.textContent = 'שולח...'; }

  try {
    const { error } = await sb.from('submissions').insert({
      topic,
      teacher_id: _student.teacherID,
      class_code: _student.classCode,
      student_name: _student.name,
      student_class: _student.class,
      student_email: _student.email,
      answers,
      submitted_at: new Date().toISOString()
    });

    if (error) throw error;

    if (msg) { msg.className = 'sub-msg ok'; msg.textContent = '✓ העבודה נשלחה! המורה יראה אותה בקרוב.'; }
    if (btn) btn.textContent = '✓ נשלח';
  } catch (e) {
    if (msg) { msg.className = 'sub-msg err'; msg.textContent = 'שגיאה — בדקו חיבור לאינטרנט ונסו שוב.'; }
    if (btn) { btn.disabled = false; btn.textContent = '◈ שלח עבודה למורה'; }
  }
}


// ===== כלי עזר =====

function autoResize(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
function ar(el) { autoResize(el); }
function blockPaste(e) { e.preventDefault(); alert('הדבקה אינה מותרת. יש לכתוב בעצמך.'); }

let _activeMic = null;
function toggleMic(btn, id) {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('הדפדפן שלך אינו תומך. נסה Chrome.'); return;
  }
  if (_activeMic) {
    _activeMic.rec.stop();
    _activeMic.btn.classList.remove('recording');
    _activeMic = null; return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR(); rec.lang = 'he-IL'; rec.continuous = true; rec.interimResults = true;
  const ta = document.getElementById(id); const base = ta.value;
  rec.onresult = e => {
    let f = '', i = '';
    for (let j = e.resultIndex; j < e.results.length; j++)
      e.results[j].isFinal ? f += e.results[j][0].transcript : i += e.results[j][0].transcript;
    ta.value = base + f + i; autoResize(ta);
    if (typeof trackProg === 'function') trackProg();
  };
  rec.onerror = rec.onend = () => { btn.classList.remove('recording'); _activeMic = null; };
  rec.start(); btn.classList.add('recording'); _activeMic = { rec, btn };
}

function toggleChip(btn, gid, max, targetId) {
  const sel = [...document.querySelectorAll('#' + gid + ' .chip.sel')];
  if (btn.classList.contains('sel')) btn.classList.remove('sel');
  else { if (sel.length >= max) return; btn.classList.add('sel'); }
  if (targetId) {
    document.getElementById(targetId).value = [...document.querySelectorAll('#' + gid + ' .chip.sel')]
      .map(c => c.textContent).join(', ');
  }
  if (typeof trackProg === 'function') trackProg();
}


// ===== TEACHER-CENTRAL.HTML =====

let _tcTeacherID = '', _tcAllData = [], _tcOpenRow = '';

/**
 * initTeacherCentral()
 * קורא ב-teacher-central.html
 */
function initTeacherCentral() {
  document.addEventListener('keydown', e => {
    const overlay = document.getElementById('login-overlay') || document.getElementById('overlay');
    if (e.key === 'Enter' && overlay && overlay.style.display !== 'none') tcLogin();
  });
}

async function tcLogin() {
  const phone = (document.getElementById('inp-phone')?.value || '').trim();
  const pass = (document.getElementById('inp-pass')?.value || '').trim();
  const err = document.getElementById('login-err') || document.getElementById('lerr');
  if (err) err.style.display = 'none';

  if (!phone || !pass) {
    if (err) { err.textContent = 'נא למלא טלפון וסיסמה'; err.style.display = 'block'; }
    return;
  }

  const { data: teachers } = await sb.from('teachers')
    .select('id_number, name')
    .eq('phone', phone)
    .eq('password', pass)
    .eq('status', 'approved');

  if (!teachers?.length) {
    if (err) { err.textContent = 'טלפון/סיסמה שגויים או המשתמש לא מאושר'; err.style.display = 'block'; }
    return;
  }

  _tcTeacherID = teachers[0].id_number;
  const teacherName = teachers[0].name || '';

  // הסתר login, הצג app
  const overlay = document.getElementById('login-overlay') || document.getElementById('overlay');
  const app = document.getElementById('app') || document.getElementById('main-page');
  if (overlay) overlay.style.display = 'none';
  if (app) app.style.display = 'block';

  const nameEl = document.getElementById('teacher-name');
  if (nameEl) nameEl.textContent = '👤 ' + teacherName;

  await tcLoadData();
}

function tcLogout() {
  _tcTeacherID = ''; _tcAllData = [];
  const overlay = document.getElementById('login-overlay') || document.getElementById('overlay');
  const app = document.getElementById('app') || document.getElementById('main-page');
  if (overlay) overlay.style.display = 'flex';
  if (app) app.style.display = 'none';
  const passEl = document.getElementById('inp-pass');
  if (passEl) passEl.value = '';
}

async function tcLoadData() {
  const content = document.getElementById('content');
  if (content) content.innerHTML = '<div class="msg-box"><p>⏳ טוען...</p></div>';

  const { data, error } = await sb.from('submissions')
    .select('*')
    .eq('teacher_id', _tcTeacherID)
    .order('submitted_at', { ascending: false });

  if (error) { console.error(error); return; }

  _tcAllData = data || [];

  // עדכן נושאים ב-dropdown
  const topics = [...new Set(_tcAllData.map(d => d.topic))].sort();
  const topicSel = document.getElementById('filter-topic');
  if (topicSel) {
    topicSel.innerHTML = '<option value="">— כל הנושאים —</option>';
    topics.forEach(t => topicSel.innerHTML += `<option value="${t}">${t}</option>`);
  }

  tcRenderTable();
}

function tcRenderTable() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const topic = document.getElementById('filter-topic')?.value || '';
  const cls = document.getElementById('filter-class')?.value || '';

  let filtered = _tcAllData.filter(d => {
    const name = (d.student_name || '').toLowerCase();
    return (!search || name.includes(search)) &&
           (!topic || d.topic === topic) &&
           (!cls || d.student_class === cls);
  });

  // עדכן סטטיסטיקות
  const statTotal = document.getElementById('s-total');
  const statToday = document.getElementById('s-today');
  const statTopics = document.getElementById('s-topics');
  const today = new Date().toDateString();
  if (statTotal) statTotal.textContent = _tcAllData.length;
  if (statToday) statToday.textContent = _tcAllData.filter(d => new Date(d.submitted_at).toDateString() === today).length;
  if (statTopics) statTopics.textContent = new Set(_tcAllData.map(d => d.topic)).size;

  // עדכן כיתות
  const classes = [...new Set(_tcAllData.map(d => d.student_class).filter(Boolean))].sort();
  const classSel = document.getElementById('filter-class');
  if (classSel) {
    const cur = classSel.value;
    classSel.innerHTML = '<option value="">כל הכיתות</option>';
    classes.forEach(c => classSel.innerHTML += `<option${c === cur ? ' selected' : ''}>${c}</option>`);
  }

  const content = document.getElementById('content');
  if (!content) return;

  if (!filtered.length) {
    content.innerHTML = '<div class="empty">אין הגשות.</div>';
    return;
  }

  let html = `<table class="tbl">
    <thead><tr>
      <th>שם תלמיד</th><th>כיתה</th><th>נושא</th><th>תאריך</th><th>ציון</th><th></th>
    </tr></thead><tbody>`;

  filtered.forEach(d => {
    const dt = new Date(d.submitted_at).toLocaleDateString('he-IL');
    const gradeHtml = d.grade != null
      ? `<span style="color:green;font-weight:700;">✅ ${d.grade}</span>`
      : `<span style="color:#999;">—</span>`;
    html += `<tr>
      <td><strong>${d.student_name || '—'}</strong></td>
      <td>${d.student_class || '—'}</td>
      <td><span class="topic-tag">${d.topic}</span></td>
      <td>${dt}</td>
      <td>${gradeHtml}</td>
      <td><button class="row-btn" onclick="tcToggleRow(${d.id})">פתח ▾</button></td>
    </tr>
    <tr class="expand-row" id="exp-${d.id}" style="display:none;">
      <td colspan="6" style="padding:0;">
        <div class="expand-panel">`;

    // הצג תשובות
    const answers = d.answers || {};
    Object.entries(answers).forEach(([k, v]) => {
      if (v) html += `<div class="ans-block">
        <div class="ans-label">${k}</div>
        <div class="ans-text">${String(v).replace(/\n/g, '<br>')}</div>
      </div>`;
    });

    // פאנל ציון
    html += `<div class="feedback-panel">
      <h4>📝 הערכת מורה</h4>
      ${d.grade != null ? `<div style="margin-bottom:10px;color:green;font-size:14px;">✅ ציון קיים: <strong>${d.grade}</strong>${d.feedback ? ' — ' + d.feedback : ''}</div>` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start;">
        <input type="number" id="grade-${d.id}" min="0" max="100" value="${d.grade ?? ''}" placeholder="ציון 0–100" style="width:100px;padding:8px;border:2px solid #ccc;font-family:Heebo,sans-serif;font-size:14px;">
        <textarea id="fb-${d.id}" placeholder="הערה לתלמיד..." style="flex:1;min-width:200px;padding:8px;border:2px solid #ccc;font-family:Heebo,sans-serif;font-size:13px;min-height:60px;">${d.feedback || ''}</textarea>
        <button onclick="tcSaveFeedback(${d.id})" style="padding:10px 20px;background:#6366f1;color:white;border:none;font-family:Heebo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;">שמור ✓</button>
      </div>
    </div>
    </div></td></tr>`;
  });

  html += '</tbody></table>';
  content.innerHTML = html;
}

function tcToggleRow(id) {
  const row = document.getElementById('exp-' + id);
  if (!row) return;
  const isOpen = row.style.display === 'table-row';
  if (_tcOpenRow && _tcOpenRow !== id) {
    const prev = document.getElementById('exp-' + _tcOpenRow);
    if (prev) prev.style.display = 'none';
  }
  row.style.display = isOpen ? 'none' : 'table-row';
  _tcOpenRow = isOpen ? '' : id;
}

async function tcSaveFeedback(id) {
  const grade = parseInt(document.getElementById('grade-' + id)?.value);
  const feedback = document.getElementById('fb-' + id)?.value.trim() || '';
  if (isNaN(grade) || grade < 0 || grade > 100) { alert('ציון לא תקין (0–100)'); return; }

  const { error } = await sb.from('submissions')
    .update({ grade, feedback, graded_at: new Date().toISOString(), graded_by: _tcTeacherID })
    .eq('id', id);

  if (error) { alert('שגיאה בשמירה'); return; }

  const rec = _tcAllData.find(d => d.id === id);
  if (rec) { rec.grade = grade; rec.feedback = feedback; }
  tcRenderTable();
}

function tcExportCSV() {
  const topic = document.getElementById('filter-topic')?.value || '';
  const cls = document.getElementById('filter-class')?.value || '';
  const data = _tcAllData.filter(d =>
    (!topic || d.topic === topic) && (!cls || d.student_class === cls)
  );

  if (!data.length) { alert('אין נתונים לייצוא'); return; }

  // אסוף את כל מפתחות התשובות
  const ansKeys = [...new Set(data.flatMap(d => Object.keys(d.answers || {})))];

  const headers = ['שם', 'כיתה', 'אימייל', 'נושא', 'קוד כיתה', 'תאריך', 'ציון', 'הערה', ...ansKeys];
  const rows = data.map(d => {
    const dt = new Date(d.submitted_at).toLocaleString('he-IL');
    return [
      d.student_name, d.student_class, d.student_email || '',
      d.topic, d.class_code, dt, d.grade ?? '', d.feedback || '',
      ...ansKeys.map(k => (d.answers?.[k] || '').replace(/\n/g, ' '))
    ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
  });

  const csv = '\uFEFF' + headers.map(h => '"' + h + '"').join(',') + '\n' + rows.join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'submissions-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
}
