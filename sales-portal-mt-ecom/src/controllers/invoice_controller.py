from src.libs.loggers import log_decorator, Logger
from src.services.invoice_service import InvoiceService


class InvoiceController:
    INVOICE_SERVICE = None
    logger = Logger("InvoiceController")

    def __init__(self):
        self.INVOICE_SERVICE = InvoiceService()

    def create_invoice_payload(self, data):
        """
        Description: This method will create invoice payload
        Params:
            - po_number :str,
            - debug :bool
        Returns:
            - bool/ dict
        """
        return self.INVOICE_SERVICE.create_invoice_payload(data)
    


    def invoice_processing(self, data:dict):
        """
        Description: This method will process invoice
        Params:
            - data :dict
        Returns:
            - bool/ dict
        """
        return self.INVOICE_SERVICE.invoice_processing(data)

    def mulesoft_invoice_sync(self, data:dict):
        """
        Description: This method will sync invoice from mule api
        Params:
            - data :dict
        Returns:
            - bool/ dict
        """
        return self.INVOICE_SERVICE.mulesoft_invoice_sync(data)
    
    @log_decorator
    def asn_download(self, data:dict):
        """
        Description: This method will download ASN
        Params:
            - data :dict
        Returns:
            - bool/ dict
        """
        return self.INVOICE_SERVICE.asn_download(data)