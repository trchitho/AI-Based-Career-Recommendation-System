"""
Check career table structure
"""
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="career_ai",
    user="postgres",
    password="123456"
)

cursor = conn.cursor()

# Get table columns
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'core' AND table_name = 'careers'
    ORDER BY ordinal_position
""")

print("📋 Cấu trúc bảng core.careers:\n")
for col_name, data_type in cursor.fetchall():
    print(f"  - {col_name}: {data_type}")

print("\n" + "="*50)
print("📊 Lấy 3 nghề nghiệp mẫu:\n")

# Get sample data
cursor.execute("SELECT * FROM core.careers LIMIT 3")
rows = cursor.fetchall()
col_names = [desc[0] for desc in cursor.description]

for row in rows:
    print("Nghề nghiệp:")
    for col_name, value in zip(col_names, row):
        if value and len(str(value)) > 100:
            print(f"  {col_name}: {str(value)[:100]}...")
        else:
            print(f"  {col_name}: {value}")
    print()

cursor.close()
conn.close()
