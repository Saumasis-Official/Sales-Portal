from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date


class ShopifySOUpdateItemsDTO(BaseModel):
    ItmNumber: str
    CustMaterialCode: str
    OrderQuantity: str
    SalesUnit: str
    ItemsConditions: list
    ItemCateg: Optional[str] = ""


class ShopifySOUpdateDTO(BaseModel):
    SalesDocument: str
    SalesOrg: str
    DistrChan: str
    Division: str
    CurrencyCode: str
    OrdReason: Optional[str] = "007"
    OrderPartners: list
    HeaderConditions: list
    LineItems: List[ShopifySOUpdateItemsDTO]
    Response: Optional[list] = [{"ResponseItems": [{"ResponseConditions": []}]}]
