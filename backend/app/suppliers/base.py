from abc import ABC, abstractmethod
from typing import Any


class SupplierAdapter(ABC):

    name: str = "unknown"

    @abstractmethod
    async def create_order(
        self,
        *,
        product_id: str,
        variation_id: str | None,
        player_id: str,
        order_id: int,
        quantity: int = 1,
    ) -> dict[str, Any]:
        raise NotImplementedError

    async def check_player(
        self,
        *,
        product_id: str,
        player_id: str,
    ) -> dict[str, Any]:
        return {
            "success": True,
            "supported": False,
            "message": "Player ID check is not supported by this supplier.",
        }
