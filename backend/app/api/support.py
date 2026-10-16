from fastapi import APIRouter, Form, File, UploadFile, HTTPException
from email.message import EmailMessage

import aiosmtplib

from ..config import settings


router = APIRouter(prefix="/support", tags=["Support"])

ADMIN_EMAIL = "your-email@example.com"


@router.post("")
async def submit_support(
    order_id: str = Form(...),
    customer_email: str = Form(...),
    payment_method: str = Form(...),
    transaction_id: str = Form(""),
    problem: str = Form(...),
    document: UploadFile | None = File(None),
):
    if not order_id.strip():
        raise HTTPException(status_code=400, detail="Order ID is required")

    if not customer_email.strip():
        raise HTTPException(status_code=400, detail="Email is required")

    if not problem.strip():
        raise HTTPException(status_code=400, detail="Problem description is required")

    message = EmailMessage()

    message["From"] = settings.smtp_from
    message["To"] = ADMIN_EMAIL
    message["Reply-To"] = customer_email.strip()
    message["Subject"] = f"ApexGamer Support Report - Order #{order_id.strip()}"

    message.set_content(
        f"""ApexGamer Support Request

Order ID: #{order_id.strip()}
Customer Email: {customer_email.strip()}
Payment Method: {payment_method.strip() or "Not provided"}
Transaction ID: {transaction_id.strip() or "Not provided"}

Customer Problem:
{problem.strip()}

A payment screenshot/document may be attached to this email.

Please review this customer report.
"""
    )

    # Attach screenshot/document
    if document and document.filename:
        file_data = await document.read()

        # 10 MB limit
        if len(file_data) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Document must be smaller than 10 MB",
            )

        content_type = document.content_type or "application/octet-stream"

        if "/" in content_type:
            maintype, subtype = content_type.split("/", 1)
        else:
            maintype, subtype = "application", "octet-stream"

        message.add_attachment(
            file_data,
            maintype=maintype,
            subtype=subtype,
            filename=document.filename,
        )

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            start_tls=True,
            username=settings.smtp_username,
            password=settings.smtp_password,
        )
    except Exception as e:
        print("SUPPORT EMAIL ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="Support request could not be sent",
        )

    # Customer confirmation email
    try:
        confirmation = EmailMessage()

        confirmation["From"] = settings.smtp_from
        confirmation["To"] = customer_email.strip()
        confirmation["Subject"] = f"ApexGamer Support Request Received - #{order_id.strip()}"

        confirmation.set_content(
            f"""Hello,

We have received your support request.

Order ID: #{order_id.strip()}
Payment Method: {payment_method.strip() or "Not provided"}
Transaction ID: {transaction_id.strip() or "Not provided"}

Our support team will review your request.

Thank you for contacting ApexGamer.
"""
        )

        await aiosmtplib.send(
            confirmation,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            start_tls=True,
            username=settings.smtp_username,
            password=settings.smtp_password,
        )

    except Exception as e:
        # Admin report was already sent, so don't fail the whole request.
        print("CUSTOMER CONFIRMATION EMAIL ERROR:", e)

    return {
        "success": True,
        "message": "Support request submitted successfully",
    }
