import json
from fastapi import APIRouter, Request, status,HTTPException
from src.controllers.shopify_controller import ShopifyController
from src.libs.loggers import Logger
router = APIRouter()

SHOPIFY_CONTROLLER = ShopifyController()
logger = Logger('Shopify Urls')

@router.post("/shopify-req-res")
async def sap_request_response_payload(request: Request):
    try:
        body = await request.body()
        params = dict(request.query_params)
        payload = json.loads(body)
        logger.info("sap_request_response_payload request", params.get('type'))
        response = SHOPIFY_CONTROLLER.sap_request_response_payload(payload,params)
        return response
    except Exception as e:
        logger.error("Exception in shopify_urls -> sap_request_response_payload", e)
        return {"success": "failure", "error": e}
    
@router.post("/shopify-po-list")
async def po_list(request: Request):
    try:
        body = json.loads(await request.body())
        response = SHOPIFY_CONTROLLER.po_list(body)
        return response
    except Exception as e:
        logger.error("Exception in shopify_urls -> po_list", e)
        return {"success": "failure", "error": e}

@router.get("/shopify-po-items")
async def po_items(request: Request):
    try:
        params = dict(request.query_params)
        response = SHOPIFY_CONTROLLER.po_items(params)
        return response
    except Exception as e:
        logger.error("Exception in shopify_urls -> po_list", e)
        return {"success": "failure", "error": e}
    
@router.post("/shopify-reports")
async def shopify_reports(request: Request):
    try:
        body = json.loads(await request.body())
        logger.info("shopify_reports request", body)
        response = SHOPIFY_CONTROLLER.shopify_reports(body)
        return response
    except Exception as e:
        logger.error("Exception in shopify_urls -> shopify_reports", e)
        return {"success": "failure", "error": e}
 
@router.post("/z-table-reports")
async def z_table_reports(request: Request):
    try:
        body = json.loads(await request.body())
        logger.info("z_table_reports request", body)
        response = SHOPIFY_CONTROLLER.z_table_reports(body)
        return response
    except Exception as e:
        logger.error("Exception in shopify_urls -> z_table_reports", e)
        return {"success": "failure", "error": e}
    
@router.post("/all-shopify-customers")
async def all_shopify_customers(request: Request):
    try:
        body = json.loads(await request.body())
        response = SHOPIFY_CONTROLLER.fetch_all_shopify_customers(body)
        if response and len(response) > 0:
            return {"success": 200, "data": response}
        else:
            raise HTTPException(status_code=400, detail = 'Error in all_shopify_customers')
    except Exception as e:
        logger.error("Exception in shopify_urls -> fetch_all_shopify_customers", e)
        raise HTTPException(status_code=500, detail=e)
    

@router.get("/ror-reports")
async def ror_reports(request: Request):
    try:
        response = SHOPIFY_CONTROLLER.ror_reports()
        if response and len(response) > 0:
            return {"success": 200, "data": response}
        else:
            raise HTTPException(status_code=400, detail = 'Error in ror_reports')
    except Exception as e:
        logger.error("Exception in shopify_urls -> ror_reports", e)
        raise HTTPException(status_code=500, detail=e)
    
@router.post("/delete-items")
async def delete_items(request: Request):
    try:
        body = json.loads(await request.body())
        response = await SHOPIFY_CONTROLLER.delete_items(body)
        if response and len(response) > 0:
            return {"success": 200, "data": response}
        else:
            raise HTTPException(status_code=400, detail = 'Error in ror_reports_by_date')
    except Exception as e:
        logger.error("Exception in shopify_urls -> ror_reports_by_date", e)
        raise HTTPException(status_code=500, detail=e)

@router.get("/resend-po")
async def resend_po(request: Request):
    try:
        params = dict(request.query_params)
        response = SHOPIFY_CONTROLLER.resend_po(params)
        return response
    except Exception as e:
        logger.error("Exception in shopify_urls -> resend_po", e)
        return {"success": "failure", "error": e}
