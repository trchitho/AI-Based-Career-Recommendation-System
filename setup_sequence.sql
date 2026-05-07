-- Create sequence for career_overview.id if not exists
CREATE SEQUENCE IF NOT EXISTS core.career_overview_id_seq;

-- Set default value for id column to use sequence
ALTER TABLE core.career_overview ALTER COLUMN id SET DEFAULT nextval('core.career_overview_id_seq');

-- Set sequence ownership
ALTER SEQUENCE core.career_overview_id_seq OWNED BY core.career_overview.id;