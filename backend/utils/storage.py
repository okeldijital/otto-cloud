import os
import boto3
from botocore.exceptions import NoCredentialsError
from config import settings
import shutil

class StorageClient:
    def __init__(self):
        self.use_s3 = bool(settings.S3_BUCKET_NAME and settings.S3_ACCESS_KEY_ID and settings.S3_SECRET_ACCESS_KEY)
        if self.use_s3:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                region_name=settings.S3_REGION_NAME,
                endpoint_url=settings.S3_ENDPOINT_URL
            )
            self.bucket_name = settings.S3_BUCKET_NAME
        else:
            self.upload_dir = settings.UPLOAD_DIR

    def save_file(self, file_obj, filename: str) -> str:
        """Saves a file and returns the path or URL."""
        if self.use_s3:
            try:
                # To support file-like objects (UploadFile.file)
                self.s3_client.upload_fileobj(file_obj, self.bucket_name, filename)
                # We return the S3 URL format
                if settings.S3_ENDPOINT_URL:
                    return f"{settings.S3_ENDPOINT_URL}/{self.bucket_name}/{filename}"
                else:
                    return f"https://{self.bucket_name}.s3.{settings.S3_REGION_NAME}.amazonaws.com/{filename}"
            except Exception as e:
                raise RuntimeError(f"Failed to upload to S3: {str(e)}")
        else:
            file_path = os.path.join(self.upload_dir, filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file_obj, buffer)
            return f"/uploads/{filename}"

storage_client = StorageClient()
