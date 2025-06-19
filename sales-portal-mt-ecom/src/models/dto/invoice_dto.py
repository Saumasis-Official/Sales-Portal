from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime


class InvoiceItemsDTO(BaseModel):
    InvType : str = "PRICE_CHECK"
    SalesOrder : str
    ItemNumber: str
    ParentSKUCode: str
    SystemSKUCode: str
    CustomerProductID: str
    MRP: str = '0'
    EAN: str

class InvoiceHeaderDTO(BaseModel):
    InvType : str = "PRICE_CHECK"
    SalesOrder : str 
    UniqueID : str = ""
    PONumber : str 
    NAV_ITEM : list[InvoiceItemsDTO]
    NAV_INVOICES : list = [
        {
            "NAVINVLINES": [],
            "NAVTAX" : []
        }
    ]


    @field_validator("PoDate", check_fields=False, mode="before")
    @classmethod
    def convert_to_sap_date(cls, v):
        # this is a field validator that converts datetime/date/str to defined SAP date format(
        # dd.mm.yyyy)
        try:
            # Try to convert the value to a datetime object
            dt = datetime.fromisoformat(str(v))
        except ValueError:
            # If the conversion fails, assume it's already a datetime object
            dt = v
        
        # Convert the datetime object to the desired SAP date format
        return dt.strftime("%d.%m.%Y")
