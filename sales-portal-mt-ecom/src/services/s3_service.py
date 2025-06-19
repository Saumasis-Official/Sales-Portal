import json

import boto3
import datetime

from src.exceptions.S3_exception import S3Exception
from src.models.dto.po_dto import PoDTO
from src.config.configurations import ENV, S3_BUCKET_NAME

from src.mock_data import s3_po_data
from src.enums.customers_enum import Customers

class S3Service:
    S3_CLIENT = None

    def __init__(self):
        self.S3_CLIENT = boto3.client("s3")

    def send_po_to_s3(self, order_details: PoDTO,customer: str):
        """
        Description: to send order details to S3
        Parameters:
            - order_details:  PoDTO
        Returns:
            - json_file_key: str
        """
        print("inside S3Service -> send_po_to_s3")
        po_number = None
        try:
            po_number = order_details.po_number
            json_file_key = (
                    ENV + '/'
                    + customer
                    + "/json/"
                    + po_number
                    + str(datetime.datetime.now().isoformat(timespec="seconds") + "Z")
            )
            self.S3_CLIENT.put_object(
                Bucket=S3_BUCKET_NAME, Key=json_file_key, Body=order_details.model_dump_json()
            )
            return json_file_key
        except Exception as e:
            print("Exception in S3Service -> send_po_to_s3", e)
            raise S3Exception(po_number, e)

    def send_po_copy_to_s3(self, order_details: dict,customer: str,po_number :str):
        """
        Description: to send Po Copy to S3
        Parameters:
            - order_details:  dict
        """
        print("inside S3Service -> send_po_copy_to_s3")
        try:
           
            if customer == Customers.AMAZON:
                for order in order_details['payload']['orders']:
                    po_number = order.get('purchaseOrderNumber', '')
                    json_file_key = (
                        ENV + '/'
                        + customer
                        + "/po/"
                        + po_number
                        + str(datetime.datetime.now().isoformat(timespec="seconds") + "Z")
                    )
                    self.S3_CLIENT.put_object(
                        Bucket=S3_BUCKET_NAME, Key=json_file_key, Body=json.dumps(order)
                    )
            else:
              
                json_file_key = (
                        ENV + '/'
                        + customer
                        + "/po/"
                        + po_number
                        + str(datetime.datetime.now().isoformat(timespec="seconds") + "Z")
                )
                self.S3_CLIENT.put_object(
                    Bucket=S3_BUCKET_NAME, Key=json_file_key, Body=json.dumps(order_details)
                )
            return True
        except Exception as e:
            print("Exception in S3Service -> send_po_copy_to_s3", e)
            raise S3Exception(po_number, e)
        
    def receive_data_from_s3(self, file_name: str) -> PoDTO:
        """
        Description: Retrieve order data from S3 using the file_name
        Parameters:
            - file_name: str: File name to look for in S3
        Return:
            - response from S3
        """
        try:
            print("inside S3Service -> receive_data_from_s3")
            s3_object = self.S3_CLIENT.get_object(Bucket=S3_BUCKET_NAME, Key=file_name)
            json_data = s3_object['Body'].read().decode('utf-8') 

           # json_data: str = json.dumps(s3_po_data)
            order = PoDTO.model_validate_json(json_data)
            return order
        except Exception as e:
            print("EXCEPTION: in S3Service -> receive_data_from_s3", e)
            raise S3Exception(file_name, e)
    
    def save_shopify_payload_response(self,data:dict):
        """
        Description: to save shopify sap payload/response to S3
        Parameters:
            - data:  dict
        Returns:
            - json_file_key: str
        """
        print("inside S3Service -> save_shopify_payload_response")
        po_number = None
        try:
            po_number = data.get('po')
            json_file_key = (
                    ENV + '/'
                    + data.get('customer')
                    + "/"
                    + data.get('type')
                    + "/"
                    + po_number
                    + str(datetime.datetime.now().isoformat(timespec="seconds") + "Z")
            )
            self.S3_CLIENT.put_object(
                Bucket=S3_BUCKET_NAME, Key=json_file_key, Body=json.dumps(data.get('data'))
            )
            return json_file_key
        except Exception as e:
            print("Exception in S3Service -> save_shopify_payload_response", e)
            raise S3Exception(po_number, e)
        
    def receive_data_from_s3_shopify(self, file_name: str) :
        """
        Description: Retrieve order data from S3 using the file_name
        Parameters:
            - file_name: str: File name to look for in S3
        Return:
            - response from S3
        """
        try:
            print("inside S3Service -> receive_data_from_s3_shopify")
            s3_object = self.S3_CLIENT.get_object(Bucket=S3_BUCKET_NAME, Key=file_name)
            json_data = s3_object['Body'].read().decode('utf-8') 
            return json_data
        except json.JSONDecodeError as e:
            print("EXCEPTION: in S3Service -> receive_data_from_s3_shopify.JSONDecodeError", e)
            return None
        except Exception as e:
            print("EXCEPTION: in S3Service -> receive_data_from_s3_shopify", e)
            raise S3Exception(file_name, e)
        
    def get_file_by_prefix(self, prefix: str):
        """
        Description: Retrieve order data from S3 using the file_name
        Parameters:
            - prefix: str: prefix to look for in S3
        Return:
            - response from S3
        """
        try:
            print("inside S3Service -> download_file_by_prefix")
            s3_object = self.S3_CLIENT.list_objects_v2(Bucket=S3_BUCKET_NAME, Prefix=prefix)
            return s3_object
        except Exception as e:
            print("EXCEPTION: in S3Service -> download_file_by_prefix", e)
            raise S3Exception(prefix, e)
    
    def upload_file(self,filename:str,file,customer:str):
        """
        Description: to upload file to S3
        Parameters:
            - filename:  str
            - file:  file
            - customer:  str
        Returns:
            - json_file_key: str
        """
        print("inside S3Service -> upload_file")
        try:
            file_key = (
                        ENV + '/'
                        + customer
                        + "/po/"
                        + filename
                )
            self.S3_CLIENT.put_object(
                Bucket=S3_BUCKET_NAME, Key=file_key, Body=file
            )
            return file_key
        except Exception as e:
            print("Exception in S3Service -> upload_file", e)
            raise S3Exception(filename, e)