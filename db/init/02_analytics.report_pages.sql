CREATE TABLE IF NOT EXISTS analytics.report_pages (
    id BIGSERIAL PRIMARY KEY,
    report_type TEXT NOT NULL,          -- big5 | riasec
    page_no INT NOT NULL,               -- 1..n
    page_key TEXT NOT NULL,             -- cover | summary | facet_problem_solving | strengths | closing
    title TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(report_type, page_no)
);
  

ALTER TABLE analytics.report_events
ADD COLUMN IF NOT EXISTS page_key TEXT,
ADD COLUMN IF NOT EXISTS device TEXT DEFAULT 'web',
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ui';


UPDATE core.report_templates
SET description = 'Big Five personality report template with 7 fixed pages, 6 behavioral facets, strengths and challenges, optimized for print and PDF export.'
WHERE template_key = 'big5_v1';
