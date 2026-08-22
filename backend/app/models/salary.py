"""SalaryStructure ORM model — one-to-one with Employee."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Standard working hours per day used for extra-hours calculation
STANDARD_WORK_HOURS: float = 8.0


class SalaryStructure(Base):
    """
    Salary breakdown for an employee.

    All monetary values are stored in INR (₹).  Calculations happen in the
    payroll service so the route handlers stay thin.
    """

    __tablename__ = "salary_structures"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Earnings
    basic_salary: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    hra: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    standard_allowance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    performance_bonus: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    lta: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    fixed_allowance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Deductions
    professional_tax: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    pf: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    effective_from: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    employee: Mapped["Employee"] = relationship(  # noqa: F821
        "Employee",
        back_populates="salary_structure",
        lazy="select",
    )
