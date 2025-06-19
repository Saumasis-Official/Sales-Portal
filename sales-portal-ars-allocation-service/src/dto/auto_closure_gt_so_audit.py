from typing import Optional, List, Dict
from uuid import UUID

from pydantic import BaseModel


class AutoClosureGtSoAudit(BaseModel):
    rule_id: int
    revision_id: UUID
    datalake_response: Optional[List] = None
    sap_payload: Optional[List[Dict]] = None
    sap_response: Optional[Dict] = None
    error: Optional[str] = None
    rdd_details: Optional[List[Dict]] = None
