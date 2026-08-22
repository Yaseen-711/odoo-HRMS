"""Employee Pydantic schemas."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class EmployeeCreate(BaseModel):
    """Fields the Admin/HR provides when onboarding a new employee."""

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
    personal_email: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    pan: Optional[str] = None
    uan: Optional[str] = None
    about_text: Optional[str] = None
    job_love_text: Optional[str] = None
    hobbies_text: Optional[str] = None
    skills: Optional[str] = None
    certifications: Optional[str] = None
    employee_code: Optional[str] = None


class EmployeeUpdate(BaseModel):
    """Fields an Admin/HR may update on an existing employee record."""

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
    personal_email: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    pan: Optional[str] = None
    uan: Optional[str] = None
    about_text: Optional[str] = None
    job_love_text: Optional[str] = None
    hobbies_text: Optional[str] = None
    skills: Optional[str] = None
    certifications: Optional[str] = None
    employee_code: Optional[str] = None


class EmployeeSelfUpdate(BaseModel):
    """Fields an Employee may update on their own profile.
    Bank details, PAN/UAN, and contract parameters are NOT allowed.
    """

    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture: Optional[str] = None
    personal_email: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    about_text: Optional[str] = None
    job_love_text: Optional[str] = None
    hobbies_text: Optional[str] = None
    skills: Optional[str] = None
    certifications: Optional[str] = None


class EmployeeOut(BaseModel):
    """General/Public employee view - safe to expose to other employees."""

    id: int
    employee_code: str
    user_id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_joining: Optional[date] = None
    department: Optional[str] = None
    job_position: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    manager: Optional[str] = None
    profile_picture: Optional[str] = None
    about_text: Optional[str] = None
    job_love_text: Optional[str] = None
    hobbies_text: Optional[str] = None
    skills: Optional[str] = None
    certifications: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmployeeSelfOut(EmployeeOut):
    """Extended employee view for the employee themselves."""

    date_of_birth: Optional[date] = None
    personal_email: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    address: Optional[str] = None
    pan: Optional[str] = None
    uan: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None


class EmployeeAdminOut(EmployeeSelfOut):
    """Complete employee details view for Admin/HR."""

    pass


class EmployeeCreatedOut(BaseModel):
    """Returned when Admin/HR creates an employee — includes one-time credentials."""

    employee: EmployeeAdminOut
    login_id: str
    temporary_password: str
