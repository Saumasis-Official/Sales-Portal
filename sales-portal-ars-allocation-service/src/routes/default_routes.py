import sys
from datetime import datetime

import pytz
from fastapi import APIRouter
from fastapi.security import HTTPBasic

from src.controller.ars_controller import ArsController
from src.libs.authorizer import Authorizer

router = APIRouter()
security = HTTPBasic()
ist = pytz.timezone("Asia/Kolkata")

AUTHORIZER = Authorizer()
ARS_CONTROLLER = ArsController()


@router.get("/hc-index")
async def health_check():
    """
    Endpoint for ECS health check.
    """
    python_version = sys.version
    now = datetime.now()
    service_time = {
        "current_date": now.strftime("%Y-%m-%d"),
        "current_time": now.strftime("%H:%M:%S"),
    }
    return {
        "status": f"""ARS ALLOCATION SERVICE running on python version: {python_version}""",
        "service-time": service_time,
        "current_date_ist": datetime.now(ist).date(),
    }
