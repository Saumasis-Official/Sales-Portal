import os
import requests
from requests.auth import HTTPBasicAuth
from src.utils import constants
from src.config.configurations import RELIANCE_CONFIG,S3_BUCKET_NAME
import boto3
import datetime

soap_url = RELIANCE_CONFIG.get('RELIANCE_API_URL')
username = RELIANCE_CONFIG.get('RELIANCE_USERNAME')
password = RELIANCE_CONFIG.get('RELIANCE_PASSWORD')
edi_soap_action = RELIANCE_CONFIG.get('RELIANCE_SOAP_ACTION')
bucket_name = S3_BUCKET_NAME
s3_client = boto3.client('s3')
env = os.environ.get('ENV')

class AcknowledgementHelper:
    def send_data_to_rel(self,data):
        print('In sendDataToRel()')
        headers = {"Content-Type": "application/xml", "soapAction": edi_soap_action, "Accept": "application/json"}
        session = requests.Session()
        try:
            soap_body_resp = session.post(soap_url, data=data, verify=False, headers=headers,
                                        auth=HTTPBasicAuth(username, password))
            print('Response received from Reliance', soap_body_resp)
            return soap_body_resp

        except ConnectionError as e:
            print(str(e))
            raise e
        except Exception as e:
            print(str(e))
            raise e


    def send_instant_ack(self,unique_id,po_number):
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
            xml_file_key = env+'/'+'Acknowledgement/'+po_number + str(datetime.datetime.now().isoformat(timespec='seconds') + 'Z')
            s3_client.put_object(Bucket=bucket_name, Key=xml_file_key, Body=data)
            headers = {"Content-Type": "application/xml", "soapAction": edi_soap_action, "Accept": "application/json"}
            session = requests.Session()
            # session.cert = './cert/Server.cer'
            soap_body_resp = session.post(soap_url, data=data, verify=False, headers=headers,
                                        auth=HTTPBasicAuth(username, password))

            print('Got response from Reliance', soap_body_resp)

            return soap_body_resp


    def send_error_ack_to_reliance(self,unique_id, err_msg):
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
        if env == 'prod':

            rel_resp = self.send_data_to_rel(err_req)

            print("rel_resp", rel_resp)