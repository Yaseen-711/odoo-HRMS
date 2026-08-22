"""Document API router — upload, download, list, and delete employee files."""

import logging

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_admin_or_hr, require_employee
from app.db.session import get_db
from app.models.user import User
from app.schemas.document import DocumentOut
from app.services import document_service, employee_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Documents"])


@router.post(
    "/employees/{employee_id}/documents",
    response_model=DocumentOut,
    status_code=201,
    summary="Upload a document for an employee",
)
async def upload_document(
    employee_id: int,
    file: UploadFile = File(...),
    document_type: str = Form("OTHER"),
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> DocumentOut:
    # Ensure permission (Admin/HR or self)
    emp = await employee_service.get_employee_by_id(db, employee_id)
    await employee_service.require_own_or_admin(current_user, emp)

    doc = await document_service.upload_document(db, employee_id, file, document_type)
    return DocumentOut.model_validate(doc)


@router.get(
    "/employees/{employee_id}/documents",
    response_model=list[DocumentOut],
    summary="List documents for an employee",
)
async def list_documents(
    employee_id: int,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentOut]:
    emp = await employee_service.get_employee_by_id(db, employee_id)
    await employee_service.require_own_or_admin(current_user, emp)

    docs = await document_service.list_employee_documents(db, employee_id)
    return [DocumentOut.model_validate(d) for d in docs]


@router.get(
    "/documents/{doc_id}/download",
    summary="Download a document by ID",
)
async def download_document(
    doc_id: int,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
):
    doc = await document_service.get_document_by_id(db, doc_id)
    emp = await employee_service.get_employee_by_id(db, doc.employee_id)
    await employee_service.require_own_or_admin(current_user, emp)

    return FileResponse(
        path=doc.file_path,
        filename=doc.document_name,
        media_type="application/octet-stream",
    )


@router.delete(
    "/documents/{doc_id}",
    status_code=204,
    summary="Delete a document",
)
async def delete_document(
    doc_id: int,
    current_user: User = Depends(require_employee),
    db: AsyncSession = Depends(get_db),
) -> None:
    doc = await document_service.get_document_by_id(db, doc_id)
    emp = await employee_service.get_employee_by_id(db, doc.employee_id)
    await employee_service.require_own_or_admin(current_user, emp)

    await document_service.delete_document(db, doc_id)
