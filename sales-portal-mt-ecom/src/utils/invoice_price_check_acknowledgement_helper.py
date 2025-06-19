# import InvoicePriceCheck.Constants
import requests
import time
import os
import boto3
import datetime
from requests.auth import HTTPBasicAuth
from src.config.configurations import RELIANCE_CONFIG,S3_BUCKET_NAME
from src.models.invoice_price_check_model import InvoicePriceCheckModel
from src.utils.helper import HelperClass

invoice_price_check_model = InvoicePriceCheckModel()
env = os.environ.get('ENV')
s3_client = boto3.client('s3')
helper = HelperClass()
class AcknowledgementHelper:
    def send_data_to_rel(self,data):
        edi_end_point = RELIANCE_CONFIG.get('RELIANCE_API_URL')
        username = RELIANCE_CONFIG.get('RELIANCE_USERNAME')
        password = RELIANCE_CONFIG.get('RELIANCE_PASSWORD')
        edi_soap_action =  RELIANCE_CONFIG.get('RELIANCE_SOAP_ACTION')
        edi_soap_action = edi_soap_action.strip('\n')
        headers = {"Content-Type": "application/xml", "soapAction": edi_soap_action, "Accept": "application/json"}
        print("headers :", headers)
        try:
            time.sleep(0.01)
            soap_body_resp = requests.post(edi_end_point, data=data, verify=False, headers=headers,
                                        auth=HTTPBasicAuth(username, password))
            print('Response received from Reliance', soap_body_resp)
        except Exception as e:
            print(str(e))
            raise e


    def prepare_error_info_xml(self,unique_id, po_number, log_type, err_data):
        if (log_type == 'MRP'):
            log_val = err_data.get('CorrectMRP')

        else:
            log_val = err_data.get('Error_message')

        if log_val == None:
            log_type = 'ERROR'
            log_val = 'something went wrong'

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

        new_data = new_data.format(unique_id=unique_id, po_number=po_number, log_type=log_type, log_val=log_val,
                                po_line=po_line)

        return new_data


    def send_error_ack_to_reliance(self,unique_id, err_msg,po_number):
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
        if env == 'prod':
            err_req = err_req.format(unique_id=unique_id, err_msg=err_msg)
            mrp2_file_key = env+'/'+'MRP2/'+po_number + str(datetime.datetime.now().isoformat(timespec='seconds') + 'Z')
            s3_client.put_object(Bucket=S3_BUCKET_NAME, Key=mrp2_file_key, Body=err_req)
            self.send_data_to_rel(err_req)


    def prepare_line_item_asn_data(self,item_data, invoice_data, res_hdr):
        print('prepareLineItemASNData ######### item_data', item_data)
        print('prepareLineItemASNData', item_data.get('PoItemNumber'))
        data = {
            'item_number': item_data.get("PoItemNumber") if item_data.get("PoItemNumber") else item_data.get("ItemNumber"),
            'sales_order': res_hdr.get("SalesOrder")

        }
        res =invoice_price_check_model.get_line_item(data)
        try:
            sku_desc = res[0].get('po_item_description')
            # To remove multiple spaces and keep only single space
            sku_desc = " ".join(sku_desc.split())
        except:
            sku_desc = ""
        sku_code = item_data.get('SystemSKUCode') if item_data.get('SystemSKUCode') else 'SKU CODE HERE'
        Quantity = item_data.get('Quantity') if item_data.get('Quantity') else '0'
        print("Qunatity1 is ", Quantity)
        print("UoM is ", item_data.get('UoM'))
        UoM = item_data.get('UoM') if item_data.get('UoM') else '0'
        print("UoM1 is", UoM)
        case_config = invoice_data.get('CaseConfig') if invoice_data.get('CaseConfig') else '0.00'
        if sku_code == '000015000000000754':
            sku_desc = 'TATA LITE SALT PACKED 50 X 1 KG'
        line_item_data = """&lt;MainASNStruct>
            &lt;LIFEX>{INVOICE_NUMBER}&lt;/LIFEX>
            &lt;EBELN>{PO_NUMBER}&lt;/EBELN>
            &lt;FKDAT>{INVOIC_DATE}&lt;/FKDAT>
            &lt;LFDAT>{DELIVERY_DATE}&lt;/LFDAT>
            &lt;EBELP>{LINE_ITEM_NUMBER}&lt;/EBELP>
            &lt;KDMAT>{SKU_CODE}&lt;/KDMAT>
            &lt;EAN11>{EAN_NUMBER}&lt;/EAN11>
            &lt;MAKTX>{SKU_DESC}&lt;/MAKTX>
            &lt;LFIMG>{QUANTITY}&lt;/LFIMG>
            &lt;NETPR>{CORRECT_PRICE}&lt;/NETPR>
            &lt;ANZPK>{CASE_CONFIG}&lt;/ANZPK>
        &lt;/MainASNStruct>"""
        line_item_data = line_item_data.format(
            INVOICE_NUMBER=invoice_data.get('Invoice'),
            QUANTITY=UoM,
            PO_NUMBER=res_hdr.get('PONumber'),
            LINE_ITEM_NUMBER=item_data.get('PoItemNumber'),
            DELIVERY_DATE=invoice_data.get('DeliveryDate'),
            SKU_CODE=sku_code,
            SKU_DESC=sku_desc,
            EAN_NUMBER=item_data.get('EAN'),
            CASE_CONFIG=case_config,
            INVOIC_DATE=invoice_data.get('InvoiceDate'),
            CORRECT_PRICE=int(float(helper.sanitize_sap_price_value(item_data.get('CorrectMRP'))))
        )

        return line_item_data


    def send_asn_to_reliance(self,line_item_data, invoice_data, res_hdr):
        print('sendASNtoReliance', invoice_data.get('Invoice'))

        asn_data = """<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://xmlns.reliance.com/schema">
    <soapenv:Header/>
    <soapenv:Body>
            <ns0:RIL_IB_MSG xmlns:ns0 = "http://xmlns.reliance.com/schema">
            <ns0:SENDING_PARTNER>TGBL</ns0:SENDING_PARTNER>
            <ns0:UNIQUE_ID>{UNIQUE_ID}</ns0:UNIQUE_ID>
            <ns0:MSG_TYPE>ASNCUST</ns0:MSG_TYPE>
            <ns0:MSG_DATA>&lt;?xml version="1.0" encoding="UTF-8"?>
    &lt;DATA xmlns="http://retail.ril.com/asnmsg">
    {ASN_STRUCT}    
    &lt;/DATA>
            </ns0:MSG_DATA>
        </ns0:RIL_IB_MSG>
    </soapenv:Body>
    </soapenv:Envelope>
        """

        asn_data = asn_data.format(
            UNIQUE_ID=res_hdr.get('UniqueID'),
            ASN_STRUCT=line_item_data
        )

        print("asn_data", asn_data)
        asn_file_key = env+'/'+'ASN/'+res_hdr.get('PONumber') + str(datetime.datetime.now().isoformat(timespec='seconds') + 'Z')
        s3_client.put_object(Bucket=S3_BUCKET_NAME, Key=asn_file_key, Body=asn_data)
        if env == 'prod':
            self.send_data_to_rel(asn_data)
