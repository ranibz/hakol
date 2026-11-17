/* zirot/agron-link.js · v1.0.0 · 2026-11-17
   פירושי המושגים בדפי הזירות נמשכים מהאגרון (טבלת concepts ב-Supabase — אותו מקור שהאגרון מציג).
   במקום לסמוך על data-slug של כל שבב (שהצביע לפעמים לשורה הלא נכונה), השבב מחפש באגרון לפי השם:
   1. מושג באגרון באותו שם בדיוק
   2. מושג באגרון שהשם שלו מכיל את שם השבב (או להפך)
   3. מושג באגרון שבתוך ההגדרה שלו מופיע שם השבב (למשל "מודל מעגלי" ← "מודלים של תקשורת")
   עדיפות לאותה זירה ולשורה הראשית (slug בלי ‎-2/-3). שם אחר באגרון? data-agron="שם המושג באגרון" על השבב.
   בחלון מסומן המושג שנלחץ, ומופיע קישור לאגרון. | פיתוח: רני בן זאב */
(function (root) {
  const SUPABASE_URL = "https://eubgzfkkovxgijhrmnif.supabase.co";
  const KEY = "sb_publishable_vJ768fOwYWiDWeYsBBR45g_4NM4s55p";
  const AGRON_URL = "/agron/index.html";

  function norm(s) {
    return String(s || "")
      .replace(/[֑-ׇ]/g, "")          // ניקוד וטעמים
      .replace(/["'״׳`]/g, "")
      .replace(/[-–—/\\,.:()]/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  function plain(html) { return norm(String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")); }
  const isMain = r => !/-\d+$/.test(r.slug || "");

  /* הבחירה עצמה — פונקציה טהורה (נבדקת גם מחוץ לדפדפן) */
  function agronMatch(name, zone, rows) {
    const n = norm(name);
    if (!n || !rows || !rows.length) return null;
    const rank = (list, extra) => list.slice().sort((a, b) =>
      ((b.zone === zone) - (a.zone === zone)) || (isMain(b) - isMain(a)) || (extra ? extra(a, b) : 0))[0] || null;

    const exact = r => norm(r.term) === n;
    const words = n.split(" ").filter(w => w.length >= 2);
    const byName = r => {
      const t = norm(r.term); if (t.length < 3 || n.length < 3) return false;
      if (t.includes(n) || n.includes(t)) return true;
      const tw = t.split(" ");                       // כל המילים של השבב מופיעות בשם המושג (בכל סדר)
      return words.length >= 2 && words.every(w => tw.includes(w));
    };
    const inside = r => plain(r.definition_html).includes(n);
    const bold = r => plain((String(r.definition_html || "").match(/<(strong|b)\b[^>]*>[\s\S]*?<\/\1>/gi) || []).join(" ")).includes(n);
    const closer = (a, b) => Math.abs(norm(a.term).length - n.length) - Math.abs(norm(b.term).length - n.length);
    const same = rows.filter(r => r.zone === zone);

    /* קודם שם זהה (בכל האגרון), אחר כך בתוך הזירה של הדף, ורק אז בכל האגרון */
    /* מילה קצרה (כמו "מסר") מחפשים קודם בתוך הגדרות הזירה, כדי לא להיתפס במושג רחוק שבשמו היא מופיעה */
    const shortWord = n.length < 5;
    const steps = [
      [rows, exact, null, "exact"],
      [same, byName, closer, "name"],
      shortWord ? [same, inside, (a, b) => bold(b) - bold(a), "inside"] : [rows, byName, closer, "name"],
      shortWord ? [rows, byName, closer, "name"] : [same, inside, (a, b) => bold(b) - bold(a), "inside"],
      [rows, inside, (a, b) => bold(b) - bold(a), "inside"]
    ];
    for (const [list, test, extra, how] of steps) {
      const hit = list.filter(test);
      if (hit.length) return { row: rank(hit, extra), how };
    }
    return null;
  }

  let ROWS = null;
  async function loadRows() {
    if (ROWS) return ROWS;
    const url = SUPABASE_URL + "/rest/v1/concepts?select=term,slug,zone,definition_html&limit=2000";
    const res = await fetch(url, { headers: { apikey: KEY } });
    if (!res.ok) throw new Error("agron " + res.status);
    ROWS = await res.json();
    return ROWS;
  }

  function pageZone() {
    const f = (location.pathname.split("/").pop() || "").toLowerCase();
    if (f.indexOf("ziratal") === 0) return "al";
    const m = f.match(/^zira(\d)/);
    return m ? m[1] : "";
  }
  function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* סימון המושג שנלחץ בתוך ההגדרה */
  function highlight(el, name) {
    const n = String(name || "").trim(); if (n.length < 2) return;
    const re = new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    let first = null;
    nodes.forEach(t => {
      if (!re.test(t.nodeValue)) return; re.lastIndex = 0;
      const frag = document.createDocumentFragment(); let last = 0, m;
      while ((m = re.exec(t.nodeValue))) {
        frag.appendChild(document.createTextNode(t.nodeValue.slice(last, m.index)));
        const mk = document.createElement("mark"); mk.textContent = m[0];
        mk.style.cssText = "background:#fff3b0;padding:0 2px;border-radius:3px";
        frag.appendChild(mk); if (!first) first = mk; last = m.index + m[0].length;
      }
      frag.appendChild(document.createTextNode(t.nodeValue.slice(last)));
      t.parentNode.replaceChild(frag, t);
    });
    if (first && first.scrollIntoView) setTimeout(() => first.scrollIntoView({ block: "center" }), 60);
  }

  function show(title, html) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalBody").innerHTML = html;
    document.getElementById("conceptModal").classList.add("active");
  }
  const link = '<p style="margin-top:14px"><a href="' + AGRON_URL + '" target="_blank" style="font-weight:bold;">פתחו את האגרון &#8592;</a></p>';

  function init() {
    const modal = document.getElementById("conceptModal");
    if (!modal) return;
    const zone = pageZone();
    document.querySelectorAll(".concept-tag").forEach(t => t.replaceWith(t.cloneNode(true))); // מנקה מאזינים ישנים
    document.querySelectorAll(".concept-tag").forEach(tag => {
      tag.style.cursor = "pointer";
      tag.addEventListener("click", async function () {
        const name = (this.getAttribute("data-agron") || this.getAttribute("data-concept") || this.textContent).trim();
        const title = this.textContent.trim();
        show(title, '<p style="color:#888;">טוען פירוש מהאגרון&#8230;</p>');
        try {
          const m = agronMatch(name, zone, await loadRows());
          if (!m || !m.row) { show(title, "<p>המושג עוד לא נמצא באגרון.</p>" + link); return; }
          const other = norm(m.row.term) !== norm(title);
          const from = !other ? "" :
            '<p style="font-size:.85em;color:#666;margin:0 0 8px">מתוך המושג באגרון: <b>' + esc(m.row.term) + "</b></p>";
          show(title, from + (m.row.definition_html || "") + link);
          if (other) {
            /* סימון רק בכותרות המודגשות שבהן מופיע המושג; אם אין — בכל ההגדרה */
            const body = document.getElementById("modalBody");
            const strongs = [...body.querySelectorAll("strong,b")].filter(x => x.textContent.includes(title));
            (strongs.length ? strongs : [body]).forEach(el => highlight(el, title));
          }
        } catch (e) {
          show(title, "<p>לא הצלחנו לטעון את האגרון כרגע.</p>" + link);
        }
      });
    });
    window.closeModal = function () { modal.classList.remove("active"); };
    modal.addEventListener("click", e => { if (e.target === modal) window.closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") window.closeModal(); });
  }

  root.agronMatch = agronMatch;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  }
  if (typeof module !== "undefined") module.exports = { agronMatch, norm };
})(typeof window !== "undefined" ? window : globalThis);
