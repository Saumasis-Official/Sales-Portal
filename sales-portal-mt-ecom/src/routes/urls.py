import sys
from fastapi import APIRouter, Request, File, UploadFile,Form
from src.utils.helper import HelperClass
from io import BytesIO
router = APIRouter()
from src.controllers.xml_validation_controller import XmlValidationController
from src.controllers.po_processing_so_creation_controller import PoProcessingSoCreationController
from src.controllers.invoice_price_check_controller import InvoicePriceCheckController
from src.utils.error_helper import ErrorHelper
from src.controllers.mt_ecom_controller import MTECOMController
from fastapi import HTTPException
from src.utils.database_helper import DatabaseHelper
from src.libs.loggers import Logger


xml_validation_controller = XmlValidationController()
po_processing_so_creation_controller = PoProcessingSoCreationController()
invoice_price_check_controller = InvoicePriceCheckController()
mt_ecom_controller = MTECOMController()
helper = HelperClass()
error_helper = ErrorHelper()
database_helper = DatabaseHelper()
logger = Logger('PO_URLS')

@router.get("/hc-index")
async def health_check(request: Request):
    resp = database_helper.is_connected()
    pyton_version = sys.version
    if resp:
        return f"""Welcome to MT_ECOM API. PYTHON VERSION: {pyton_version}"""
    else:
        raise HTTPException(status_code=500, detail = 'Internal Server Error')
@router.post("/validate-po")
async def validate_po(request: Request):
    xml_content = await request.body()
    response = xml_validation_controller.validate_xml(xml_content)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)
# Backend API for PO Processing and SO Creation for Reliance
@router.post("/po-processing-so-creation")
async def po_processing_so_creation(request: Request):
    data = await request.body()
    response = po_processing_so_creation_controller.po_processing_so_creation(data)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)
@router.get("/invoice-price-check")
async def invoice_price_check(request: Request):
    params = dict(request.query_params)
    debug = params.get('debug', False)
    po_number = params.get('po_number', None)
    response = invoice_price_check_controller.check_invoice_price(debug,po_number)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)
@router.post("/sap-invoice-price-check")
async def sap_invoice_price_check(request: Request):
    data = await request.body()
    response = invoice_price_check_controller.sap_check_invoice_price(data)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)
@router.get("/reports")
async def invoice_price_check(request: Request):
    response = mt_ecom_controller.mt_ecom_reports()
    if response:
        return helper.get_response_object('Reports sent successfully')
    else:
        raise HTTPException(status_code=400, detail = 'Error in edi_daily_reports')
@router.post("/mt-ecom-upload")
async def mt_ecom_upload(file:UploadFile = File(...) ,user_id: str = Form(...)):
    data = BytesIO(await file.read())
    response = mt_ecom_controller.mt_ecom_upload(data,user_id)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    if response:
        return helper.get_response_object({'Success':'File uploaded successfully','data':response})
    else:
        return helper.get_response_object({'Failed':'Error in File Format'})

# For listing po header data
@router.post("/mt-ecom-poList")
async def po_processing_so_creation(request: Request):
    data = await request.body()
    response = mt_ecom_controller.get_mt_ecom_po_list(data)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)

# For PO Item data
@router.post("/mt-ecom-poItem")
async def po_processing_so_creation(request: Request):
    data = await request.body()
    response = mt_ecom_controller.get_mt_ecom_po_details(data)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)

# For RDD item data
@router.post("/mt-ecom-rdd-list")
async def rdd_list(request: Request):
    data = await request.body()
    response = mt_ecom_controller.get_mt_ecom_rdd_list(data)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)

#For getting Customer data

@router.post("/mt-ecom-customer-list")
async def customer_type(request: Request):
    data = await request.body()
    response = mt_ecom_controller.get_mt_ecom_customer_list(data)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)

#For adding/updating Customer data

@router.post("/mt-ecom-add-customer")
async def customer_type(request: Request):
    data = await request.body()
    response = mt_ecom_controller.add_update_customer(data)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)


