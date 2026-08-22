import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.employee import Employee
from app.core.security import hash_password

async def delete_user_and_employee(db, login_id=None, email=None):
    # Find user by login_id or email
    stmt = select(User)
    if login_id:
        stmt = stmt.where(User.login_id == login_id)
    elif email:
        stmt = stmt.where(User.email == email)
    
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if user:
        print(f"Deleting user {user.login_id} ({user.email})...")
        # Find and delete employee
        emp_res = await db.execute(select(Employee).where(Employee.user_id == user.id))
        emp = emp_res.scalar_one_or_none()
        if emp:
            await db.delete(emp)
        await db.delete(user)
        await db.flush()

async def seed():
    print("Forcing database seeding of ADMIN-0001 and EMP-0001...")
    async with AsyncSessionLocal() as db:
        # Delete existing entries
        await delete_user_and_employee(db, login_id="ADMIN-0001")
        await delete_user_and_employee(db, email="admin@dayflow.com")
        await delete_user_and_employee(db, login_id="EMP-0001")
        await delete_user_and_employee(db, email="employee@dayflow.com")

        # 1. Create Admin
        new_admin = User(
            login_id="ADMIN-0001",
            email="admin@dayflow.com",
            hashed_password=hash_password("password"),
            role=UserRole.ADMIN,
            must_change_password=False,
            is_active=True,
        )
        db.add(new_admin)
        await db.flush()

        admin_employee = Employee(
            user_id=new_admin.id,
            employee_code="ADMIN-0001",
            first_name="Marcus",
            last_name="Vance",
            phone="+1 (555) 019-2834",
            address="742 Evergreen Terrace, Springfield",
            department="Engineering",
            job_position="Lead Dev",
            company="Dayflow Inc.",
            location="San Francisco",
        )
        db.add(admin_employee)

        # 2. Create Employee
        new_emp = User(
            login_id="EMP-0001",
            email="employee@dayflow.com",
            hashed_password=hash_password("password"),
            role=UserRole.EMPLOYEE,
            must_change_password=True,
            is_active=True,
        )
        db.add(new_emp)
        await db.flush()

        employee = Employee(
            user_id=new_emp.id,
            employee_code="EMP-0001",
            first_name="Sophia",
            last_name="Martinez",
            phone="+1 (555) 014-9384",
            address="123 Maple Street, Oakland",
            department="Design",
            job_position="UI Designer",
            company="Dayflow Inc.",
            location="San Francisco",
        )
        db.add(employee)

        await db.commit()
        print("Success! Admin & Employee accounts forced seeded.")
        print("  Admin ID: ADMIN-0001 / Password: password")
        print("  Employee ID: EMP-0001 / Password: password")

if __name__ == "__main__":
    asyncio.run(seed())
