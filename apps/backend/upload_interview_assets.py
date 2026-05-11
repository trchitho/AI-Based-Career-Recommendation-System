# -*- coding: utf-8 -*-
"""Upload interview videos & avatars to Cloudflare R2."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

import boto3
from botocore.exceptions import ClientError

ACCOUNT_ID  = os.getenv("CF_R2_ACCOUNT_ID", "")
ACCESS_KEY  = os.getenv("CF_R2_ACCESS_KEY_ID", "")
SECRET_KEY  = os.getenv("CF_R2_SECRET_ACCESS_KEY", "")
BUCKET      = os.getenv("CF_R2_BUCKET_NAME", "career-ai-cvs")
PUBLIC_URL  = os.getenv("CF_R2_PUBLIC_URL", "").rstrip("/")

FRONTEND_ROOT = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")

ASSETS = [
    {
        "local_path": os.path.join(FRONTEND_ROOT, "video", "nam.mp4"),
        "r2_key": "interview/videos/nam.mp4",
        "content_type": "video/mp4",
        "gender": "male",
        "asset_type": "video",
    },
    {
        "local_path": os.path.join(FRONTEND_ROOT, "video", "nu.mp4"),
        "r2_key": "interview/videos/nu.mp4",
        "content_type": "video/mp4",
        "gender": "female",
        "asset_type": "video",
    },
    {
        "local_path": os.path.join(FRONTEND_ROOT, "images", "anhNam.png"),
        "r2_key": "interview/avatars/anhNam.png",
        "content_type": "image/png",
        "gender": "male",
        "asset_type": "avatar",
    },
    {
        "local_path": os.path.join(FRONTEND_ROOT, "images", "anhNu.png"),
        "r2_key": "interview/avatars/anhNu.png",
        "content_type": "image/png",
        "gender": "female",
        "asset_type": "avatar",
    },
]


def get_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name="auto",
    )


def upload_all():
    client = get_client()
    results = []

    for asset in ASSETS:
        path = asset["local_path"]
        if not os.path.exists(path):
            print(f"[SKIP] File not found: {path}")
            continue

        size = os.path.getsize(path)
        print(f"[Upload] {os.path.basename(path)} ({size/1024:.0f} KB) -> {asset['r2_key']}")

        try:
            with open(path, "rb") as f:
                client.upload_fileobj(
                    f, BUCKET, asset["r2_key"],
                    ExtraArgs={"ContentType": asset["content_type"]},
                )
            url = f"{PUBLIC_URL}/{asset['r2_key']}"
            print(f"  [OK] {url}")
            results.append({**asset, "url": url})
        except ClientError as e:
            print(f"  [ERR] {e}")

    return results


def save_to_db(results):
    from sqlalchemy import text
    from sqlalchemy.orm import Session
    from app.core.db import engine

    with Session(engine) as db:
        # Create table if not exists
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS interview.interview_assets (
                id          SERIAL PRIMARY KEY,
                gender      VARCHAR(10)  NOT NULL,
                asset_type  VARCHAR(20)  NOT NULL,
                url         TEXT         NOT NULL,
                created_at  TIMESTAMPTZ  DEFAULT NOW(),
                UNIQUE(gender, asset_type)
            )
        """))
        db.commit()
        print("[OK] interview_assets table ready")

        for r in results:
            db.execute(text("""
                INSERT INTO interview.interview_assets (gender, asset_type, url)
                VALUES (:gender, :type, :url)
                ON CONFLICT (gender, asset_type) DO UPDATE SET url = EXCLUDED.url
            """), {"gender": r["gender"], "type": r["asset_type"], "url": r["url"]})

        db.commit()
        print(f"[OK] Saved {len(results)} assets to DB")

        # Print all saved
        rows = db.execute(text("SELECT gender, asset_type, url FROM interview.interview_assets ORDER BY gender, asset_type")).fetchall()
        print("\nAssets in DB:")
        for row in rows:
            print(f"  [{row.gender}] {row.asset_type}: {row.url}")


if __name__ == "__main__":
    print("=== Uploading Interview Assets to Cloudflare R2 ===\n")
    if not ACCOUNT_ID or not ACCESS_KEY:
        print("[ERR] CF_R2 credentials not configured in .env")
        sys.exit(1)

    results = upload_all()
    if results:
        save_to_db(results)
        print("\nDone!")
    else:
        print("\n[WARN] No files uploaded.")
