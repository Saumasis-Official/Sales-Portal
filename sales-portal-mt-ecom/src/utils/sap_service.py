import requests
from requests.auth import HTTPBasicAuth
import json
import src.utils.constants as constants
from src.config.configurations import SAP, SAP_URLS
from src.models.po_processing_so_creation_model import PoProcessingSoCreationModel
from src.libs.loggers import  Logger
from src.models.mt_ecom_model import MTECOMModel
from datetime import datetime
sap_mrp_and_caselot_check_url = SAP.get('SAP_MRP_CASELOT_CHECK_URL')
so_creation_url = SAP.get('SAP_SO_CREATION_URL')
sap_mrp2_check_url = SAP.get('SAP_MRP2_CHECK_URL')
sap_so_details_url = SAP.get('SAP_SO_DETAILS_URL')
sap_get_amendment_url = SAP.get('SAP_GET_AMENDMENT_DETAILS')
sap_create_amendment = SAP.get('SAP_CREATE_AMENDMENT')
sap_so_sync_url = SAP.get('SAP_MT_ECOM_SO_SYNC')
po_processing_so_creation_model = PoProcessingSoCreationModel()
logger = Logger("SapService")
mt_ecom_model = MTECOMModel()
class SapService:
    def __init__(self):
        self.sap_invoice_creation_url = SAP_URLS.get('INVOICE_CREATION')

    def mrp_and_caselot_check(self, data):
        try:
            price_check_response = requests.post(sap_mrp_and_caselot_check_url,data = json.dumps(data), headers=constants.HEADERS)
            return price_check_response
        except Exception as e:
            print("Exception in mrp_and_caselot_check",e)
            raise e
    def create_so(self, data,po_number): 
        flag = po_processing_so_creation_model.get_so_status(po_number)[0].get('so_flag')
        try:
            if not flag:
                po_processing_so_creation_model.update_so_status(po_number)
                so_response = requests.post(so_creation_url,data = json.dumps(data), headers=constants.HEADERS)
            return so_response
        except Exception as e:
            print("Exception in create_so",e)
            raise e
    def mrp_check_2(self, data):
        try:
            price_check_response = requests.post(sap_mrp2_check_url,data = json.dumps(data), headers=constants.HEADERS)
            return price_check_response
        except Exception as e:
            print("Exception in mrp_check_2",e)
            raise e
    def get_sale_order_details(self, data):
        try:
            response = requests.post(sap_so_details_url,data=json.dumps(data), headers=constants.HEADERS)
            return response
        except Exception as e:
            print("Exception in get_saleorder_details",e)
            raise e
    def get_amendment_details(self, data):
        try:
            url = sap_get_amendment_url + '/' +data.get('po_number')
            response = requests.get(url=url, headers=constants.HEADERS)
            return response
        except Exception as e:
            print("Exception in get_amendment_details",e)
            return False
    def create_amendment(self,data):
        try:
            response = requests.post(sap_create_amendment,data=json.dumps(data), headers=constants.HEADERS)
            return response
        except Exception as e:
            print("Exception in create amendment",e)
            return False
        
    def so_sync(self, customer_code,sync_date,user_id):
        try:
            params = {'customerCode':customer_code,'date':sync_date}
            response = requests.get(sap_so_sync_url,params=params, headers=constants.HEADERS)
            if response and response.status_code == 200 :
                logger.info("Inside SapService.so_sync status", response.status_code)
                return response
            else :
                logger.error("Error in SapService.so_sync status", response.status_code)
                logger.error("Error in SapService.so_sync response", response.json())

                mt_ecom_model.sync_logs({
                            'type' : "MT ECOM SO Sync",
                            'run_at' : datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            'status' : 'FAIL',
                        }, True, user_id)
                return response
        except Exception as e:
            logger.error("Exception in SapService.so_sync", e)
            mt_ecom_model.sync_logs({
                            'type' : "MT ECOM SO Sync",
                            'run_at' : datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            'status' : 'FAIL',
                        }, True, user_id)
            raise e
        