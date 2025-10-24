-- =========================================
-- 2025-10-18_build_map.sql
-- Rebuild career ↔ RIASEC labels (top1 + top2)
-- Run after loading core.career_interests
-- =========================================

BEGIN;

-- Ensure supporting tables & function exist (idempotent)
CREATE TABLE IF NOT EXISTS core.riasec_labels (
  id bigserial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text
);

-- Seed basic RIASEC labels if missing
INSERT INTO core.riasec_labels(code, name) VALUES
('R','Realistic'),('I','Investigative'),('A','Artistic'),('S','Social'),('E','Enterprising'),('C','Conventional')
ON CONFLICT (code) DO NOTHING;

-- Map table: Career ↔ RIASEC label
CREATE TABLE IF NOT EXISTS core.career_riasec_map (
  career_id bigint NOT NULL,
  label_id  bigint NOT NULL,
  PRIMARY KEY (career_id, label_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='career_riasec_map_career_id_fkey'
  ) THEN
    ALTER TABLE core.career_riasec_map
      ADD CONSTRAINT career_riasec_map_career_id_fkey
      FOREIGN KEY (career_id) REFERENCES core.careers(id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='career_riasec_map_label_id_fkey'
  ) THEN
    ALTER TABLE core.career_riasec_map
      ADD CONSTRAINT career_riasec_map_label_id_fkey
      FOREIGN KEY (label_id) REFERENCES core.riasec_labels(id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

-- Helper function: return top-2 RIASEC codes by score
CREATE OR REPLACE FUNCTION core.riasec_top12(r numeric, i numeric, a numeric, s numeric, e numeric, c numeric)
RETURNS text[] LANGUAGE sql AS $$
  SELECT ARRAY(
    SELECT code FROM (
      VALUES ('R', r),('I', i),('A', a),('S', s),('E', e),('C', c)
    ) t(code, val)
    ORDER BY val DESC NULLS LAST, code ASC
    LIMIT 2
  );
$$;

-- Xoá map cũ (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='core' AND table_name='career_riasec_map'
  ) THEN
    EXECUTE 'DELETE FROM core.career_riasec_map';
  END IF;
END$$;

-- Derive & map
WITH base AS (
  SELECT c.id AS career_id,
         core.riasec_top12(ci.r,ci.i,ci.a,ci.s,ci.e,ci.c) AS t12
  FROM core.careers c
  JOIN core.career_interests ci ON ci.onet_code = c.onet_code
),
exp AS (
  SELECT career_id, unnest(t12) AS code FROM base
)
INSERT INTO core.career_riasec_map(career_id, label_id)
SELECT e.career_id, l.id
FROM exp e
JOIN core.riasec_labels l ON l.code = e.code
ON CONFLICT DO NOTHING;

COMMIT;

-- ---------------------------
-- (Optional) Sanity check: labels thiếu trong catalog
-- Nếu có dòng bên dưới -> bạn chưa seed đủ nhãn
-- ---------------------------
-- WITH base AS (
--   SELECT c.id AS career_id,
--          core.riasec_top12(ci.r,ci.i,ci.a,ci.s,ci.e,ci.c) AS t12
--   FROM core.careers c
--   JOIN core.career_interests ci ON ci.onet_code = c.onet_code
-- ),
-- exp AS (
--   SELECT career_id, unnest(t12) AS code FROM base
-- )
-- SELECT e.career_id, e.code
-- FROM exp e
-- LEFT JOIN core.riasec_labels l ON l.code = e.code
-- WHERE l.id IS NULL;
