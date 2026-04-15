"""
Cloudflare R2 Storage Service (S3-compatible)
"""
import logging
import os
import uuid
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import boto3
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    ClientError = None
    BOTO3_AVAILABLE = False


class R2StorageService:
    """Service để upload file lên Cloudflare R2"""

    def __init__(self):
        self.account_id = os.getenv("CF_R2_ACCOUNT_ID", "")
        self.access_key = os.getenv("CF_R2_ACCESS_KEY_ID", "")
        self.secret_key = os.getenv("CF_R2_SECRET_ACCESS_KEY", "")
        self.bucket_name = os.getenv("CF_R2_BUCKET_NAME", "career-ai-cvs")
        self.public_url = os.getenv("CF_R2_PUBLIC_URL", "").rstrip("/")
        self._client = None

    @property
    def is_configured(self) -> bool:
        """Kiểm tra xem R2 đã được cấu hình chưa"""
        return (
            BOTO3_AVAILABLE
            and bool(self.account_id)
            and bool(self.access_key)
            and bool(self.secret_key)
            and self.account_id != "your_account_id_here"
        )

    def _get_client(self):
        if self._client is None:
            if not BOTO3_AVAILABLE:
                raise RuntimeError("boto3 is not installed. Run: pip install boto3")
            self._client = boto3.client(
                "s3",
                endpoint_url=f"https://{self.account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name="auto",
            )
        return self._client

    def upload_cv(
        self,
        file_content: bytes,
        original_filename: str,
        user_id: int,
        content_type: Optional[str] = None,
    ) -> Optional[str]:
        """
        Upload CV file lên R2 và trả về public URL.

        Args:
            file_content: Nội dung file dạng bytes
            original_filename: Tên file gốc
            user_id: ID người dùng
            content_type: MIME type (tự detect nếu không truyền)

        Returns:
            Public URL của file hoặc None nếu upload thất bại
        """
        if not self.is_configured:
            logger.debug("[R2] Not configured — skipping upload")
            return None

        try:
            ext = ""
            if "." in original_filename:
                ext = "." + original_filename.rsplit(".", 1)[-1].lower()

            # Tạo unique key: cvs/{user_id}/{date}/{uuid}{ext}
            date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
            unique_id = uuid.uuid4().hex[:12]
            object_key = f"cvs/{user_id}/{date_prefix}/{unique_id}{ext}"

            # Detect content type
            if not content_type:
                mime_map = {
                    ".pdf": "application/pdf",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".png": "image/png",
                    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                }
                content_type = mime_map.get(ext, "application/octet-stream")

            client = self._get_client()
            client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=file_content,
                ContentType=content_type,
            )

            # Trả về public URL
            if self.public_url:
                file_url = f"{self.public_url}/{object_key}"
            else:
                file_url = f"https://{self.account_id}.r2.cloudflarestorage.com/{self.bucket_name}/{object_key}"

            logger.info(f"[R2] Uploaded: {object_key}")
            return file_url

        except ClientError as e:
            logger.error(f"[R2] S3 client error during upload: {e}")
            return None
        except Exception as e:
            logger.error(f"[R2] Upload failed: {e}")
            return None


# Singleton instance
r2_storage = R2StorageService()
