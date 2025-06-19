from datetime import datetime,date
from pydantic import BaseModel, Field, model_validator
from typing import Optional
from src.enums.mt_ecom_status_type import MtEcomStatusType
from src.enums.customers_enum import Customers


class UpsertPoKey(BaseModel):
    po_number: str = Field(max_length=15)
    unique_id: Optional[str] = Field(default=None, max_length=50)
    status: MtEcomStatusType
    json_file_name: Optional[str] = None
    xml_file_name: Optional[str] = None
    po_created_date: datetime
    customer: Customers
    customer_code: str
    site_code : str
    delivery_date : datetime
    others: Optional[dict] = None
    location : Optional[str] = ""
    po_created_timestamp : Optional[datetime] = None               #Special case: If po_created_date has time and date both example Amazon

    @model_validator(mode="after")
    def check_file_names_present(self):
        json_file_name, xml_file_name = (
            self.json_file_name,
            self.xml_file_name
        )
        if json_file_name is None and xml_file_name is None:
            raise ValueError(
                "Either json_file_name or xml_file_name must be provided, but not both None."
            )
        return self
