CREATE TABLE core.roadmaps
(
    id         BIGSERIAL PRIMARY KEY,
    career_id  bigint NOT NULL,
    title_en   text,
    title_vn   text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT roadmaps_career_id_fkey
        FOREIGN KEY (career_id)
        REFERENCES core.careers (id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX ux_roadmaps_career_id
ON core.roadmaps(career_id);
