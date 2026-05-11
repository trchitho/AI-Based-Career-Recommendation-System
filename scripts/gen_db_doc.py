import psycopg2

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
conn = psycopg2.connect(DB)
cur = conn.cursor()

EXCLUDE = {
    'comment_likes', 'comment_rate_limits',
    'assessment_questions_backup_20260508',
    'mentorship_requests',
    'career_overview_backup_viet_hoa',
    'careers_backup_alt_titles_viet_hoa',
    'careers_backup_title_vi',
    'assessment_responses_full', 'user_trait_view', 'full_conversation_view',
}

schemas = ['ai', 'analytics', 'chatbot', 'core', 'interview']
schema_labels = {
    'ai':        'AI / Machine Learning',
    'analytics': 'Analytics / Tracking',
    'chatbot':   'Chatbot',
    'core':      'Core / Business Logic',
    'interview': 'Interview / Voice',
}
schema_counts = {'ai': 5, 'analytics': 4, 'chatbot': 2, 'core': 74, 'interview': 10}

TYPE_MAP = {
    'bigint':                    'BIGINT',
    'integer':                   'INT',
    'smallint':                  'SMALLINT',
    'numeric':                   'NUMERIC',
    'double precision':          'FLOAT',
    'real':                      'REAL',
    'text':                      'TEXT',
    'character varying':         'VARCHAR',
    'boolean':                   'BOOLEAN',
    'date':                      'DATE',
    'timestamp with time zone':  'TIMESTAMPTZ',
    'timestamp without time zone': 'TIMESTAMP',
    'jsonb':                     'JSONB',
    'json':                      'JSON',
    'uuid':                      'UUID',
    'ARRAY':                     'ARRAY',
    'USER-DEFINED':              'VECTOR',
}

lines = []
SEP  = '=' * 80
SEP2 = '-' * 60

lines.append(SEP)
lines.append('DATABASE DESIGN DOCUMENT')
lines.append('Project  : AI-Based Career Recommendation System')
lines.append('Database : career_ai  (PostgreSQL 15)')
lines.append(SEP)
lines.append('')
lines.append('SCHEMAS OVERVIEW')
lines.append(SEP2)
lines.append('  Schema      Label                          Tables')
lines.append(SEP2)
lines.append('  ai          AI / Machine Learning              5')
lines.append('  analytics   Analytics / Tracking               4')
lines.append('  chatbot     Chatbot                            2')
lines.append('  core        Core / Business Logic             74')
lines.append('  interview   Interview / Voice                 10')
lines.append(SEP2)
lines.append('  TOTAL                                         95')
lines.append('')
lines.append('EXCLUDED (backup / internal):')
lines.append('  core.comment_likes')
lines.append('  core.comment_rate_limits')
lines.append('  core.assessment_questions_backup_20260508')
lines.append('  core.mentorship_requests')
lines.append('  core.career_overview_backup_viet_hoa')
lines.append('  core.careers_backup_alt_titles_viet_hoa')
lines.append('  core.careers_backup_title_vi')
lines.append('')

for schema in schemas:
    cur.execute('''
        SELECT table_name, column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = %s
        ORDER BY table_name, ordinal_position
    ''', (schema,))
    rows = cur.fetchall()

    tables = {}
    for tname, cname, dtype, nullable, default in rows:
        if tname in EXCLUDE:
            continue
        if tname not in tables:
            tables[tname] = []
        tables[tname].append((cname, dtype, nullable, default))

    n = len(tables)
    label = schema_labels[schema]
    lines.append(SEP)
    lines.append(f'SCHEMA: {schema}  |  {label}  |  {n} tables')
    lines.append(SEP)
    lines.append('')

    for tname in sorted(tables.keys()):
        cols = tables[tname]
        lines.append(f'  [{schema}.{tname}]')
        hdr = f'  {"Column":<36} {"Type":<16} {"Null":<6} Notes'
        lines.append('  ' + '-' * 70)
        lines.append(hdr)
        lines.append('  ' + '-' * 70)

        for cname, dtype, nullable, default in cols:
            dtype_short = TYPE_MAP.get(dtype, dtype.upper()[:16])
            null_str = 'YES' if nullable == 'YES' else 'NO'

            notes = []
            if cname == 'id':
                notes.append('PK')
            if cname.endswith('_id') and cname != 'id':
                notes.append('FK')
            if default and 'now()' in str(default).lower():
                notes.append('default=now()')
            if default and 'nextval' in str(default).lower():
                notes.append('auto-increment')
            if default and 'true' == str(default).lower():
                notes.append('default=true')
            if default and 'false' == str(default).lower():
                notes.append('default=false')

            note_str = ', '.join(notes)
            lines.append(f'  {cname:<36} {dtype_short:<16} {null_str:<6} {note_str}')

        lines.append('')

lines.append(SEP)
lines.append('END OF DOCUMENT')
lines.append(SEP)

output = '\n'.join(lines)
with open('DB.txt', 'w', encoding='utf-8') as f:
    f.write(output)

print(f'Done. {len(lines)} lines written to DB.txt')
cur.close()
conn.close()
