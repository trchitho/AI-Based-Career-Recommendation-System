#!/usr/bin/env python3
"""
Script to create the missing interview-audio bucket in Cloudflare R2
"""
import os
import sys
import logging
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.r2_storage import R2StorageService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_audio_bucket():
    """Create the interview-audio bucket if it doesn't exist"""
    
    # Get R2 configuration
    account_id = os.getenv("CF_R2_ACCOUNT_ID", "")
    access_key = os.getenv("CF_R2_ACCESS_KEY_ID", "")
    secret_key = os.getenv("CF_R2_SECRET_ACCESS_KEY", "")
    audio_bucket_name = os.getenv("CF_R2_AUDIO_BUCKET_NAME", "interview-audio")
    
    if not all([account_id, access_key, secret_key]):
        logger.error("❌ R2 credentials not configured in .env file")
        return False
    
    try:
        import boto3
        from botocore.exceptions import ClientError
        
        # Create R2 client
        client = boto3.client(
            "s3",
            endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="auto",
        )
        
        # Check if bucket exists
        try:
            client.head_bucket(Bucket=audio_bucket_name)
            logger.info(f"✅ Bucket '{audio_bucket_name}' already exists")
            return True
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                logger.info(f"🔧 Bucket '{audio_bucket_name}' doesn't exist, creating...")
            else:
                logger.error(f"❌ Error checking bucket: {e}")
                return False
        
        # Create the bucket
        try:
            client.create_bucket(Bucket=audio_bucket_name)
            logger.info(f"✅ Successfully created bucket '{audio_bucket_name}'")
            
            # Set CORS policy for audio uploads
            cors_configuration = {
                'CORSRules': [
                    {
                        'AllowedHeaders': ['*'],
                        'AllowedMethods': ['GET', 'PUT', 'POST'],
                        'AllowedOrigins': ['*'],
                        'ExposeHeaders': ['ETag'],
                        'MaxAgeSeconds': 3000
                    }
                ]
            }
            
            client.put_bucket_cors(
                Bucket=audio_bucket_name,
                CORSConfiguration=cors_configuration
            )
            logger.info(f"✅ CORS policy set for bucket '{audio_bucket_name}'")
            
            return True
            
        except ClientError as e:
            logger.error(f"❌ Failed to create bucket: {e}")
            return False
            
    except ImportError:
        logger.error("❌ boto3 not installed. Run: pip install boto3")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return False


if __name__ == "__main__":
    logger.info("🚀 Creating interview-audio bucket...")
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    success = create_audio_bucket()
    
    if success:
        logger.info("🎉 Audio bucket setup complete!")
        sys.exit(0)
    else:
        logger.error("💥 Failed to create audio bucket")
        sys.exit(1)