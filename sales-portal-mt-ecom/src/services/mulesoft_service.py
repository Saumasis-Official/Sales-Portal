import requests
from requests.auth import HTTPBasicAuth
import json
import src.utils.constants as constants
from src.config.configurations import MULESOFT
from src.models.mt_ecom_model import MTECOMModel
from datetime import datetime
from src.models.dto.so_dto import SoDTO
from src.exceptions.so_sap_exception import SOCreationException
from src.exceptions.so_sap_validation_exception import SOValidationException
from src.models.dto.validation_dto import ValidationDTO
from src.libs.loggers import log_decorator, Logger
mt_ecom_model = MTECOMModel()
logger = Logger("MulesoftService")

client_id = MULESOFT.get('MULESOFT_CLIENT_ID')
client_secret = MULESOFT.get('MULESOFT_CLIENT_SECRET')
mulesoft_base_url = MULESOFT.get('MULESOFT_BASE_URL')
shopify_base_url = MULESOFT.get('MULESOFT_SHOPIFY_BASE_URL')
shopify_client_id = MULESOFT.get('MULESOFT_SHOPIFY_CLIENT_ID')
shopify_client_secret = MULESOFT.get('MULESOFT_SHOPIFY_CLIENT_SECRET')
headers = constants.HEADERS
headers.update({'client_id': client_id, 'client_secret': client_secret, 'x-transaction-id': '1234', 'x-source-system': 'Order Management'})

class MulesoftService:
    logger = None
    
    @log_decorator
    def so_sync(self, customer_code,date,user_id):
        try:
            url = mulesoft_base_url + f'/sap/soSync?customer={customer_code}&createdOn={date}'
            response = requests.get(url, headers=headers)
            if response and response.status_code == 200 :
                return response
            else :
                logger.error("Error in MulesoftService.so_sync status", response.status_code)
                logger.error("Error in MulesoftService.so_sync response", response.json())

                mt_ecom_model.sync_logs({
                            'type' : "MT ECOM SO Sync",
                            'run_at' : datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            'status' : 'FAIL',
                        }, True, user_id)
                return response
        except Exception as e:
            logger.error("Exception in MulesoftService.so_sync", e)
            mt_ecom_model.sync_logs({
                            'type' : "MT ECOM SO Sync",
                            'run_at' : datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            'status' : 'FAIL',
                        }, True, user_id)
            raise e
    
    @log_decorator
    def so_creation(self, so_payload :SoDTO):
        try:
            # logger.info("MulesoftService -> so_creation ")
            url = mulesoft_base_url + '/sap/soCreation'
            response = requests.post(url, headers=headers,data=json.dumps(so_payload.model_dump()))
            if response and response.status_code == 201 :
                return response
            else :
                print("Error in MulesoftService.so_creation response", response.status_code, response)
                # Log and save in datebase
                return response
        except Exception as e:
            logger.error("EXCEPTION: in Mulesoft_service -> sap_so_creation", e)
            raise SOCreationException(so_payload,e)

    @log_decorator     
    def so_validation_check(self, data :ValidationDTO):
        try:
            logger.info("MulesoftService -> so_validation_check ")
            url = mulesoft_base_url + '/sap/soValidation'
            response = requests.post(url, headers=headers,data=json.dumps(data.model_dump()))
            if response and response.status_code == 201 :
                return response
            else :
                print("Error in MulesoftService-> soValidation response", response.status_code, response)
                # Log and save in datebase

                return response
        except Exception as e:
            logger.error("EXCEPTION: in Mulesoft_service -> SOValidationException", e)
            raise SOValidationException(data,e)
        
    @log_decorator
    def invoice_sync(self, data:dict):
        try:
            logger.info("MulesoftService -> invoice_sync ")
            url = mulesoft_base_url + '/sap/invCreation'
            response = requests.post(url, headers=headers, data=json.dumps(data))
            if response and response.status_code == 201 :
                return response
        except Exception as e:
            logger.error("Exception in MulesoftService.invoice_sync", e)
            raise e
    
    @log_decorator
    def asn(self, data:dict,customer:str,location:str = ''):
        try:
            logger.info("MulesoftService -> asn ")
            url = mulesoft_base_url + '/asn'
            params = {'customer':customer,'location':location}
            response = requests.post(url, headers=headers, data=json.dumps(data),params=params)
            if response and response.status_code == 201 :
                return response
            else:
                print("Error in MulesoftService.asn response", response.status_code)
                return False
        except Exception as e:
            logger.error("Exception in MulesoftService.asn", e)
            raise e
        
    @log_decorator
    def shopify_so_creation(self, payload:dict):
        try:
            logger.info("MulesoftService -> shopify_so_creation ")
            url = shopify_base_url + '/soCreation'
            headers.update({'client_id': shopify_client_id, 'client_secret': shopify_client_secret, 'x-transaction-id': '1234', 'x-source-system': 'Order Management'})
            response = requests.post(url, headers=headers, data=json.dumps(payload))
            return response
        except Exception as e:
            logger.error("Exception in MulesoftService.shopify_so_creation", e)
            raise e
    
    @log_decorator
    def invoice(self, data:dict,customer:str,location:str):
        try:
            logger.info("MulesoftService -> invoice ")
            url = mulesoft_base_url + '/invoice'
            params = {'customer':customer,'location':location}
            print(data)
            response = requests.post(url, headers=headers, data=json.dumps(data),params=params)
            if response and response.status_code == 201 :
                return response
            else :
                print("Error in MulesoftService.invoice response", response.status_code)
                return False
        except Exception as e:
            logger.error("Exception in MulesoftService.invoice", e)
            raise e
        
    @log_decorator
    def acknowledgement(self, data:dict,customer:str,location:str):
        try:
            logger.info("MulesoftService -> acknowledgement ")
            url = mulesoft_base_url + '/ack'
            params = {'customer':customer,'location':location}
            response = requests.post(url, headers=headers, data=json.dumps(data),params=params)
            if response and response.status_code == 201 :
                return response.json()
        except Exception as e:
            logger.error("Exception in MulesoftService.acknowledgement", e)
            raise e
        
    @log_decorator
    def resend_po(self, file_name:str):
        try:
            logger.info("MulesoftService -> resend_po ")
            url = shopify_base_url + f'/fetchPoFile?fileName={file_name}'
            headers.update({'client_id': shopify_client_id, 'client_secret': shopify_client_secret, 'x-transaction-id': '1234', 'x-source-system': 'Order Management'})
            response = requests.get(url, headers=headers)
            if response and response.status_code == 200 :
                return response
            else :
                return False
        except Exception as e:
            logger.error("Exception in MulesoftService.resend_po", e)
            raise e