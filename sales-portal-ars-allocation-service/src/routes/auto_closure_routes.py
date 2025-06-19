from fastapi import APIRouter, Depends, Request, Body
from fastapi.security import HTTPBasic

from src.controller.auto_closure_controller import AutoClosureController
from src.libs.authorizer import Authorizer
from src.libs.loggers import Logger
from src.libs.request_validation import AutoClosureSync, SoClosureStatus
from src.libs.response_template import respond

router = APIRouter()
security = HTTPBasic()
logger = Logger("AUTO-CLOSURE-ROUTES")
AUTHORIZER = Authorizer()
AUTO_CLOSURE_CONTROLLER = AutoClosureController()


@router.get("/auto-closure-sync")
async def auto_closure(
    request: AutoClosureSync = Depends(),
):
    # TODO: APPLY AUTHENTICATION AS PER THE CRON JOB
    # Authenticate api call
    # try:
    #     assert AUTHORIZER.authenticate(credentials)
    # except AssertionError:
    #     raise HTTPException(
    #         status_code=401, detail="Request is not authorized, Token invalid"
    #     )
    gt = request.gt
    mt_ecom = request.mt_ecom
    if gt:
        AUTO_CLOSURE_CONTROLLER.auto_closure_gt_orchestration()
    if mt_ecom:
        AUTO_CLOSURE_CONTROLLER.auto_closure_mt_ecom_orchestration()
    return {"message": "Auto closure sync running in background"}


@router.get("/auto-closure-gt-so-audit-report")
async def auto_closure_gt_so_audit_report(request: Request):
    """
    Description: To sync audit.auto_closure_gt_so_audit_report table from audit.auto_closure_gt_so_audit table
    """
    AUTO_CLOSURE_CONTROLLER.report_table_initialization()
    return {"message": "running..."}


@router.post("/so-closure-status")
async def so_closure_status(
    body: SoClosureStatus = Body(...),
):
    """
    Description: To check the overall status of the SO in Datalake
    """
    so_list = body.so_list
    response = AUTO_CLOSURE_CONTROLLER.so_closure_status(so_list)
    return respond(True, "SO Closure Status", response)
