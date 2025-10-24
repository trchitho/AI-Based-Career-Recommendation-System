BEGIN;

-- Notifications
CREATE TABLE IF NOT EXISTS core.notifications (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE core.notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES core.users (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON core.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON core.notifications(is_read);

-- Roadmaps
CREATE TABLE IF NOT EXISTS core.roadmaps (
    id bigserial PRIMARY KEY,
    career_id bigint NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roadmaps_career_id_fkey'
  ) THEN
    ALTER TABLE core.roadmaps
      ADD CONSTRAINT roadmaps_career_id_fkey
      FOREIGN KEY (career_id) REFERENCES core.careers (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS core.roadmap_milestones (
    id bigserial PRIMARY KEY,
    roadmap_id bigint NOT NULL,
    order_no integer,
    skill_name text,
    description text,
    estimated_duration text,
    resources_json jsonb
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roadmap_milestones_roadmap_id_fkey'
  ) THEN
    ALTER TABLE core.roadmap_milestones
      ADD CONSTRAINT roadmap_milestones_roadmap_id_fkey
      FOREIGN KEY (roadmap_id) REFERENCES core.roadmaps (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_milestones_roadmap ON core.roadmap_milestones(roadmap_id);

CREATE TABLE IF NOT EXISTS core.user_progress (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL,
    career_id bigint NOT NULL,
    roadmap_id bigint NOT NULL,
    completed_milestones jsonb DEFAULT '[]'::jsonb,
    milestone_completions jsonb DEFAULT '{}'::jsonb,
    current_milestone_id bigint,
    progress_percentage numeric(5,2) DEFAULT 0,
    started_at timestamp with time zone DEFAULT now(),
    last_updated_at timestamp with time zone DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_progress_user_id_fkey'
  ) THEN
    ALTER TABLE core.user_progress
      ADD CONSTRAINT user_progress_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES core.users (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_progress_roadmap_id_fkey'
  ) THEN
    ALTER TABLE core.user_progress
      ADD CONSTRAINT user_progress_roadmap_id_fkey
      FOREIGN KEY (roadmap_id) REFERENCES core.roadmaps (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_progress_career_id_fkey'
  ) THEN
    ALTER TABLE core.user_progress
      ADD CONSTRAINT user_progress_career_id_fkey
      FOREIGN KEY (career_id) REFERENCES core.careers (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON core.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_career ON core.user_progress(career_id);

-- User Feedback for admin analytics
CREATE TABLE IF NOT EXISTS core.user_feedback (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL,
    assessment_id bigint,
    rating integer,
    comment text,
    created_at timestamp with time zone DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_feedback_user_id_fkey'
  ) THEN
    ALTER TABLE core.user_feedback
      ADD CONSTRAINT user_feedback_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES core.users (id)
      ON UPDATE NO ACTION ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_feedback_assessment_id_fkey'
  ) THEN
    ALTER TABLE core.user_feedback
      ADD CONSTRAINT user_feedback_assessment_id_fkey
      FOREIGN KEY (assessment_id) REFERENCES core.assessments (id)
      ON UPDATE NO ACTION ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_feedback_user ON core.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_assessment ON core.user_feedback(assessment_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON core.user_feedback(created_at);

COMMIT;
