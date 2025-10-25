BEGIN;

-- Seed English RIASEC (short)
WITH form AS (
  INSERT INTO core.assessment_forms (code, title, form_type, lang, version)
  VALUES ('RIASEC_EN_V1', 'RIASEC Questionnaire (EN)', 'RIASEC', 'en', 'v1')
  ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, version=EXCLUDED.version
  RETURNING id
)
INSERT INTO core.assessment_questions (form_id, question_no, question_key, prompt, options_json, reverse_score)
VALUES
((SELECT id FROM form), 1, 'R', 'I like working with tools and machines.', NULL, FALSE),
((SELECT id FROM form), 2, 'I', 'I enjoy analyzing data and solving problems.', NULL, FALSE),
((SELECT id FROM form), 3, 'A', 'I value creativity and self-expression.', NULL, FALSE),
((SELECT id FROM form), 4, 'S', 'I like helping and teaching others.', NULL, FALSE),
((SELECT id FROM form), 5, 'E', 'I enjoy persuading and leading people.', NULL, FALSE),
((SELECT id FROM form), 6, 'C', 'I prefer structured tasks and clear procedures.', NULL, FALSE)
ON CONFLICT DO NOTHING;

-- Seed English Big Five (short)
WITH form AS (
  INSERT INTO core.assessment_forms (code, title, form_type, lang, version)
  VALUES ('BIGFIVE_EN_V1', 'Big Five Questionnaire (EN)', 'BigFive', 'en', 'v1')
  ON CONFLICT (code) DO UPDATE SET title=EXCLUDED.title, version=EXCLUDED.version
  RETURNING id
)
INSERT INTO core.assessment_questions (form_id, question_no, question_key, prompt, options_json, reverse_score)
VALUES
((SELECT id FROM form), 1, 'O', 'I am open to new experiences.', NULL, FALSE),
((SELECT id FROM form), 2, 'C', 'I am organized and meet deadlines.', NULL, FALSE),
((SELECT id FROM form), 3, 'E', 'I feel energized around people.', NULL, FALSE),
((SELECT id FROM form), 4, 'A', 'I am considerate and cooperative.', NULL, FALSE),
((SELECT id FROM form), 5, 'N', 'I often feel anxious under pressure.', NULL, FALSE)
ON CONFLICT DO NOTHING;

COMMIT;
