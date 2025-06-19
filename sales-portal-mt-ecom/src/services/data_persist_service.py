from typing import List, Literal
from src.exceptions.data_persisting_exception import DataPersistingException
from src.utils import constants
from src.models.xml_validation_model import XmlValidationModel
from src.models.data_persist_model import PersistModel
from src.services.log_service import LogService
from src.enums.mt_ecom_status_type import MtEcomStatusType
from src.enums.customers_enum import Customers
from src.models.dto.upsert_po_key_interface import UpsertPoKey
from src.models.dto.po_dto import PoItemsDTO,PoDTO
from datetime import datetime
from src.libs.loggers import log_decorator, Logger
import math

logger = Logger("PoInwardService")
class DataPersistService:
    XML_VALIDATION_MODEL = None
    LOG_SERVICE = None
    PERSIST_MODEL = None
    logger = None

    def __init__(self):
        self.XML_VALIDATION_MODEL = XmlValidationModel()
        self.LOG_SERVICE = LogService()
        self.PERSIST_MODEL = PersistModel()

    @log_decorator
    def persist_po_key(self, order_data: PoDTO, json_file_key: str,customer:str, location = ""):
        try:
            logger.info('inside DataPersistService -> persist_po_key')
            # persist po_number and S3 file key in database
            data = UpsertPoKey(
                po_number=order_data.po_number,
                po_created_date = f"{order_data.po_created_date} {datetime.now().time()}",
                json_file_name = json_file_key,
                customer_code = order_data.customer_code,
                site_code = order_data.site_code, 
                status = MtEcomStatusType.VALIDATION_SUCCESS,
                customer = customer,
                delivery_date = order_data.delivery_date,
                others = order_data.others,
                location= location if location else "",
                po_created_timestamp = order_data.po_created_timestamp if order_data.po_created_timestamp else None
            )
            resp = self.PERSIST_MODEL.upsert_po_key([data])
            if resp:
                self.LOG_SERVICE.log_process(order_data.po_number, constants.JSON_VALIDATION_STATUS_SUCCESS,
                                             MtEcomStatusType.VALIDATION_SUCCESS)
                return resp
            else:
                self.LOG_SERVICE.log_process(order_data.po_number, constants.JSON_VALIDATION_STATUS_FAILED,
                                             MtEcomStatusType.VALIDATION_FAILED)
                raise DataPersistingException(order_data.po_number, "Failed to persist PO key")

        except Exception as e:
            logger.info("Exception in DataPersistService -> persist_po_key", e)
            raise DataPersistingException(order_data.po_number, e)

    @log_decorator
    def fetch_po_key(self, po_number: str):
        """
        Description: This method uses po_number to fetch the S3 file name from database
        Parameters:
            - po_number: str: PO number
        Return:
            - file_name: str
        """
        try:
            logger.info('inside DataPersistService -> fetch_po_key', po_number)
            return self.PERSIST_MODEL.fetch_po_key(po_number)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> fetch_po_file_name", e)
            raise DataPersistingException(po_number, e)

    @log_decorator
    def fetch_workflow_configurations(self, customer: Customers):
        try:
            logger.info(f'inside DataPersistService -> fetch_workflow_configurations for customer', customer )
            return self.PERSIST_MODEL.fetch_workflow_configurations(customer)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> fetch_workflow_configurations", e)
            raise DataPersistingException(customer, e)

    @log_decorator
    def fetch_article_details(self, order_items: List[PoItemsDTO], site_code: str, vendor_code:
    str):
        try:
            logger.info('inside DataPersistService -> fetch_article_details')
            return self.PERSIST_MODEL.fetch_article_details(order_items, site_code,
                                                            vendor_code)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> fetch_article_details", e)
            raise DataPersistingException("DataPersistService -> fetch_article_details", e)

    @log_decorator
    def update_status(self, id: int, message: str, status: MtEcomStatusType, item_number: str,
                      mrp: int = 0, caselot: int = 0):
        try:
            logger.info('inside DataPersistService -> update_status')   
            return self.PERSIST_MODEL.update_status(id, message, status, item_number, mrp, caselot)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> update_status", e)
            raise DataPersistingException(id, e)

    @log_decorator
    def get_customer_code(self, site_code: str):
        try:
            logger.info('inside DataPersistService -> get_customer_code')
            return self.PERSIST_MODEL.get_customer_code(site_code)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> get_customer_code", e)
            raise DataPersistingException(site_code, e)

    @log_decorator
    def create_logs(self, logs):
        """
        Description: This method will create a log entry in the database.
        Params:
            - data: dict{ "po_number": str, "log": str, "status": MtEcomStatusType }
        Returns:
            - bool
        """
        try:
            logger.info('inside DataPersistService -> create_logs')
            return self.PERSIST_MODEL.create_logs(logs)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> create_logs", e)
            raise DataPersistingException("create_logs service", e)

    @log_decorator
    def get_so_number(self, po_number):
        """
        Description: This method will get So Number from database for the given Po Number
        Params:
            - po_number :str
        Returns:
            - bool
        """
        try :
            logger.info('inside DataPersistService -> get_so_number')
            return self.PERSIST_MODEL.get_so_number(po_number)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> get_so_number", e)
            raise DataPersistingException("get_so_number", e)

    @log_decorator
    def save_item_details(self,order_details :PoDTO,id : str):
        """
        Description: This method will save item details in database
        Params:
            - order_details :PoDTO
        """
        try:
            logger.info('inside DataPersistService -> save_item_details')
            self.PERSIST_MODEL.save_item_details(order_details,id)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> save_item_details", e)
            raise DataPersistingException("save_item_details", e)
    
    @log_decorator
    def fetch_non_invoiced_items(self, po_number:str,id:str):
        """
        Description: This method will fetch non invoiced items for the given po_number
        Params:
            - po_number :str
        Returns:
            - bool
        """
        try :
            logger.info('inside DataPersistService -> fetch_non_invoiced_items')    
            return self.PERSIST_MODEL.fetch_non_invoiced_items(po_number,id)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> fetch_non_invoiced_items", e)
            raise DataPersistingException("fetch_non_invoiced_items", e)
    
    @log_decorator
    def update_po_status(self, id:str):
        """
        Description: This method will update the status of the given po to Invoice Success
        Params:
            - id :str
        """
        try :
            return self.PERSIST_MODEL.update_po_status(id)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> update_po_status", e)
            raise DataPersistingException("update_po_status", e)
        
    @log_decorator
    def get_invoice_status(self, data:dict):
        """
        Description: This method will check the status of the given so and item number, if invoice is created
        Params:
            - data :dict
        """
        try :
            return self.PERSIST_MODEL.get_invoice_status(data)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> get_invoice_status", e)
            raise DataPersistingException("invoice_status", e)

    @log_decorator
    def update_header_status(self, id: int, status: MtEcomStatusType):
        try:
            logger.info('inside DataPersistService -> update_header_status')
            return self.PERSIST_MODEL.update_header_status(id,status)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> update_header_status", e)
            raise DataPersistingException(id, e)

    @log_decorator     
    def save_or_update_item_details(self,data:dict):
        try:
            logger.info("inside save_or_update_item_details")
            return self.PERSIST_MODEL.save_or_update_item_details(data)
        except Exception as e:
            logger.error("EXCEPTION: DataPersistService -> save_or_update_item_details", e)
            raise DataPersistingException(data, e)
    
    @log_decorator
    def save_req_res(self, data,type,request_id: str=""):
        try:
            logger.info("inside save_req_res")
            return self.PERSIST_MODEL.save_req_res(data,type,request_id)
        except Exception as e:
            logger.error("Exception in save_mrp_req_res",e)
            raise e
    
    @log_decorator
    def update_materials(self,data:list):
        """
        Description: This method will persist the material details in the database
        Params:
            - data :list
        """
        try:
            logger.info("inside update_materials")
            return self.PERSIST_MODEL.update_materials(data)
        except Exception as e:
            logger.error("Exception in update_materials",e)
            raise e

    @log_decorator    
    def fetch_items(self, id:str):
        """
        Description: This method will fetch the items for the given id
        Params:
            - id :str
        """
        try:
            logger.info("inside fetch_items")
            return self.PERSIST_MODEL.fetch_items(id)
        except Exception as e:
            logger.error("Exception in fetch_items",e)
            raise e
   
    @log_decorator
    def update_invoice_status(self, data:dict):
        """
        Description: This method will update the invoice status in the database
        Params:
            - data :dict
        """
        try:
            logger.info("inside update_invoice_status")
            return self.PERSIST_MODEL.update_invoice_status(data)
        except Exception as e:
            logger.error("Exception in update_invoice_status",e)
            raise e

    @log_decorator  
    def convert_pieces_to_cases(self,qty:int,sku:int):
        """
        Description: This method will convert the pieces to cases
        Params:
            - qty :int
        """
        try:
            logger.info("inside convert_pieces_to_cases")
            cases = self.PERSIST_MODEL.fetch_conversion_factor(sku)
            if cases:
                return {'qty':math.floor(qty/int(cases)),"remainder": qty % int(cases)}
            else:
                return False
        except Exception as e:
            logger.error("Exception in convert_pieces_to_cases",e)
            raise e
    @log_decorator   
    def save_remaining_caselot(self,remainder:int,po_number:str,item_number:str,so_qty:int,sap_caselot:int,message:str = ''):
        """
        Description: This method will save the remaining caselot in the database
        Params:
            - remainder :int
            - po_number :str
            - item_number :str
            - so_qty :int
            - message :str
        """
        try:
            return self.PERSIST_MODEL.save_remaining_caselot(remainder,po_number,item_number,so_qty,sap_caselot,message)
        except Exception as e:
            print("Exception in save_remaining_caselot",e)
            raise e
        
    @log_decorator    
    def delete_po(self, data:dict):
        """
        Description: This method will delete the po from the database
        Params:
            - data :dict
        """
        try:
            return self.PERSIST_MODEL.delete_po(data)
        except Exception as e:
            print("Exception in delete_po",e)
            raise e
        
    @log_decorator    
    def change_po_status(self):
        """
        Description: This method will change the po status in the database
        """
        try:
            return self.PERSIST_MODEL.change_po_status()
        except Exception as e:
            print("Exception in change_po_status",e)
            raise e
        
    @log_decorator    
    def update_base_price(self, data:dict):
        """
        Description: This method will update the base price in the database
        Params:
            - data :dict
        """
        try:
            return self.PERSIST_MODEL.update_base_price(data)
        except Exception as e:
            print("Exception in update_base_price",e)
            raise e

    @log_decorator    
    def get_header_data(self,po:str):
        """
        Description: This method will get the header data from the database
        Params:
            - po :str
        """
        try:
            return self.PERSIST_MODEL.get_header_data(po)
        except Exception as e:
            print("Exception in get_header_data",e)
            raise e

    @log_decorator    
    def create_audit_logs(self,data:dict):
        """
        Description: This method will create audit logs in the database
        Params:
            - data :dict
        """
        try:
            return self.PERSIST_MODEL.create_audit_logs(data)
        except Exception as e:
            print("Exception in create_audit_logs",e)
            raise e

    @log_decorator    
    def check_vendor_code(self,vendor_code:str):
        """
        Description: This method will check the vendor code in the database
        Params:
            - site_code :str
            - article_id :str
            - vendor_code :str
        """
        try:
            return self.PERSIST_MODEL.check_vendor_code(vendor_code)
        except Exception as e:
            print("Exception in check_vendor_code",e)
            raise e
        
    @log_decorator
    def update_so_flag(self,po:str):
        """
        Description: This method will update the so flag in the database
        Params:
            - po :str 
        """
        try:
            return self.PERSIST_MODEL.update_so_flag(po)
        except Exception as e:
            logger.error("Exception in update_so_flag",e)
            raise e
        
    @log_decorator
    def get_po_copy(self,po:str):
        """
        Description: This method will get the po copy from the database
        Params:
            - po :str
        """
        try:
            return self.PERSIST_MODEL.get_po_copy(po)
        except Exception as e:
            logger.error("Exception in get_po_copy",e)
            raise e
        
    @log_decorator
    def save_invoice_headers(self,data:list):
        """
        Description: This method will save the invoice headers in the database
        Params:
            - data :list
        """
        try:
            return self.PERSIST_MODEL.save_invoice_headers(data)
        except Exception as e:
            logger.error("Exception in save_invoice_headers",e)
            raise e
    
    @log_decorator
    def save_invoice_items(self,data:list):
        """
        Description: This method will save the invoice items in the database
        Params:
            - data :list
        """
        try:
            return self.PERSIST_MODEL.save_invoice_items(data)
        except Exception as e:
            logger.error("Exception in save_invoice_items",e)
            raise e
        
    @log_decorator
    def get_po_details(self,po:str):
        """
        Description: This method will get the po details from the database
        Params:
            - po :str
        """
        try:
            return self.PERSIST_MODEL.get_po_details(po)
        except Exception as e:
            logger.error("Exception in get_po_details",e)
            raise e
        
    @log_decorator
    def insert_json_key(self,po:str,json_key:str):
        """
        Description: This method will insert the json key in the database
        Params:
            - po :str
            - json_key :str
        """
        try:
            return self.PERSIST_MODEL.insert_json_key(po,json_key)
        except Exception as e:
            logger.error("Exception in insert_json_key",e)
            raise e
    @log_decorator
    def check_maintenance(self):
        """
        Description: This method will check the maintenance in the database
        """
        try:
            logger.info("inside PersistService -> inside check_maintenance")
            return self.PERSIST_MODEL.check_maintenance()
        except Exception as e:
            logger.error("Exception in check_maintenance",e)
            raise e
        
    @log_decorator
    def get_asn_data(self,data :dict={},type:str =''):
        """
        Description: This method will get the asn data from the database
        Params:
            - data :dict
            - type :str
        """
        try:
            logger.info("inside PersistService -> inside get_asn_data")
            return self.PERSIST_MODEL.get_asn_data(data,type)
        except Exception as e:
            logger.error("Exception in get_asn_data",e)
    @log_decorator
    def get_tot_tolerance(self,customer:str):
        """
        Description: This method will get the total tolerance from the database
        Params:
            - customer :str
        """
        try:
            tolerance = self.PERSIST_MODEL.get_tot_tolerance(customer)
            return float(tolerance) if tolerance else 0
        except Exception as e:
            logger.error("Exception in get_tot_tolerance",e)
            raise e

    @log_decorator
    def update_tot(self,data:dict):
        """
        Description: This method will update the tot in the database
        Params:
            - data :dict
        """
        try:
            return self.PERSIST_MODEL.update_tot(data)
        except Exception as e:
            logger.error("Exception in update_tot",e)
            raise e

    @log_decorator
    def update_landing_price(self,data:dict):
        """
        Description: This method will update the landing price in the database
        Params:
            - data :dict
        """
        try:
            return self.PERSIST_MODEL.update_landing_price(data)
        except Exception as e:
            logger.error("Exception in update_landing_price",e)
            raise e
        
    @log_decorator
    def save_sap_data(self, data:dict):
        """
        Description: This method will save the sap mrp caselot in the database
        Params:
            - data :dict
        """
        try:
            return self.PERSIST_MODEL.save_sap_data(data)
        except Exception as e:
            logger.error("Exception in save_sap_mrp_caselot",e)
            raise e
        
    @log_decorator
    def get_so_req_res(self, po:str):
        """
        Description: This method will get the so request response from the database
        Params:
            - po :str
        """
        try:
            return self.PERSIST_MODEL.get_so_req_res(po)
        except Exception as e:
            logger.error("Exception in get_so_req_res",e)
            raise e