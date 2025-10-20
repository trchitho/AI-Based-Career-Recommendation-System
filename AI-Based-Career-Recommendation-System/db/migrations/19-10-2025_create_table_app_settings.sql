-- Create app_settings table for application branding/config
-- Run order: after core schema exists

BEGIN;

CREATE TABLE IF NOT EXISTS core.app_settings (
    id bigserial PRIMARY KEY,
    logo_url       text,
    app_title      text,
    app_name       text,
    footer_html    text,
    updated_at     timestamp with time zone DEFAULT now(),
    updated_by     bigint
);

-- Optional: seed a default row (commented)
-- INSERT INTO core.app_settings (id, app_title, app_name, footer_html)
-- VALUES (1, 'CareerBridge AI', 'CareerBridge', '© 2025 CareerBridge AI')
-- ON CONFLICT DO NOTHING;

COMMIT;

