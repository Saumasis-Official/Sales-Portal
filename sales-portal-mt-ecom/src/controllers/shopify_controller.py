from src.libs.loggers import Logger
from src.services.shopify_service import ShopifyService


logger = Logger("ShopifyController")



class ShopifyController:
    SHOPIFY_SERVICE = None
    def __init__(self):
       self.SHOPIFY_SERVICE = ShopifyService()
    
    def sap_request_response_payload(self, payload,req_type):
        logger.info("sap_request_response_payload")
        if (req_type.get('type') == 'request'):
            response = self.SHOPIFY_SERVICE.sap_request_payload_persistance(payload)
            if response and response.get('status') == 'success':
                self.SHOPIFY_SERVICE.sap_response_persistance(payload)
            else :
                return response 
        elif (req_type.get('type') == 'retrigger'):
            response = self.SHOPIFY_SERVICE.po_retrigger(req_type)
        elif (req_type.get('type') == 'ztable'):
            response = self.SHOPIFY_SERVICE.z_table_persistance(payload)
        else:
            response = {"status": "failure", "message": "Invalid request type"}

        return response
    
    def po_list(self, data):
        logger.info("po_list", data)
        response = self.SHOPIFY_SERVICE.po_list(data)
        return response
    
    def po_items(self, params):
        logger.info("po_items", params)
        response = self.SHOPIFY_SERVICE.po_items(params)
        return response
    
    def shopify_reports(self, data):
        try:
            logger.info("shopify_reports", data)
            response = self.SHOPIFY_SERVICE.shopify_reports(data)
            if response is None:
                raise ValueError(
                    "Response from Shopify service.shopify_reports cannot be None"
                )
            return response
        except Exception as e:
            logger.error("Exception in ShopifyController -> shopify_reports", e)
            return {"success": "failure", "error": str(e)}
        
    def z_table_reports(self, data):
        try:
            logger.info("z_table_reports", data)
            response = self.SHOPIFY_SERVICE.z_table_reports(data)
            if response is None:
                raise ValueError(
                    "Response from Shopify service.z_table_reports cannot be None"
                )
            return response
        except Exception as e:
            logger.error("Exception in ShopifyController -> z_table_reports", e)
            return {"success": "failure", "error": str(e)}
        
    def fetch_all_shopify_customers(self, data):
        try:
            response = self.SHOPIFY_SERVICE.fetch_all_shopify_customers(data)
            if response is None:
                raise ValueError(
                    "Response from Shopify service.fetch_all_shopify_customers cannot be None"
                )
            return response
        except Exception as e:
            logger.error("Exception in ShopifyController -> fetch_all_shopify_customers", e)
            return {"success": "failure", "error": str(e)}
        

    def ror_reports(self):
        try:
            response = self.SHOPIFY_SERVICE.ror_reports()
            return response
        except Exception as e:
            logger.error("Exception in ShopifyController -> ror_reports", e)
            return {"success": "failure", "error": str(e)}
        
    async def delete_items(self, data):
        try:
            response = await self.SHOPIFY_SERVICE.delete_item(data)
            return response
        except Exception as e:
            logger.error("Exception in ShopifyController -> delete_items", e)
            return {"success": "failure", "error": str(e)}
        
    def resend_po(self,data):
        try:
            response = self.SHOPIFY_SERVICE.resend_po(data)
            return response
        except Exception as e:
            logger.error("Exception in ShopifyController -> resend_po", e)
            return {"success": "failure", "error": str(e)}