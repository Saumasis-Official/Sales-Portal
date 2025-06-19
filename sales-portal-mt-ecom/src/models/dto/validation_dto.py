from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date, datetime


class ValidationItemsDTO(BaseModel):
    ItemNumber: str
    ParentSKUCode: str
    SystemSKUCode: str
    CustomerProductID: str
    MRP: str
    EAN: str
    CaseLot: str
    Quantity:  Optional[str] = "1"
    BasePrice : Optional[str] = "0"


class ValidationDTO(BaseModel):
    UniqueID: Optional[str] = ""
    SalesOrg: Optional[str] = "1010"
    SoldTo: str
    PoDate: str
    DocType: Optional[str] =  "ZOR"
    DistChannel: Optional[str] =  "10"
    Division: Optional[str] =  "10"
    PoNumber : str
    NAVPRICE: List[ValidationItemsDTO]
    NAVRESULT: Optional[list] = []

    @field_validator("PoDate", "PoDateTo", "ReqDate", check_fields=False, mode="before")
    @classmethod
    def convert_to_sap_date(cls, v):
        # this is a field validator that converts datetime/date/str to defined SAP date format(dd.mm.yyyy)
        # Do a instance check if not convert to datetime object
        if not isinstance(v, datetime):
            dt = datetime.fromisoformat(str(v))
        else:
            dt = v
        # Convert the datetime object to the desired SAP date format
        return dt.strftime("%d.%m.%Y")
