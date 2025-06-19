from pydantic import BaseModel
from typing import Literal, Optional


class BlinkitPoAckDTO(BaseModel):
    po_number: int
    receiver_code: int
    status: Literal["Success", "Failure"]
    event_name: Literal[
        "PO_CREATION",
        "CANCELLED_POST_CREATION",
        "PO_EXPIRED",
        "PO_SCHEDULED",
        "PO_UNSCHEDULED",
        "PO_RESCHEDULED",
        "PO_FULFILLED",
    ]
    event_message: Literal[
        "PO_CREATION",
        "PO_DEACTIVATION",
        "PO_SCHEDULING",
        "PO_FULFILMENT",
    ]
    errors: Optional[str] = ""