#For submitting RDD

@router.post("/mt-ecom-add-rdd")
async def add_rdd(request:Request):
    data = await request.body()
    response = mt_ecom_controller.add_update_rdd(data)
    if len(response) > 0:
        raise HTTPException(status_code=400, detail = 'Error while creating RDD for the following SO ' + ', '.join(response))
    else:
        return helper.get_response_object(response)
#For getting submitted RDD data

@router.get("/mt-ecom-rdd-item-list/{limit}/{offset}/{po_number}")
async def rdd_item_list (request: Request):
    response = mt_ecom_controller.get_mt_ecom_rdd_item_list(request.path_params)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)

#For getting Customer workflow data

@router.get("/mt-ecom-customer-workflow-list/{limit}/{offset}")
async def customer_type(request: Request):
    response = mt_ecom_controller.get_mt_ecom_customer_workflow_list(request.path_params)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)

#For adding/updating Customer workflow data

@router.post("/mt-ecom-add-customer-workflow")
async def customer_type(request: Request):
    data = await request.body()
    response = mt_ecom_controller.add_update_customer_workflow(data)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)

@router.get("/mt-ecom-customer-workflow/{customer_name}/{user_id}")
async def customer_type(request: Request):
    response = mt_ecom_controller.get_mt_ecom_customer_workflow(request.path_params)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)


@router.get("/mt-ecom-so-sync/{user_id}")
async def so_sync(request: Request):
    response = mt_ecom_controller.so_sync(request.path_params)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)

@router.post("/mt-ecom-customer-codes")
async def customer_codes(request: Request):
    data = await request.body()
    response = mt_ecom_controller.customer_codes(data)
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)


@router.post("/mt-ecom-add-kams")
async def addUpdateKams(request: Request):
    data = await request.body()
    response = mt_ecom_controller.add_update_kams(data)
    # return True
    if 'message' not in response and len(response):
        raise HTTPException(status_code=400, detail = 'Error while adding KAMS for the following Mails ' + ', '.join(response))
    return helper.get_response_object(response)
@router.post("/mt-ecom-get-kams")
async def getKamsData(request: Request):
    data = await request.body()
    response = mt_ecom_controller.getKamsData(data)
    # return True
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)

@router.post("/mt-ecom-retrigger-so")
async def retrigger(request: Request):
    data = await request.body()
    response = mt_ecom_controller.retrigger(data)
    # return True
    if error_helper.has_errors():
        return helper.send_error_response(error_helper.get_errors(), 400)
    return helper.get_response_object(response)

@router.get("/sync-iso-state")
async def sync_iso_state(request: Request):
    try:
        logger.info("sync_iso_state request")
        response = mt_ecom_controller.sync_iso_state()   
        return response
    except Exception as e:
        logger.error("Exception in urls -> mt_ecom_iso_state", e)
        return {"success": "failure", "error": e}

@router.get("/mt-ecom-rdd-sync")
async def rdd_sync(request: Request):
    try:
        params = dict(request.query_params)
        logger.info("rdd_sync request", params)
        response = mt_ecom_controller.rdd_sync(params)     
        return response
    except Exception as e:
        logger.error("Exception in urls -> mt_ecom_rdd_sync", e)
        return {"success": "failure", "error": e}
    
@router.post("/mt-ecom-edit-kams")
async def edit_kams_data(request: Request):
    try:
        data = await request.body()
        logger.info("edit_kams_data request", data)
        response = mt_ecom_controller.edit_kams_data(data)     
        return response
    except Exception as e:
        logger.error("Exception in urls -> mt_ecom_rdd_sync", e)
        return {"success": "failure", "error": e}
    
@router.post("/mt-tot-tolerance")
async def tot_tolerance(request: Request):
    try:
        data = await request.body()
        logger.info("tot_tolerance request", data)
        response = mt_ecom_controller.tot_tolerance(data)     
        return response
    except Exception as e:
        logger.error("Exception in urls -> tot_tolerance", e)
        return {"success": "failure", "error": e}