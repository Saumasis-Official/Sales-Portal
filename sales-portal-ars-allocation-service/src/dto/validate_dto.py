from pydantic import BaseModel
from typing import Optional, List, Literal


class PartnersDTO(BaseModel):
    partner_role: Literal["AG", "WE", "Y1"]
    partner_number: str
    partner_name: Optional[str] = None
    
    class Config:
        # Exclude unset fields from the serialized output
        exclude_unset = True


class ItemsDTO(BaseModel):
    material_code: str
    item_number: str
    required_qty: str
    target_qty: str
    original_quantity: str
    description: str
    sales_unit: str
    pack_type: str
    sales_org: int = 1010
    distribution_channel: int = 10
    ReqDeliveryDate: Optional[str] = None
    division: int
    stock_in_hand: Optional[str] = ""
    stock_in_transit: Optional[str] = ""
    open_order: Optional[str] = ""
    item_type: str = "dist_specific"
    stock_norm_days: str
    soq_norm_qty: Optional[str] = None


class OrderDataDTO(BaseModel):
    sales_org: str = "1010"
    distribution_channel: int = 10
    division: str = "10"
    items: List[ItemsDTO]
    partners: List[PartnersDTO]
    pdp: Literal["ON", "OFF"]
    original_items: List[ItemsDTO]
    po_number: str = ""
    po_date: str = ""
    req_date: str = ""
    navresult: List = []