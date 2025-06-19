from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime


class ShopifyItemsDTO(BaseModel):
    item_number: str
    customer_material_code: str
    order_quantity: str
    sales_unit : str
    item_conditions: list
    created_on : date = date.today()
    po_id : Optional[int] = 0
    item_category : Optional[str] = ""


class ShopifyDTO(BaseModel):
    sales_org: str
    disribution_channel: str
    division: str
    currency_code: str
    order_type : str
    po_number: str
    customer : str
    po_date: str
    rdd : str
    status : str = 'Open'
    ship_cond : Optional[str]
    ship_type : Optional[str]
    compl_div : Optional[str]
    order_partners : list
    header_conditions : list
    created_on : date = date.today()
    json_file_key : str
    items : List[ShopifyItemsDTO]
    


