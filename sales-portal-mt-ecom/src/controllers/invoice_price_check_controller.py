from src.services.invoice_price_check_service import InvoicePriceCheckService
from src.services.log_service import LogService


class InvoicePriceCheckController:
    def __init__(self) -> None:
        self.invoice_price_check_service = InvoicePriceCheckService()

    def check_invoice_price(self, flag,po_number):
        return  self.invoice_price_check_service.check_invoice_price(flag,po_number)
    def sap_check_invoice_price(self,data):
        return self.invoice_price_check_service.sap_check_invoice_price(data)