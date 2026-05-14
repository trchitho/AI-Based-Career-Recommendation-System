import urllib.request, json, time

start = time.time()
req = urllib.request.Request(
    'http://localhost:8000/api/trends/jobs/refresh',
    headers={'Accept': 'application/json'}
)
try:
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.loads(r.read())
        elapsed = time.time() - start
        print(f"Time: {elapsed:.1f}s")
        print(f"success: {data.get('success')}")
        print(f"source: {data.get('source')}")
        print(f"total: {data.get('total')}")
        jobs = data.get('trending_jobs', [])
        print(f"Jobs: {len(jobs)}")
        for j in jobs[:5]:
            print(f"  [{j.get('source','?')}] {j['title']} | {j['company']}")
except Exception as e:
    print(f"Error: {e}")
