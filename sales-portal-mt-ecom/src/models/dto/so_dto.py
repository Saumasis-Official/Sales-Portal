from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import date, datetime


class SoItems(BaseModel):
    ItemNumber: str
    TargetQty: str
    SalesUnit: str
    SystemSKUCode: str
    MRP: str
    ROR: str
    BasePrice: str
    case_lot: str


class SoDTO(BaseModel):
    DocType: Optional[str] = "ZOR"
    SalesOrg: Optional[str] = "1010"
    SoldTo: str
    ShipTo: str
    DistChannel: Optional[str] = "10"
    Division: str
    PoNumber: str
    PoDate: str
    PoDateTo: str
    ReqDate: Optional[str] = datetime.now().date().strftime("%d.%m.%Y")
    NAVITEM: List[SoItems]
    NAVRES: List[Any] = []

    @field_validator("PoDate", "PoDateTo", "ReqDate", check_fields=False, mode="before")
    @classmethod
    def convert_to_sap_date(cls, v):
        # this is a field validator that converts datetime/date/str to defined SAP date format(dd.mm.yyyy)
        # Do a instance check if not convert to datetime object
        if not isinstance(v, datetime):
            dt = datetime.fromisoformat(str(v))
        else:
            dt = v

        # Convert the datetime object to the desired  SAP date format
        return dt.strftime("%d.%m.%Y")

