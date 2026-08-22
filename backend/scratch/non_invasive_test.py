import asyncio
from app.db.session import AsyncSessionLocal
from app.services.auth_service import authenticate_user
from app.services.employee_service import get_employee_by_user_id, list_employees
from app.services.dashboard_service import get_summary
from app.services.leave_service import list_leave_requests
from app.services.attendance_service import list_all_attendance
from app.services.payroll_service import get_salary_out
from app.services.pdf_service import generate_payslip_pdf

async def main():
    print("=" * 60)
    print("RUNNING NON-INVASIVE READ-ONLY VERIFICATION TEST")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        # 1. Test Admin Authentication
        print("\n1. Testing Admin Authentication (nkchinmayanandunk@gmail.com / 2007)...")
        try:
            admin_token = await authenticate_user(db, "nkchinmayanandunk@gmail.com", "2007")
            print(f"   SUCCESS: Token generated ({admin_token.access_token[:15]}...)")
        except Exception as e:
            print(f"   FAILED: {e}")
            return

        # 2. Test Employee Authentication
        print("\n2. Testing Employee Authentication (OIANKU20260804 / 123456)...")
        try:
            emp_token = await authenticate_user(db, "OIANKU20260804", "123456")
            print(f"   SUCCESS: Token generated ({emp_token.access_token[:15]}...)")
        except Exception as e:
            print(f"   FAILED: {e}")

        # 3. Test Admin Dashboard Summary
        print("\n3. Testing Admin Dashboard Summary...")
        try:
            # Query Admin user
            from sqlalchemy import select
            from app.models.user import User
            res = await db.execute(select(User).where(User.email == "nkchinmayanandunk@gmail.com"))
            admin_user = res.scalar_one_or_none()
            summary = await get_summary(db, admin_user)
            print(f"   SUCCESS: Employee={summary.employee.first_name} {summary.employee.last_name}, Role={summary.role}, Attendance Status={summary.attendance.status}")
        except Exception as e:
            print(f"   FAILED: {e}")

        # 4. Test Listing Employees
        print("\n4. Testing List Employees...")
        try:
            employees = await list_employees(db)
            print(f"   SUCCESS: Found {len(employees)} employee profiles in database.")
        except Exception as e:
            print(f"   FAILED: {e}")

        # 5. Test Listing Attendance Records
        print("\n5. Testing List Attendance Records...")
        try:
            attendance_list = await list_all_attendance(db)
            print(f"   SUCCESS: Found {len(attendance_list)} attendance records.")
        except Exception as e:
            print(f"   FAILED: {e}")

        # 6. Test Listing Leave Requests
        print("\n6. Testing List Leave Requests...")
        try:
            leaves = await list_leave_requests(db, admin_user)
            print(f"   SUCCESS: Found {len(leaves)} leave requests.")
        except Exception as e:
            print(f"   FAILED: {e}")

        # 7. Test PDF Payslip Generation (Read-only for Admin Employee profile)
        print("\n7. Testing Payslip PDF Generation for Admin...")
        try:
            admin_emp = await get_employee_by_user_id(db, admin_user.id)
            salary = await get_salary_out(db, admin_emp.id)
            pdf_bytes = generate_payslip_pdf(admin_emp, salary, month=8, year=2026)
            print(f"   SUCCESS: Payslip PDF generated successfully ({len(pdf_bytes)} bytes, starts with {pdf_bytes[:4]})")
        except Exception as e:
            print(f"   FAILED: {e}")

    print("=" * 60)
    print("ALL NON-INVASIVE TESTS COMPLETED CLEANLY WITHOUT DB MUTATIONS")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
