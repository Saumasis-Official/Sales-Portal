from typing import Optional, List, Dict
from uuid import UUID

from pydantic import BaseModel


class AutoClosureMtEcomSoAudit(BaseModel):
    rule_id: Optional[int] = None
    revision_id: Optional[UUID] = None
    datalake_response: Optional[List] = None
    process_details: Optional[List[Dict]] = None
    sap_payload: Optional[List[Dict]] = None
    sap_response: Optional[Dict] = None
    error: Optional[str] = None
