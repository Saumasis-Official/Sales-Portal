import os
from src.utils import constants
import requests
from requests.auth import HTTPBasicAuth
from src.config.configurations import RELIANCE_CONFIG,S3_BUCKET_NAME
import os
import boto3
import datetime
edi_end_point = RELIANCE_CONFIG.get('RELIANCE_API_URL')
edi_soap_action =  RELIANCE_CONFIG.get('RELIANCE_SOAP_ACTION')
edi_soap_action = edi_soap_action.strip('\n') if edi_soap_action else None
username = RELIANCE_CONFIG.get('RELIANCE_USERNAME')
password = RELIANCE_CONFIG.get('RELIANCE_PASSWORD')

env = os.environ.get('ENV')
s3_client = boto3.client('s3')
class AcknowledgementHelper:
    def send_data_to_rel(self,data):
        print('In self.send_data_to_rel()')
        headers = {"Content-Type": "application/xml", "soapAction": edi_soap_action, "Accept": "application/json"}
        session = requests.Session()
        # session.cert = './cert/Server.cer'
        try:
            if env == 'prod':
                soap_body_resp = session.post(edi_end_point, data=data, verify=False, headers=headers,
                                            auth=HTTPBasicAuth(username, password))
                print('Response received from Reliance', soap_body_resp)
                return soap_body_resp

        except ConnectionError as e:
            print(str(e))
            print("1- connection error")
            print("error in connection error", e)
            raise e
        except Exception as e:
            print(str(e))
            print("2- send tata to rel")
            print("error in send data to rel", e)
            raise e


    def send_instant_ack(self,unique_id):
        data = """<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://xmlns.reliance.com/schema">
    <soapenv:Header/>
    <soapenv:Body>
        <sch:RIL_IB_MSG>
            <sch:SENDING_PARTNER>TGBL</sch:SENDING_PARTNER>
            <sch:UNIQUE_ID>{unique_id}</sch:UNIQUE_ID>
            <sch:MSG_TYPE>POACK</sch:MSG_TYPE>
            <sch:MSG_DATA>{unique_id}</sch:MSG_DATA>
        </sch:RIL_IB_MSG>
    </soapenv:Body>
    </soapenv:Envelope>"""
        if env == 'prod':
            data = data.format(unique_id=unique_id)
            try:
                rel_resp = self.send_data_to_rel(data)
            except Exception as e:
                print(str(e))
                print("3- send instant Ack ")
                print("error in sending Ack", e)
                raise e

            print("rel_resp", rel_resp)


    def prepare_error_info_xml(self,unique_id, PoNumber, log_type, err_data):
        print('prepareErrorInfoXML')
        print('PoNumber: ', PoNumber)
        print('log_type: ', log_type)
        print('err_data: ', err_data)

        if (log_type == 'MRP'):
            log_val = err_data.get('CorrectMRP')
            print("CorrectMRP")

        elif (log_type == 'CASELOT'):
            log_val = err_data.get('CorrectCaseLot')

        else:
            log_val = err_data.get('Error_message')

        if log_val == None:
            log_type = 'ERROR'
            log_val = 'something went wrong'
            print("ERROR")

        po_line = err_data.get('ItemNumber')

        if po_line == None:
            po_line = ""

        new_data = """&lt;ns1:ACKMSG>
                &lt;ns1:IDOC_NO>{unique_id}&lt;/ns1:IDOC_NO>
                &lt;ns1:PO_NO>{po_number}&lt;/ns1:PO_NO>
                &lt;ns1:LOG_TYPE>{log_type}&lt;/ns1:LOG_TYPE>
                &lt;ns1:LOG_VAL>{log_val}&lt;/ns1:LOG_VAL>
                &lt;ns1:PO_LINE_NO>{po_line}&lt;/ns1:PO_LINE_NO>
            &lt;/ns1:ACKMSG>"""

        new_data = new_data.format(unique_id=unique_id, po_number=PoNumber, log_type=log_type, log_val=log_val,
                                po_line=po_line)
        print(new_data,"New Data")
        return new_data


    def send_error_ack_to_reliance(self,unique_id, err_msg,type,po_number): 
        print("in sendErrorACKToReliance - NEW")

        err_req = """<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://xmlns.reliance.com/schema">
    <soapenv:Header/>
    <soapenv:Body>
        <sch:RIL_IB_MSG xmlns:SOAP-ENV = "http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch = "http://xmlns.reliance.com/schema">
            <sch:SENDING_PARTNER>TGBL</sch:SENDING_PARTNER>
            <sch:UNIQUE_ID>{unique_id}</sch:UNIQUE_ID>
            <sch:MSG_TYPE>POERR</sch:MSG_TYPE>
            <sch:MSG_DATA>&lt;ns1:Reliance_PO_Log_In_MT
        xmlns:SOAP-ENV=&quot;http://schemas.xmlsoap.org/soap/envelope/&quot;
        xmlns:ns1=&quot;http://xmlns.reliance.com/schema&quot;
        xmlns:SOAP=&quot;http://schemas.xmlsoap.org/soap/envelope/&quot;&gt;
        {err_msg}
    &lt;/ns1:Reliance_PO_Log_In_MT&gt;
            </sch:MSG_DATA>
        </sch:RIL_IB_MSG>
    </soapenv:Body>
    </soapenv:Envelope>"""

        err_req = err_req.format(unique_id=unique_id, err_msg=err_msg)

        print('err_req', err_req)
        error_file_key = env+'/'+ type +'/'+ po_number + str(datetime.datetime.now().isoformat(timespec='seconds') + 'Z')
        s3_client.put_object(Bucket=S3_BUCKET_NAME, Key=error_file_key, Body=err_req)
        rel_resp = self.send_data_to_rel(err_req)

        print("err_req", err_req)
        print("rel_resp", rel_resp)


    def send_error_to_reliance(self,unique_id, err_msg):
        print("in sendErrorToReliance - OLD")

        err_req = """<?xml version="1.0" encoding="utf-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://xmlns.reliance.com/schema">
    <soapenv:Header/>
    <soapenv:Body><sch:RIL_IB_MSG xmlns:SOAP-ENV = "http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch = "http://xmlns.reliance.com/schema">
            <sch:SENDING_PARTNER>TGBL</sch:SENDING_PARTNER>
            <sch:UNIQUE_ID>{unique_id}</sch:UNIQUE_ID>
            <sch:MSG_TYPE>POERR</sch:MSG_TYPE>
            <sch:MSG_DATA>&lt;ns1:Reliance_PO_Log_In_MT xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://xmlns.reliance.com/schema" xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
    &lt;ns1:ACKMSG>
                &lt;ns1:IDOC_NO>{unique_id}&lt;/ns1:IDOC_NO>
                &lt;ns1:PO_NO>{po_number}&lt;/ns1:PO_NO>
                &lt;ns1:LOG_TYPE>{log_type}&lt;/ns1:LOG_TYPE>
                &lt;ns1:LOG_VAL>{log_val}&lt;/ns1:LOG_VAL>
                &lt;ns1:PO_LINE_NO>{po_line}&lt;/ns1:PO_LINE_NO>
            &lt;/ns1:ACKMSG>
    &lt;/ns1:Reliance_PO_Log_In_MT>
            </sch:MSG_DATA>
    </sch:RIL_IB_MSG></soapenv:Body>
    </soapenv:Envelope>"""

        err_req = err_req.format(unique_id=unique_id, po_number=unique_id, log_type="ERROR", log_val=err_msg, po_line="")
        print(err_msg)
        if env == 'prod':
            rel_resp = self.send_data_to_rel(err_req)
            print("rel_resp", rel_resp)

