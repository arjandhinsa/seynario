import cloudinary
import cloudinary.uploader

from app.config import settings


# Configure Cloudinary with your credentials
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


def upload_image(file_bytes: bytes, filename: str) -> str:
    # Uploads image to Cloudinary, returns the URL
    # folder="seynario" keeps all your images organised
    result = cloudinary.uploader.upload(
        file_bytes,
        folder="seynario",
        public_id=filename,
        overwrite=True,
        resource_type="image",
    )
    return result["secure_url"]


def delete_image(image_url: str) -> bool:
    # Extracts the public ID from the URL and deletes it
    # URL looks like: https://res.cloudinary.com/xxx/image/upload/v123/seynario/filename.jpg
    try:
        parts = image_url.split("/upload/")[1]  # "v123/seynario/filename.jpg"
        public_id = parts.split("/", 1)[1].rsplit(".", 1)[0]  # "seynario/filename"
        cloudinary.uploader.destroy(public_id)
        return True
    except Exception:
        return False