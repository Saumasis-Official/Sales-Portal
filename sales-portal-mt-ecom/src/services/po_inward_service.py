import json
from datetime import datetime,timedelta
from src.transformers.blinkit_transformers import BlinkitTransformers
from src.models.xml_validation_model import XmlValidationModel
from src.utils import constants
from src.exceptions.po_transformer_exception import PoTransformerException
from src.models.dto.po_dto import PoDTO
from src.exceptions.so_exception import SoException
from src.transformers.sap_transformers import SapTransformers
from src.models.dto.so_dto import SoDTO
from src.config.configurations import SAP_URLS
from src.models.po_processing_so_creation_model import PoProcessingSoCreationModel
from src.mock_data import sap_so_response
from src.enums.error_message import ErrorMessage
from src.enums.mt_ecom_status_type import MtEcomStatusType
from src.services.data_persist_service import DataPersistService
from src.utils.response_handlers import ResponseHandlers
from src.enums.customers_enum import Customers
from src.utils.mail_helper import MailHelper
from src.libs.loggers import log_decorator, Logger
from src.services.s3_service import S3Service
from src.exceptions.sqs_exception import SQSException
from src.services.po_acknowledgement_service import PoAckService
from src.exceptions.po_acknowledgement_exception import PoAcknowledgementException
from src.utils.sqs_helper import SQSHelper
from src.exceptions.S3_exception import S3Exception
from src.enums.success_message import SuccessMessage
from src.services.mulesoft_service import MulesoftService
from src.models.data_persist_model import PersistModel as DataPersistModel
import pandas as pd
from src.utils.helper import HelperClass
from src.transformers.sap_transformers import SapTransformers
import math
import copy
from src.transformers.amazon_transformers import AmazonTransformers
from src.models.dto.amazon_po_ack import AmazonAcknowledgementsDTO
from src.utils.mail_helper import MailHelper
import pytz
from src.transformers.bigbasket_transformers import BigBasketTransformers
from src.transformers.swiggy_transformers import SwiggyTransformers
from src.transformers.zepto_transformers import ZeptoTransformers
from src.config.configurations import ENV
from src.utils.sap_service import SapService
from io import StringIO



mulesoft_service = MulesoftService()

logger = Logger("PoInwardService")


