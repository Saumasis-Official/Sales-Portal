import json
from fastapi import APIRouter, Request, status,File, Form, UploadFile
from src.controllers.po_controller import PoController
from src.libs.loggers import Logger
from src.utils.helper import HelperClass
from typing import Optional
router = APIRouter()

PO_CONTROLLER = PoController()
logger = Logger('PO_URLS')
helper = HelperClass()

@router.post("/po-creation")
async def po_creation(request: Request,pdf: Optional[UploadFile] = File(None),csv: Optional[UploadFile] = File(None),
    data: Optional[str] = Form(None)):
    try:
        response = ''
        if pdf or csv:
            response = await PO_CONTROLLER.po_receiver(request,pdf,csv)
            logger.info("po_creation response", response)
        else:
            response = await PO_CONTROLLER.po_receiver(request)
            logger.info("po_creation response", response)
        if response:
            return {"status": "success", "data": response}
        else:
            return {"status": "failure", "data": response}
    except Exception as e:
        logger.error("Exception in po_urls -> po_inward: ", e)
        return {"status": "fail", "error": e}


@router.post("/so-creation")
async def so_creation(request: Request):
    try:
        body = await request.body()
        payload = json.loads(body)
        logger.info("so_creation request", payload)
        response = PO_CONTROLLER.so_creation(payload)
        return {"status": "success", "data": response}
    except Exception as e:
        logger.error("Exception in po_urls -> so_creation", e)
        return {"success": "failure", "error": e}

@router.post("/mt-ecom-reports")   
async def mt_ecom_download_reports(request: Request):
    try:
        body = await request.body()
        payload = json.loads(body)
        logger.info("mt_ecom_download_reports request", payload)
        response = await PO_CONTROLLER.mt_ecom_download_reports(payload)     
        return response
    except Exception as e:
        logger.error("Exception in po_urls -> mt_ecom_download_reports", e)
        return {"success": "failure", "error": e}
    

@router.post("/export-po-data")   
async def export_po_data(request: Request):
    try:
        body = await request.body()
        payload = json.loads(body)
        logger.info("mt_ecom_download_reports request", payload)
        response = await PO_CONTROLLER.export_po_data(payload)     
        return response
    except Exception as e:
        logger.error("Exception in po_urls -> mt_ecom_download_reports", e)
        return {"success": "failure", "error": e}    
    
@router.get("/delete-po")   
async def export_po_data(request: Request):
    try:
        params = dict(request.query_params)
        logger.info("export_po_data request", params)
        response = await PO_CONTROLLER.delete_po(params)     
        return response
    except Exception as e:
        logger.error("Exception in po_urls -> export_po_data", e)
        return {"success": "failure", "error": e}  
    
@router.get("/mt-ecom-download-po")   
async def mt_ecom_download_po(request: Request):
    try:
        params = dict(request.query_params)
        logger.info("mt_ecom_download_po request", params)
        response = await PO_CONTROLLER.mt_ecom_download_po(params) 
        if response and "error" in response:
            return {"status": "failure", "error": response["error"],"status_code":status.HTTP_400_BAD_REQUEST,"message" : "Failed to Download PO Copy"} 
        return {"status": "success", "data": response,"status_code":status.HTTP_200_OK,"message" : "PO Copy Downloaded Successfully"}
    except Exception as e:
        logger.error("Exception in po_urls -> mt_ecom_download_po", e)
        return {"status": "failure", "error": e,"status_code":status.HTTP_400_BAD_REQUEST,"message" : "Failed to Download PO Copy"} 
    
@router.get("/mt-ecom-download-po-details")   
async def mt_ecom_download_po_details(request: Request):
    try:
        params = dict(request.query_params)
        logger.info("mt_ecom_download_po_details request", params)
        response = await PO_CONTROLLER.mt_ecom_download_po_details(params) 
        if response and "error" in response:
            return {"status": "failure", "error": response["error"],"status_code":status.HTTP_400_BAD_REQUEST,"message" : "Failed to Download PO Details"} 
        return {"status": "success", "data": response,"status_code":status.HTTP_200_OK,"message" : "PO Details Downloaded Successfully"}
    except Exception as e:
        logger.error("Exception in po_urls -> mt_ecom_download_po_details", e)
        return {"status": "failure", "error": e,"status_code":status.HTTP_400_BAD_REQUEST,"message" : "Failed to Download PO Details"} 

@router.get("/download-so-req-res")   
async def mt_ecom_download_so_req_res(request: Request):
    try:
        params = dict(request.query_params)
        logger.info("mt_ecom_download_so_req_res request", params)
        response = await PO_CONTROLLER.mt_ecom_download_so_req_res(params) 
        if response and "error" in response:
            return {"status": "failure", "error": response["error"],"status_code":status.HTTP_400_BAD_REQUEST,"message" : "Failed to Download SO Req Res"} 
        return {"status": "success", "data": response,"status_code":status.HTTP_200_OK,"message" : "SO Req Res Downloaded Successfully"}
    except Exception as e:
        logger.error("Exception in po_urls -> mt_ecom_download_so_req_res", e)
        return {"status": "failure", "error": e,"status_code":status.HTTP_400_BAD_REQUEST,"message" : "Failed to Download SO Req Res"} 