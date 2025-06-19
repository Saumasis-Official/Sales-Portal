from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator


class PoItemsDTO(BaseModel):
    # attributes and data types to be kept in sync with mt_ecom_item_table
    item_number: str
    caselot: Optional[int] = 0
    customer_product_id: str                        #Customers are sending in string as well as int
    target_qty: int
    ean: str = ""                                         
    mrp: Optional[float] = 0.0
    po_item_description: Optional[str] = None  
    psku_code: Optional[int] = None                  
    psku_description: Optional[str] = None
    plant_code: Optional[str] = None
    system_sku_code: Optional[int] = None
    system_sku_description: Optional[str] = None
    ror: Optional[str] = ''
    base_price : Optional[float] = 0.0
    landing_price : Optional[float] = 0.0
    sales_unit : Optional[str] = ''
    item_total_amount : Optional[float] = 0.0
    uom : str 


class PoDTO(BaseModel):
    # attributes and data-types to be kept in sync with mt_ecom_header_table
    site_code: str
    po_number: str
    po_created_date: date = date.today()
    delivery_date: Optional[datetime] = None
    vendor_code: Optional[str] = None
    customer_code: Optional[str] = ''
    items: List[PoItemsDTO]
    others: Optional[dict] = None
    location: Optional[str] = ""
    po_created_timestamp: Optional[datetime] = None     #Special case: If po_created_date has time and date both example Amazon

    @field_validator('po_created_date', 'delivery_date', mode="before", check_fields=False)
    @classmethod
    def convert_date_to_datetime(cls, v):
        # This is a field validator that converts date to datetime, if the date is not a datetime object
        if isinstance(v, date) and not isinstance(v, datetime):
            return datetime.combine(v, datetime.min.time())
        return v