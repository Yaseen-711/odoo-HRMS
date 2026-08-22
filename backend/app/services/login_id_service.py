import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def generate_login_id(
    db: AsyncSession,
    first_name: str,
    last_name: str,
    joining_year: int | None = None,
) -> str:
    """
    Generate a database-safe, unique, and sequential login ID based on:
    OI + first 2 letters of first name + first 2 letters of last name + joining year + 4-digit serial.
    Example: John Doe, 2026, serial 1 -> OIJODO20260001
    """
    # 1. Extract first two alphabetic characters of first name
    fn_part = "".join(c for c in first_name if c.isalpha())[:2].upper()
    if len(fn_part) < 2:
        fn_part = fn_part.ljust(2, "X")

    # 2. Extract first two alphabetic characters of last name
    ln_part = "".join(c for c in last_name if c.isalpha())[:2].upper()
    if len(ln_part) < 2:
        ln_part = ln_part.ljust(2, "X")

    # 3. Handle year
    if joining_year is None:
        joining_year = datetime.date.today().year

    # 4. Fetch the next value from the Postgres sequence (atomic and thread-safe)
    result = await db.execute(text("SELECT nextval('employee_serial_seq')"))
    serial = result.scalar() or 1

    # 5. Format and return
    return f"OI{fn_part}{ln_part}{joining_year}{serial:04d}"
