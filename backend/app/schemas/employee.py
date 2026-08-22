"""Employee Pydantic schemas."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class EmployeeCreate(BaseModel):
    """Fields the Admin provides when onboarding a new employee."""

    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    date_of_joining: Optional[date] = None
    department: Optional[str] = None
    job_position: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    manager: Optional[str] = None


class EmployeeUpdate(BaseModel):
    """Fields an Admin may update on an existing employee record."""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    date_of_joining: Optional[date] = None
    department: Optional[str] = None
    job_position: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    manager: Optional[str] = None
    profile_picture: Optional[str] = None


class EmployeeSelfUpdate(BaseModel):
    """Fields an Employee may update on their own profile."""

    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture: Optional[str] = None


class EmployeeOut(BaseModel):
    id: int
    employee_id: str
    user_id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    date_of_joining: Optional[date] = None
    department: Optional[str] = None
    job_position: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    manager: Optional[str] = None
    profile_picture: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmployeeCreatedOut(BaseModel):
    """Returned when Admin creates an employee — includes one-time credentials."""

    employee: EmployeeOut
    login_id: str
    temporary_password: str
