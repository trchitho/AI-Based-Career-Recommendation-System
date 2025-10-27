-- =========================================
-- 2025-10-18_build_map.sql
-- Rebuild career ↔ RIASEC labels (top1 + top2)
-- Run after loading core.career_interests
-- =========================================

BEGIN;

-- Xoá map cũ (idempotent)
DELETE FROM core.career_riasec_map;

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