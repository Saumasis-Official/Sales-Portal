from src.services.data_persist_service import DataPersistService
from src.utils.sqs_helper import SQSHelper
from src.exceptions.data_persisting_exception import DataPersistingException
from src.transformers.blinkit_transformers import BlinkitTransformers
from src.transformers.amazon_transformers import AmazonTransformers
from src.libs.loggers import log_decorator, Logger
from src.services.mulesoft_service import MulesoftService
import json
from src.enums.customers_enum import Customers
from datetime import date, datetime
from src.utils.helper import HelperClass
from src.enums.mt_ecom_status_type import MtEcomStatusType
from src.enums.success_message import SuccessMessage
from src.constants.globals import GlobalsVars
from src.utils.sap_service import SapService
from src.enums.error_message import ErrorMessage

logger = Logger("InvoiceService")
global_var = GlobalsVars()
sap_service = SapService()
class InvoiceService:
    DATA_PERSIST_SERVICE = None
    SQS_HELPER = None
    BLINKIT_TRANSFORMERS = None
    MULESOFT_SERVICE = None
    HELPER = None
    AMAZON_TRANSFORMERS = None

    def __init__(self):
        self.DATA_PERSIST_SERVICE = DataPersistService()
        self.SQS_HELPER = SQSHelper()
        self.BLINKIT_TRANSFORMERS = BlinkitTransformers()
        self.MULESOFT_SERVICE = MulesoftService()
        self.HELPER = HelperClass()
        self.AMAZON_TRANSFORMERS = AmazonTransformers()

    @log_decorator
    def create_invoice_payload(self, data):
        """
        Description: This method will create invoice payload
        Params:
            - po_number :str,
            - debug :bool
        Returns:
            - bool/ dict
        """
        non_invoiced_items = None
        non_invoiced_po = []
        try:
            if data.get("po_number"):
                invoice_data = self.DATA_PERSIST_SERVICE.fetch_non_invoiced_items(
                    data.get("po_number"), ""
                )
                if len(invoice_data):
                    global_var.set_current_customer(invoice_data[0].get("customer"))
                    customer = invoice_data[0].get("customer")
                    config_data = (
                        self.DATA_PERSIST_SERVICE.fetch_workflow_configurations(
                            customer
                        )
                    )
                    invoice = config_data.get("invoice") if len(config_data) else False
                    if invoice:
                        non_invoiced_items = self.DATA_PERSIST_SERVICE.fetch_items(
                            invoice_data[0].get("id")
                        )
                        non_invoiced_items["customer"] = customer
                        non_invoiced_items["so_number"] = invoice_data[0].get(
                            "so_number"
                        )
                    else:
                        logger.info(
                            f"Invoice is not enabled for the customer {customer} for po {data.get('po_number')}"
                        )
                        return []
                else:
                    logger.info(f"PO number {data.get('po_number')} not found")
                    return []
            else:
                non_invoiced_po = self.DATA_PERSIST_SERVICE.fetch_non_invoiced_items(
                    "", ""
                )
            if non_invoiced_items and len(non_invoiced_items.get("data", [])):
                po_data = {
                    "po_number": data.get("po_number"),
                    "so_number": non_invoiced_items.get("so_number"),
                }
                if data.get("debug"):
                    invoice_payload = (
                        self.BLINKIT_TRANSFORMERS.invoice_payload_transformer(
                            non_invoiced_items.get("data", []), po_data
                        )
                    )
                    return {"data": invoice_payload, "customer": customer}
                else:
                    invoice_payload = (
                        self.BLINKIT_TRANSFORMERS.invoice_payload_transformer(
                            non_invoiced_items.get("data", []), po_data
                        )
                    )
                    global_var.set_current_customer(customer)
                    self.SQS_HELPER.send_data_to_invoicing_sqs(
                        {"data": invoice_payload, "customer": customer}
                    )
                    return True
            elif len(non_invoiced_po):
                for po in non_invoiced_po:
                    config = self.DATA_PERSIST_SERVICE.fetch_workflow_configurations(
                        po.get("customer")
                    )
                    if config and config.get("invoice"):
                        non_invoiced_items = (
                            self.DATA_PERSIST_SERVICE.fetch_non_invoiced_items(
                                None, po.get("id")
                            )
                        )
                        if len(non_invoiced_items):
                            invoice_payload = (
                                self.BLINKIT_TRANSFORMERS.invoice_payload_transformer(
                                    non_invoiced_items, po
                                )
                            )
                            global_var.set_current_customer(po.get("customer"))
                            self.SQS_HELPER.send_data_to_invoicing_sqs(
                                {
                                    "data": invoice_payload,
                                    "customer": po.get("customer"),
                                }
                            )
                        else:
                            logger.info(
                                "No non invoiced items found for PO: ", po.get("po")
                            )
                            self.DATA_PERSIST_SERVICE.update_po_status(po.get("id"))
                    else:
                        logger.info(
                            "Invoice configuration not found for customer: ",
                            po.get("customer"),
                        )
            return True

        except DataPersistingException as dpe:
            print(dpe)
            return False
        except Exception as e:
            logger.error("Exception in InvoiceService -> create_invoice_payload", e)
    @log_decorator
    def invoice_processing(self, data: dict):
        """
        Description: This method will process invoice
        Params:
            - data :dict
        Returns:
            - bool/ dict
        """
        receipt_handle = ""
        try: 
            payload = {}
            event = json.loads(data)
            customer = ""
            resp = {}
            if event.get("body") and len(event["body"]) > 0:
                data = json.loads(event.get("body"))
                payload = data.get("data")
                customer = data.get("customer")
                receipt_handle = event.get("receiptHandle")
            else:
                payload = event.get("data")
                customer = event.get("customer")
            #set the global variable
            global_var.set_current_customer(customer)
            config_data = self.DATA_PERSIST_SERVICE.fetch_workflow_configurations(customer)
            check_maintaineance = self.DATA_PERSIST_SERVICE.check_maintenance()
            if check_maintaineance[0].get('status') == 'OPEN':
                return {'error': ErrorMessage.MAINTENANCE_OPEN}
            # resp = self.MULESOFT_SERVICE.invoice_sync(payload)
            resp = sap_service.mrp_check_2(payload)
            #Saving request and response
            res_data = {
                "req": json.dumps(payload),
                "res": json.dumps(resp.json()),
            }
            data_type = {
                "type": "Invoice payload and response",
                "po_number": payload.get("NAVHDR")[0].get("PONumber"),
            }
            self.DATA_PERSIST_SERVICE.save_req_res(res_data, data_type)
            if receipt_handle:
                    self.SQS_HELPER.delete_message(receipt_handle,'invoicing')
                    receipt_handle = ""
            # Mrp Check 2 for customer
            if config_data and config_data.get("mrp_2"):
                if customer == Customers.BLINKIT:
                    logger.info("Mrp 2 check is not there for customer: ", customer)
            # Sending ASN to customers
            if (
                resp
                and resp.json().get('data',{}).get('data',{}).get("d")
                and resp.json().get('data',{}).get('data',{}).get("d").get("NAVHDR")
                and resp.json().get('data',{}).get('data',{}).get("d").get("NAVHDR").get("results")
                and len(resp.json().get('data',{}).get('data',{}).get("d").get("NAVHDR").get("results")) > 0
            ):
                resp_headers = resp.json().get('data',{}).get('data',{}).get("d").get("NAVHDR").get("results")
                for res_hdr in resp_headers:
                    if (
                        res_hdr.get("NAV_INVOICES")
                        and res_hdr.get("NAV_INVOICES").get("results")
                        and len(res_hdr.get("NAV_INVOICES").get("results")) > 0
                    ):
                        sales_order = res_hdr.get("SalesOrder")
                        po_number = res_hdr.get("PONumber")
                        invoices_arr = res_hdr.get("NAV_INVOICES").get("results")
                        item_data = {}
                        for invoice_data in invoices_arr:
                            asn_items = []
                            invoice_items = []
                            invoices = []
                            tax_data = invoice_data.get('NAVTAX','')
                            if (
                                invoice_data.get("NAVINVLINES")
                                and invoice_data.get("NAVINVLINES").get("results")
                                and len(invoice_data.get("NAVINVLINES").get("results"))
                                > 0
                            ):
                                line_item_arr = invoice_data.get("NAVINVLINES").get(
                                    "results"
                                )
                                grouped_items = {}
                                for i, item in enumerate(line_item_arr):
                                    item_number = item.get("ItemNumber")
                                    if item_number in grouped_items:
                                        grouped_items[item_number].append(item)
                                    else:
                                        grouped_items[item_number] = [item]
                                line_item_arr = grouped_items
                                for line_item_data in line_item_arr:
                                    quantity = 0
                                    for item_d in line_item_arr[line_item_data]:
                                        if len(line_item_arr[line_item_data]) > 1:
                                            data = {
                                                "item_number": item_d.get("ItemNumber").lstrip('0'),
                                                "so_number": sales_order,
                                            }
                                            quantity = quantity + float(
                                                item_d.get("Quantity")
                                            )
                                            po_data = self.DATA_PERSIST_SERVICE.get_invoice_status(
                                                data
                                            )
                                            if config_data and config_data.get("invoice"):
                                                if customer == Customers.BLINKIT:
                                                    logger.info("Invoice is not there for customer: ", customer) 
                                                elif customer == Customers.AMAZON:
                                                    if po_data:
                                                        po_data = self.HELPER.remove_custom_types(po_data)
                                                        po_data["po_number"] = po_number
                                                        invoice_item_data = self.AMAZON_TRANSFORMERS.invoice_items_transformer(item_d, po_data)
                                                        invoice_items.append(invoice_item_data)
                                                        
                                            if po_data:
                                                po_data = self.HELPER.remove_custom_types(po_data)
                                                if customer == Customers.BLINKIT:
                                                    asn_data = {
                                                        "SKUDescription" :po_data.get('po_item_description'),
                                                        "NoOfPackages" :item_d.get("caseCount"),
                                                        "POLineNumber" : item_d.get("PoItemNumber").lstrip('0'),
                                                        "UGST" :item_d.get("UGST_Value"),
                                                        "CGST" :item_d.get("CGST_Value"),
                                                        "CESS" :item_d.get("Cess_Value"),
                                                        "IGST" :item_d.get("IGST_Value"),
                                                        "SGST" :item_d.get("SGST_Value"),
                                                        "SKUCode" : int(po_data.get("customer_product_id")),
                                                        "MRP" :item_d.get("MRP"),
                                                        "Article_Code_Wise_HSN_CODE" :item_d.get("hsnCode"),
                                                        "TotalTaxAmount" :item_d.get("lltaxAmt"),
                                                        "Quantity" : str(int(float(item_d.get("Quantity"))) * int(float(item_d.get("outerCaseSize")))),
                                                        "TotalBasicPrice" :item_d.get("costPrice"),
                                                        "TotalLandedCost" : item_d.get("costPrice"),
                                                        "ShelfLifeExpiry" :item_d.get("expDt"),
                                                        "MfgPkdDate" :item_d.get("mfdDate"),
                                                        "OuterCaseSize" :item_d.get("outerCaseSize"), 
                                                    }
                                                    asn_items.append(asn_data)
                                                if customer == Customers.AMAZON:
                                                    asn_data = self.AMAZON_TRANSFORMERS.asn_items_transformer(item_d, po_data)
                                                    asn_items.append(asn_data)
                                                item_data = {
                                                    "so_number": sales_order,
                                                    "item_number": item_d.get("ItemNumber").lstrip('0') ,
                                                    "invoice_number": invoice_data.get("Invoice"),
                                                    "invoice_mrp": self.HELPER.sanitize_sap_price_value(item_d.get("CorrectMRP")),
                                                    "invoice_quantity": str(int(float(item_d.get("Quantity"))) * int(float(item_d.get("outerCaseSize")))),
                                                    "invoice_date": invoice_data.get("InvoiceDate"),
                                                    "po_number" : po_number,
                                                    'invoice_base_price' : round(float(self.HELPER.sanitize_sap_price_value(item_d.get("BasePrice")))/int(float(item_d.get("Quantity"))),2),
                                                    'invoice_uom' : 'EA',
                                                }
                                        else:
                                            data = {
                                                "item_number": item_d.get("ItemNumber").lstrip('0'),
                                                "so_number": sales_order,
                                            }
                                            quantity = quantity + float(
                                                item_d.get("Quantity")
                                            )
                                            po_data = self.DATA_PERSIST_SERVICE.get_invoice_status(
                                                data
                                            )
                                            if config_data and config_data.get("invoice"):
                                                if customer == Customers.BLINKIT:
                                                    logger.info("Invoice is not there for customer: ", customer) 
                                                elif customer == Customers.AMAZON:
                                                    if po_data:
                                                        po_data = self.HELPER.remove_custom_types(po_data)
                                                        po_data["po_number"] = po_number
                                                        invoice_item_data = self.AMAZON_TRANSFORMERS.invoice_items_transformer(item_d, po_data)
                                                        invoice_items.append(invoice_item_data)
                                            if po_data:
                                                po_data = self.HELPER.remove_custom_types(po_data)
                                                if customer == Customers.BLINKIT:
                                                    asn_data = {
                                                        "SKUDescription" : po_data.get('po_item_description'),
                                                        "NoOfPackages" : item_d.get("caseCount"),
                                                        "POLineNumber" : item_d.get("PoItemNumber").lstrip('0'),
                                                        "UGST" : item_d.get("UGST_Value"),
                                                        "CGST" : item_d.get("CGST_Value"),
                                                        "CESS" : item_d.get("Cess_Value"),
                                                        "IGST" : item_d.get("IGST_Value"),
                                                        "SGST" : item_d.get("SGST_Value"),
                                                        "SKUCode" : int(po_data.get("customer_product_id")),
                                                        "MRP" : item_d.get("MRP"),
                                                        "Article_Code_Wise_HSN_CODE" : item_d.get("hsnCode"),
                                                        "TotalTaxAmount" : item_d.get("lltaxAmt"),
                                                        "Quantity" : str(int(float(item_d.get("Quantity"))) * int(float(item_d.get("outerCaseSize")))),
                                                        "TotalBasicPrice" :item_d.get("costPrice"),
                                                        "TotalLandedCost" : item_d.get("costPrice"),
                                                        "ShelfLifeExpiry" : item_d.get("expDt"),
                                                        "MfgPkdDate" : item_d.get("mfdDate"),
                                                        "OuterCaseSize" : item_d.get("outerCaseSize"), 
                                                    }
                                                    asn_items.append(asn_data)
                                                if customer == Customers.AMAZON:
                                                    asn_data = self.AMAZON_TRANSFORMERS.asn_items_transformer(item_d, po_data)
                                                    asn_items.append(asn_data)
                                                item_data = {
                                                    "so_number": sales_order,
                                                    "item_number": item_d.get("ItemNumber").lstrip('0') ,
                                                    "invoice_number": invoice_data.get("Invoice"),
                                                    "invoice_mrp": self.HELPER.sanitize_sap_price_value(item_d.get("CorrectMRP")),
                                                    "invoice_quantity": str(int(float(item_d.get("Quantity"))) * int(float(item_d.get("outerCaseSize")))),
                                                    "invoice_date": invoice_data.get("InvoiceDate"),
                                                    "po_number" : po_number,
                                                    'invoice_base_price' : round(float(self.HELPER.sanitize_sap_price_value(item_d.get("BasePrice")))/int(float(item_d.get("Quantity"))),2),
                                                    'invoice_uom' : 'EA',
                                                }
                                    if item_data:
                                        self.DATA_PERSIST_SERVICE.update_invoice_status(
                                            item_data
                                        )
                                        log_data = {
                                            "po_number": po_number,
                                            "log": SuccessMessage.INVOICE_PROCESSING,
                                            "status": MtEcomStatusType.PARTIAL_INVOICE,
                                        } 
                                        self.DATA_PERSIST_SERVICE.create_logs(log_data)
                            if len(invoice_items):
                                if customer == Customers.AMAZON:
                                    header_data = self.DATA_PERSIST_SERVICE.get_header_data(po_number)
                                    invoice_dto = self.AMAZON_TRANSFORMERS.invoice_header_transformer(invoice_data,header_data,invoice_items,tax_data)
                                    invoices.append(invoice_dto.model_dump())
                                    if len(invoices):
                                        invoice_payload = {
                                            "invoices": invoices
                                        }
                                        print(invoice_payload)
                                        invoice_response = self.MULESOFT_SERVICE.invoice(invoice_payload,customer,header_data.get('location',""))
                                        if invoice_response:
                                            logger.info(invoice_response.json())
                                            log_data = {
                                                    "po_number": po_number,
                                                    "log": SuccessMessage.INVOICE_PROCESSING,
                                                    "status": MtEcomStatusType.ASN_SENT,
                                                } 
                                            self.DATA_PERSIST_SERVICE.create_logs(log_data)   
                                            audit_data = {
                                                "po_number": po_number,
                                                "data": invoice_response.json(),
                                                "id": invoice_response.json().get('Amazon-RequestID'),
                                                "type": "Amazon Invoice Response"                                }
                                            self.DATA_PERSIST_SERVICE.create_audit_logs(audit_data)
                                        else:
                                            logger.info("Error in sending invoice",invoice_response)   

                            if len(asn_items):
                                asn_dto = {}
                                location = ''
                                if config_data and config_data.get("asn"):
                                    if customer == Customers.BLINKIT:
                                        asn_dto = {
                                        "TotalWeight" : invoice_data.get("InvoiceQty"),
                                        "InvoiceDate" : invoice_data.get("InvoiceDate"),
                                        "PONumber" : po_number,
                                        "DeliveryDate" : invoice_data.get("DeliveryDate"),
                                        "TotalBasicPrice" : invoice_data.get("TotalCostPrice"),
                                        "TotalTaxAmount" : invoice_data.get("totTaxAmt"),
                                        "VendorInvoiceNumber" : invoice_data.get("Invoice"),
                                        "TotalLandingCost" : invoice_data.get("TotalCostPrice"),
                                        "items" : asn_items 
                                        }
                                    if customer == Customers.AMAZON:
                                        header_data = self.DATA_PERSIST_SERVICE.get_header_data(po_number)
                                        location = header_data.get('location',"")
                                        asn_dto = self.AMAZON_TRANSFORMERS.asn_header_transformer(invoice_data,header_data,asn_items,po_number).model_dump()
                                if asn_dto:
                                    asn_response = self.MULESOFT_SERVICE.asn(asn_dto,customer,location)
                                    if asn_response:
                                            logger.info(asn_response.json())
                                            log_data = {
                                                    "po_number": po_number,
                                                    "log": SuccessMessage.INVOICE_PROCESSING,
                                                    "status": MtEcomStatusType.ASN_SENT,
                                                } 
                                            self.DATA_PERSIST_SERVICE.create_logs(log_data)
                                    else:
                                        logger.info("Error in sending ASN",asn_response)    
                return True
        
        except Exception as e:
            logger.error("Exception in InvoiceService -> invoice_processing", e)
            if receipt_handle:
                    self.SQS_HELPER.delete_message(receipt_handle,'invoicing')

    def mulesoft_invoice_sync(self, data: dict) -> bool:
        """
        Description: This method will sync invoice from mule api
        Params:
            - data :dict
        Returns:
            - bool/ dict
        """
        try:
            logger.info("inside InvoiceService -> mulesoft_invoice_sync")
            payload = json.loads(data)
            header_data = []
            item_data = []
            for so in payload.get("data"):
                header_data.append({
                    "so_number": so.get("SaleOrderNo"),
                    "invoice_number": so.get("odnNo"),
                })

                for item in so.get("items"):
                    item_data.append({
                        "invoice_number": so.get("odnNo"),
                        "response_item_number": item.get('Itemnumber'),
                         "invoice_quantity": item.get('invQty'),
                         "invoice_date": so.get("cmpInvDt"),
                         "invoice_uom" : 'CV',
                         "invoice_tax" : {
                                        "totGrossAmt": item.get('totGrossAmt'),
                                        "lltaxAmt": item.get('lltaxAmt'),
                                        "netAmt": item.get('netAmt'),                                        
                             
                         },
                         "invoice_mrp" : item.get('mrp'),
                         "sales_order" : so.get("SaleOrderNo"),
                         "updated_caselot" : item.get('DMSUOMQty'),
                        
                    })
            if len(header_data):
                header_response = self.DATA_PERSIST_SERVICE.save_invoice_headers(header_data)
                logger.info("Updated Header count :",header_response)
            if len(item_data):
                item_response = self.DATA_PERSIST_SERVICE.save_invoice_items(item_data)
                logger.info("Updated Item count :",item_response)
            return True
        except Exception as e:
            logger.error("Exception in InvoiceService -> mulesoft_invoice_sync", e)
            return False
        
    @log_decorator
    def asn_download(self, data: dict):
        """
        Description: This method will download ASN
        Params:
            - data :dict
        Returns:
            - bool/ dict
        """
        try:
            payload = json.loads(data)
            logger.info("inside InvoiceService -> asn_download",payload)
            if payload.get('so_number'):
                response =  self.DATA_PERSIST_SERVICE.get_asn_data(payload,'so_number')
                return response
            elif payload.get("customer",'') and payload.get("from_date",'') and payload.get("to_date",''):
                return self.DATA_PERSIST_SERVICE.get_asn_data(payload,'customer')
            else:
                return self.DATA_PERSIST_SERVICE.get_asn_data('', '')
            
            
        except Exception as e:
            logger.error("Exception in InvoiceService -> asn_download", e)
            return False
