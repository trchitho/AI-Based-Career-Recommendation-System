$ErrorActionPreference = "Stop"

# Keep Uvicorn's file watcher focused on application source.
# Without --reload-dir, WatchFiles scans the whole backend folder and may reload
# repeatedly when files inside .venv/Lib/site-packages are touched.
python -m uvicorn app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8000
