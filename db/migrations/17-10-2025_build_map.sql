BEGIN;

-- 1) Bảng map N-N (đảm bảo tồn tại)
CREATE TABLE IF NOT EXISTS core.career_riasec_map(
  career_id BIGINT NOT NULL REFERENCES core.careers(id) ON DELETE CASCADE,
  label_id  BIGINT NOT NULL REFERENCES core.riasec_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (career_id, label_id)
);

-- 2) Hàm ghép nhãn đôi ('E','C') -> 'EC'
CREATE OR REPLACE FUNCTION core._mk_pair_label(a TEXT, b TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (COALESCE(a,'') || COALESCE(b,''));
$$;

-- 3) Hàm chọn top1 & top2 (ĐÃ SỬA lỗi ambiguous/RETURN QUERY)
DROP FUNCTION IF EXISTS core.riasec_top12(NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC,NUMERIC);

CREATE OR REPLACE FUNCTION core.riasec_top12(
  r_ NUMERIC, i_ NUMERIC, a_ NUMERIC, s_ NUMERIC, e_ NUMERIC, c_ NUMERIC
) RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  arr  DOUBLE PRECISION[] := ARRAY[r_, i_, a_, s_, e_, c_];
  labs TEXT[] := ARRAY['R','I','A','S','E','C'];
  ord  INT[];
BEGIN
  -- dùng alias 'g' để tránh trùng tên biến
  SELECT ARRAY(
    SELECT g
    FROM generate_series(1,6) AS g
    ORDER BY arr[g] DESC, g ASC
  ) INTO ord;

  RETURN ARRAY[ labs[ord[1]], labs[ord[2]] ];
END
$$;

-- 4) Xây lại mapping từ core.career_interests (yêu cầu bảng này đã có dữ liệu)
--    Nếu bạn muốn giữ mapping cũ nào đó, bỏ dòng DELETE dưới.
DELETE FROM core.career_riasec_map;

WITH v AS (
  SELECT
    c.id AS career_id,
    ci.r,ci.i,ci.a,ci.s,ci.e,ci.c,
    (core.riasec_top12(ci.r,ci.i,ci.a,ci.s,ci.e,ci.c))[1] AS top1,
    (core.riasec_top12(ci.r,ci.i,ci.a,ci.s,ci.e,ci.c))[2] AS top2
  FROM core.careers c
  JOIN core.career_interests ci ON ci.onet_code = c.onet_code
),
m AS (
  SELECT
    career_id,
    top1 AS code1,
    core._mk_pair_label(top1, top2) AS code2
  FROM v
),
codes AS (
  SELECT career_id, code1 AS code FROM m
  UNION ALL
  SELECT career_id, code2 AS code FROM m
)
INSERT INTO core.career_riasec_map(career_id, label_id)
SELECT c.career_id, rl.id
FROM codes c
JOIN core.riasec_labels rl ON rl.code = c.code
ON CONFLICT DO NOTHING;

COMMIT;
