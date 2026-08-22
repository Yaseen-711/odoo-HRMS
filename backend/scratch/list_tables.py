import asyncio
from sqlalchemy import inspect
from app.db.session import async_engine

async def main():
    def get_tables(conn):
        inspector = inspect(conn)
        return inspector.get_table_names()

    async with async_engine.connect() as conn:
        tables = await conn.run_sync(get_tables)
        print("Existing database tables:")
        for t in tables:
            print(f" - {t}")

if __name__ == "__main__":
    asyncio.run(main())
