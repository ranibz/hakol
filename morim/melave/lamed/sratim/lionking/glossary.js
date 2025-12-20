
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מלך האריות | ניתוח תקשורתי</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700;900&family=Rubik:wght@700;900&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet">

    <style>
        :root {
            --lion-gold: #FFC107;
            --lion-orange: #FF6F00;
            --lion-brown: #3E2723;
            --bg-color: #FFF8E1;
            --text-color: #333;
        }

        body {
            font-family: 'Heebo', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 0;
            line-height: 1.8;
            background-image: radial-gradient(#ffe082 1px, transparent 1px);
            background-size: 30px 30px;
        }

        /* --- כותרת --- */
        header {
            background: linear-gradient(135deg, var(--lion-brown), var(--lion-orange));
            color: white;
            padding: 60px 20px;
            text-align: center;
            border-bottom: 5px solid var(--lion-gold);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }

        h1 {
            font-family: 'Rubik', sans-serif;
            font-size: 3.5rem;
            margin: 0;
            text-shadow: 2px 2px 0px rgba(0,0,0,0.3);
        }

        .subtitle {
            font-size: 1.3rem;
            margin-top: 10px;
            font-weight: 300;
            opacity: 0.9;
        }

        /* --- אזור המושגים העליון --- */
        #glossary-container {
            margin: 30px auto;
            max-width: 900px;
        }
        
        /* עיצובים לסקריפט ה-JS של הכפתורים העליונים */
        .top-concepts-box {
            background: rgba(255, 255, 255, 0.95);
            border: 2px dashed var(--lion-orange);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }
        .top-concepts-title { color: var(--lion-brown); font-weight: bold; margin-bottom: 15px; font-size: 1.2rem; }
        .concepts-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
        .concept-wrapper { position: relative; display: inline-block; }
        .concept-btn {
            padding: 8px 16px; border-radius: 25px; font-size: 0.95rem; font-weight: bold;
            color: #333; cursor: pointer; transition: transform 0.2s; display: inline-block;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.1);
        }
        .concept-btn:hover { transform: scale(1.05); filter: brightness(1.05); }
        
        /* הבועה של הכפתורים העליונים */
        .concept-tooltip {
            display: none; position: absolute; bottom: 125%; left: 50%; transform: translateX(-50%);
            width: 300px; background-color: white; color: #333; padding: 15px; border-radius: 10px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.3); z-index: 100; text-align: right; font-size: 0.9rem;
            border-top: 4px solid var(--lion-orange);
        }
        .concept-wrapper.active .concept-tooltip { display: block; animation: fadeIn 0.3s ease; }
        .tooltip-arrow {
            position: absolute; top: 100%; left: 50%; margin-left: -10px;
            border-width: 10px; border-style: solid; border-color: white transparent transparent transparent;
        }
        @keyframes fadeIn { from { opacity:0; transform:translate(-50%, 10px); } to { opacity:1; transform:translate(-50%, 0); } }

        /* --- המאמר המרכזי --- */
        .article-container {
            max-width: 800px;
            margin: 40px auto;
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
            border-top: 1px solid #eee;
        }

        .article-container h2 {
            font-family: 'Rubik', sans-serif;
            color: var(--lion-orange);
            font-size: 2rem;
            border-bottom: 2px solid var(--lion-gold);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .article-container h3 {
            font-family: 'Rubik', sans-serif;
            color: var(--lion-brown);
            font-size: 1.4rem;
            margin-top: 30px;
            margin-bottom: 10px;
        }

        .article-text {
            font-size: 1.1rem;
            color: #444;
        }
        
        .article-text p {
            margin-bottom: 15px;
        }

        /* עיצוב המילים הלחיצות בטקסט */
        .highlight {
            background: linear-gradient(120deg, #ffd54f 0%, #ffecb3 100%);
            padding: 2px 5px;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer; /* יד מצביעה */
            border-bottom: 2px solid #FFA000;
            transition: all 0.2s;
        }
        
        .highlight:hover {
            background: #FFA000;
            color: white;
        }

        /* --- גריד הדמויות --- */
        .characters-grid {
            max-width: 1000px;
            margin: 40px auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            padding: 0 20px;
        }

        .char-card {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            text-decoration: none;
            color: inherit;
            transition: transform 0.3s;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
            border: 1px solid #eee;
            display: flex;
            flex-direction: column;
        }

        .char-card:hover { transform: translateY(-10px); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
        
        .char-img {
            height: 150px;
            background-color: #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #777;
            font-size: 3rem;
        }

        .char-content { padding: 15px; text-align: center; }
        .char-title { font-weight: bold; font-size: 1.2rem; display: block; margin-bottom: 5px; color: var(--lion-brown); }
        .char-desc { font-size: 0.9rem; color: #666; }

        .back-btn {
            display: block; width: 200px; margin: 50px auto; padding: 12px;
            text-align: center; background: var(--lion-brown); color: white;
            text-decoration: none; border-radius: 50px; font-weight: bold;
        }
        .back-btn:hover { background: var(--lion-orange); }

        /* --- עיצוב המודל (החלון הקופץ מהטקסט) --- */
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(2px); }
        .modal-content { background: white; padding: 30px; border-radius: 15px; max-width: 500px; position: relative; border-top: 6px solid var(--lion-orange); box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
        .close { position: absolute; top: 10px; left: 15px; cursor: pointer; font-size: 1.8rem; color: #999; }
        .modal-def-title { font-size: 1.4rem; font-weight: bold; color: var(--lion-brown); margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
        .modal-def-text { font-size: 1.1rem; line-height: 1.6; color: #333; }

        @media (max-width: 768px) {
            h1 { font-size: 2.5rem; }
            .article-container { padding: 20px; }
            .concept-tooltip { width: 250px; left: 0; transform: none; }
        }
    </style>
</head>
<body>

    <header>
        <h1>מלך האריות</h1>
        <div class="subtitle">ההיסטוריה נכתבת על ידי המנצחים</div>
        
        <div id="glossary-container"></div>
    </header>

    <div class="article-container">
        <h2>האם רק לסימבה יש סיפור?</h2>
        <div class="article-text">
            <p>
                המשפט הידוע אומר ש"ההיסטוריה נכתבת על ידי המנצחים". בשיעורי התקשורת, אנחנו קוראים לזה 
                <span class="highlight" onclick="openModal('narrative')">נרטיב</span> (סיפר). 
                הסרט "מלך האריות" מספר לנו סיפור אחד בלבד – הסיפור של האריות מ"צוק התקווה". אנחנו מזדהים אוטומטית עם סימבה ומופאסה, כי הסרט מעצב אותם כגיבורים וכ"טובים".
                אבל מה קורה אם נחליף את המשקפיים וננסה לראות את הנרטיבים האחרים?
            </p>

            <h3>האפרטהייד של מופאסה</h3>
            <p>
                מופאסה מוצג כמלך נאור, אך שלטונו מבוסס על 
                <span class="highlight" onclick="openModal('exclusion')">הדרה</span> מוחלטת. 
                הממלכה שלו היא למעשה משטר הפרדה (אפרטהייד): האריות ("הגזע העליון") חיים בשפע, בעוד הצבועים נדחקים לגטאות של "בית הקברות לפילים" ללא זכויות, ללא מזון וללא יכולת לנוע בחופשיות. 
                האידיאולוגיה של מופאסה – "גלגל החיים" – מצדיקה את העליונות הזו כ"טבעית". האם זו באמת הרמוניה, או שזהו דיכוי?
            </p>

            <h3>המהפכה של סקאר: נבל או סוציאליסט?</h3>
            <p>
                סקאר נחשב לנבל האולטימטיבי, אך האם רצונו להיות מלך אינו לגיטימי? הרי הוא אחיו של המלך.
                יתרה מכך, סקאר הוא היחיד שמציע אלטרנטיבה של 
                <span class="highlight" onclick="openModal('pluralism')">פלורליזם</span> 
                ו<span class="highlight" onclick="openModal('pluralism')">רב-תרבותיות</span>.
            </p>
            <p>
                החזון שסקאר מציג בשירו הוא חזון של שוויון: אריות וצבועים חיים יחד. הוא היחיד שמוכן לשלב את המיעוט המודר (הצבועים) בתוך החברה ולתת להם מקום. 
                מדוע, אם כן, הסרט מציג את תקופת שלטונו כחשוכה והרסנית? 
                כי הסרט משרת את 
                <span class="highlight" onclick="openModal('hegemony')">הנרטיב ההגמוני</span>: 
                הוא מלמד אותנו שערבוב בין המעמדות ומתן כוח ל"אחרים" (הצבועים) יוביל בהכרח לאסון, ושרק חזרה לסדר הישן (סימבה) תביא את הגשם והפריחה.
            </p>
            <p>
                <strong>לפניכם ניתוח מעמיק של הדמויות המרכזיות והקשרן למושגי התקשורת:</strong>
            </p>
        </div>
    </div>

    <div class="characters-grid">
        
        <a href="simba.html" class="char-card">
            <div class="char-img" style="background: #FFECB3;">🦁</div>
            <div class="char-content">
                <span class="char-title">סימבה</span>
                <span class="char-desc">הנרטיב המנצח ומסע הגיבור</span>
            </div>
        </a>

        <a href="scar.html" class="char-card">
            <div class="char-img" style="background: #cfd8dc;">😈</div>
            <div class="char-content">
                <span class="char-title">סקאר</span>
                <span class="char-desc">האלטרנטיבה והמהפכה שנכשלה</span>
            </div>
        </a>

        <a href="hyenas.html" class="char-card">
            <div class="char-img" style="background: #424242; color: #76ff03;">🦴</div>
            <div class="char-content">
                <span class="char-title">הצבועים</span>
                <span class="char-desc">הדרה חברתית וסטריאוטיפים</span>
            </div>
        </a>

        <a href="zazu.html" class="char-card">
            <div class="char-img" style="background: #E1F5FE; color: #0288D1;">🦜</div>
            <div class="char-content">
                <span class="char-title">זאזו</span>
                <span class="char-desc">שומר הסף והתקשורת המגויסת</span>
            </div>
        </a>

        <a href="timon_pumbaa.html" class="char-card">
            <div class="char-img" style="background: #E8F5E9; color: #2E7D32;">🐗</div>
            <div class="char-content">
                <span class="char-title">טימון ופומבה</span>
                <span class="char-desc">אינדיבידואליזם ואסקפיזם</span>
            </div>
        </a>

        <a href="imperialism.html" class="char-card">
            <div class="char-img" style="background: #FAFAFA; color: #B71C1C;">🌍</div>
            <div class="char-content">
                <span class="char-title">אימפריאליזם</span>
                <span class="char-desc">ניכוס תרבותי ומסחור</span>
            </div>
        </a>

    </div>

    <a href="../../index.html" class="back-btn">חזרה לתפריט ראשי</a>

    <div id="modal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal()">&times;</span>
            <div id="modal-def-content"></div>
        </div>
    </div>

    <script src="glossary.js"></script>
    <script>
        // המושגים המרכזיים שיוצגו בכפתורים בראש הדף
        const relevantTerms = [
            "narrative",           
            "hegemony",            
            "exclusion",           
            "pluralism",           
            "social_construction", 
            "ideology"             
        ];

        document.addEventListener('DOMContentLoaded', () => {
            if (typeof renderPageGlossary === 'function') {
                renderPageGlossary(relevantTerms);
            }
        });

        // פונקציה לפתיחת המודל מתוך הטקסט
        function openModal(id) {
            const modal = document.getElementById('modal');
            const contentDiv = document.getElementById('modal-def-content');
            
            // בדיקה אם המושג קיים בקובץ ה-JS
            if (typeof glossaryDB !== 'undefined' && glossaryDB[id]) {
                const item = glossaryDB[id];
                contentDiv.innerHTML = `
                    <div class="modal-def-title">
                        <span class="material-icons-round" style="color:${item.color}">${item.icon}</span>
                        ${item.term}
                    </div>
                    <div class="modal-def-text">${item.def}</div>
                `;
                modal.style.display = 'flex';
            } else {
                // במקרה של שגיאה או מושג חסר
                console.log("מושג לא נמצא:", id);
                // אופציה: להציג הודעת שגיאה במודל
                contentDiv.innerHTML = `<div class="modal-def-text">הגדרת המושג לא נמצאה במאגר.</div>`;
                modal.style.display = 'flex';
            }
        }

        function closeModal() {
            document.getElementById('modal').style.display = 'none';
        }

        // סגירה בלחיצה מחוץ לחלון
        window.onclick = function(event) {
            const modal = document.getElementById('modal');
            if (event.target == modal) {
                closeModal();
            }
        }
    </script>
</body>
</html>