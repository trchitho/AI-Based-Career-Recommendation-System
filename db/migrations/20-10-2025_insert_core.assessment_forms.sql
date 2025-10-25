INSERT INTO core.assessment_forms (code, title, form_type, lang, version)
VALUES
('RIASEC120', 'RIASEC Career Interest Test (120 items)', 'RIASEC', 'en', '1.0'),
('BIG5_100', 'Big Five Personality Test (100 items)', 'BigFive', 'en', '1.0')
ON CONFLICT (code) DO NOTHING;
