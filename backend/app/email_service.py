from email.message import EmailMessage

import aiosmtplib

from .config import settings


async def send_order_email(
    to_email: str,
    order_id: int,
    game_name: str,
    player_id: str,
    package_amount: int | str,
    price: int,
    payment_method: str,
    status: str,
    quantity: int = 1,
):
    price_text = f"{float(price):.2f}".rstrip("0").rstrip(".")

    message = EmailMessage()

    message["From"] = settings.smtp_from
    message["To"] = to_email
    message["Subject"] = f"ApexGamer Order #{order_id}"

    message.set_content(
        f"""ApexGamer Order Notification

Order ID: #{order_id}
Game: {game_name}
Player ID: {player_id}
Package: {package_amount} x {quantity}
Price: ৳{price_text}
Payment Method: {payment_method}
Order Status: {status}

Thank you for using ApexGamer.
"""
    )

    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        start_tls=True,
        username=settings.smtp_username,
        password=settings.smtp_password,
    )


async def send_password_reset_email(
    to_email: str,
    reset_link: str,
):
    message = EmailMessage()

    message["From"] = settings.smtp_from
    message["To"] = to_email
    message["Subject"] = "Reset your ApexGamer password"

    message.set_content(
        f"""ApexGamer Password Reset

We received a request to reset your password.
Open this link to choose a new password (valid for 30 minutes):

{reset_link}

If you did not request this, you can ignore this email.
Your password will not change.
"""
    )

    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        start_tls=True,
        username=settings.smtp_username,
        password=settings.smtp_password,
    )
