import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_company_signup_flow(client: AsyncClient):
    unique = uuid.uuid4().hex[:8]
    email = f"company_admin_{unique}@hrms-test.com"
    resp = await client.post(
        "/api/auth/signup",
        json={
            "company_name": "Acme Corp",
            "admin_name": "Alice Admin",
            "email": email,
            "phone": "+1 (555) 019-9999",
            "password": "AdminPassword@1",
        },
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["success"] is True
    assert "login_id" in data
    assert data["email"] == email

    # Verify login with newly registered company admin
    login_resp = await client.post(
        "/api/auth/login",
        json={
            "login_id": data["login_id"],
            "password": "AdminPassword@1",
        },
    )
    assert login_resp.status_code == 200, login_resp.text
    assert "access_token" in login_resp.json()


@pytest.mark.asyncio
async def test_document_upload_and_download(client: AsyncClient, admin_token: str, created_employee: dict):
    emp_id = created_employee["employee"]["id"]
    
    # 1. Upload a dummy document
    files = {
        "file": ("test_contract.pdf", b"%PDF-1.4 dummy pdf content", "application/pdf")
    }
    data = {"document_type": "CONTRACT"}
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    upload_resp = await client.post(
        f"/api/employees/{emp_id}/documents",
        files=files,
        data=data,
        headers=headers,
    )
    assert upload_resp.status_code == 201, upload_resp.text
    doc_data = upload_resp.json()
    assert doc_data["document_name"] == "test_contract.pdf"
    assert doc_data["document_type"] == "CONTRACT"
    doc_id = doc_data["id"]

    # 2. List documents
    list_resp = await client.get(
        f"/api/employees/{emp_id}/documents",
        headers=headers,
    )
    assert list_resp.status_code == 200, list_resp.text
    assert len(list_resp.json()) >= 1

    # 3. Download document
    download_resp = await client.get(
        f"/api/documents/{doc_id}/download",
        headers=headers,
    )
    assert download_resp.status_code == 200, download_resp.text
    assert download_resp.content == b"%PDF-1.4 dummy pdf content"

    # 4. Delete document
    del_resp = await client.delete(
        f"/api/documents/{doc_id}",
        headers=headers,
    )
    assert del_resp.status_code == 204, del_resp.text


@pytest.mark.asyncio
async def test_payroll_pdf_and_attendance_csv(client: AsyncClient, admin_token: str, created_employee: dict):
    emp_id = created_employee["employee"]["id"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create salary structure
    await client.post(
        f"/api/payroll/{emp_id}",
        json={
            "basic_salary": 50000,
            "hra": 20000,
            "standard_allowance": 5000,
            "performance_bonus": 3000,
            "fixed_allowance": 2000,
            "professional_tax": 200,
            "pf": 1800,
        },
        headers=headers,
    )

    # 2. Download Payslip PDF
    pdf_resp = await client.get(
        f"/api/payroll/{emp_id}/slip?month=8&year=2026",
        headers=headers,
    )
    assert pdf_resp.status_code == 200, pdf_resp.text
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert b"%PDF" in pdf_resp.content[:10]

    # 3. Export Attendance CSV
    csv_resp = await client.get(
        "/api/attendance/export",
        headers=headers,
    )
    assert csv_resp.status_code == 200, csv_resp.text
    assert csv_resp.headers["content-type"].startswith("text/csv")
    assert "Date,Employee ID" in csv_resp.text
