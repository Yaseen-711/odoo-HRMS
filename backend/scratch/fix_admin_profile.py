import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.salary import SalaryStructure

async def main():
    print("Fixing admin database profile...")
    async with AsyncSessionLocal() as db:
        # Find user
        res = await db.execute(select(User).where(User.email == "nkchinmayanandunk@gmail.com"))
        user = res.scalar_one_or_none()
        
        if not user:
            print("Admin user not found. Cannot fix.")
            return

        # Check if Employee record exists
        emp_res = await db.execute(select(Employee).where(Employee.user_id == user.id))
        emp = emp_res.scalar_one_or_none()
        
        if not emp:
            print("Creating missing Employee record for nkchinmayanandunk@gmail.com...")
            emp = Employee(
                user_id=user.id,
                employee_code="ADMIN-CHINMAY",
                first_name="Chinmayanand",
                last_name="Nk",
                phone="+91 9999999999",
                address="Bangalore, India",
                department="HR & Admin",
                job_position="Administrator",
                company="Dayflow Inc.",
                location="Bangalore",
            )
            db.add(emp)
            await db.flush()
        else:
            print("Employee record already exists.")

        # Check if Salary Structure exists
        salary_res = await db.execute(select(SalaryStructure).where(SalaryStructure.employee_id == emp.id))
        salary = salary_res.scalar_one_or_none()
        
        if not salary:
            print("Creating missing Salary Structure...")
            salary = SalaryStructure(
                employee_id=emp.id,
                basic_salary=120000,
                hra=48000,
                standard_allowance=10000,
                performance_bonus=5000,
                fixed_allowance=3000,
                professional_tax=200,
                pf=1800,
            )
            db.add(salary)
        else:
            print("Salary Structure already exists.")

        await db.commit()
        print("Success! Admin profile and salary structure successfully linked in the database.")

if __name__ == "__main__":
    asyncio.run(main())
