from fastapi import APIRouter, Request, Depends, Query, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from src.config.configurations import ARS_ALLOCATION
from src.config.global_configs import GlobalConfigs
from src.controller.ars_controller import ArsController
from src.libs.authorizer import Authorizer
from src.libs.loggers import Logger

router = APIRouter()
security = HTTPBasic()

AUTHORIZER = Authorizer()
ARS_CONTROLLER = ArsController()
GLOBAL_CONFIGS = GlobalConfigs()
logger = Logger("AOS_ROUTES")


@router.get("/aos-warehouse-payload-generate")
async def aos_warehouse_payload(
    request: Request,
    credentials: HTTPBasicCredentials = Depends(security),
):
    # TODO: Apply authentication as per cron job
    # try:
    #     assert AUTHORIZER.authenticate(credentials)
    # except AssertionError:
    #     return "Request is not authorized, Token invalid"

    # TODO: add a debug mode, to store data in database with "DEBUG" status
    try:
        body = await request.json()
    except Exception:
        body = {}

    distributor_codes = body.get("distributor_codes", None)

    if distributor_codes is not None and not isinstance(distributor_codes, list):
        raise HTTPException(status_code=400, detail="distributor_codes must be a list")

    ARS_CONTROLLER.holding_sync_validation()

    return ARS_CONTROLLER.aos_warehouse_payload_orchestration(distributor_codes)


@router.get("/aos-submit")
async def aos_submit(
    request: Request,
    credentials: HTTPBasicCredentials = Depends(security),
    debug: bool = Query(False),
    skip_sqs: bool = Query(False),
):
    # TODO: Apply authentication as per cron job
    # try:
    #     assert AUTHORIZER.authenticate(credentials)
    # except AssertionError:
    #     return "Request is not authorized, Token invalid"

    # Restrict calls from Postman in production
    if ARS_ALLOCATION["APPLICATION_ENV"] == "prod":
        user_agent = request.headers.get("User-Agent", "")
        if "Postman" in user_agent:
            logger.error(
                "Requests from Postman are not allowed in production", "POSTMAN"
            )
            raise HTTPException(
                status_code=403,
                detail="Requests from Postman are not allowed in production",
            )

    if GLOBAL_CONFIGS.get_is_aos_submit_running():
        raise HTTPException(status_code=400, detail="AOS Submit is already running")

    try:
        body = await request.json()
    except Exception:
        body = {}

    distributor_codes = body.get("distributor_codes", None)

    if distributor_codes is not None and not isinstance(distributor_codes, list):
        raise HTTPException(status_code=400, detail="distributor_codes must be a list")

    holding_sync: bool = ARS_CONTROLLER.holding_sync_validation()
    if not holding_sync:
        raise HTTPException(
            status_code=400, detail="Datalake holding sync validation failed"
        )

    return ARS_CONTROLLER.aos_submit_orchestration(distributor_codes, debug, skip_sqs)
