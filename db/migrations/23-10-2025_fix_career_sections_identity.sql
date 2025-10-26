-- 23-10-2025_fix_career_sections_identity.sql
-- Mục tiêu tổng hợp:
-- 1) Thêm IDENTITY + PK cho các bảng insert-hàng-loạt (tasks/technology/ksas/wages)
-- 2) Dọn trùng (ưu tiên ONLINE) và tạo UNIQUE INDEX để tránh trùng tự nhiên
-- 3) Đảm bảo core.careers có UNIQUE INDEX trên onet_code
-- 4) Đặt PK theo onet_code cho các bảng 1-1 (prep/outlook/interests)
-- 5) Thêm index (onet_code, source) để ưu tiên ONLINE khi đọc

SET search_path TO core, public;

BEGIN;

---------------------------------------------
-- 0) Đảm bảo unique index cho careers.onet_code
---------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS ux_careers_onet_code
  ON core.careers (onet_code);

---------------------------------------------
-- 1) Thêm IDENTITY + PK cho bảng insert-hàng-loạt
--    (career_tasks, career_technology, career_ksas, career_wages_us)
---------------------------------------------

-- 1.1 career_tasks (skip ADD IDENTITY if default/sequence already in place)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='core.career_tasks'::regclass AND contype='p'
  ) THEN
    ALTER TABLE core.career_tasks
      ADD CONSTRAINT career_tasks_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- 1.2 career_technology (skip ADD IDENTITY if default/sequence already in place)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='core.career_technology'::regclass AND contype='p'
  ) THEN
    ALTER TABLE core.career_technology
      ADD CONSTRAINT career_technology_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- 1.3 career_ksas (skip ADD IDENTITY if default/sequence already in place)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='core.career_ksas'::regclass AND contype='p'
  ) THEN
    ALTER TABLE core.career_ksas
      ADD CONSTRAINT career_ksas_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- 1.4 career_wages_us (skip ADD IDENTITY if default/sequence already in place)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='core.career_wages_us'::regclass AND contype='p'
  ) THEN
    ALTER TABLE core.career_wages_us
      ADD CONSTRAINT career_wages_us_pkey PRIMARY KEY (id);
  END IF;
END $$;

---------------------------------------------
-- 2) Dọn trùng trước khi tạo UNIQUE INDEX
--    Chính sách: giữ ONLINE nếu có; nếu không, giữ id nhỏ nhất
---------------------------------------------

-- 2.1 career_tasks: key (onet_code, task_text)
WITH ranked AS (
  SELECT
    id,
    onet_code,
    task_text,
    source,
    ROW_NUMBER() OVER (
      PARTITION BY onet_code, task_text
      ORDER BY (CASE WHEN source='ONLINE' THEN 1 ELSE 0 END) DESC, id ASC
    ) AS rn
  FROM core.career_tasks
)
DELETE FROM core.career_tasks t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- 2.2 career_technology: key (onet_code, COALESCE(category,''), COALESCE(name,''))
WITH ranked AS (
  SELECT
    id,
    onet_code,
    COALESCE(category,'') AS category_norm,
    COALESCE(name,'')     AS name_norm,
    source,
    ROW_NUMBER() OVER (
      PARTITION BY onet_code, COALESCE(category,''), COALESCE(name,'')
      ORDER BY (CASE WHEN source='ONLINE' THEN 1 ELSE 0 END) DESC, id ASC
    ) AS rn
  FROM core.career_technology
)
DELETE FROM core.career_technology t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- 2.3 career_ksas: key (onet_code, COALESCE(ksa_type,''), COALESCE(name,''), COALESCE(category,''))
WITH ranked AS (
  SELECT
    id,
    onet_code,
    COALESCE(ksa_type,'') AS ksa_type_norm,
    COALESCE(name,'')     AS name_norm,
    COALESCE(category,'') AS category_norm,
    source,
    ROW_NUMBER() OVER (
      PARTITION BY onet_code, COALESCE(ksa_type,''), COALESCE(name,''), COALESCE(category,'')
      ORDER BY (CASE WHEN source='ONLINE' THEN 1 ELSE 0 END) DESC, id ASC
    ) AS rn
  FROM core.career_ksas
)
DELETE FROM core.career_ksas t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- 2.4 career_wages_us: key (onet_code, area, timespan) — optional
WITH ranked AS (
  SELECT
    id,
    onet_code,
    COALESCE(area,'')     AS area_norm,
    COALESCE(timespan,'') AS span_norm,
    source,
    ROW_NUMBER() OVER (
      PARTITION BY onet_code, COALESCE(area,''), COALESCE(timespan,'')
      ORDER BY (CASE WHEN source='ONLINE' THEN 1 ELSE 0 END) DESC, id ASC
    ) AS rn
  FROM core.career_wages_us
)
DELETE FROM core.career_wages_us t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

