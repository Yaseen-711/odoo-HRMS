"""PDF Generation service — payslip formatting using ReportLab."""

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.employee import Employee
from app.models.salary import SalaryStructure
from app.services.payroll_service import compute_salary_totals


def generate_payslip_pdf(
    employee: Employee,
    salary: SalaryStructure,
    month: int = 8,
    year: int = 2026,
) -> bytes:
    """Build a professional Payslip PDF in memory and return bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1e293b"),
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
    )
    section_heading = ParagraphStyle(
        "SecHeading",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=6,
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.HexColor("#1e293b"),
    )
    cell_normal = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#334155"),
    )

    story = []

    # 1. Header
    month_name = datetime(year, month, 1).strftime("%B %Y")
    story.append(Paragraph("DAYFLOW HRMS", title_style))
    story.append(Paragraph(f"PAYSLIP FOR THE MONTH OF {month_name.upper()}", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#e2e8f0"), spaceAfter=15))

    # 2. Employee Details Grid
    emp_details = [
        [
            Paragraph("<b>Employee Name:</b>", cell_normal),
            Paragraph(f"{employee.first_name} {employee.last_name}", cell_bold),
            Paragraph("<b>Employee ID:</b>", cell_normal),
            Paragraph(employee.employee_code, cell_bold),
        ],
        [
            Paragraph("<b>Department:</b>", cell_normal),
            Paragraph(employee.department or "N/A", cell_normal),
            Paragraph("<b>Designation:</b>", cell_normal),
            Paragraph(employee.job_position or "N/A", cell_normal),
        ],
        [
            Paragraph("<b>Company:</b>", cell_normal),
            Paragraph(employee.company or "Dayflow Inc.", cell_normal),
            Paragraph("<b>Bank Account:</b>", cell_normal),
            Paragraph(employee.account_number or "N/A", cell_normal),
        ],
    ]
    emp_table = Table(emp_details, colWidths=[110, 160, 110, 160])
    emp_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(emp_table)
    story.append(Spacer(1, 15))

    # 3. Salary Computation
    computed = compute_salary_totals(salary)

    story.append(Paragraph("Salary Breakdown", section_heading))

    breakdown_data = [
        [
            Paragraph("<b>Earnings</b>", cell_bold),
            Paragraph("<b>Amount (INR)</b>", cell_bold),
            Paragraph("<b>Deductions</b>", cell_bold),
            Paragraph("<b>Amount (INR)</b>", cell_bold),
        ],
        [
            Paragraph("Basic Salary", cell_normal),
            Paragraph(f"₹ {salary.basic_salary:,.2f}", cell_normal),
            Paragraph("Provident Fund (PF)", cell_normal),
            Paragraph(f"₹ {salary.pf:,.2f}", cell_normal),
        ],
        [
            Paragraph("House Rent Allowance (HRA)", cell_normal),
            Paragraph(f"₹ {salary.hra:,.2f}", cell_normal),
            Paragraph("Professional Tax", cell_normal),
            Paragraph(f"₹ {salary.professional_tax:,.2f}", cell_normal),
        ],
        [
            Paragraph("Standard Allowance", cell_normal),
            Paragraph(f"₹ {salary.standard_allowance:,.2f}", cell_normal),
            Paragraph("", cell_normal),
            Paragraph("", cell_normal),
        ],
        [
            Paragraph("Performance Bonus", cell_normal),
            Paragraph(f"₹ {salary.performance_bonus:,.2f}", cell_normal),
            Paragraph("", cell_normal),
            Paragraph("", cell_normal),
        ],
        [
            Paragraph("Fixed Allowance", cell_normal),
            Paragraph(f"₹ {salary.fixed_allowance:,.2f}", cell_normal),
            Paragraph("", cell_normal),
            Paragraph("", cell_normal),
        ],
        [
            Paragraph("<b>Total Earnings</b>", cell_bold),
            Paragraph(f"<b>₹ {computed.gross_salary:,.2f}</b>", cell_bold),
            Paragraph("<b>Total Deductions</b>", cell_bold),
            Paragraph(f"<b>₹ {computed.total_deductions:,.2f}</b>", cell_bold),
        ],
    ]

    salary_table = Table(breakdown_data, colWidths=[160, 110, 160, 110])
    salary_table.setStyle(
        TableStyle([
            ("HEADERBACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(salary_table)
    story.append(Spacer(1, 20))

    # 4. Net Payout Card
    payout_data = [
        [
            Paragraph("<b>NET SALARY PAYOUT</b>", ParagraphStyle("NetLbl", parent=cell_bold, fontSize=11, textColor=colors.HexColor("#0f172a"))),
            Paragraph(f"<b>₹ {computed.net_salary:,.2f}</b>", ParagraphStyle("NetVal", parent=cell_bold, fontSize=14, textColor=colors.HexColor("#0284c7"))),
        ]
    ]
    payout_table = Table(payout_data, colWidths=[300, 240])
    payout_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#e0f2fe")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#0284c7")),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ])
    )
    story.append(payout_table)
    story.append(Spacer(1, 30))

    # 5. Footer / Signatures
    story.append(Paragraph("This is a system-generated document and does not require a physical signature.", ParagraphStyle("Foot", parent=cell_normal, fontSize=8, textColor=colors.HexColor("#94a3b8"))))

    doc.build(story)
    return buffer.getvalue()
