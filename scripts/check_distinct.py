import psycopg2

conn = psycopg2.connect('postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8')
cur = conn.cursor()

cur.execute('SELECT COUNT(*) FROM core.career_overview')
total = cur.fetchone()[0]
print('Total rows:', total)

cur.execute("SELECT DISTINCT experience_text_vn FROM core.career_overview WHERE experience_text_vn IS NOT NULL ORDER BY experience_text_vn")
exp_texts = [r[0] for r in cur.fetchall()]
print('Distinct exp texts:', len(exp_texts))
for t in exp_texts:
    print(' -', t[:120])

print()

cur.execute("SELECT DISTINCT degree_text_vn FROM core.career_overview WHERE degree_text_vn IS NOT NULL ORDER BY degree_text_vn")
deg_texts = [r[0] for r in cur.fetchall()]
print('Distinct deg texts:', len(deg_texts))
for t in deg_texts:
    print(' -', t[:120])

cur.close()
conn.close()
