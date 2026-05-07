import psycopg2, re
conn = psycopg2.connect('postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8')
cur  = conn.cursor()
viet_re = re.compile(
    r'[àáảãạăắặẳẵằâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ'
    r'ÀÁẢÃẠĂẮẶẲẴẰÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]'
)
cur.execute('SELECT id, name_vn, description_vn FROM core.career_ksas ORDER BY id')
rows = cur.fetchall()
total    = len(rows)
has_dau  = sum(1 for r in rows if r[1] and viet_re.search(r[1]))
desc_dau = sum(1 for r in rows if r[2] and viet_re.search(r[2]))
print(f'Tổng: {total:,}')
print(f'name_vn có dấu (dịch OK): {has_dau:,}')
print(f'description_vn có dấu:    {desc_dau:,}')
print(f'Còn cần dịch name_vn:     {total-has_dau:,}')
# Sample 3 rows đã dịch tốt
good = [r for r in rows if r[1] and viet_re.search(r[1])]
print('\nSample đã dịch tốt:')
for r in good[:3]:
    print(f'  ID={r[0]} name_vn={repr(r[1][:50])}')
    print(f'         desc_vn={repr((r[2] or "")[:60])}')
conn.close()
