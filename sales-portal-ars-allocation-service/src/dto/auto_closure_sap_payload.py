from typing import List

from pydantic import BaseModel


class SalesDetails(BaseModel):
    SaleOrder: str
    CustomerGroup: str
    SaleOrg: str
    DBnumber: str


class AutoClosureSapPayload(BaseModel):
    Type: str = "Closure"
    NAVSALEORDERS: List[SalesDetails]
    NAVRESULT: List = []
