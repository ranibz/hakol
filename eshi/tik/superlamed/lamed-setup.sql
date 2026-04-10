-- ============================================
-- פרויקט למ"ד - Supabase Setup
-- ============================================

-- טבלת מנהלים
CREATE TABLE admins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pass TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- טבלת מורים
CREATE TABLE teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pass TEXT,
    classes TEXT[], -- מערך כיתות
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- טבלת תלמידים (עבודת גמר למ"ד)
CREATE TABLE gmar_students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cls TEXT, -- כיתה
    drive_link TEXT, -- קישור לתיקיית גוגל דרייב
    teacher_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- טבלת נתוני עבודת גמר
CREATE TABLE gmar_data (
    student_id TEXT PRIMARY KEY REFERENCES gmar_students(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}', -- כל השדות של העבודה
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- טבלת תיק דיגיטלי (לעתיד - כיתות י'-יא')
CREATE TABLE portfolio_students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cls TEXT,
    teacher_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portfolio_works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES portfolio_students(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    file_url TEXT,
    category TEXT,
    grade TEXT,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies - Allow All (פשוט לעכשיו)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmar_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmar_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_works ENABLE ROW LEVEL SECURITY;

-- פוליסות פתוחות
CREATE POLICY "Allow all on admins" ON admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on teachers" ON teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on gmar_students" ON gmar_students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on gmar_data" ON gmar_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on portfolio_students" ON portfolio_students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on portfolio_works" ON portfolio_works FOR ALL USING (true) WITH CHECK (true);

-- אינדקסים
CREATE INDEX idx_gmar_students_cls ON gmar_students(cls);
CREATE INDEX idx_gmar_students_teacher ON gmar_students(teacher_id);
CREATE INDEX idx_portfolio_students_cls ON portfolio_students(cls);
