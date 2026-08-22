import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.employee import Employee
from app.core.security import hash_password

async def seed():
    print("Starting database seeding...")
    async with AsyncSessionLocal() as db:
        # Check if users already exist
        from sqlalchemy import select
        res = await db.execute(select(User))
        existing_users = res.scalars().all()
        if existing_users:
            print("Database already has users. Skipping seeding.")
            return

        # 1. Create Admin
        admin_user = User(
            login_id="ADMIN-0001",
            email="admin@dayflow.com",
            hashed_password=hash_password("password"),
            role=UserRole.ADMIN,
            must_change_password=False,
            is_active=True,
        )
        db.add(admin_user)
        await db.flush()

        admin_employee = Employee(
            user_id=admin_user.id,
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
        emp_user = User(
            login_id="EMP-0001",
            email="employee@dayflow.com",
            hashed_password=hash_password("password"),
            role=UserRole.EMPLOYEE,
            must_change_password=True,
            is_active=True,
        )
        db.add(emp_user)
        await db.flush()

        employee = Employee(
            user_id=emp_user.id,
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
        print("Database successfully seeded with:")
        print("  Admin: ADMIN-0001 / password")
        print("  Employee: EMP-0001 / password")

if __name__ == "__main__":
    asyncio.run(seed())