---------------------------------------------
-- 3) UNIQUE INDEX theo natural keys (idempotent)
---------------------------------------------

-- 3.1 career_tasks
CREATE UNIQUE INDEX IF NOT EXISTS ux_career_tasks_unique
  ON core.career_tasks (onet_code, task_text);

-- 3.2 career_technology (dùng COALESCE để NULL không phá uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS ux_career_technology_unique
  ON core.career_technology (onet_code, COALESCE(category,''), COALESCE(name,''));

-- 3.3 career_ksas (dùng COALESCE)
CREATE UNIQUE INDEX IF NOT EXISTS ux_career_ksas_unique
  ON core.career_ksas (onet_code, COALESCE(ksa_type,''), COALESCE(name,''), COALESCE(category,''));

-- 3.4 career_wages_us (optional theo area + timespan)
CREATE UNIQUE INDEX IF NOT EXISTS ux_career_wages_us_unique
  ON core.career_wages_us (onet_code, COALESCE(area,''), COALESCE(timespan,''));

---------------------------------------------
-- 4) PK cho các bảng 1-1 theo onet_code (nếu chưa có PK/UNIQUE)
---------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='core.career_prep'::regclass AND contype IN ('p','u')
  ) THEN
    ALTER TABLE core.career_prep
      ADD CONSTRAINT career_prep_pk PRIMARY KEY (onet_code);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='core.career_outlook'::regclass AND contype IN ('p','u')
  ) THEN
    ALTER TABLE core.career_outlook
      ADD CONSTRAINT career_outlook_pk PRIMARY KEY (onet_code);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='core.career_interests'::regclass AND contype IN ('p','u')
  ) THEN
    ALTER TABLE core.career_interests
      ADD CONSTRAINT career_interests_pk PRIMARY KEY (onet_code);
  END IF;
END $$;

---------------------------------------------
-- 5) Index phụ trợ để ưu tiên ONLINE và lookup nhanh
---------------------------------------------

-- (onet_code, source) cho 3 bảng chính
CREATE INDEX IF NOT EXISTS idx_career_tasks_onet_source
  ON core.career_tasks (onet_code, source);
CREATE INDEX IF NOT EXISTS idx_career_technology_onet_source
  ON core.career_technology (onet_code, source);
CREATE INDEX IF NOT EXISTS idx_career_ksas_onet_source
  ON core.career_ksas (onet_code, source);

-- (tuỳ chọn) thêm cho wages
CREATE INDEX IF NOT EXISTS idx_career_wages_us_onet_source
  ON core.career_wages_us (onet_code, source);

-- Lookup nhanh theo onet_code
CREATE INDEX IF NOT EXISTS idx_career_tasks_onet
  ON core.career_tasks (onet_code);
CREATE INDEX IF NOT EXISTS idx_career_technology_onet
  ON core.career_technology (onet_code);
CREATE INDEX IF NOT EXISTS idx_career_ksas_onet
  ON core.career_ksas (onet_code);
CREATE INDEX IF NOT EXISTS idx_career_wages_us_onet
  ON core.career_wages_us (onet_code);

COMMIT;

-- (Khuyến nghị sau khi chạy)
-- VACUUM ANALYZE core.career_tasks;
-- VACUUM ANALYZE core.career_technology;
-- VACUUM ANALYZE core.career_ksas;
-- VACUUM ANALYZE core.career_wages_us;





