from datetime import datetime
from typing import Optional, Dict, List

from pydantic import BaseModel

from src.dto.validate_dto import OrderDataDTO


class AosLogsDto(BaseModel):
    distributor_code: str
    order_date: str = datetime.today().strftime("%Y-%m-%d")
    pdp: Optional[Dict] = None
    warehouse_response: Optional[Dict] = None
    errors: Optional[str] = None
    order_payload: Optional[OrderDataDTO] = None
    holdings: Optional[List] = None
    sap_validation_response_1: Optional[Dict] = None
    sap_validation_errors_1: Optional[Dict] = None
    sap_validation_response_2: Optional[Dict] = None
    sap_validation_errors_2: Optional[Dict] = None
    order_id: Optional[int] = None
