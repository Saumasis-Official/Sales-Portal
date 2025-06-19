from typing import List, Literal

from pydantic import BaseModel, validator


class SubmitItemsDTO(BaseModel):
    item_number: str
    material_code: str
    required_qty: str
    sales_unit: str
    sales_org: int
    distribution_channel: int = 10
    division: int


class SubmitOrderDTO(BaseModel):
    sales_org: str = "1010"
    distribution_channel: int = 10
    division: str = "10"
    soldto: str
    shipto: str
    unloading: str = ""
    po_number: str
    po_date: str
    req_date: str
    pay_terms: str = ""
    items: List[SubmitItemsDTO]
    navresult: List = []
    product_type: str = "dist_specific"
    ton: float
    pdp: Literal["ON", "OFF"]
    
    @validator('unloading', pre=True, always=True)
    def set_unloading_default(cls, v):
        return v or ""
