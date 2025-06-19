from src.models.dto.po_dto import PoDTO
from src.services.po_inward_service import PoInwardService
from src.services.s3_service import S3Service
from src.services.data_persist_service import DataPersistService
from src.utils.sqs_helper import SQSHelper
from src.exceptions.po_transformer_exception import PoTransformerException
from src.exceptions.S3_exception import S3Exception
from src.exceptions.data_persisting_exception import DataPersistingException
from src.exceptions.sqs_exception import SQSException
from src.services.po_acknowledgement_service import PoAckService
from src.exceptions.po_acknowledgement_exception import PoAcknowledgementException
from src.enums.customers_enum import Customers
from src.enums.success_message import SuccessMessage
from src.enums.mt_ecom_status_type import MtEcomStatusType
from src.transformers.sap_transformers import SapTransformers
from src.utils.sap_service import SapService
from src.exceptions.article_lookup_exception import ArticleLookupException
from src.exceptions.mrp_exception import MrpException
from src.exceptions.caselot_exception import CaselotException
from src.exceptions.validation_exception import ValidationException
from src.services.workflow_validation_service import WorkflowValidationService
from src.enums.error_message import ErrorMessage
from src.constants.globals import GlobalsVars
import json
from src.libs.loggers import log_decorator, Logger
from threading import Thread
import pandas as pd
from io import BytesIO


logger = Logger("PO_CONTROLLER")
global_var = GlobalsVars()

