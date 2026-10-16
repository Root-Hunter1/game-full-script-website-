from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .models import SupplierProductMapping
from .suppliers.vertexbazaar import VertexBazaarAdapter


async def deliver_order(
    package_id: int,
    player_id: str,
    order_id: int,
    db: AsyncSession,
    quantity: int = 1,
):
    """
    Multi-supplier delivery dispatcher.

    Supplier is selected from SupplierProductMapping.

    Currently implemented:
    - VertexBazaar

    More suppliers can be added later by creating
    their own adapter inside backend/app/suppliers/.
    """

    # ---------------------------------------------------------
    # Find active supplier mapping
    # ---------------------------------------------------------
    result = await db.execute(
        select(SupplierProductMapping)
        .where(
            SupplierProductMapping.package_id == package_id,
            SupplierProductMapping.is_active == True,
        )
        .order_by(SupplierProductMapping.id)
    )

    mapping = result.scalars().first()

    if not mapping:
        return {
            "success": False,
            "status": "no_supplier_mapping",
            "supplier_order_id": None,
            "supplier_name": None,
            "message": (
                f"No active supplier mapping "
                f"for package {package_id}"
            ),
        }

    supplier_name = mapping.supplier_name.strip().lower()

    # ---------------------------------------------------------
    # SAFETY MODE
    # ---------------------------------------------------------
    # When false, NEVER send a real supplier order.
    # This allows Admin "Approve & Send" to verify mapping
    # without spending supplier balance.
    # ---------------------------------------------------------
    if not settings.supplier_live_mode:
        return {
            "success": True,
            "status": "test_ready",
            "supplier_order_id": f"TEST-{order_id}",
            "supplier_name": mapping.supplier_name,
            "supplier_product_id": mapping.supplier_product_id,
            "supplier_variation_id": mapping.supplier_variation_id,
            "message": (
                "Supplier mapping verified. "
                "LIVE mode is OFF."
            ),
        }

    # ---------------------------------------------------------
    # VertexBazaar
    # ---------------------------------------------------------
    if supplier_name == "vertexbazaar":

        adapter = VertexBazaarAdapter(
            api_url=settings.supplier_api_url,
            api_key=settings.supplier_api_key,
        )

        return await adapter.create_order(
            product_id=mapping.supplier_product_id,
            variation_id=mapping.supplier_variation_id,
            player_id=player_id,
            order_id=order_id,
            quantity=quantity,
        )

    # ---------------------------------------------------------
    # Supplier not implemented yet
    # ---------------------------------------------------------
    return {
        "success": False,
        "status": "unsupported_supplier",
        "supplier_order_id": None,
        "supplier_name": mapping.supplier_name,
        "message": (
            f"Supplier adapter not implemented: "
            f"{mapping.supplier_name}"
        ),
    }
