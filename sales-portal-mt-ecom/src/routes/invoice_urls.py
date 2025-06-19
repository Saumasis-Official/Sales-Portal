import json
from fastapi import FastAPI, APIRouter, Request, status
from fastapi.responses import JSONResponse
from src.controllers.invoice_controller import InvoiceController
from src.utils.response_handlers import ResponseHandlers
from src.enums.success_message import SuccessMessage
from src.enums.error_message import ErrorMessage
from src.libs.loggers import log_decorator, Logger

logger = Logger("InvoiceUrls")
INVOICE_CONTROLLER = InvoiceController()
RESPONSE_TEMPLATE = ResponseHandlers()

router = APIRouter()
#Creation of sap payload
@router.get("/create-invoice-payload")
async def invoice_payload(request: Request):
    try:
        params = dict(request.query_params)
        response = INVOICE_CONTROLLER.create_invoice_payload(params)
        print("inside invoice_urls -> invoice_payload")
        return {"status": "success", "data": response}
    except Exception as e:
        logger.error("inside invoice_urls -> invoice_payload, Error: ", e)
        json_response = RESPONSE_TEMPLATE.internal_server_error()
        return JSONResponse(status_code= status.HTTP_500_INTERNAL_SERVER_ERROR, content=json_response)
    
#Processing invoice from sqs
@router.post("/invoice-processing")
async def invoice_processing(request: Request):
    try:
        data = await request.body()
        response = INVOICE_CONTROLLER.invoice_processing(data)
        logger.info("inside invoice_urls -> invoice_processing")
        return JSONResponse(status_code= status.HTTP_200_OK, content=response)
    except Exception as e:
        logger.error("inside invoice_urls -> invoice_processing, Error: ", e)
        json_response = RESPONSE_TEMPLATE.internal_server_error()
        return JSONResponse(status_code= status.HTTP_500_INTERNAL_SERVER_ERROR, content=json_response)
    
@router.post("/invoice-sync")
async def mulesoft_invoice_sync(request: Request):
    try:
        data = await request.body()
        response = INVOICE_CONTROLLER.mulesoft_invoice_sync(data)
        logger.info("inside invoice_urls -> mulesoft_invoice_sync")
        if response:
            return JSONResponse(status_code= status.HTTP_200_OK, content= {"message" : SuccessMessage.INVOICE_SYNC_SUCCESS ,"status" :status.HTTP_200_OK} )
        return JSONResponse(status_code= status.HTTP_400_BAD_REQUEST, content= {"message" : ErrorMessage.INVOICE_SYNC_FAIL ,"status" :status.HTTP_400_BAD_REQUEST})
    except Exception as e:
        logger.error("inside invoice_urls -> mulesoft_invoice_sync, Error: ", e)
        json_response = RESPONSE_TEMPLATE.internal_server_error()
        return JSONResponse(status_code= status.HTTP_500_INTERNAL_SERVER_ERROR, content=json_response)
    
@router.post("/asn-download")
async def asn_download(request: Request):
    try:
        data = await request.body()
        response = INVOICE_CONTROLLER.asn_download(data)
        logger.info("inside invoice_urls -> asn_download")
        return response
    except Exception as e:
        logger.error("inside invoice_urls -> asn_download, Error: ", e)
        json_response = RESPONSE_TEMPLATE.internal_server_error()
        return JSONResponse(status_code= status.HTTP_500_INTERNAL_SERVER_ERROR, content=json_response)