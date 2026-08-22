import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.salary import SalaryStructure

async def main():
    async with AsyncSessionLocal() as db:
        # Check Admin User
        admin_res = await db.execute(select(User).where(User.email == "nkchinmayanandunk@gmail.com"))
        admin = admin_res.scalar_one_or_none()
        if admin:
            print(f"Admin User: id={admin.id}, login_id={admin.login_id}, email={admin.email}, role={admin.role}")
            # Check if Admin has an Employee record
            emp_res = await db.execute(select(Employee).where(Employee.user_id == admin.id))
            emp = emp_res.scalar_one_or_none()
            if emp:
                print(f"   Employee Record: id={emp.id}, code={emp.employee_code}, name={emp.first_name} {emp.last_name}")
                # Check salary structure
                salary_res = await db.execute(select(SalaryStructure).where(SalaryStructure.employee_id == emp.id))
                salary = salary_res.scalar_one_or_none()
                if salary:
                    print(f"      Salary Structure: id={salary.id}, basic={salary.basic_salary}")
                else:
                    print("      Salary Structure: None")
            else:
                print("   Employee Record: None")
        else:
            print("Admin User nkchinmayanandunk@gmail.com not found in DB")

        # Check Employee User
        emp_user_res = await db.execute(select(User).where(User.login_id == "OIANKU20260804"))
        emp_user = emp_user_res.scalar_one_or_none()
        if emp_user:
            print(f"Employee User: id={emp_user.id}, login_id={emp_user.login_id}, email={emp_user.email}, role={emp_user.role}")
            emp_res = await db.execute(select(Employee).where(Employee.user_id == emp_user.id))
            emp = emp_res.scalar_one_or_none()
            if emp:
                print(f"   Employee Record: id={emp.id}, code={emp.employee_code}, name={emp.first_name} {emp.last_name}")
            else:
                print("   Employee Record: None")
        else:
            print("Employee User OIANKU20260804 not found in DB")

if __name__ == "__main__":
    asyncio.run(main())
