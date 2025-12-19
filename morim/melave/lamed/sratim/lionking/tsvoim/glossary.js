/* glossary.js - המוח של האגרון (גרסה נקייה - רק חומר שהתקבל) */

const glossaryDB = {
    // --- זירת העל / דמוקרטיה ---
    "democracy": {
        term: "דמוקרטיה",
        def: "שיטת ממשל בה לכל האזרחים יש זכות להשפיע על המדיניות הציבורית באופן חוקי וממוסד. מתאפיינת בשוויון, שמירה על זכויות אדם, הפרדת רשויות ותקשורת חופשית.",
        icon: "how_to_vote",
        color: "#a0c4ff"
    },
    "freedom_of_speech": {
        term: "חופש הביטוי",
        def: "הזכות לפרסם ולחלוק מחשבות ורגשות באופן חופשי. תנאי הכרחי לקיום 'שוק דעות' ובירור האמת.",
        icon: "record_voice_over",
        color: "#bdb2ff"
    },
    "open_marketplace_of_ideas": {
        term: "שוק דעות פתוח",
        def: "תפיסה לפיה יש לאפשר לכל הדעות להישמע, מתוך הנחה שהאמת תנצח בוויכוח הרציונלי והיא זו שתשכנע את הרוב.",
        icon: "storefront",
        color: "#ffc6ff"
    },
    "public_right_to_know": {
        term: "זכות הציבור לדעת",
        def: "זכותו של האזרח לקבל מידע המצוי בידי השלטון (חופש המידע) כדי שיוכל לקבל החלטות ולקחת חלק בהליך הדמוקרטי.",
        icon: "info",
        color: "#9bf6ff"
    },
    "pluralism": {
        term: "פלורליזם",
        def: "ריבוי ומגוון של דעות, תרבויות ואמצעי תקשורת. מתן אפשרות לכל הקבוצות בחברה להביע את דעתן ואת השונות שלהן.",
        icon: "groups",
        color: "#caffbf"
    },
    "freedom_of_press": {
        term: "חופש העיתונות",
        def: "אי-תלות ועצמאות העיתונות והגנה עליה מפני השלטון, כדי שתוכל לבצע את תפקידה ככלב שמירה וכרשות מבקרת.",
        icon: "newspaper",
        color: "#fdffb6"
    },
    "free_speech_limitations": {
        term: "הגבלות על חופש הביטוי",
        def: "הגבלה של ביטוי רק במקרים קיצוניים של התנגשות עם ערכים אחרים: פגיעה בביטחון המדינה, פגיעה בשם הטוב (דיבה) ופגיעה בפרטיות.",
        icon: "gavel",
        color: "#ffadad"
    },
    "media_fourth_estate": {
        term: "הרשות הרביעית",
        def: "התקשורת כגוף המבקר ומפקח על שלוש הרשויות (המחוקקת, המבצעת, השופטת), חושפת מידע ומקשרת בין השלטון לאזרחים.",
        icon: "security",
        color: "#ffd6a5"
    },
    "public_sphere": {
        term: "המרחב הציבורי",
        def: "מקום פומבי (פיזי או וירטואלי) שבו מתנהל דיון רציונלי בעניינים ציבוריים ובו מתגבשת דעת הקהל (הברמאס).",
        icon: "forum",
        color: "#a0c4ff"
    },

    // --- אמת, שקר ומציאות ---
    "post_truth": {
        term: "פוסט-אמת",
        def: "תרבות פוליטית שבה לעובדות אובייקטיביות יש פחות השפעה על דעת הקהל מאשר לפניות לרגש ולאמונה אישית. אין אמת אחת, יש נרטיבים.",
        icon: "blur_on",
        color: "#ffc6ff"
    },
    "fake_news": {
        term: "פייק ניוז",
        def: "ידיעות בדויות המופצות בכוונה להטעות (למטרות פוליטיות או כלכליות) במסווה של חדשות אמיתיות.",
        icon: "warning",
        color: "#ffadad"
    },
    "fact_vs_opinion": {
        term: "עובדה ודעה",
        def: "ההבחנה בין תיאור המציאות כפי שהתרחשה (עובדה) לבין עמדה אישית ופרשנות (דעה). טשטוש הגבול פוגע באמינות.",
        icon: "fact_check",
        color: "#caffbf"
    },
    "agenda_setting": {
        term: "תאוריית סדר היום",
        def: "התקשורת קובעת לציבור 'על מה לחשוב' (ולא מה לחשוב) על ידי הבלטת נושאים מסוימים והצנעת אחרים.",
        icon: "view_agenda",
        color: "#fdffb6"
    },
    "media_bias": {
        term: "הטיה",
        def: "סיקור שאינו ניטרלי ונוטה לכיוון מסוים (פוליטי, כלכלי, אידיאולוגי). מתבטא במסגור, השמטת מידע, ועריכה מגמתית.",
        icon: "compare_arrows",
        color: "#ffd6a5"
    },
    "social_construction": {
        term: "הבניית המציאות",
        def: "התקשורת אינה משקפת מציאות אלא בוררת, מעצבת ומבנה אותה. אנו רואים את העולם דרך 'המשקפיים' של התקשורת.",
        icon: "construction",
        color: "#9bf6ff"
    },

    // --- חברה, זהות וייצוג ---
    "representation": {
        term: "ייצוג",
        def: "האופן שבו קבוצות שונות מוצגות במדיה. ייצוג חסר או מעוות משפיע על מעמדן החברתי.",
        icon: "theater_comedy",
        color: "#bdb2ff"
    },
    "exclusion": {
        term: "הדרה",
        def: "היעדר ייצוג או ייצוג מצומצם ושולי של קבוצה מסוימת בתקשורת (ההפך מרב-תרבותיות).",
        icon: "person_off",
        color: "#fdffb6"
    },
    "hegemony": {
        term: "הגמוניה",
        def: "שליטה של קבוצה אחת באמצעות יצירת הסכמה ('קונצנזוס'). השקפת העולם של החזקים מוצגת כטבעית והגיונית לכולם.",
        icon: "psychology_alt",
        color: "#a0c4ff"
    },
    "identity_politics": {
        term: "פוליטיקה של זהויות",
        def: "התארגנות המדגישה זהויות 'קטנות' (מגדר, דת, מוצא) ותובעת עבורן זכויות, לעומת הזהות הלאומית הרחבה.",
        icon: "badge",
        color: "#ffc6ff"
    },
    "political_correctness": {
        term: "תקינות פוליטית (PC)",
        def: "עיצוב השיח במטרה לא להעליב קבוצות מוחלשות. נובע מההנחה שלשפה יש כוח לעצב מציאות.",
        icon: "spellcheck",
        color: "#caffbf"
    },
    "cancel_culture": {
        term: "תרבות הביטול",
        def: "נידוי או חרם חברתי על אדם שהתבטא באופן שנתפס כפוגעני, לרוב באמצעות הרשתות החברתיות.",
        icon: "block",
        color: "#ffadad"
    },
    "media_violence": {
        term: "תיאוריות על אלימות",
        def: "גישות המסבירות את השפעת האלימות במדיה: קתרזיס (שחרור), חיקוי (למידה), עוררות וחיזוק עמדות.",
        icon: "flash_on",
        color: "#ffd6a5"
    },

    // --- מבנה, כלכלה ומוסדות ---
    "cross_ownership": {
        term: "בעלויות צולבות",
        def: "מצב בו גורם אחד שולט במגוון אמצעי תקשורת או עסקים שונים, מה שעלול לפגוע בסיקור ההוגן וביסודות הדמוקרטיה.",
        icon: "lan",
        color: "#9bf6ff"
    },
    "capital_gov_press": {
        term: "הון-שלטון-עיתון",
        def: "משולש האינטרסים והקשרים בין בעלי ההון, הפוליטיקאים והתקשורת, היוצר תלות הדדית ולעיתים פוגע בציבור.",
        icon: "attach_money",
        color: "#a0c4ff"
    },
    "public_media": {
        term: "שידור ציבורי",
        def: "תקשורת בבעלות הציבור הממומנת מכספי מיסים. מטרתה לשרת את האינטרס הציבורי ולא רווח כלכלי (כמו כאן 11).",
        icon: "radio",
        color: "#bdb2ff"
    },
    "commercial_media": {
        term: "תקשורת מסחרית",
        def: "תקשורת בבעלות פרטית הממומנת מפרסומות. המטרה העיקרית היא רווח כלכלי, התלוי ברייטינג.",
        icon: "store",
        color: "#fdffb6"
    },
    "public_trust": {
        term: "אמון הציבור",
        def: "המידה שבה האזרחים מאמינים שהתקשורת פועלת ביושרה ולמענם. אמון נמוך פוגע ביכולת לקיים שיח דמוקרטי.",
        icon: "handshake",
        color: "#caffbf"
    },
    "media_accountability": {
        term: "אחריותיות",
        def: "חובת התקשורת לתת דין וחשבון על מעשיה, להודות בטעויות, להתנצל ולבצע פעולות מתקנות.",
        icon: "verified_user",
        color: "#9bf6ff"
    },
    "social_responsibility": {
        term: "תקשורת ואחריות חברתית",
        def: "בחירה של התקשורת להגביל את עצמה (למשל במלחמה) מתוך דאגה לחברה, גם אם החוק לא מחייב זאת.",
        icon: "health_and_safety",
        color: "#ffc6ff"
    },
    "journalistic_ethics": {
        term: "אתיקה עיתונאית",
        def: "כללי התנהגות מוסריים ומקצועיים (אמת, דיוק, הוגנות, פרטיות) שהעיתונאים מקבלים על עצמם.",
        icon: "balance",
        color: "#ffd6a5"
    },
    "press_council": {
        term: "מועצת העיתונות",
        def: "גוף וולונטרי (התנדבותי) המורכב מנציגי ציבור ועיתונות, שתפקידו לשמור על האתיקה וחופש העיתונות.",
        icon: "local_police",
        color: "#bdb2ff"
    },
    "mobilized_media": {
        term: "תקשורת מגויסת",
        def: "תקשורת שאינה מבקרת את השלטון אלא משרתת אותו (בכפייה או מרצון בזמן חירום) ומקדמת את הנרטיב שלו.",
        icon: "military_tech",
        color: "#ffadad"
    },
    "sectorial_media": {
        term: "תקשורת מגזרית",
        def: "כלי תקשורת הפונים למגזר ספציפי (חרדים, ערבים) ומותאמים לו בתוכן, בשפה ובערכים.",
        icon: "synagogue",
        color: "#a0c4ff"
    },
    "investigative_journalism": {
        term: "עיתונות חוקרת",
        def: "עבודה עם מקורות ראשוניים כדי לחשוף מידע שמישהו מנסה להסתיר. התגלמות 'זכות הציבור לדעת'.",
        icon: "search",
        color: "#caffbf"
    },

    // --- מושגי קמפיינים (מהקוד הספציפי ששלחת) ---
    "ad_campaign": {
        term: "קמפיין פרסום",
        def: "סדרת פעולות פרסום מתואמות ומתוכננות להעברת מסר מסוים לקהל יעד, במטרה להשיג יעד מוגדר.",
        icon: "campaign",
        color: "#ffc6ff"
    },
    "commercial_campaign": {
        term: "קמפיין מסחרי",
        def: "פרסום שנועד לקדם מוצר או שירות תמורת רווח כספי למפרסם.",
        icon: "storefront",
        color: "#ffadad"
    },
    "social_campaign": {
        term: "קמפיין חברתי",
        def: "פרסום שנועד לקדם מטרה חברתית או ציבורית (כמו בריאות, בטיחות) ללא כוונת רווח.",
        icon: "volunteer_activism",
        color: "#caffbf"
    },
    "imposter_campaign": {
        term: "קמפיין מתחזה",
        def: "קמפיין מסחרי המציג עצמו כחברתי כדי לשפר תדמית ולקדם מכירות בצורה עקיפה.",
        icon: "masks",
        color: "#ffd6a5"
    }
};

/* --- הפונקציה שבונה את הכפתורים בדף --- */
function renderPageGlossary(termIds) {
    const container = document.getElementById('glossary-container');
    if (!container) return;

    let html = `
        <div class="top-concepts-box">
            <div class="top-concepts-title">
                <span class="material-icons-round">touch_app</span> מושגי מפתח (לחצו לפירוש)
            </div>
            <div class="concepts-grid">
    `;

    termIds.forEach(id => {
        const item = glossaryDB[id];
        if (item) {
            html += `
                <div class="concept-wrapper" onclick="toggleTooltip(this)">
                    <span class="concept-btn" style="background-color: ${item.color};">
                        <span class="material-icons-round" style="font-size:16px; vertical-align:middle;">${item.icon}</span> ${item.term}
                    </span>
                    <div class="concept-tooltip">
                        ${item.def}
                        <div class="tooltip-arrow"></div>
                    </div>
                </div>
            `;
        }
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// פונקציית עזר לפתיחה/סגירה של הבועה
function toggleTooltip(element) {
    const allWrappers = document.querySelectorAll('.concept-wrapper');
    allWrappers.forEach(wrapper => {
        if (wrapper !== element) {
            wrapper.classList.remove('active');
        }
    });
    element.classList.toggle('active');
}