"""
Upload audio file to Cloudflare R2
Sử dụng thông tin từ .env file
"""
import os
import sys
from pathlib import Path
import boto3
from botocore.client import Config
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables from backend .env
env_path = Path(__file__).parent.parent / 'apps' / 'backend' / '.env'
load_dotenv(env_path)

# Configuration from .env
ACCOUNT_ID = os.getenv('CF_R2_ACCOUNT_ID')
ACCESS_KEY_ID = os.getenv('CF_R2_ACCESS_KEY_ID')
SECRET_ACCESS_KEY = os.getenv('CF_R2_SECRET_ACCESS_KEY')
BUCKET_NAME = os.getenv('CF_R2_BUCKET_NAME')
PUBLIC_URL = os.getenv('CF_R2_PUBLIC_URL')

# File paths
AUDIO_FILE = Path(__file__).parent.parent / 'apps' / 'frontend' / 'public' / 'audio' / 'success-sound.mp3'
DESTINATION_KEY = 'audio/success-sound.mp3'

def upload_to_r2():
    """Upload audio file to Cloudflare R2"""
    
    print("=" * 80)
    print("🚀 CLOUDFLARE R2 AUDIO UPLOAD")
    print("=" * 80)
    
    # Validate configuration
    if not all([ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY, BUCKET_NAME]):
        print("❌ Error: Missing Cloudflare R2 configuration in .env file")
        print("\nRequired variables:")
        print("  - CF_R2_ACCOUNT_ID")
        print("  - CF_R2_ACCESS_KEY_ID")
        print("  - CF_R2_SECRET_ACCESS_KEY")
        print("  - CF_R2_BUCKET_NAME")
        return False
    
    # Check if file exists
    if not AUDIO_FILE.exists():
        print(f"❌ Error: Audio file not found: {AUDIO_FILE}")
        return False
    
    file_size = AUDIO_FILE.stat().st_size
    print(f"\n📁 Source File:")
    print(f"   Path: {AUDIO_FILE}")
    print(f"   Size: {file_size:,} bytes ({file_size / 1024:.2f} KB)")
    
    print(f"\n🎯 Destination:")
    print(f"   Bucket: {BUCKET_NAME}")
    print(f"   Key: {DESTINATION_KEY}")
    
    try:
        # Create S3 client for Cloudflare R2
        print(f"\n🔗 Connecting to Cloudflare R2...")
        print(f"   Account ID: {ACCOUNT_ID}")
        print(f"   Endpoint: https://{ACCOUNT_ID}.r2.cloudflarestorage.com")
        
        s3_client = boto3.client(
            's3',
            endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
            aws_access_key_id=ACCESS_KEY_ID,
            aws_secret_access_key=SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )
        
        # Upload file
        print(f"\n⬆️  Uploading...")
        
        with open(AUDIO_FILE, 'rb') as file_data:
            s3_client.put_object(
                Bucket=BUCKET_NAME,
                Key=DESTINATION_KEY,
                Body=file_data,
                ContentType='audio/mpeg',
                CacheControl='public, max-age=31536000',  # Cache for 1 year
            )
        
        print("✅ Upload successful!")
        
        # Generate public URL
        if PUBLIC_URL:
            public_url = f"{PUBLIC_URL}/{DESTINATION_KEY}"
        else:
            public_url = f"https://pub-{ACCOUNT_ID}.r2.dev/{DESTINATION_KEY}"
        
        print(f"\n📍 Public URL:")
        print(f"   {public_url}")
        
        print(f"\n⚙️  Next Steps:")
        print(f"   1. ✅ File uploaded successfully")
        print(f"   2. 🔓 Enable public access in R2 bucket settings (if not already enabled)")
        print(f"   3. 📝 Update apps/frontend/src/config/assets.ts:")
        print(f"      - Change cloudflare URL to: {PUBLIC_URL or f'https://pub-{ACCOUNT_ID}.r2.dev'}")
        print(f"      - Change CURRENT_BASE to: 'cloudflare'")
        print(f"   4. 🚀 Deploy and test!")
        
        print("\n" + "=" * 80)
        print("✨ DONE!")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Upload failed: {type(e).__name__}")
        print(f"   Error: {str(e)}")
        
        if "NoSuchBucket" in str(e):
            print(f"\n💡 Bucket '{BUCKET_NAME}' does not exist.")
            print("   Please create the bucket in Cloudflare R2 dashboard first.")
        elif "InvalidAccessKeyId" in str(e):
            print("\n💡 Invalid access key ID.")
            print("   Please check CF_R2_ACCESS_KEY_ID in .env file.")
        elif "SignatureDoesNotMatch" in str(e):
            print("\n💡 Invalid secret access key.")
            print("   Please check CF_R2_SECRET_ACCESS_KEY in .env file.")
        
        return False

if __name__ == '__main__':
    success = upload_to_r2()
    sys.exit(0 if success else 1)
