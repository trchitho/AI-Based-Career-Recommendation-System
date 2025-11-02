-- vào psql trong container
BEGIN;
DROP SCHEMA IF EXISTS ai CASCADE;
DROP SCHEMA IF EXISTS core CASCADE;
COMMIT;
-- sau đó import snapshot như trên
