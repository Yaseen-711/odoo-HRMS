import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.leave import LeaveRequest
from app.models.salary import SalaryStructure

async def count_table(db, model, name):
    count = await db.scalar(select(func.count()).select_from(model))
    print(f"Table '{name}': {count} rows")
    if count > 0:
        # Fetch one sample row
        res = await db.execute(select(model).limit(1))
        row = res.scalar()
        if hasattr(row, 'login_id'):
            print(f"   Sample: login_id={row.login_id}, role={row.role}")
        elif hasattr(row, 'employee_code'):
            print(f"   Sample: code={row.employee_code}, name={row.first_name} {row.last_name}, dept={row.department}")
        elif hasattr(row, 'check_in'):
            print(f"   Sample: emp_id={row.employee_id}, date={row.date}, check_in={row.check_in}, status={row.status}")
        elif hasattr(row, 'leave_type'):
            print(f"   Sample: emp_id={row.employee_id}, type={row.leave_type}, range={row.start_date} to {row.end_date}, status={row.status}")
        elif hasattr(row, 'basic_salary'):
            print(f"   Sample: emp_id={row.employee_id}, basic_salary={row.basic_salary}, hra={row.hra}")

async def main():
    print("Database Tables Data Summary:")
    async with AsyncSessionLocal() as db:
        await count_table(db, User, "users")
        await count_table(db, Employee, "employees")
        await count_table(db, Attendance, "attendance")
        await count_table(db, LeaveRequest, "leave_requests")
        await count_table(db, SalaryStructure, "salary_structures")

if __name__ == "__main__":
    asyncio.run(main())
