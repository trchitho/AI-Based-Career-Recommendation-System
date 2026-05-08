-- Run once to create course recommendation tables

CREATE TABLE IF NOT EXISTS core.course_catalog (
    id           SERIAL PRIMARY KEY,
    external_id  VARCHAR(255) UNIQUE NOT NULL,
    title        VARCHAR(500) NOT NULL,
    description  TEXT,
    url          VARCHAR(1000),
    platform     VARCHAR(50),
    instructor   VARCHAR(255),
    rating       FLOAT DEFAULT 0.0,
    num_reviews  INTEGER DEFAULT 0,
    price        FLOAT DEFAULT 0.0,
    is_free      BOOLEAN DEFAULT FALSE,
    level        VARCHAR(50),
    duration_hrs FLOAT,
    thumbnail    VARCHAR(1000),
    language     VARCHAR(20) DEFAULT 'en',
    tags         TEXT[] DEFAULT '{}',
    embedding    FLOAT[],
    is_embedded  BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.course_skill_map (
    id               SERIAL PRIMARY KEY,
    course_id        INTEGER NOT NULL REFERENCES core.course_catalog(id) ON DELETE CASCADE,
    skill_name       VARCHAR(255) NOT NULL,
    similarity_score FLOAT NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, skill_name)
);

CREATE INDEX IF NOT EXISTS ix_csm_skill_score
    ON core.course_skill_map(skill_name, similarity_score DESC);

CREATE INDEX IF NOT EXISTS ix_course_catalog_platform
    ON core.course_catalog(platform);

CREATE INDEX IF NOT EXISTS ix_course_catalog_embedded
    ON core.course_catalog(is_embedded);
