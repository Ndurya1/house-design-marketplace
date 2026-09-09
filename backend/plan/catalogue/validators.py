from pathlib import Path

from django.core.exceptions import ValidationError
from pypdf import PdfReader


MAX_PLAN_FILE_BYTES = 20 * 1024 * 1024
MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024


def validate_plan_file(uploaded_file):
    if uploaded_file.size > MAX_PLAN_FILE_BYTES:
        raise ValidationError('Plan files must be 20 MB or smaller.')

    if Path(uploaded_file.name).suffix.lower() != '.pdf':
        raise ValidationError('Plan files must be PDF documents.')

    original_position = uploaded_file.tell()
    try:
        uploaded_file.seek(0)
        header = uploaded_file.read(5)
        if header != b'%PDF-':
            raise ValidationError('The uploaded plan file is not a valid PDF.')
        uploaded_file.seek(0)
        try:
            reader = PdfReader(uploaded_file, strict=True)
            if reader.is_encrypted:
                raise ValidationError('Upload a PDF without password protection.')
            if not len(reader.pages):
                raise ValidationError('The PDF must contain at least one page.')
        except ValidationError:
            raise
        except Exception as exc:
            raise ValidationError('The uploaded PDF cannot be read.') from exc
    finally:
        uploaded_file.seek(original_position)


def validate_thumbnail_file(uploaded_file):
    if uploaded_file.size > MAX_THUMBNAIL_BYTES:
        raise ValidationError('Thumbnails must be 5 MB or smaller.')
