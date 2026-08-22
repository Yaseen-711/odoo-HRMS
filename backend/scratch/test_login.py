import asyncio
import httpx
from app.main import app

async def main():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Test Admin Login
        resp = await client.post("/api/auth/login", json={
            "login_id": "ADMIN-0001",
            "password": "password"
        })
        print("Admin Login Status:", resp.status_code)
        if resp.status_code == 200:
            print("Admin Login Success! JWT Token:", resp.json().get("access_token")[:20] + "...")
        else:
            print("Admin Login Failure:", resp.text)

        # Test Employee Login
        resp = await client.post("/api/auth/login", json={
            "login_id": "EMP-0001",
            "password": "password"
        })
        print("Employee Login Status:", resp.status_code)
        if resp.status_code == 200:
            print("Employee Login Success! JWT Token:", resp.json().get("access_token")[:20] + "...")
        else:
            print("Employee Login Failure:", resp.text)

if __name__ == "__main__":
    asyncio.run(main())