class PoInwardService:
    BLINKIT_TRANSFORMERS = None
    XML_VALIDATION_MODEL = None
    SAP_TRANSFORMERS = None
    SAP_SERVICE = None
    PO_PROCESSING_SO_CREATION_MODEL = None
    DATA_PERSIST_SERVICE = None
    RESPONSE_HANDLERS = None
    MAIL_HELPER = None
    logger = None
    S3_SERVICE = None
    SQS_HELPER = None
    PO_ACK_SERVICE = None
    DATA_PERSIST_MODEL = None
    HELPER_CLASS = None
    SAP_TRANSFORMERS = None
    AMAZON_TRANSFORMERS = None
    MAIL_HELPER = None
    BIGBASKET_TRANSFORMERS = None
    SWIGGY_TRANSFORMERS = None
    SAP_SERVICE = SapService()
    SWIGGY_TRANSFORMERS = None
    ZEPTO_TRANSFORMERS = None

    def __init__(self):
        self.BLINKIT_TRANSFORMERS = BlinkitTransformers()
        self.XML_VALIDATION_MODEL = XmlValidationModel()
        self.SAP_TRANSFORMERS = SapTransformers()
        self.PO_PROCESSING_SO_CREATION_MODEL = PoProcessingSoCreationModel()
        self.DATA_PERSIST_SERVICE = DataPersistService()
        self.RESPONSE_HANDLERS = ResponseHandlers()
        self.MAIL_HELPER = MailHelper()
        self.S3_SERVICE = S3Service()
        self.SQS_HELPER = SQSHelper()
        self.PO_ACK_SERVICE = PoAckService()
        self.DATA_PERSIST_MODEL = DataPersistModel()
        self.HELPER_CLASS = HelperClass()
        self.SAP_TRANSFORMERS = SapTransformers()
        self.AMAZON_TRANSFORMERS = AmazonTransformers()
        self.MAIL_HELPER = MailHelper()
        self.BIGBASKET_TRANSFORMERS = BigBasketTransformers()
        self.SWIGGY_TRANSFORMERS = SwiggyTransformers()
        self.ZEPTO_TRANSFORMERS = ZeptoTransformers()

    @log_decorator
    def convert_customer_orders(self, po_details: dict, customer: str, location: str = "", request_id: str = ""):
        """
        Description: It coverts the customer specific order payload to generic payload
            - It will check for the customer and call appropriate transformers
        Parameters:
            - po_details: Dict - Details of the order
        Return:
            - order_derails: PoDTO - generic payload
        """
        po_number = None
        transformers = {Customers.BLINKIT: self.BLINKIT_TRANSFORMERS.po_transformer,
                        Customers.AMAZON: self.AMAZON_TRANSFORMERS.po_transformer,
                        Customers.BIGBASKET: self.BIGBASKET_TRANSFORMERS.po_transformer,
                        Customers.SWIGGY: self.SWIGGY_TRANSFORMERS.po_transformer,
                        Customers.ZEPTO: self.ZEPTO_TRANSFORMERS.po_transformer}
        try:
            # transform the payload based on the customer
            assert (
                customer in Customers.__members__.values()
            ), f"Customer {customer} not found in Customers Enum"

             # Get the transformer function for the customer
            transformer_func = transformers.get(customer)
            if not callable(transformer_func):
                raise PoTransformerException(f"Transformer for customer {customer} is not callable")

            # Transform the payload based on the customer
            order_details = transformer_func(po_details, location)
            
            if isinstance(order_details, list):
                logger.info("If order_details is a list -> Amazon")
                acknowledgements = []
                for order in order_details:
                    po_number = order.po_number
                    acknowledgements.append(self.transformed_order_details(order, customer,po_number,po_details, location,request_id))
                ack_data = AmazonAcknowledgementsDTO(acknowledgements=acknowledgements)
                acknowledgement_response = mulesoft_service.acknowledgement(ack_data.model_dump(), customer, location)
                return acknowledgement_response

            else:
                  logger.info(f"If order_details is not a list -> {customer} ")
                  po_number = order_details.po_number
                  return self.transformed_order_details(order_details, customer, po_number,po_details)
        
        except AssertionError as ae:
            print("AssertionError in PoInwardService ->",ae)
            return False
        except Exception as e:
            print("Exception in PoInwardService -> convert_customer_orders", e)
            raise PoTransformerException(po_number, e, constants.XSD_FAILED)

    @log_decorator
    def so_creation(self, order: PoDTO, header_table_id: str):
        """
        Description: To create SO from SAP
            - create SAP payload
            - send request to SAP for so creation and receive response
            - map any validation error with the line items
            - store the data in database
        Parameters:
            - order: PoDTO: order details
        """
        try:
            local_tz = pytz.timezone('Asia/Kolkata')
            # convert pieces to cases
            data : PoDTO = self.SAP_TRANSFORMERS.convert_pieces_to_cases(order)
            # create SAP payload
            if data:
                payload: SoDTO = self.SAP_TRANSFORMERS.so_payload(data)
            else:
                return self.RESPONSE_HANDLERS.send(400, ErrorMessage.SALES_ORDER_CREATE_FAILED)
            # send request to SAP
            # self.DATA_PERSIST_SERVICE.update_so_flag(payload.PoNumber)
            # response = mulesoft_service.so_creation(payload)
            response = self.SAP_SERVICE.create_so(payload.model_dump(),payload.PoNumber)
            response_data = response.json()
            response_data = response_data.get('data',{}).get('data',{})
            mail_data = []
            so_res_dict = {"Message": []}
            so_flag = False
            so_number = ""
            if response:
                logger.info("so_creation response")
                data_d = response_data.get("d", {})
                navres_result = data_d.get("NAVRES", {}).get("results")
                navitem_result = data_d.get("NAVITEM", {}).get("results")

                so_req = {
                    "req": payload.model_dump_json(),
                    "res": json.dumps(response.json()),
                }
                so_type = {
                    "type": "SO Request and Response",
                    "po_number": payload.PoNumber,
                }
                self.DATA_PERSIST_SERVICE.save_req_res(so_req, so_type)
                if navres_result and navitem_result:
                    for item_data in navitem_result:
                        row = {
                            "Item Number": item_data.get("ItemNumber", ""),
                            "System SKU Code": item_data.get(
                                "SystemSKUCode",
                            ),
                            "Quantity": item_data.get("TargetQty"),
                            "ROR": item_data.get("ROR", "-"),
                            "MRP": item_data.get("MRP"),
                            "Caselot": item_data.get("case_lot"),
                        }
                        mail_data.append(row)

                    for item in navres_result:
                        if item.get("Sales_Order_Number") != "" and so_flag is False:
                            so_number = item["Sales_Order_Number"].zfill(10)
                            so_flag = True
                        elif item.get("Type") == "E":                       #if not required remove this condition !
                            log = {
                                "po_number": payload.PoNumber,
                                "log": ErrorMessage.SALES_ORDER_CREATE_FAILED,
                                "status": MtEcomStatusType.SO_FAILED,
                                "data": item,
                            }
                            self.DATA_PERSIST_SERVICE.create_logs(log)
                            return self.RESPONSE_HANDLERS.send(
                                400, ErrorMessage.SALES_ORDER_CREATE_FAILED
                            )
                        else:
                            so_res_dict["Message"].append(item.get("Message"))              #if not required remove

                        line_item_data = {
                            "data": item,
                            "id": header_table_id,
                            "status": MtEcomStatusType.INVOICE_PENDING,
                            "type": "Update",
                            "so_number": so_number,
                            "po_number": payload.PoNumber,
                        }
                        self.DATA_PERSIST_SERVICE.save_or_update_item_details(
                            line_item_data
                        )

            elif response and response.json() and response.json().get("error"):
                log = {
                    "po_number": payload.PoNumber,
                    "log": ErrorMessage.SALES_ORDER_CREATE_FAILED,
                    "status": MtEcomStatusType.SO_FAILED,
                    "data": response.json(),
                }
                self.DATA_PERSIST_SERVICE.create_logs(log)
                return self.RESPONSE_HANDLERS.send(
                    400, ErrorMessage.SALES_ORDER_CREATE_FAILED
                )
           
            so_data = {
                "po_number": payload.PoNumber,
                "so_number": so_number,
                "so_created_date": datetime.now(pytz.utc).astimezone(local_tz),
                "id": header_table_id,
                "status": MtEcomStatusType.INVOICE_PENDING,
            }
            if so_number:
                self.PO_PROCESSING_SO_CREATION_MODEL.update_header_data(so_data)
                subject = SuccessMessage.SALES_ORDER_CREATE_SUCCESS
                body = {
                    "po_number": payload.PoNumber,
                    "so_number": so_number,
                    "so_created_date": datetime.now(pytz.utc).astimezone(local_tz),
                    "id": header_table_id,
                    "so_details": mail_data,
                }
                log = {
                "po_number": payload.PoNumber,
                "log": SuccessMessage.SALES_ORDER_CREATE_SUCCESS,
                "status": MtEcomStatusType.SO_SUCCESS,
                 }
                self.DATA_PERSIST_SERVICE.create_logs(log)
                logger.info(SuccessMessage.SALES_ORDER_CREATE_SUCCESS,payload.PoNumber)
                if len(mail_data):
                    logger.info("Sending mail for SO creation")
                    self.MAIL_HELPER.send_mail(body, subject)
                return {"message": SuccessMessage.SALES_ORDER_CREATE_SUCCESS,"so_number" : so_number}
            else:
                log = {
                "po_number": payload.PoNumber,
                "log": ErrorMessage.SALES_ORDER_CREATE_FAILED,
                "status": MtEcomStatusType.SO_FAILED,
                }
                self.DATA_PERSIST_SERVICE.create_logs(log)
                logger.info(ErrorMessage.SALES_ORDER_CREATE_FAILED,payload.PoNumber)
                return {"message": ErrorMessage.SALES_ORDER_CREATE_FAILED}
        except Exception as e:
            print("EXCEPTION: in PoInwardService -> so_creation", e)
            raise SoException(order.po_number, e)

    @log_decorator
    def mt_ecom_download_reports(self, data: dict):
        """
        Description: To download the reports
        Parameters:
            - data: dict - .
        Return: response
        """
        try:
            logger.info("po_inward_service -> mt_ecom_download_reports")
            reports_data = []
            reports_sorted = pd.DataFrame()
            if data.get("type","") :
                data["data"] = {}
                data["data"]["from_date"] = datetime.now() - timedelta(days=7)
                data["data"]["to_date"] = datetime.now() - timedelta(days=1)
            response = self.DATA_PERSIST_MODEL.download_reports(data.get("data"))
            reports_data.extend(
                [
                    {
                        "Customer Name": row.get("customer"),
                        "TCPL Plant Code": str(self.HELPER_CLASS.remove_custom_types(row.get("plant_code"))),
                        "TCPL Plant Name": row.get("plant_name"),
                        "Site Code": row.get("site_code"),
                        "Customer Code": row.get("customer_code"),
                        "PO Number": row.get("po_number"),
                        "SO Number": row.get("so_number"),
                        "ITEM Number": row.get("item_number"),
                        "Invoice Number": str(self.HELPER_CLASS.remove_custom_types(row.get("invoice_number"))),
                        "ASN Number": str(self.HELPER_CLASS.remove_custom_types(row.get("invoice_number"))),
                        "PO Date": str(self.HELPER_CLASS.remove_custom_types(row.get("po_created_date"))),
                        "Delivery Date": "",
                        "PO Expiry Date": str(self.HELPER_CLASS.remove_custom_types(row.get("delivery_date"))),
                        "SO Create Date": str(self.HELPER_CLASS.remove_custom_types(row.get("so_created_date"))),
                        "Invoice Date": str(self.HELPER_CLASS.remove_custom_types(row.get("invoice_date"))),
                        "Customer Article Code": str(self.HELPER_CLASS.remove_custom_types(row.get("customer_product_id"))),
                        "Customer Article Description": row.get("po_item_description"),
                        "Parent SKU Code": str(self.HELPER_CLASS.remove_custom_types(row.get("psku_code"))),
                        "Parent SKU Description": row.get("psku_description"),
                        "SKU Code": str(self.HELPER_CLASS.remove_custom_types(row.get("system_sku_code"))),
                        "SKU Description": row.get("system_sku_description"),
                        "SWITCHOVER SKU": str(self.HELPER_CLASS.remove_custom_types(row.get("switchover_sku"))),
                        "Po ToT": str(self.HELPER_CLASS.remove_custom_types(row.get("tot"))),
                        "SAP ToT": str(self.HELPER_CLASS.remove_custom_types(row.get("sap_tot"))),
                        "PO MRP": str(self.HELPER_CLASS.remove_custom_types(row.get("mrp"))),
                        "SAP MRP": str(self.HELPER_CLASS.remove_custom_types(row.get("sap_mrp"))),
                        "PO Base Cost": str(self.HELPER_CLASS.remove_custom_types(row.get("base_price"))),
                        "SAP Base Cost": str(self.HELPER_CLASS.remove_custom_types(row.get("tcpl_base_price"))),
                        "PO Caselot": str(self.HELPER_CLASS.remove_custom_types(row.get("caselot"))),
                        "SAP Caselot": str(self.HELPER_CLASS.remove_custom_types(row.get("sap_caselot"))),
                        "Remaining Qty (Pieces)": str(self.HELPER_CLASS.remove_custom_types(row.get("remaining_caselot"))),
                        "PO Qty": str(self.HELPER_CLASS.remove_custom_types(row.get("target_qty"))),
                        "SO Qty in cv": str(self.HELPER_CLASS.remove_custom_types(row.get("so_qty"))),
                        "Invoice Qty": str(self.HELPER_CLASS.remove_custom_types(row.get("invoice_quantity"))) if row.get("invoice_quantity") else str(self.HELPER_CLASS.remove_custom_types(row.get("delivery_quantity"))),
                        "PO UOM": str(self.HELPER_CLASS.remove_custom_types(row.get("uom"))),
                        "SAP UOM": "CV",
                        "Invoice MRP": str(self.HELPER_CLASS.remove_custom_types(row.get("invoice_mrp"))),
                        "Invoice Base Price": str(self.HELPER_CLASS.remove_custom_types(row.get("invoice_base_price"))),
                        "Invoice UOM": str(self.HELPER_CLASS.remove_custom_types(row.get("invoice_uom"))),
                        "Status": row.get("status"),
                        "ROR": row.get("ror"),
                        "ROR Description" : row.get("ror_description"),
                        "PoC Details" : row.get("ror_spoc"),
                    }
                    for row in response
                ]
            )
            reports_data_df = pd.DataFrame(reports_data)
            if len(reports_data_df):
                reports_sorted = reports_data_df.sort_values(
                    by=["PO Date", "PO Number", "ITEM Number"], ascending=True
                )
            if data.get("type","") :
                response = self.MAIL_HELPER.send_ecom_reports(reports_sorted,data)
                if response == constants.RECIPIENT_NOT_FOUND:
                    return response
                else:
                    return "Email Sent Succesfully"
            else:
                output = StringIO()
                reports_sorted.to_csv(output,index=False,encoding='utf-8-sig')
                response = output.getvalue()
                return response
        except Exception as e:
            logger.error("EXCEPTION in PoInwardService -> mt_ecom_download_reports", e)
            return None
        
    @log_decorator   
    def export_po_data(self,data:dict):
        try:
            logger.info("po_inward_service-> export_po_data")
            response = self.DATA_PERSIST_MODEL.export_po_data(data)
            return response
        except Exception as e:
            print("EXCEPTION in PoInwardService -> export_po_data", e)
            return None

    @log_decorator   
    def transformed_order_details(self, po_details: PoDTO, customer: str,po_number: str,original_po_details:dict, location:str = "", request_id: str = ""): 
        try:
            logger.info("PoInwardService -> transformed_order_details")
            # Check if So Created for the given PO
            so_number_exists = self.DATA_PERSIST_SERVICE.get_so_number(po_number)    
            data = {
                "original": original_po_details,
                "generic": json.loads(po_details.model_dump_json()),
            }
            data_type = {
                "type": "PO Original and Generic",
                "po_number": po_details.po_number,
            }
            self.DATA_PERSIST_SERVICE.save_req_res(data, data_type,request_id)

            json_file_key: str = self.S3_SERVICE.send_po_to_s3(po_details, customer)
            self.S3_SERVICE.send_po_copy_to_s3(original_po_details, customer,po_details.po_number)

            # persist the S3 key to database (header table)
            res_id: str = self.DATA_PERSIST_SERVICE.persist_po_key(
                po_details, json_file_key, customer, location
            )
            if so_number_exists:
                logger.info("SO Number already exists for po_number :", po_number)
                return False
            else:
                #  save items into item table
                self.DATA_PERSIST_SERVICE.save_item_details(po_details, res_id)

                # send to SQS
                self.SQS_HELPER.send_data_so_sqs(po_details.po_number)

                acknowledgement = self.DATA_PERSIST_SERVICE.fetch_workflow_configurations(customer).get("acknowledgement")
                # acknowledgement validation : fetch the configuration as per the acknowledgement
                if acknowledgement:
                    ack_data = self.PO_ACK_SERVICE.po_acknowledgement(    
                        po_details,
                        customer
                    )
                
                    log = {
                        "po_number": po_number,
                        "log": SuccessMessage.ACKNOWLEDGEMENT_SENT,
                        "status": MtEcomStatusType.ACKNOWLEDGEMENT_SUCCESS,
                        "data": ack_data,
                    }
                    self.DATA_PERSIST_SERVICE.create_logs(log)
                    return ack_data
                else:
                    return "No Acknowledgment"
        except SQSException as sqe:
            logger.error('SqsException',sqe,)
            return False
        except PoAcknowledgementException as pae:
            logger.error(pae)
            return False
        except S3Exception as se:
            print(se)
            return False    
    @log_decorator    
    def delete_po(self,data:dict):
        try:
            logger.info("PoInwardService -> delete_po", data)
            if data.get('type'):
                response = self.DATA_PERSIST_SERVICE.change_po_status()
                return {"status": "Success", "Status Updated": response}
            else:
                response = self.DATA_PERSIST_SERVICE.delete_po(data)
                # self.SQS_HELPER.clear_queue()
                return {"status": "success", "PO Deleted": response}
        except Exception as e:
            logger.error("EXCEPTION in PoInwardService -> delete_po", e)
            return None
        
    @log_decorator
    async def mt_ecom_download_po(self, data: dict):
        """
        Description: To download the PO
        Parameters:
            - data: dict - .
        Return: response
        """
        try:
            logger.info("po_inward_service -> mt_ecom_download_po")
            po_data = self.DATA_PERSIST_SERVICE.get_po_copy(data.get('po',''))
            if po_data and po_data.get('xml_file_name','') :
                response = self.S3_SERVICE.receive_data_from_s3_shopify(po_data.get('xml_file_name', ''))
                return {"type" : 'xml', "data" : response}
            elif po_data and po_data.get('customer') == Customers.ZEPTO or po_data.get('customer') == Customers.SWIGGY:
                json_file_key = (
                        ENV + '/'
                        + po_data.get('customer','')
                        + "/po/"
                        + data.get('po','')
                        +".csv"
                    )
                response = self.S3_SERVICE.receive_data_from_s3_shopify(json_file_key)
                return {"type" : 'csv', "data" : response}
            else:
                json_file_key = (
                        ENV + '/'
                        + po_data.get('customer','')
                        + "/po/"
                        + data.get('po','')
                    )
                s3_response = self.S3_SERVICE.get_file_by_prefix(json_file_key)
                if 'Contents' not in s3_response:
                    raise Exception("No files found with the given prefix")

                # Assuming you want the first file that matches the prefix
                file_name = s3_response.get('Contents',[])[0].get('Key','')
                response = self.S3_SERVICE.receive_data_from_s3_shopify(file_name)
                return {"type" : 'json', "data" : response}
        except Exception as e:
            logger.error("EXCEPTION in PoInwardService -> mt_ecom_download_po", e)
            return None
        
    @log_decorator
    async def mt_ecom_download_po_details(self, data: dict):
        """
        Description: To download the PO Details
        Parameters:
            - data: dict - .
        Return: response
        """
        try:
            logger.info("po_inward_service -> mt_ecom_download_po_details")
            response = self.DATA_PERSIST_SERVICE.get_po_details(data.get('po',''))
            df = pd.DataFrame(response)
            output = StringIO()
            df.to_csv(output,index=False,encoding='utf-8-sig')
            response = output.getvalue()
            return {"type" : 'csv', "data" : response}
        except Exception as e:
            logger.error("EXCEPTION in PoInwardService -> mt_ecom_download_po_details", e)
            return None
        
    @log_decorator
    async def mt_ecom_download_so_req_res(self, data: dict):
        """
        Description: To download the SO Request and Response
        Parameters:
            - data: dict - .
        Return: response
        """
        try:
            logger.info("po_inward_service -> mt_ecom_download_so_req_res")
            response = self.DATA_PERSIST_SERVICE.get_so_req_res(data.get('po',''))
            req = json.loads(response[0].get("column_values",{}).get('req', {}))
            res = json.loads(response[0].get("column_values",{}).get('res', {}))
            if not req or not res:
                return {"type": 'json', "data": "No data found for the given PO"}
            
            return {"type" : 'json', "data" : json.dumps({"req":req, "res": res})}
        except Exception as e:
            logger.error("EXCEPTION in PoInwardService -> mt_ecom_download_so_req_res", e)
            return None