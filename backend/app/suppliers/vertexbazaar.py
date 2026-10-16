import httpx

from .base import SupplierAdapter


class VertexBazaarAdapter(SupplierAdapter):

    name = "vertexbazaar"

    def __init__(
        self,
        *,
        api_url: str,
        api_key: str,
    ):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key

    async def create_order(
        self,
        *,
        product_id: str,
        variation_id: str | None,
        player_id: str,
        order_id: int,
        quantity: int = 1,
    ) -> dict:

        if not variation_id:
            return {
                "success": False,
                "status": "missing_variation_id",
                "supplier_order_id": None,
                "supplier_name": self.name,
                "message": "VertexBazaar variation ID is missing.",
            }

        url = (
            self.api_url
            + "/api/v1/reseller/orders"
        )

        headers = {
            "X-Api-Key": self.api_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        payload = {
            "product_id": int(product_id),
            "variation_id": int(variation_id),
            "quantity": quantity,
            "client_ref": f"apexgamer-order-{order_id}",
            "fields": {
                "player_id": player_id,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json=payload,
                )

            try:
                data = response.json()
            except Exception:
                data = {}

            if response.status_code < 200 or response.status_code >= 300:
                return {
                    "success": False,
                    "status": "supplier_http_error",
                    "supplier_order_id": None,
                    "supplier_name": self.name,
                    "message": data.get(
                        "message",
                        response.text[:500],
                    ),
                    "response": data,
                }

            supplier_data = data.get("data", {})
            supplier_order = supplier_data.get("order", {})

            supplier_order_id = (
                supplier_order.get("id")
                or supplier_data.get("order_id")
            )

            supplier_status = (
                supplier_order.get("status")
                or supplier_data.get("status")
                or "processing"
            )

            return {
                "success": bool(supplier_order_id),
                "status": supplier_status,
                "supplier_order_id": (
                    str(supplier_order_id)
                    if supplier_order_id is not None
                    else None
                ),
                "supplier_name": self.name,
                "message": "VertexBazaar order submitted.",
                "response": data,
            }

        except Exception as exc:
            return {
                "success": False,
                "status": "supplier_connection_error",
                "supplier_order_id": None,
                "supplier_name": self.name,
                "message": str(exc),
            }
