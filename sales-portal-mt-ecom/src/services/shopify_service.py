from src.libs.loggers import Logger
from src.models.shopify_model import ShopifyModel
from src.models.dto.shopify_payload_dto import ShopifyDTO, ShopifyItemsDTO
from datetime import datetime
from src.services.s3_service import S3Service
from src.services.mulesoft_service import MulesoftService
from src.transformers.sap_transformers import SapTransformers
import pandas as pd
from src.utils.helper import HelperClass
import json
from src.utils.mail_helper import MailHelper
from src.utils import constants
import copy

logger = Logger("ShopifyService")


class ShopifyService:
    SHOPIFY_MODEL = None
    S3_SERVICE = None
    MULESOFT_SERVICE = None
    SAP_TRANSFORMERS = None
    HELPER_CLASS = None
    MAIL_HELPER = None

    def __init__(self):
        self.SHOPIFY_MODEL = ShopifyModel()
        self.S3_SERVICE = S3Service()
        self.MULESOFT_SERVICE = MulesoftService()
        self.SAP_TRANSFORMERS = SapTransformers()
        self.HELPER_CLASS = HelperClass()
        self.MAIL_HELPER = MailHelper()

    def sap_request_payload_persistance(self, payload: dict):
        try:
            header_data = []
            logger.info("ShopifyService --> sap_request_payload_persistance")
            if payload and len(payload.get("Orders")):
                for order in payload.get("Orders"):
                    items = []
                    for item in order.get("LineItems"):
                        items.append(
                            ShopifyItemsDTO(
                                item_number=item.get("ItmNumber"),
                                customer_material_code=item.get("CustMaterialCode"),
                                order_quantity=item.get("OrderQuantity"),
                                sales_unit=item.get("SalesUnit"),
                                item_conditions=item.get("ItemsConditions"),
                                item_category=item.get("ItemCateg"),
                            )
                        )
                    s3_data = {
                        "data": order,
                        "type": "payload",
                        "customer": "Shopify UK",
                        "po": order.get("CustomerReference"),
                    }
                    json_file_key: str = self.S3_SERVICE.save_shopify_payload_response(
                        s3_data
                    )
                    header_data.append(
                        ShopifyDTO(
                            sales_org=order.get("SalesOrg"),
                            disribution_channel=order.get("DistrChan"),
                            division=order.get("Division"),
                            currency_code=order.get("CurrencyCode"),
                            order_type=order.get("OrderType"),
                            po_number=order.get("CustomerReference"),
                            customer=(
                                self.SHOPIFY_MODEL.get_customer_name(
                                    order.get("OrderPartners")[0].get("PartnNumb")
                                )
                                if self.SHOPIFY_MODEL.get_customer_name(
                                    order.get("OrderPartners")[0].get("PartnNumb")
                                )
                                else ""
                            ),
                            po_date=order.get("CustomerReferenceDate"),
                            rdd=order.get("RequiredDeliveryDate"),
                            ship_cond=order.get("ShipCond"),
                            ship_type=order.get("ShipType"),
                            compl_div=order.get("ComplDlv"),
                            order_partners=order.get("OrderPartners"),
                            header_conditions=order.get("HeaderConditions"),
                            json_file_key=json_file_key,
                            items=items,
                        )
                    )
                response = self.SHOPIFY_MODEL.sap_request_payload_persistance(header_data)
                return response
        except Exception as e:
            logger.error("Error in sap_request_payload_persistance", e)
            return {"status": "failure", "error": str(e)}

        return {
            "status": "success",
            "message": "Request payload processed successfully",
        }

    def sap_response_persistance(self, payload: dict):
        try:
            header_response_data = []
            error_flag = False
            logger.info("ShopifyService --> sap_response_persistance")
            response = self.MULESOFT_SERVICE.shopify_so_creation(payload)
            response = response.json()
            if response and len(response.get("d").get("Response").get("results")):
                for order in response.get("d").get("Response").get("results"):
                    item_data = []
                    s3_data = {
                        "data": order,
                        "type": "response",
                        "customer": "Shopify UK",
                        "po": order.get("CustomerReference"),
                    }
                    self.S3_SERVICE.save_shopify_payload_response(s3_data)
                    if order.get("Type") == "S":
                        for item in order.get("ResponseItems").get("results"):
                            item_data.append(
                                {
                                    "item_number": item.get("PoItmNo",""),
                                    "message": order.get("Message",""),
                                    "ror": "",
                                    "material_code": item.get("Material",""),
                                    "sales_order": order.get("SalesDocument",""),
                                    "material_description": item.get(
                                        "MaterialDescription",""
                                    ),
                                }
                            )
                        header_response_data.append(
                            {
                                "po_number": order.get("CustomerReference",""),
                                "sales_order": order.get("SalesDocument",""),
                                "status": "Closed",
                                "so_date": datetime.strptime(
                                    order.get("CreationDate",""), "%Y%m%d"
                                ).strftime("%Y-%m-%d"),
                                "items": item_data,
                            }
                        )
                    elif order.get("Type") == "E":
                        error_flag = True
                        for item in order.get("ResponseItems").get("results"):
                            item_data.append(
                                {
                                    "item_number": item.get("PoItmNo",""),
                                    "message": "",
                                    "ror": item.get("Message",""),
                                    "material_code": item.get("Material",""),
                                    "sales_order": "",
                                    "material_description": item.get(
                                        "MaterialDescription",""
                                    ),
                                }
                            )
                        if constants.ORDER_ALREADY_EXIST in order.get("Message"):
                            logger.info(order.get("Message") + " for PO: "+order.get("CustomerReference"))
                        else :
                            header_response_data.append(
                                {
                                    "po_number": order.get("CustomerReference",""),
                                    "sales_order": "",
                                    "status": "Open",
                                    "so_date": None,
                                    "items": item_data,
                                    "message" : order.get("Message","")
                                }
                            )
                self.SHOPIFY_MODEL.sap_response_persistance(header_response_data)
        except Exception as e:
            logger.error("Error in sap_response_persistance", e)
            return {"status": "failure", "error": e}
        if error_flag:
            return {
                "status": "failure",
                "message": "Response processed with errors",
            }
        return {
            "status": "success",
            "message": "Response processed successfully",
        }

    def po_list(self, data):
        try:
            logger.info("ShopifyService --> po_list", data)
            response = self.SHOPIFY_MODEL.po_list(data)
        except Exception as e:
            logger.error("Error ShopifyService --> po_list", e)
            return {"status": "failure", "error": e}
        return {"status": "success", "data": response}

    def po_items(self, params):
        try:
            logger.info("ShopifyService --> po_items", params)
            response = self.SHOPIFY_MODEL.po_items(params)
        except Exception as e:
            logger.error("Error ShopifyService --> po_items", e)
            return {"status": "failure", "error": e}
        return {"status": "success", "data": response}

    def po_retrigger(self, data):
        try:
            logger.info("ShopifyService --> po_retrigger", data)
            payload = {}
            if data.get("po_number"):
                po_data = self.SHOPIFY_MODEL.po_data(data.get("po_number"))
                if po_data:
                    payload = self.create_updated_payload(po_data[0].get('id',0))
                retrigger_data = {
                    "Orders": [payload],
                    "Response": [{"ResponseItems": [{"ResponseConditions": []}]}],
                }
                response = self.sap_response_persistance(retrigger_data)
                if response.get('status') == 'failure':
                    return {"status": "failure", "message": "SO creation failed for PO: "+data.get("po_number") + " as ROR still exists"}
                return {"status": "success", "message": "PO: "+data.get("po_number")+" Retriggered successfully"}
            else:
                fetch_po_data = self.SHOPIFY_MODEL.retrigger_po_list()
                for po in fetch_po_data:
                    payload = self.create_updated_payload(po.get('id',0))
                    retrigger_data = {
                        "Orders": [payload],
                        "Response": [{"ResponseItems": [{"ResponseConditions": []}]}],
                    }
                    self.sap_response_persistance(retrigger_data)
            return {"status": "success", "message": "All POs Retriggered successfully"}

        except Exception as e:
            logger.error("Error ShopifyService --> po_retrigger", e)
            return {"status": "failure", "error": e}

    def shopify_reports(self, data):
        """
        Description: To get the reports for the shopify between PO (from and to) date
        """
        try:
            logger.info("ShopifyService --> shopify_reports", data)
            reports_data = []
            response = self.SHOPIFY_MODEL.shopify_reports(data.get("data"))
            reports_data.extend(
                [
                    {
                        "Customer Name": row.get("customer"),
                        "PO Number": row.get("po_number"),
                        "SO Number": row.get("sales_order"),
                        "Status": row.get("status"),
                        "Sales Org": row.get("sales_org"),
                        "Distributor Channel": row.get("disribution_channel"),
                        "Item Number": row.get("item_number"),
                        "Material Code": row.get("material_code"),
                        "Material Description": row.get("material_description"),
                        "Customer Material Code": row.get("customer_material_code"),
                        "Division": row.get("division"),
                        "Currency Code": row.get("currency_code"),
                        "Order Type": row.get("order_type"),
                        "PO Date": str(
                            self.HELPER_CLASS.remove_custom_types(row.get("po_date"))
                        ),
                        "RDD": str(
                            self.HELPER_CLASS.remove_custom_types(row.get("rdd"))
                        ),
                        "SO Date": str(
                            self.HELPER_CLASS.remove_custom_types(row.get("so_date"))
                        ),
                        "Ship Condition": row.get("ship_cond"),
                        "Ship Type": row.get("ship_type"),
                        "Compl Div": row.get("compl_div"),
                        "Order Quantity": row.get("order_quantity"),
                        "Sales Unit": row.get("sales_unit"),
                        "Message": row.get("message"),
                        "ROR": row.get("ror"),
                        "Item Category": row.get("item_category"),
                    }
                    for row in response
                ]
            )
            reports_data_df = pd.DataFrame(reports_data)
            reports_sorted = reports_data_df.sort_values(
                by=["PO Date", "PO Number", "Item Number"], ascending=True
            )
            return reports_sorted.to_dict(orient="records")
        except Exception as e:
            logger.error("Error ShopifyService --> shopify_reports", e)
            return None
        
    def z_table_reports(self, data):
        """
        Description: To get the reports for the shopify between PO (from and to) date
        """
        try:
            logger.info("ShopifyService --> shopify_reports", data)
            reports_data = []
            response = self.SHOPIFY_MODEL.z_table_reports(data.get("data"))
            reports_data.extend(
                [
                            {
                                "PO Number": row.get("po_number"),
                                "Feed date": row.get("feeddate"),
                                "Partner Code": row.get("partnercode"),
                                "Region": row.get("region"),
                                "Shopify Deposit Number": row.get("shopify_deposit_number"),
                                "Shopify Shipping Tax": row.get("shopify_shipping_tax"),
                                "Shopify Shipping No tax": row.get("shopify_shipping_no_tax"),
                                "App Id": row.get("app_id"),
                                "Currency" : row.get("currency"),
                                "Shopify Order Date": row.get("shopify_order_date"),
                                "Shopify Order Number": row.get("shopify_order_number"),
                                "Shopify Total Price": row.get("shopify_total_price"),
                                "Shopify Total Tax": row.get("shopify_total_tax"),
                                "Shopify Total Discounts": row.get("shopify_total_discounts"),
                                "ItemCode" : row.get("item_code"),
                                "Quantity" : row.get("quantity"),
                                "Quantity Uom" : row.get("quantity_uom"),
                                "Sales Price" : row.get("sales_price"),
                                "Total Discount Amount" : row.get("total_discount_amount"),
                                "Discount Amount" : row.get("discount_rate"),
                                "Mixed Item" : row.get("mixed_item"),
                                "Mixed Item Id" : row.get("mixed_item_id")
                            }
                    for row in response
                ]
            )
            reports_data_df = pd.DataFrame(reports_data)
            reports_sorted = reports_data_df.sort_values(
                by=["Shopify Deposit Number"], ascending=False
            )
            return reports_sorted.to_dict(orient="records")
        except Exception as e:
            logger.error("Error ShopifyService --> shopify_reports", e)
            return None

    def z_table_persistance(self, payload: dict):
        try:
            logger.info("ShopifyService --> z_table_persistance")
            response = self.SHOPIFY_MODEL.z_table_persistance(payload)
            return response
        except Exception as e:
            logger.error("Error in z_table_persistance", e)
            return {"status": "failure", "error": str(e)}
    
    def fetch_all_shopify_customers(self,payload:dict):
        try:
            logger.info("ShopifyService --> fetch_all_shopify_customers")
            response = self.SHOPIFY_MODEL.fetch_all_shopify_customers(payload)
            return response
        except Exception as e:
            logger.error("Error in fetch_all_shopify_customers", e)
            return None
        

    def ror_reports(self):
        try:
            logger.info("ShopifyService --> ror_reports")
            for sales_org in constants.SALES_ORG:
                response = self.SHOPIFY_MODEL.fetch_all_ror_data(sales_org)
                if response and len(response):
                    report_df = pd.DataFrame(response)
                    report_df_sorted = report_df.sort_values(by=["PO Date", "PO Number", "Item Number"], ascending=True)
                    mail_response = self.MAIL_HELPER.send_shopify_reports(report_df_sorted,sales_org)
                    if mail_response:
                        return {"status": "failure", "message": mail_response}
                    logger.info("ROR reports sent successfully for sales org: "+sales_org)
                else:
                    logger.info("No data found for ROR reports")
            return {"status": "success", "message": "ROR reports sent Successfully"}
        except Exception as e:
            logger.error("Error in ror_reports", e)
            return None
    
    def resend_po(self,data):
        try:
            logger.info("ShopifyService --> resend_po")
            if (data.get('year')):
                logger.info("Fetching file name for year: "+data.get('year'))
                file_name = self.SHOPIFY_MODEL.fetch_file_name(data.get('year'),data.get('salesOrg'))
                return {"status": "success", "file_name": file_name}
            elif(data.get('fileName')):
                logger.info("Resending PO for file: "+data.get('fileName'))
                response = self.MULESOFT_SERVICE.resend_po(data.get('fileName'))
                if response:
                    return {"status": "success", "message": "File Processed Successfully"}
                else:
                    return {"status": "failure", "message": "Error in processing file"}
            elif (data.get('userId')):
                logger.info("Fetching year for resend po")
                year = self.SHOPIFY_MODEL.fetch_year(data.get('userId'))
                sales_org = self.SHOPIFY_MODEL.get_user_sales_org(data.get('userId'))
                return {"status": "success", "year": year,"sales_org": sales_org}
        except Exception as e:
            logger.error("Error in resend_po", e)
            return {"status": "failure", "error": e}
        
    async def delete_item(self, data):
        try:
            logger.info("ShopifyService --> delete_items", data)
            response = await self.SHOPIFY_MODEL.delete_items(data)    
            return response
        except Exception as e:
            logger.error("Error in delete_items", e)
            return {"status": "failure", "error": str(e)}
        
    def create_updated_payload(self,id):
        logger.info("ShopifyService --> create_updated_payload")
        original_po = ''
        try:
            json_key = self.SHOPIFY_MODEL.get_S3_key(id)
            if json_key:
                original_po = self.S3_SERVICE.receive_data_from_s3_shopify(
                            json_key
                        )
                original_po = json.loads(original_po)
                modify_po = copy.deepcopy(original_po)
                modify_po['LineItems'] = []
            item_data = self.SHOPIFY_MODEL.get_po_item(id)
            for item in item_data:
                modify_po.get('LineItems',{}).append({
                    "ItmNumber": item.get('item_number',''),
                    "CustMaterialCode": item.get('customer_material_code',''),
                    "OrderQuantity": item.get('order_quantity',''),
                    "SalesUnit": item.get('sales_unit'),
                    "ItemsConditions": item.get('item_conditions',[])[0],
                    "ItemCateg": item.get('item_category','') 
                })
            s3_data = {
                    "data": modify_po,
                    "type": "payload",
                    "customer": "Shopify UK",
                    "po": modify_po.get("CustomerReference"),
                }
            json_file_key: str = self.S3_SERVICE.save_shopify_payload_response(
                s3_data
                )
            audit_data ={
                'Original Payload': original_po,
                'Modified Payload': modify_po
            }
            self.SHOPIFY_MODEL.audit_log(audit_data,original_po.get('CustomerReference'))
            response = self.SHOPIFY_MODEL.save_s3_key(json_file_key,id)  
            logger.info("Updated payload created successfully",response)         
            return modify_po
        except Exception as e:
            logger.error("Error in create_updated_payload", e)
            return {"status": "failure", "error": str(e)}