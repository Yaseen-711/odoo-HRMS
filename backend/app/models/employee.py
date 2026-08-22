"""Employee ORM model — HR domain record linked 1:1 to a User."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # FK to users — one User has exactly one Employee record
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    company_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # HR-visible identifier shown on payslips, badges, etc.
    employee_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    # Personal details
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    profile_picture: Mapped[str | None] = mapped_column(String(512), nullable=True)
    personal_email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pan: Mapped[str | None] = mapped_column(String(10), nullable=True)
    uan: Mapped[str | None] = mapped_column(String(12), nullable=True)

    # Bank details
    bank_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    account_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ifsc_code: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Bio & custom text details
    about_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_love_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    hobbies_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    certifications: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Job details
    date_of_joining: Mapped[date | None] = mapped_column(Date, nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    job_position: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    manager: Mapped[str | None] = mapped_column(String(100), nullable=True)

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

    # Relationships
    user: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="employee",
        lazy="select",
    )

    attendances: Mapped[list["Attendance"]] = relationship(  # noqa: F821
        "Attendance",
        back_populates="employee",
        lazy="select",
        cascade="all, delete-orphan",
    )

    leave_requests: Mapped[list["LeaveRequest"]] = relationship(  # noqa: F821
        "LeaveRequest",
        back_populates="employee",
        lazy="select",
        cascade="all, delete-orphan",
    )

    salary_structure: Mapped["SalaryStructure | None"] = relationship(  # noqa: F821
        "SalaryStructure",
        back_populates="employee",
        uselist=False,
        lazy="select",
        cascade="all, delete-orphan",
    )

    documents: Mapped[list["Document"]] = relationship(  # noqa: F821
        "Document",
        back_populates="employee",
        lazy="select",
        cascade="all, delete-orphan",
    )
