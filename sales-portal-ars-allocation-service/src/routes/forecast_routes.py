from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.security import (
    HTTPBasicCredentials,
    HTTPBasic,
    HTTPBearer,
)

from src.controller.ars_controller import ArsController
from src.enums.forecast_dump_method import ForecastDumpMethod
from src.libs.authorizer import Authorizer
from src.libs.request_validation import (
    PhasingRequest,
    SyncRequest,
    SyncRequestBody,
    PostProgramApi,
    UniformForecastPhasing,
)

router = APIRouter()
security = HTTPBasic()
security_bearer = HTTPBearer()

AUTHORIZER = Authorizer()
ARS_CONTROLLER = ArsController()


@router.get("/phasing")
async def read_phasing(
    request: PhasingRequest = Depends(),
    credentials: HTTPBasicCredentials = Depends(security),
):
    # Authenticate api call
    try:
        assert AUTHORIZER.authenticate(credentials)
    except AssertionError:
        return "Request is not authorized, Token invalid"

    area_code = request.area_id
    customer_group = request.customer_group

    return ARS_CONTROLLER.fetch_phasing(area_code, customer_group)


@router.post("/ars-sync")
async def sync_phasing(
    query_params: SyncRequest = Depends(),
    body: SyncRequestBody = Body(...),
    credentials: HTTPBasicCredentials = Depends(security),
):
    """
    Synchronize phasing data with the ARS service.
    """
    try:
        assert AUTHORIZER.authenticate(credentials)
    except AssertionError:
        raise HTTPException(
            status_code=401, detail="Request is not authorized, Token invalid"
        )

    sync_jobs = (
        query_params.sync_type.split(",")
        if query_params.sync_type is not None
        else ["phasing", "monthly_sales", "sales_allocation"]
    )
    area_codes = (
        query_params.area_codes.split(",")
        if query_params.area_codes is not None
        else None
    )
    customer_groups = (
        query_params.customer_groups.split(",")
        if query_params.customer_groups is not None
        else None
    )
    execute_post_program_apis = (
        query_params.execute_post_program_apis
        if query_params.execute_post_program_apis is not None
        else True
    )
    forecast_dump_method: ForecastDumpMethod = query_params.forecast_dump_method
    remove_deleted_customers = query_params.remove_deleted_customers
    forecast_month = query_params.forecast_month
    sales_type = query_params.sales_type
    sales_months = body.sales_months
    weightages = body.weightages
    db_codes = body.db_codes

    if forecast_dump_method != ForecastDumpMethod.PREV_MONTH_ADJ and (
        weightages is None or not bool(weightages)
    ):
        return {"message": "Weightage can not be empty in this case"}

    if "sales_allocation" in sync_jobs:
        ARS_CONTROLLER.sales_allocation(
            req_area_codes=area_codes,
            forecast_month=forecast_month,
            forecast_dump_method=forecast_dump_method,
            remove_deleted_customers=remove_deleted_customers,
            sales_months=sales_months,
            weightages=weightages,
            db_codes=db_codes,
            sales_type=sales_type,
        )

    if "monthly_sales" in sync_jobs:
        ARS_CONTROLLER.monthly_sales(
            req_area_codes=area_codes,
            sales_months=sales_months,
            remove_deleted_customers=remove_deleted_customers,
            db_codes=db_codes,
            sales_type=sales_type,
        )

    if "phasing" in sync_jobs:
        ARS_CONTROLLER.phasing(
            req_area_codes=area_codes,
            req_customer_groups=customer_groups,
            phasing_for_month=forecast_month,
        )

    if execute_post_program_apis:
        ARS_CONTROLLER.post_program_apis()

    return {"message": "Sync successful"}


@router.get("/forecast-dump-post-program-apis")
async def forecast_dump_post_program_apis(
    request: PostProgramApi = Depends(),
    credentials: HTTPBasicCredentials = Depends(security),
):
    try:
        assert AUTHORIZER.authenticate(credentials)
    except AssertionError:
        raise HTTPException(
            status_code=401, detail="Request is not authorized, Token invalid"
        )

    applicable_month = request.forecast_month
    stock_norm_sync = request.stock_norm_sync
    forecast_total_sync = request.forecast_total_sync
    forecast_allocation_sync = request.forecast_allocation_sync

    ARS_CONTROLLER.post_program_apis(
        applicable_month=applicable_month,
        stock_norm_sync=stock_norm_sync,
        forecast_total_sync=forecast_total_sync,
        forecast_allocation_sync=forecast_allocation_sync,
    )
    return {"message": applicable_month}


@router.post("/uniform-forecast-phasing")
async def uniform_forecast_phasing(
    data: UniformForecastPhasing, credentials=Depends(security)
):
    try:
        assert AUTHORIZER.authenticate(credentials)
    except AssertionError:
        raise HTTPException(
            status_code=401, detail="Request is not authorized, Token invalid"
        )
    ARS_CONTROLLER.update_forecast_phasing(data)
    return {"Success": True}
