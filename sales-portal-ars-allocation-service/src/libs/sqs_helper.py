import boto3
import json
from src.config.configurations import SQS
from src.exceptions.sqs_exceptions import SQSException


class SQSHelper:
    aos_submit_queue_url = ""
    
    def __init__(self):
        self.aos_submit_queue_url = SQS.get("AOS_SUBMIT_QUEUE_SQS")

    def send_data_to_sqs(self, payload):
        try:
            print("Inside send_data_to_sqs", payload)
            resource = boto3.resource("sqs")
            queue = resource.Queue(self.aos_submit_queue_url)
            queue.send_message(
                QueueUrl=self.aos_submit_queue_url, MessageBody=str(payload)
            )
        except Exception as e:
            print("Exception in sqs_helper -> send_data_to_sql", e)
            raise SQSException("send_data_to_sql", e)

    def delete_message(self, receipt_handle, type):
        try:
            queue_url = ""
            if type == "aos_submit":
                queue_url = self.aos_submit_queue_url

            sqs_client = boto3.client("sqs", region_name="ap-south-1")
            response = sqs_client.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=receipt_handle,
            )
            return response
        except Exception as e:
            print("EXCEPTION: in SQSHelper -> delete_message ", e)
            raise SQSException(receipt_handle, e)
