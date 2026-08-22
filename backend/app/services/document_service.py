"""Document service — upload, list, download, and delete employee files."""

import logging
import os
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.models.document import Document
from app.models.employee import Employee
from app.schemas.document import DocumentOut

logger = logging.getLogger(__name__)

# Base storage directory for uploads
UPLOAD_DIR = Path("uploads/documents")
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit


async def upload_document(
    db: AsyncSession,
    employee_id: int,
    file: UploadFile,
    document_type: str = "OTHER",
) -> Document:
    """Save file to disk and record metadata in database."""
    # Check employee existence
    emp_res = await db.execute(select(Employee).where(Employee.id == employee_id))
    emp = emp_res.scalar_one_or_none()
    if not emp:
        raise NotFoundError(f"Employee {employee_id} not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise BadRequestError(f"File extension '{ext}' is not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    # Ensure upload folder exists
    emp_upload_dir = UPLOAD_DIR / f"emp_{employee_id}"
    emp_upload_dir.mkdir(parents=True, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex[:12]}_{file.filename}"
    file_path = emp_upload_dir / unique_filename

    # Read and save file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise BadRequestError("File size exceeds 10MB limit")

    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        employee_id=employee_id,
        document_name=file.filename or "Uploaded Document",
        document_type=document_type.upper(),
        file_path=str(file_path),
        file_size=len(content),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    logger.info("Document uploaded  employee_id=%s  doc_id=%s  filename=%s", employee_id, doc.id, doc.document_name)
    return doc


async def list_employee_documents(db: AsyncSession, employee_id: int) -> list[Document]:
    """Retrieve all documents belonging to an employee."""
    res = await db.execute(
        select(Document)
        .where(Document.employee_id == employee_id)
        .order_by(Document.uploaded_at.desc())
    )
    return list(res.scalars().all())


async def get_document_by_id(db: AsyncSession, doc_id: int) -> Document:
    """Get document record by ID."""
    res = await db.execute(select(Document).where(Document.id == doc_id))
    doc = res.scalar_one_or_none()
    if not doc:
        raise NotFoundError(f"Document {doc_id} not found")
    return doc


async def delete_document(db: AsyncSession, doc_id: int) -> None:
    """Delete document from disk and remove DB metadata."""
    doc = await get_document_by_id(db, doc_id)
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.warning("Failed to remove file from disk: %s", e)

    await db.delete(doc)
    await db.commit()
    logger.info("Document deleted  doc_id=%s", doc_id)
