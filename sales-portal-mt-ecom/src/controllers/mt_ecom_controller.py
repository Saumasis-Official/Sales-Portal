from src.services.mt_ecom_service import MTECOMService
from src.services.log_service import LogService
import json
from src.utils import constants
from src.controllers.po_controller import PoController
from src.controllers.po_processing_so_creation_controller import PoProcessingSoCreationController
from src.libs.loggers import log_decorator, Logger
from src.models.data_persist_model import PersistModel

mt_ecom_service = MTECOMService()
po_controller = PoController()
po_processing_so_creation_controller = PoProcessingSoCreationController()
logger = Logger("MTECOMController")
data_persist_model = PersistModel()

class MTECOMController:
    @log_decorator
    def get_mt_ecom_po_list(self, data):
        try:
            return mt_ecom_service.get_mt_ecom_po_list(data)
        except Exception as e:
            logger.error(e)
            return False
        
    @log_decorator
    def get_mt_ecom_po_details(self, data):
        try:
            return mt_ecom_service.get_mt_ecom_po_details(data)
        except Exception as e:
            logger.error(e)
            return False
        
    @log_decorator
    def mt_ecom_reports(self):
        try:
            response = mt_ecom_service.mt_ecom_reports()
            if response :
                LogService.insert_sync_log("MTECOM_ORDER_REPORT","SUCCESS",None,None,None,True)
            return response
        except Exception as e:
            logger.error(e)
            LogService.insert_sync_log("MTECOM_ORDER_REPORT","FAIL",None,None,str(e),True)
            return False

    @log_decorator 
    def mt_ecom_upload(self, data,user_id):
        try:
            return mt_ecom_service.mt_ecom_upload(data,user_id)
        except Exception as e:
            logger.error(e)
            return False

    @log_decorator
    def get_mt_ecom_rdd_list(self,data):
        try:
            return mt_ecom_service.get_mt_ecom_rdd_list(data)
        except Exception as e:
            logger.error(e)
            return False
    
    @log_decorator
    def get_mt_ecom_customer_list(self,data):
        try:
            return mt_ecom_service.get_mt_ecom_customer_list(data)
        except Exception as e:
            logger.error(e)
            return False
        
    @log_decorator
    def add_update_customer(self,data):
        try:
            return mt_ecom_service.add_update_customer(data)
        except Exception as e:
            logger.error(e)
            return False
        
    @log_decorator
    def add_update_rdd(self,data):
        try:
            return mt_ecom_service.add_update_rdd(data)
        except Exception as e:
            logger.error(e)
            return False
    
    @log_decorator
    def get_mt_ecom_rdd_item_list(self,data):
        try:
            return mt_ecom_service.get_mt_ecom_rdd_item_list(data)
        except Exception as e:
            logger.error(e)
            return False
    
    @log_decorator
    def get_mt_ecom_customer_workflow_list(self,data):
        try:
            return mt_ecom_service.get_mt_ecom_customer_workflow_list(data)
        except Exception as e:
            logger.error(e)
            return False
    
    @log_decorator
    def add_update_customer_workflow(self,data):
        try:
            return mt_ecom_service.add_update_customer_workflow(data)
        except Exception as e:
            logger.error(e)
            return False
    @log_decorator
    def get_mt_ecom_customer_workflow(self,data):
        try:
            return mt_ecom_service.get_mt_ecom_customer_workflow(data)
        except Exception as e:
            logger.error("Exception in MTECOMController.get_mt_ecom_customer_workflow",e)
            return False
        
    @log_decorator
    def so_sync(self,data):
        try:
            return mt_ecom_service.so_sync(data)
        except Exception as e:
            logger.error("Exception in MTECOMController.so_sync",e)
            return False

    @log_decorator  
    def customer_codes(self,data):
        try:
            return mt_ecom_service.customer_codes(data)
        except Exception as e:
            logger.error("Exception in MTECOMController.customer_codes",e)
            return False
    @log_decorator
    def add_update_kams(self,data):
        try:
            return mt_ecom_service.add_update_kams(data)
        except Exception as e:
            logger.error("Exception in MTECOMController.add_update_kams",e)
            return False
    
    @log_decorator
    def getKamsData(self,data):
        try:
            return mt_ecom_service.getKamsData(data)
        except Exception as e:
            logger.error("Exception in MTECOMController.getKamsData",e)
            return False    
        
    @log_decorator
    def retrigger(self,data):
        try:
            data = json.loads(data)
            if data.get('customer') == constants.RELIANCE:    
                mt_ecom_service.retrigger(data)
                response = po_processing_so_creation_controller.po_processing_so_creation(json.dumps(data))
            else :
                mt_ecom_service.retrigger(data)
                customer_code = data_persist_model.get_customer_code(data.get('site_code'))
                customer_code = data_persist_model.update_customer_code(data.get('PO NUMBER'),customer_code)
                response = po_controller.so_creation({'PO' : data.get('PO NUMBER'),'customer_code': customer_code})
            return response
        except Exception as e:
            logger.error("Exception in MTECOMController.getKamsData",e)
            return False  
        
    @log_decorator
    def sync_iso_state(self):
        try:
            logger.info("MTECOMController.sync_iso_state")
            return mt_ecom_service.sync_iso_state()
        except Exception as e:
            logger.error("Exception in MTECOMController.sync_iso_state",e)
            return "Error in sync_iso_state"
        
    @log_decorator
    def rdd_sync(self,data):
        try:
            logger.info("Inside MTECOMController.rdd_sync")
            return mt_ecom_service.rdd_sync(data)
        except Exception as e:
            logger.error("Exception in MTECOMController.rdd_sync",e)
            return False
        
    @log_decorator
    def edit_kams_data(self,data):
        try:
            return mt_ecom_service.edit_kams_data(data)
        except Exception as e:
            logger.error("Exception in MTECOMController.edit_kams_data",e)
            return False
        
    @log_decorator
    def tot_tolerance(self,data):
        try:
            return mt_ecom_service.tot_tolerance(data)
        except Exception as e:
            logger.error("Exception in MTECOMController.tot_tolerance",e)
            return False