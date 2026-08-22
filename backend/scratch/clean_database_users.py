import asyncio
from sqlalchemy import select, delete
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.leave import LeaveRequest
from app.models.salary import SalaryStructure
from app.models.document import Document

async def main():
    print("Starting clean up of database users...")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Retrieve the IDs of the two users to KEEP
            admin_res = await db.execute(select(User).where(User.email == "nkchinmayanandunk@gmail.com"))
            admin_user = admin_res.scalar_one_or_none()
            
            emp_res = await db.execute(select(User).where(User.login_id == "OIANKU20260804"))
            emp_user = emp_res.scalar_one_or_none()
            
            users_to_keep = []
            employees_to_keep = []
            
            if admin_user:
                users_to_keep.append(admin_user.id)
                admin_emp_res = await db.execute(select(Employee).where(Employee.user_id == admin_user.id))
                admin_emp = admin_emp_res.scalar_one_or_none()
                if admin_emp:
                    employees_to_keep.append(admin_emp.id)
                    print(f"Keeping Admin: User ID={admin_user.id}, Employee ID={admin_emp.id}")
            
            if emp_user:
                users_to_keep.append(emp_user.id)
                emp_emp_res = await db.execute(select(Employee).where(Employee.user_id == emp_user.id))
                emp_emp = emp_emp_res.scalar_one_or_none()
                if emp_emp:
                    employees_to_keep.append(emp_emp.id)
                    print(f"Keeping Employee: User ID={emp_user.id}, Employee ID={emp_emp.id}")

            # 2. Delete dependant tables for other employees
            # (Attendance, LeaveRequest, SalaryStructure, Document)
            if employees_to_keep:
                # Delete attendances not belonging to kept employees
                await db.execute(
                    delete(Attendance).where(Attendance.employee_id.not_in(employees_to_keep))
                )
                # Delete leaves not belonging to kept employees
                await db.execute(
                    delete(LeaveRequest).where(LeaveRequest.employee_id.not_in(employees_to_keep))
                )
                # Delete salary structures not belonging to kept employees
                await db.execute(
                    delete(SalaryStructure).where(SalaryStructure.employee_id.not_in(employees_to_keep))
                )
                # Delete documents not belonging to kept employees
                await db.execute(
                    delete(Document).where(Document.employee_id.not_in(employees_to_keep))
                )
            else:
                # No employees to keep, delete all
                await db.execute(delete(Attendance))
                await db.execute(delete(LeaveRequest))
                await db.execute(delete(SalaryStructure))
                await db.execute(delete(Document))

            # 3. Delete other Employees
            if employees_to_keep:
                await db.execute(
                    delete(Employee).where(Employee.id.not_in(employees_to_keep))
                )
            else:
                await db.execute(delete(Employee))

            # 4. Delete other Users
            if users_to_keep:
                await db.execute(
                    delete(User).where(User.id.not_in(users_to_keep))
                )
            else:
                await db.execute(delete(User))

            await db.commit()
            print("Successfully deleted all other users, employees, and dependent data!")

        except Exception as e:
            await db.rollback()
            print(f"Error during cleanup: {e}")
            raise e

if __name__ == "__main__":
    asyncio.run(main())
