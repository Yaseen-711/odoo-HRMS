"""Payroll Pydantic schemas."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class SalaryStructureCreate(BaseModel):
    basic_salary: float = 0.0
    hra: float = 0.0
    standard_allowance: float = 0.0
    performance_bonus: float = 0.0
    lta: float = 0.0
    fixed_allowance: float = 0.0
    professional_tax: float = 0.0
    pf: float = 0.0
    effective_from: Optional[date] = None


class SalaryStructureUpdate(BaseModel):
    basic_salary: Optional[float] = None
    hra: Optional[float] = None
    standard_allowance: Optional[float] = None
    performance_bonus: Optional[float] = None
    lta: Optional[float] = None
    fixed_allowance: Optional[float] = None
    professional_tax: Optional[float] = None
    pf: Optional[float] = None
    effective_from: Optional[date] = None


class SalaryOut(BaseModel):
    """Full salary structure with computed totals."""

    id: int
    employee_id: int

    # Raw components
    basic_salary: float
    hra: float
    standard_allowance: float
    performance_bonus: float
    lta: float
    fixed_allowance: float
    professional_tax: float
    pf: float
    effective_from: Optional[date] = None

    # Computed by the payroll service
    gross_salary: float
    total_deductions: float
    net_salary: float

    updated_at: datetime

    model_config = {"from_attributes": True}