class PoController:
    PO_INWARD_SERVICE = None
    DATA_PERSIST_SERVICE = None
    WORKFLOW_VALIDATION_SERVICE = None
    S3_SERVICE = None
    SQS_HELPER = None
    PO_ACK_SERVICE = None
    logger = None

    def __init__(self):
        self.PO_INWARD_SERVICE = PoInwardService()
        self.DATA_PERSIST_SERVICE = DataPersistService()
        self.WORKFLOW_VALIDATION_SERVICE = WorkflowValidationService()
        self.S3_SERVICE = S3Service()
        self.SQS_HELPER = SQSHelper()
        self.PO_ACK_SERVICE = PoAckService()
   
    @log_decorator
    async def po_receiver(self, po_details,pdf=None,csv=None):
        """
        Description: This is a generic method to be called by Customers.
            - Convert customer specific order payload to generic payload (XML,JSON,PDF,CSV)
            - Send to S3
            - Store the S3 key to database
            - Send to SQS
            - Send PO Acknowledgement to the specific customer

        Parameters:
            - po_details: Dict - Details of the order.
        Return: response
        """
        try:
            logger.info("po_controller -> po_receiver request", po_details)
            order = ''
            if pdf:
                file = await pdf.read()
                pdf_file_name = pdf.filename
                self.S3_SERVICE.upload_file(pdf_file_name, file,po_details.headers.get("customer"))
            if csv:
                data = await csv.read()
                df = pd.read_csv(BytesIO(data))
                csv_file_name = csv.filename
                self.S3_SERVICE.upload_file(csv_file_name, data,po_details.headers.get("customer"))
                order = df.to_json(orient='records')   
            else :
                order = await po_details.body()
            customer = po_details.headers.get("customer")
            location = po_details.headers.get("location", "") or ""
            request_id = po_details.headers.get("amazonRequestId", "") or ""
            orders = json.loads(order)

            #set the global variable
            global_var.set_current_customer(customer)

            if customer == Customers.AMAZON:
                Thread(target=self.PO_INWARD_SERVICE.convert_customer_orders, args=(orders, customer, location, request_id)).start()
                return True

            # transform to generic payload
            return self.PO_INWARD_SERVICE.convert_customer_orders(orders, customer, location)          
        except PoTransformerException as pte:
            print(pte)
            return False
        except S3Exception as se:
            print(se)
            return False
        except DataPersistingException as dpe:
            print(dpe)
            return False
        except SQSException as sqe:
            print(sqe)
            return False
        except PoAcknowledgementException as pae:
            print(pae)
            return False
        except Exception as e:
            print(e)
            return False

    @log_decorator
    def so_creation(self, data: dict):
        """
        Description: This is a generic method to be called by SQS.
            - receive PO number from SQS
            - retrieve po details from S3
            - validate the PO as per the defined validations for the specific customers
            - send the validated PO to SAP for SO creation
            - delete reference from SQS

        Parameters:
            - data: dict - .
        Return: response
        """
        try:
            logger.info("po_controller -> so_creation request", data)
            po_number = ""
            receipt_handle = ""
            if data.get("PO"):
                po_number = data.get("PO")
            elif data and data.get("body"):
                po_number = data.get("body")
                receipt_handle = data.get("receiptHandle")
            else:
                return False
            so_number_exists = self.DATA_PERSIST_SERVICE.get_so_number(po_number)
            check_maintaineance = self.DATA_PERSIST_SERVICE.check_maintenance()
            if so_number_exists:
                return SuccessMessage.SO_ALREADY_EXISTS
            if check_maintaineance[0].get('status') == 'OPEN':
                return {'error': ErrorMessage.MAINTENANCE_OPEN}
            # retrieve the file name against the PO number
            file_names = self.DATA_PERSIST_SERVICE.fetch_po_key(po_number)
            json_file_name = file_names.get("json_file_name")
            customer = file_names.get("customer")
             #set the global variable
            global_var.set_current_customer(customer)
            header_table_id = file_names.get("id")

            # retrieve PO details from S3
            order_data = self.S3_SERVICE.receive_data_from_s3(json_file_name)
            if data.get("customer_code"):
                order_data.customer_code = str(data.get("customer_code"))
                json_file_key: str = self.S3_SERVICE.send_po_to_s3(order_data, customer)
                self.DATA_PERSIST_SERVICE.insert_json_key(
                    json_file_key, order_data.po_number)
            # validate the PO
            validated_order: PoDTO = self.po_validation_orchestration(
                order_data, customer, header_table_id
            )

            # SO creation
            if validated_order and len(validated_order.items):
                logger.info("Sending PO to SAP for SO creation")
                so_response = self.PO_INWARD_SERVICE.so_creation(
                    validated_order, header_table_id
                )
                self.DATA_PERSIST_SERVICE.change_po_status()
            else:
                logger.info("SO creation failed")
                return {"message": ErrorMessage.SALES_ORDER_CREATE_FAILED}
            

            # delete key from SQS
            if receipt_handle:
                logger.info("Inside po_controllers -> Deleting message from SQS")
                self.SQS_HELPER.delete_message(receipt_handle, "so_creation")
            return so_response
        except DataPersistingException as dpe:
            print("EXCEPTION in po_controller -> so_creation", dpe)
            return None
        except S3Exception as se:
            print("EXCEPTION in po_controller -> so_creation-> S3Exception", se)
            return None
        except ArticleLookupException as ae:
            print("EXCEPTION in po_controller -> so_creation-> Article exception", ae)
            return None
        except MrpException as me:
            print("EXCEPTION in po_controller -> so_creation -> MrpException", me)
            return None
        except CaselotException as ce:
            print("EXCEPTION in po_controller -> so_creation -> CaselotException", ce)
            return None
        except SQSException as se:
            print("EXCEPTION: in PoController -> po_validation_orchestration", se)
            return None
        except Exception as e:
            print("EXCEPTION in po_controller -> so_creation", e)
            return None

    @log_decorator
    def po_validation_orchestration(
        self, order: PoDTO, customer: Customers, header_table_id: int
    ):
        """
        Description: Orchestration of PO validation to be conducted before SO creation. It would
        validate the PO as per the defined validations for the specific customers
            - Article lookup
            - MRP Check-1
            - Caselot check
        Parameters:
            - order: PoDTO : order data as fetched from S3
            - customer: Customer: customer name
            - id: int: mt_ecom_header_table id
        Returns:
            - order: PoDTO: order data which got validated and also contain the ROR at line level
        """
        try:
            logger.info("po_controller -> po_validation_orchestration request", order)
            # fetch the configuration as per the
            workflow = self.DATA_PERSIST_SERVICE.fetch_workflow_configurations(customer)

            article, tot, mrp_1, base_price, caselot = (
                workflow.get("article"),
                workflow.get("tot"),
                workflow.get("mrp_1"),
                workflow.get("base_price"),
                workflow.get("caselot"),
            )

            # Article lookup validation
            if article:
                order: PoDTO = (
                    self.WORKFLOW_VALIDATION_SERVICE.article_lookup_validation(
                        order, header_table_id
                    )
                )

            # TOT validation
            if tot and len(order.items):
                order: PoDTO = self.WORKFLOW_VALIDATION_SERVICE.tot_validation(
                    order, header_table_id
                )
            # MRP CHECK-1 validation
            if mrp_1 and len(order.items):
                order: PoDTO = self.WORKFLOW_VALIDATION_SERVICE.mrp_check_1_validation(
                    order, header_table_id
                )
            
            # Base Price validation
            if base_price and len(order.items):
                order: PoDTO = self.WORKFLOW_VALIDATION_SERVICE.base_price_validation(
                    order, header_table_id
                )

            # CASELOT validation
            if caselot and len(order.items):
                order: PoDTO = self.WORKFLOW_VALIDATION_SERVICE.caselot_validation(
                    order, header_table_id, customer
                )

            return order
        except ArticleLookupException as ae:
            raise ValidationException(header_table_id, ae)
        except MrpException as me:
            raise MrpException(order.po_number, me)
        except CaselotException as ce:
            raise CaselotException(order.po_number, ce)
        except Exception as e:
            logger.error("EXCEPTION: in PoController -> po_validation_orchestration", e)
            raise ValidationException(header_table_id, e)

    @log_decorator
    async def mt_ecom_download_reports(self, data: dict):
        try:
            logger.info("mt_ecom_download_reports request", data)
            response = self.PO_INWARD_SERVICE.mt_ecom_download_reports(data)
            if response is None:
                raise ValueError(
                    "Response from PO_INWARD_SERVICE.mt_ecom_download_reports cannot be None"
                )

            return response
        except Exception as e:
            logger.error("Exception in po_urls -> mt_ecom_download_reports", e)
            return {"success": "failure", "error": str(e)}

    @log_decorator    
    async def export_po_data(self, data: dict):
        try:
            logger.info("export_po_data request", data)
            response = self.PO_INWARD_SERVICE.export_po_data(data)
            if response is None:
                raise ValueError(
                    "Response from PO_INWARD_SERVICE.export_po_data cannot be None"
                )

            return response
        except Exception as e:
            print("Exception in po_controller -> export_po_data", e)
            return {"success": "failure", "error": str(e)}

    @log_decorator    
    async def delete_po(self, data: dict):
        """
        Description: This is a generic method to Delete PO.
            - To delete the PO from Database
            - Clear the queue

        Parameters:
            - customer: str - Customer Name.
            - from_date: str - From which Date to delete the records.
            - to_date: str - to which Date to delete the records.
            - type: str - to change the status.
        Return: response
        """
        try:
            response = self.PO_INWARD_SERVICE.delete_po(data)
            if response is None:
                raise ValueError(
                    "Response from PO_INWARD_SERVICE.delete_po cannot be None"
                )

            return response
        except Exception as e:
            print("Exception in po_controller -> delete_po", e)
            return {"success": "failure", "error": str(e)}
        
    @log_decorator
    async def mt_ecom_download_po(self, data: dict):
        """
        Description: This is a generic method to Download PO.
            - To Download the PO from S3

        Parameters:
            - data: dict - Contains PO Number.
        Return: response
        """
        try:
            logger.info("mt_ecom_download_po request", data)
            response = await self.PO_INWARD_SERVICE.mt_ecom_download_po(data)
            if response is None:
                raise ValueError(
                    "Response from PO_INWARD_SERVICE.mt_ecom_download_po cannot be None"
                )

            return response
        except Exception as e:
            logger.error("Exception in po_urls -> mt_ecom_download_po", e)
            return {"success": "failure", "error": str(e)}
    
    @log_decorator
    async def mt_ecom_download_po_details(self, data: dict):
        """
        Description: This is a generic method to Download PO Deetails.
            - To Download the PO Details in CSV

        Parameters:
            - data: dict - Contains PO Number.
        Return: response
        """
        try:
            logger.info("mt_ecom_download_po_details request", data)
            response = await self.PO_INWARD_SERVICE.mt_ecom_download_po_details(data)
            if response is None:
                raise ValueError(
                    "Response from PO_INWARD_SERVICE.mt_ecom_download_po_details cannot be None"
                )

            return response
        except Exception as e:
            logger.error("Exception in po_urls -> mt_ecom_download_po_details", e)
            return {"success": "failure", "error": str(e)}
    
    @log_decorator
    async def mt_ecom_download_so_req_res(self, data: dict):
        """
        Description: This is a generic method to Download SO Request and Response.
            - To Download the SO Request and Response in JSON

        Parameters:
            - data: dict - Contains PO Number.
        Return: response
        """
        try:
            logger.info("mt_ecom_download_so_req_res request", data)
            response = await self.PO_INWARD_SERVICE.mt_ecom_download_so_req_res(data)
            if response is None:
                raise ValueError(
                    "Response from PO_INWARD_SERVICE.mt_ecom_download_so_req_res cannot be None"
                )

            return response
        except Exception as e:
            logger.error("Exception in po_urls -> mt_ecom_download_so_req_res", e)
            return {"success": "failure", "error": str(e)}
