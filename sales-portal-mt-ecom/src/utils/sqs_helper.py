import boto3
import json
from src.utils import constants
from src.config.configurations import SQS
from src.exceptions.sqs_exception import SQSException
from src.enums.customers_enum import Customers
from src.libs.loggers import log_decorator,Logger
from src.constants.globals import GlobalsVars


logger=Logger("SQSHelper")
global_vars = GlobalsVars()

class SQSHelper:
    def __init__(self):
        self.validate_queue_url = SQS.get('VALIDATE_PO_SQS')
        self.invoice_queue_url = SQS.get('INVOICE_SQS')
        self.so_queue_url = SQS.get('SO_SQS')
        self.invoicing_queue_url = SQS.get('INVOICING_SQS')

        self.so_sqs_urls = {
            Customers.BLINKIT : SQS.get('BLINKIT_SO_SQS'),
            Customers.AMAZON : SQS.get('AMAZON_SO_SQS'),
            Customers.BIGBASKET : SQS.get('BIGBASKET_SO_SQS'),
            Customers.ZEPTO : SQS.get('ZEPTO_SO_SQS'),
            Customers.SWIGGY : SQS.get('SWIGGY_SO_SQS'),
        }

        self.invoicing_sqs_urls = {
            Customers.BLINKIT : SQS.get('BLINKIT_INVOICE_SQS'),
            Customers.AMAZON : SQS.get('AMAZON_INVOICE_SQS'),
            Customers.BIGBASKET : SQS.get('BIGBASKET_INVOICE_SQS'),
            Customers.ZEPTO : SQS.get('ZEPTO_INVOICE_SQS'),
            Customers.SWIGGY : SQS.get('SWIGGY_INVOICE_SQS'),
        }

        logger = None
        
    @log_decorator
    def send_data_to_sqs(self,po_number):
        try:
            logger.info("Inside send_data_to_sqs",po_number)
            resource = boto3.resource('sqs')
           
            queue =resource.Queue(self.validate_queue_url)
            queue.send_message(
                QueueUrl=self.validate_queue_url,
                MessageBody=str(po_number)
                )
        except Exception as e:
            logger.error("Exception in sqs_helper -> send_data_to_sql", e)
            raise SQSException("send_data_to_sql", e)
    
    @log_decorator
    def send_data_to_invoice_sqs(self,payload):
        logger.info("Inside SQSHelper -> send_data_to_invoice_sqs, payload: ")
        resource = boto3.resource('sqs')
        queue =resource.Queue(self.invoice_queue_url)
        queue.send_message(
            QueueUrl=self.invoice_queue_url,
            MessageBody=json.dumps(payload),
            )
    @log_decorator    
    def send_data_so_sqs(self,po_number):
        try:
            logger.info(f"Inside send_data_so_sqs: po_number={po_number}")
            resource = boto3.resource('sqs')
            #customers check
            sqs_url = self.so_sqs_urls.get(global_vars.get_current_customer())
            logger.info(f"Inside send_data_so_sqs=> SO CREATION SQS URL: {sqs_url}")
            queue = resource.Queue(sqs_url)
            queue.send_message(
                QueueUrl=sqs_url,
                MessageBody=str(po_number)
                )
        except Exception as e:
            logger.error("Exception in sqs_helper -> send_data_to_sqs", e)
            raise SQSException("send_data_to_sql", e)
    @log_decorator
    def send_data_to_invoicing_sqs(self,payload):
        try:
            logger.info("Inside SQSHelper -> send_data_to_invoicing_sqs ")
            resource = boto3.resource('sqs')

            sqs_url = self.invoicing_sqs_urls.get(global_vars.get_current_customer())
            logger.info(f"Inside SQSHelper -> send_data_to_invoicing_sqs ->INVOICE SQS URL: {sqs_url}")
            queue =resource.Queue(sqs_url)
            queue.send_message(
                QueueUrl=sqs_url,
                MessageBody=json.dumps(payload),
                )
        except Exception as e:
            logger.error("Exception in sqs_helper -> send_data_to_invoicing_sql", e)
            raise SQSException("send_data_to_invoicing", e)
        
    @log_decorator    
    def delete_message(self,receipt_handle,type):
        try:
            logger.info(f"Inside SQS_Helper-> delete_message",receipt_handle) 
            queue_url = ''
            if type == 'so':
                queue_url = self.validate_queue_url
            elif type == 'invoice':
                queue_url = self.invoice_queue_url
            elif type == "so_creation":
                queue_url = self.so_sqs_urls.get(global_vars.get_current_customer())
                logger.info(f"Inside SQS_Helper-> delete_message SO SQS URL:{queue_url}")
            elif type == "invoicing":
                queue_url = self.invoicing_sqs_urls.get(global_vars.get_current_customer())
                logger.info(f"Inside SQS_Helper-> delete_message INVOICE SQS URL: {queue_url}")
            sqs_client = boto3.client("sqs", region_name="ap-south-1")
            response = sqs_client.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=receipt_handle,
            )
            return response
        except Exception as e:
            logger.error("EXCEPTION: in SQSHelper -> delete_message ", e)
            raise SQSException(receipt_handle, e) 