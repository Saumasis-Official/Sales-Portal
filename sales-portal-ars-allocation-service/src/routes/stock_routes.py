from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.security import HTTPBasicCredentials, HTTPBasic

from src.controller.ars_controller import ArsController
from src.libs.authorizer import Authorizer
from src.libs.loggers import Logger

router = APIRouter()
security = HTTPBasic()
logger = Logger("STOCK-ROUTES")

AUTHORIZER = Authorizer()
ARS_CONTROLLER = ArsController()


@router.get("/stock-count")
async def stock_count(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    # Authenticate api call
    try:
        assert AUTHORIZER.authenticate(credentials)
    except AssertionError:
        raise HTTPException(
            status_code=401, detail="Request is not authorized, Token invalid"
        )

    try:
        body = await request.json()
        request_type = body.get("type")

        if request_type == "transit":
            response = ARS_CONTROLLER.fetch_in_transit(body)
        elif request_type == "inhand":
            response = ARS_CONTROLLER.fetch_in_hand(body)
        elif request_type == "open":
            response = ARS_CONTROLLER.fetch_open(body)
        elif request_type == "MTD":
            response = ARS_CONTROLLER.fetch_mtd(body)
        elif request_type == "time":
            response = ARS_CONTROLLER.fetch_time()
        elif request_type == "MTD-BULK":
            response = ARS_CONTROLLER.fetch_mtd_bulk(body)
        else:
            response = "INVALID TYPE"

        return response
    except Exception as e:
        print("CAUGHT: Error in read_root: ", e)
        raise HTTPException(
            status_code=400, detail="Error occurred in  ARS Stock Count service."
        )


@router.get("/holdings")
async def fetch_holdings(
    request: Request, credentials: HTTPBasicCredentials = Depends(security)
):
    # Authenticate api call
    try:
        assert AUTHORIZER.authenticate(credentials)
    except AssertionError:
        raise HTTPException(
            status_code=401, detail="Request is not authorized, Token invalid"
        )
    try:
        body = await request.json()
        return ARS_CONTROLLER.fetch_holdings(body)
    except Exception as e:
        logger.exception(e)
        raise HTTPException(
            status_code=400, detail="Error occurred in  FETCH-HOLDINGS service."
        )


@router.get("/holdings-sync-validation")
async def holding_sync_validation(req: Request):
    try:
        return ARS_CONTROLLER.holding_sync_validation()
    except Exception as e:
        logger.exception(e)
        raise HTTPException(
            status_code=400, detail="Error occurred in holding_sync_validation"
        )
