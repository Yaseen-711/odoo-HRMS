"""Document Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    id: int
    employee_id: int
    document_name: str
    document_type: str
    file_size: int
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
