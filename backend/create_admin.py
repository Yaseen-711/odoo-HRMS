import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole


async def main():
    email = input("Admin email: ").strip()
    password = input("Admin password: ")

    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            select(User).where(User.email == email)
        )

        if existing.scalar_one_or_none():
            print("A user with that email already exists.")
            return

        admin = User(
            login_id=email,
            email=email,
            hashed_password=hash_password(password),
            role=UserRole.ADMIN,
            must_change_password=False,
            is_active=True,
        )

        db.add(admin)
        await db.commit()

        print(f"Created ADMIN: {email}")


if __name__ == "__main__":
    asyncio.run(main())
