-- 1. 删除旧的 records 表
DROP TABLE IF EXISTS records CASCADE;

-- 2. 重新创建 records 表
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category TEXT NOT NULL,
  subcategory TEXT DEFAULT '',
  amount DECIMAL(12,2) NOT NULL,
  note TEXT DEFAULT '',
  record_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_records_date ON records(date DESC);
CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);
CREATE INDEX IF NOT EXISTS idx_records_record_by ON records(record_by);

-- 3. 关闭 RLS（或放开权限）
ALTER TABLE records DISABLE ROW LEVEL SECURITY;
GRANT ALL ON records TO anon, authenticated;

-- 4. 启用实时同步
ALTER PUBLICATION supabase_realtime ADD TABLE records;
