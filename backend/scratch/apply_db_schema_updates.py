import asyncio
from sqlalchemy import text
from app.db.base import Base
from app.db.session import async_engine

# Ensure all models are imported so Base.metadata is fully populated
from app.models.company import Company
from app.models.user import User
from app.models.employee import Employee
from app.models.document import Document
from app.models.attendance import Attendance
from app.models.leave import LeaveRequest
from app.models.salary import SalaryStructure

async def main():
    print("Updating database schema...")
    async with async_engine.begin() as conn:
        # Create companies table if not exists
        await conn.run_sync(Base.metadata.create_all)

        # Add company_id column to users table if missing
        await conn.execute(text("""
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='company_id') THEN
                    ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;
                    CREATE INDEX IF NOT EXISTS ix_users_company_id ON users (company_id);
                END IF;
            END $$;
        """))

        # Add company_id column to employees table if missing
        await conn.execute(text("""
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='company_id') THEN
                    ALTER TABLE employees ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;
                    CREATE INDEX IF NOT EXISTS ix_employees_company_id ON employees (company_id);
                END IF;
            END $$;
        """))

    print("Database schema successfully updated!")

if __name__ == "__main__":
    asyncio.run(main())
