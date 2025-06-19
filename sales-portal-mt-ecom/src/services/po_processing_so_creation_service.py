from src.models.po_processing_so_creation_model import PoProcessingSoCreationModel
from src.utils.po_processing_so_creation_acknowledgement_helper import AcknowledgementHelper
from src.utils.error_helper import ErrorHelper
from src.services.ean_mapping_service import EanMappingService
from src.utils.sap_service import SapService
from src.utils.mail_helper import MailHelper
import src.utils.constants as constants
from src.utils.response_handlers import ResponseHandlers
from src.config.configurations import S3_BUCKET_NAME
import json
import copy
import boto3
import datetime
from src.utils.sqs_helper import SQSHelper
from src.models.data_persist_model import PersistModel
from src.services.data_persist_service import DataPersistService
from src.enums.error_message import ErrorMessage

po_processing_so_creation_model = PoProcessingSoCreationModel()
error_helper = ErrorHelper()
acknowledgement_helper = AcknowledgementHelper()
ean_mapping_service = EanMappingService()
mail_helper = MailHelper()
sap_service = SapService()
s3_client = boto3.client('s3')
bucket_name = S3_BUCKET_NAME
response_handlers = ResponseHandlers()
sqs_helper = SQSHelper()
persist_model = PersistModel()
DATA_PERSIST_SERVICE = DataPersistService()

class PoProcessingSoCreationService:
    def po_processing_so_creation_service(self, data):
        data = json.loads(data)
        po_number = ''
        json_key = ''
        so_payload = {}
        sales_order_number =''
        err_msg = ""
        receipt_handle = ''
        if data.get('PO NUMBER'):
            po_number = data.get('PO NUMBER')
        elif data and data.get('body'):
            po_number = data.get('body')
            receipt_handle = data.get('receiptHandle')
        else :
            return response_handlers.send(400,  "PO Number is not found")
        result = po_processing_so_creation_model.so_check(po_number)
        check_maintaineance = DATA_PERSIST_SERVICE.check_maintenance()
        if check_maintaineance[0].get('status') == 'OPEN':
                return {'error': ErrorMessage.MAINTENANCE_OPEN}
        if len(result) > 0 and result[0].get('so_number'):
            sales_order_number = result[0].get('so_number')
            json_key = result[0].get('json_file_name')
            s3_object = s3_client.get_object(Bucket=bucket_name, Key=json_key)
            json_data = s3_object['Body'].read().decode('utf-8')
            payload = ean_mapping_service.prepare_payload_from_xml_event(json.loads(json_data),result[0].get('unique_id'))
            line_item_data = {
                'data': payload.get('ean_full_details'),
                'unique_id': result[0].get('unique_id'),
                'po_number': po_number,
                'id': result[0].get('id'),
                'status': constants.XSD_SUCCESS,
                'type': 'Insert',
                'delivery_date': payload.get('po_date_to'),
                'customer_code': payload.get('customer_code')
            }
            po_processing_so_creation_model.save_or_update_line_item_details(line_item_data)
            previous_validity_date = result[0].get('delivery_date').date()
            new_validity_date =  datetime.datetime.strptime(payload.get('po_date_to'), '%Y-%m-%d').date()
            if previous_validity_date != new_validity_date:
                amendment_payload = ean_mapping_service.prepare_validity_date_payload(result,payload,po_number)
                response = sap_service.create_amendment(amendment_payload)
                amendment_req ={             
                    'req': json.dumps(amendment_payload),
                    'res': json.dumps(response.json()),
                    }
                po_processing_so_creation_model.save_req_res(amendment_req,{'type':'AMENDMENT validity date Request and Response','po_number':po_number})
                line_item_data = {
                        'id': result[0].get('id'),
                        'type': 'Date',
                        'delivery_date': payload.get('po_date_to')
                        }
                po_processing_so_creation_model.save_or_update_line_item_details(line_item_data)
            if receipt_handle:
                sqs_helper.delete_message(receipt_handle,'so')
            return {"message":"So Already Created"}
        elif len(result) > 0 and result[0].get('json_file_name'):
            print("So creation in progress")
            json_key = result[0].get('json_file_name')
        else:
            if receipt_handle:
                sqs_helper.delete_message(receipt_handle,'so')
            return response_handlers.send(400,  "PO Number not found in database")
        try:
            s3_object = s3_client.get_object(Bucket=bucket_name, Key=json_key)
            json_data = s3_object['Body'].read().decode('utf-8')
            payload = ean_mapping_service.prepare_payload_from_xml_event(json.loads(json_data),result[0].get('unique_id'))
            line_item_data = {
                'data': payload.get('ean_full_details'),
                'unique_id': result[0].get('unique_id'),
                'po_number': po_number,
                'id': result[0].get('id'),
                'type': 'Insert',
                'status': constants.XSD_SUCCESS,
                'delivery_date': payload.get('po_date_to'),
                'customer_code': payload.get('customer_code')
            }
            po_processing_so_creation_model.save_or_update_line_item_details(line_item_data)
            try:
                if len(payload.get('incorrect_ean_data')) > 0 :
                    incorrect_data = {
                        "Error_message": ""
                    }
                    message_error_articlelookup = ""
                    log = {
                        "po_number": po_number,
                        "log": constants.ARTICLE_ROR_ERROR,
                        "status": constants.ARTICLE_FAILED
                    }
                    po_processing_so_creation_model.create_logs(log)
                    # Article lookup failed mail
                    article_mail_data = []
                    for article_data in payload.get('incorrect_ean_data'):
                        if article_data.get('Error_message') == 'SITE_CODE_NOT_FOUND':
                            error_data ={
                                'item_number':article_data.get('ItemNumber'),
                                'po_number' : po_number,
                                'type': 'EAN Failed',
                                'message': 'Site code : ' + article_data.get('SiteCode','') + ' is not available in masters for  - CustomerProductID : ' + article_data.get('CustomerProductID'),
                                'id': result[0].get('id'),
                            }
                            row ={
                                'Item Number':article_data.get('ItemNumber'),
                                'EAN': article_data.get('EAN'),
                                'Customer Product ID': article_data.get('CustomerProductID'),
                            }
                            article_mail_data.append(row)
                            incorrect_data['Error_message'] += 'Site code : ' + article_data.get('SiteCode','') + ' is not available in masters for  - CustomerProductID : ' + article_data.get('CustomerProductID')
                            po_processing_so_creation_model.update_failed_message(error_data)
                        elif article_data.get('Error_message') == 'VENDOR_ID_NOT_FOUND':
                            error_data ={
                                'item_number':article_data.get('ItemNumber'),
                                'po_number' : po_number,
                                'type': 'EAN Failed',
                                'message': 'Vendor ID : ' + article_data.get('VendorCode','') + ' is not available in masters for  - CustomerProductID : ' + article_data.get('CustomerProductID'),
                                'id': result[0].get('id'),
                            }
                            row ={
                                'Item Number':article_data.get('ItemNumber'),
                                'EAN': article_data.get('EAN'),
                                'Customer Product ID': article_data.get('CustomerProductID'),
                            }
                            article_mail_data.append(row)
                            incorrect_data['Error_message'] += 'Vendor ID : ' + article_data.get('VendorCode','') + ' is not available in masters for  - CustomerProductID : ' + article_data.get('CustomerProductID')
                            po_processing_so_creation_model.update_failed_message(error_data)
                        else:
                            error_data ={
                                'item_number':article_data.get('ItemNumber'),
                                'po_number' : po_number,
                                'type': 'EAN Failed',
                                'message': 'Product details are not found - CustomerProductID : ' + article_data.get('CustomerProductID') + ' , EAN: ' + article_data.get('EAN') + ' , SITE_CODE: ' + (article_data.get('SiteCode',0) if article_data.get('SiteCode') else ''),
                                'id': result[0].get('id'),
                            }
                            row ={
                                'Item Number':article_data.get('ItemNumber'),
                                'EAN': article_data.get('EAN'),
                                'Customer Product ID': article_data.get('CustomerProductID'),
                            }
                            article_mail_data.append(row)
                            # incorrect_data['Error_message'] += article_data.get('data') + "  :::  "
                            incorrect_data['Error_message'] += 'Product details are not found - CustomerProductID : ' + article_data.get('CustomerProductID') + ' , EAN: ' + article_data.get('EAN') + ' , SITE_CODE: ' + (article_data.get('SiteCode',0) if article_data.get('SiteCode') else '') +','
                            po_processing_so_creation_model.update_failed_message(error_data)
                    if len(incorrect_data) > 0:
                      body ={
                        'po_number': po_number,
                        'id': result[0].get('id'),
                        'type': constants.ARTICLE_LOOKUP_FAILED,
                        'details': article_mail_data
                        }
                      mail_helper.send_mail(body, constants.ARTICLE_LOOKUP_FAILED)
                elif (payload.get('status') == True) and payload.get('is_valid') == True:
                    log = {
                        "po_number": po_number,
                        "log": constants.ARTICLE_LOOKUP_SUCCESS,
                        "status": constants.ARTICLE_SUCCESS
                    }
                    po_processing_so_creation_model.create_logs(log)
                if payload.get('mrp_check_req') and len(payload.get('mrp_check_req').get('NAVPRICE')) > 0:
                    mrp_check_req = payload.get('mrp_check_req')
                    mrp_response = {}
                        # return {'data': mrp_response,"message": constants.DATA_VALIDATED_SUCCESSFULLY }
                    try:
                        if bool(mrp_check_req):
                                mrp_response = sap_service.mrp_and_caselot_check(mrp_check_req)
                                mrp_req ={
                                    
                                    'req': json.dumps(mrp_check_req),
                                    'res': json.dumps(mrp_response.json()),
                                }
                                mrp_response = mrp_response.json().get('data').get('data')
                                po_processing_so_creation_model.save_req_res(mrp_req,{'type':'MRP Request and Response','po_number':po_number})
                    except Exception as e:
                        print("Error in MRP check",e)
                        # return error_helper.add_error(400, str(e))
                        return response_handlers.send(400,  str(e))
                    valid_lline_items ={}
                    mrp_err_msg = ""
                    caselot_err_msg = ""
                    base_price_error = False
                    mrp_check_failed_items = []
                    base_price_check_failed_items = []
                    caselot_check_failed_items = []
                    mrp_flag = 0
                    caselot_flag = 0
                    sap_req = {}
                    if (
                        mrp_response and
                        mrp_response.get('d') and
                        bool(mrp_response.get('d').get('NAVRESULT')) == True and
                        mrp_response.get('d').get('NAVRESULT').get('results') and
                        len(mrp_response.get('d').get('NAVRESULT').get('results')) > 0
                    ):
                        updated_mrp_list = mrp_response.get('d').get('NAVRESULT').get('results')
                        for item in updated_mrp_list:
                            if item.get('HasError') == 'true':
                                err_msg += acknowledgement_helper.prepare_error_info_xml(result[0].get('unique_id'), po_number, constants.MRP, item)
                        if err_msg and len(err_msg) > 0:
                            try:
                                acknowledgement_helper.send_error_ack_to_reliance(result[0].get('unique_id'), err_msg,constants.MRP,po_number)
                                # return error_helper.add_error(400,constants.MRP_FAILED)
                                return response_handlers.send(400,  constants.MRP_FAILED)
                            except Exception as e:
                                print("Error in sending error ack to reliance",e)
                                # return error_helper.add_error(400,str(e))
                                return response_handlers.send(400,  str(e))
                        else:
                            so_payload = copy.deepcopy(payload.get('sap_req'))
                            sap_req = so_payload.get('NAVITEM')
                            configuration = persist_model.fetch_workflow_configurations(constants.RELIANCE)
                            for item in updated_mrp_list:
                                if item.get('IsValid') == 'false':
                                    mrp_flag = 1
                                    row = {
                                        'Item Number': item.get('ItemNumber'),
                                        'Updated Mrp': item.get('CorrectMRP'),
                                        'ParentSKUCode': item.get('ParentSKUCode'),
                                        'Parent SKU Description': item.get('ParentSKUDescription'),
                                        'SKU Code': item.get('SKUCode'),
                                        'SKU Description': item.get('SystemSKUDescription'),
                                        'MRP': item.get('MRP'),
                                        'EAN': item.get('EAN'),
                                        'Customer Product ID': item.get('CustomerProductID'),

                                    }
                                    mrp_check_failed_items.append(row)
                                    mrp_err_msg += acknowledgement_helper.prepare_error_info_xml(result[0].get('unique_id'), po_number, constants.MRP, item)
                                    for i,req in enumerate(sap_req):
                                        if req.get('ItemNumber') == item.get('ItemNumber'):
                                            so_payload.get('NAVITEM')[i]['ROR'] = constants.MRP_ROR_CODE
                                            error_data ={
                                                'item_number': item.get('ItemNumber'),
                                                'po_number' : po_number,
                                                'type': constants.MRP_FAILED,
                                                'message': constants.MRP_ROR_ERROR,
                                                'id': result[0].get('id'),
                                                'updated_mrp': item.get('CorrectMRP')
                                                }
                                            po_processing_so_creation_model.update_failed_message(error_data)
                                if(item.get('BasePriceValid') == 'false') and configuration.get('base_price'):
                                    base_price_error = True
                                    row = {
                                        'Item Number': item.get('ItemNumber'),
                                        'Updated Base Price': item.get('CorrectBasePrice'),
                                        'ParentSKUCode': item.get('ParentSKUCode'),
                                        'Parent SKU Description': item.get('ParentSKUDescription'),
                                        'SKU Code': item.get('SKUCode'),
                                        'SKU Description': item.get('SystemSKUDescription'),
                                        'Base Price': item.get('BasePrice'),
                                        'EAN': item.get('EAN'),
                                        'Customer Product ID': item.get('CustomerProductID')

                                    }
                                    base_price_check_failed_items.append(row)
                                    for i,req in enumerate(sap_req):
                                        if (int(req.get('ItemNumber')) == int(item.get('ItemNumber'))) and so_payload.get('NAVITEM')[i].get('ROR') == '':
                                            so_payload.get('NAVITEM')[i]['ROR'] = constants.MRP_ROR_CODE
                                            error_data ={
                                                'item_number': item.get('ItemNumber'),
                                                'po_number' : po_number,
                                                'type': constants.BASE_PRICE_FAILED,
                                                'message': constants.BASE_PRICE_ROR_ERROR,
                                                'id': result[0].get('id'),
                                                'updated_base_price': item.get('CorrectBasePrice')
                                                }
                                            po_processing_so_creation_model.update_failed_message(error_data)
                                if(item.get('IsCaseLotValid') == 'false'):
                                    caselot_flag = 1
                                    row = {
                                        'Item Number': item.get('ItemNumber'),
                                        'Updated Caselot': item.get('CorrectCaseLot'),
                                        'ParentSKUCode': item.get('ParentSKUCode'),
                                        'Parent SKU Description': item.get('ParentSKUDescription'),
                                        'SKU Code': item.get('SKUCode'),
                                        'SKU Description': item.get('SystemSKUDescription'),
                                        'Caselot': item.get('CaseLot'),
                                        'EAN': item.get('EAN'),
                                        'Customer Product ID': item.get('CustomerProductID')

                                    }
                                    caselot_check_failed_items.append(row)
                                    caselot_err_msg += acknowledgement_helper.prepare_error_info_xml(result[0].get('unique_id'), po_number, constants.CASELOT, item)
                                    for i,req in enumerate(sap_req):
                                        if (int(req.get('ItemNumber')) == int(item.get('ItemNumber'))) and so_payload.get('NAVITEM')[i].get('ROR') == '':
                                            so_payload.get('NAVITEM')[i]['ROR'] = constants.CASELOT_ROR_CODE
                                            error_data ={
                                                'item_number': item.get('ItemNumber'),
                                                'po_number' : po_number,
                                                'type': constants.CASELOT_FAILED,
                                                'message': constants.CASELOT_ROR_ERROR,
                                                'id': result[0].get('id'),
                                                'updated_caselot': item.get('CorrectCaseLot')
                                                }
                                            po_processing_so_creation_model.update_failed_message(error_data)
                                else:
                                    success_data ={
                                                'item_number': item.get('ItemNumber'),
                                                'po_number' : po_number,
                                                'id': result[0].get('id'),
                                                'updated_caselot': item.get('CorrectCaseLot'),
                                                'updated_mrp': item.get('CorrectMRP'),
                                                'updated_base_price': item.get('CorrectBasePrice'),
                                                'type': '',
                                            }
                                    po_processing_so_creation_model.update_failed_message(success_data)
                        if len(mrp_err_msg) > 0:
                            try:
                                acknowledgement_helper.send_error_ack_to_reliance(result[0].get('unique_id'), mrp_err_msg,constants.MRP,po_number)
                                subject = constants.MRP_AMENDMENT_MSG
                                body ={
                                'po_number': po_number,
                                'id': result[0].get('id'),
                                'type': constants.MRP_FAILED,
                                'details': mrp_check_failed_items
                                }
                                mail_helper.send_mail(body, subject)
                                log = {
                                "po_number": po_number,
                                "log": constants.MRP_ROR_ERROR,
                                "status": constants.MRP_FAILED,
                                'data': mrp_check_failed_items,
                                }
                                po_processing_so_creation_model.create_logs(log)
                            except Exception as e:
                                print("Error in sending error ack to reliance",e)
                                # return error_helper.add_error(400,str(e))
                                return response_handlers.send(400,  str(e))
                        else :
                            log = {
                                "po_number": po_number,
                                "log": constants.MRP_SUCCESS_MSG,
                                "status": constants.MRP_SUCCESS,
                                }
                            po_processing_so_creation_model.create_logs(log)
                        if base_price_error:
                            log = {
                                "po_number": po_number,
                                "log": constants.BASE_PRICE_ROR_ERROR,
                                "status": constants.BASE_PRICE_FAILED,
                                'data': base_price_check_failed_items,
                                }
                            po_processing_so_creation_model.create_logs(log)
                        else :
                            log = {
                                "po_number": po_number,
                                "log": constants.BASE_PRICE_SUCCESS_MSG,
                                "status": constants.BASE_PRICE_SUCCESS,
                                }
                            po_processing_so_creation_model.create_logs(log)
                        if len(caselot_err_msg) > 0:
                            try:
                                acknowledgement_helper.send_error_ack_to_reliance(result[0].get('unique_id'), caselot_err_msg,constants.CASELOT,po_number)
                                subject = 'Error in Caselot check'
                                body ={
                                'po_number': po_number,
                                'id': result[0].get('id'),
                                'type': constants.CASELOT_FAILED,
                                'details': caselot_check_failed_items
                                }
                                log = {
                                "po_number": po_number,
                                "log": constants.CASELOT_ROR_ERROR,
                                "status": constants.CASELOT_FAILED,
                                'data': caselot_check_failed_items,
                                }
                                po_processing_so_creation_model.create_logs(log)
                                # mail_helper.send_mail(body, subject)
                            except Exception as e:
                                print("Error in sending error ack to reliance",e)
                                # return error_helper.add_error(400,str(e))
                                return response_handlers.send(400,  str(e))
                        else :
                            log = {
                                "po_number": po_number,
                                "log": constants.CASELOT_SUCCESS_MSG,
                                "status": constants.CASELOT_SUCCESS,
                                }
                            po_processing_so_creation_model.create_logs(log)
                    else :
                        # return error_helper.add_error(400,constants.SAP_ERROR_MSG)
                        if receipt_handle:
                            sqs_helper.delete_message(receipt_handle,'so')
                        return response_handlers.send(400,  constants.SAP_ERROR_MSG)   
                else:
                    # return error_helper.add_error(400,constants.ARTICLE_FAILED)
                    if receipt_handle:
                        sqs_helper.delete_message(receipt_handle,'so')
                    return response_handlers.send(400,  constants.ARTICLE_FAILED)               
            except Exception as e:
                subject = 'Error in MRP and Caselot check'
                body = {
                    "exception": str(e),
                    "PoNumber": po_number,
                    "Stage": constants.MRP_CASELOT_FAILED
                }
                # MailHelper.send_mail(body, subject)
                # return error_helper.add_error(400,constants.MRP_CASELOT_FAILED)
                print("Exception in MRP and Caselot check",e)
                return response_handlers.send(400,  constants.MRP_CASELOT_FAILED)

            try:
                if len(so_payload) > 0 and sales_order_number == '':
                    so_flag = False
                    so_created_date = datetime.datetime.now().date()
                    so_resp = {}
                    so_result =[]
                    mail_data = []
                    so_res_dict = {'Message': []}
                    try:
                        so_resp = sap_service.create_so(so_payload,po_number)
                    except ConnectionError as e:
                        print('Connection Error while calling Create Sales Order OData:', str(e))

                        # return error_helper.add_error(400, str(e))
                        return response_handlers.send(400,  str(e))


                    except Exception as e:
                        print('ERROR while calling Create Sales Order OData :', str(e))
                        # return error_helper.add_error(400, str(e))
                        return response_handlers.send(400,  str(e))
                    if so_resp and so_resp.json() and so_resp.json().get('data').get('data').get('d') :
                        so_req ={
                                    'req': json.dumps(so_payload),
                                    'res': json.dumps(so_resp.json()),
                                }
                        po_processing_so_creation_model.save_req_res(so_req,{'type':'SO Request and Response','po_number':po_number})
                        so_resp = so_resp.json().get('data').get('data').get('d')
                        if so_resp.get('NAVRES') and so_resp.get('NAVRES').get('results'):
                            so_result = so_resp.get('NAVRES').get('results')
                            for item_data in so_resp.get('NAVITEM').get('results'):
                                row ={
                                    'Item Number': item_data.get('ItemNumber',''),
                                    'System SKU Code': item_data.get('SystemSKUCode',),
                                    'Quantity': item_data.get('TargetQty'),
                                    'ROR': item_data.get('ROR','-'),
                                    'MRP': item_data.get('MRP'),
                                    'Caselot': item_data.get('case_lot'),
                                }
                                mail_data.append(row)

                            for item in so_result:
                                if item.get('Sales_Order_Number') != '' and so_flag == False:
                                    sales_order_number = item.get('Sales_Order_Number')
                                    so_flag = True
                                    if (len(sales_order_number) < 10):
                                        length = 10 - len(sales_order_number)
                                        sales_order_number = (length * '0') + sales_order_number
                                elif item.get('Type') == 'E':
                                    message = constants.SO_FAILED
                                    body = {
                                        'po_number': po_number,
                                        'message': item,
                                        'type' : constants.SO_FAILED,
                                    }
                                    log = {
                                    "po_number": po_number,
                                    "log": constants.SALES_ORDER_CREATE_FAILED_MSG,
                                    "status": constants.SO_FAILED,
                                    'data': item,
                                    }
                                    po_processing_so_creation_model.create_logs(log)
                                    # mail_helper.send_mail(body, message)
                                    # return error_helper.add_error(400,constants.SALES_ORDER_CREATE_FAILED_MSG)
                                    return response_handlers.send(400,  constants.SALES_ORDER_CREATE_FAILED_MSG)
                                else:
                                    so_res_dict["Message"].append(item.get('Message'))
                                line_item_data = {
                                'data': item,
                                'id': result[0].get('id'),
                                'status': constants.INVOICE_PENDING,
                                'type': 'Update',
                                 "so_number": sales_order_number
                                }
                                po_processing_so_creation_model.save_or_update_line_item_details(line_item_data)
                    elif so_resp and so_resp.json() and so_resp.json().get('error'):
                        log = {
                        "po_number": po_number,
                        "log": constants.SALES_ORDER_CREATE_FAILED_MSG,
                        "status": constants.SO_FAILED,
                        'data': so_resp.json()
                        }
                        po_processing_so_creation_model.create_logs(log)                        
                        # return error_helper.add_error(400,constants.SALES_ORDER_CREATE_FAILED_MSG)
                        return response_handlers.send(400,  constants.SALES_ORDER_CREATE_FAILED_MSG)
                    log = {
                    "po_number": po_number,
                    "log": constants.SALES_ORDER_CREATE_SUCCESS_MSG,
                    "status": constants.SO_SUCCESS,
                    }
                    po_processing_so_creation_model.create_logs(log)
                    so_data = {
                        'po_number': po_number,
                        'so_number': sales_order_number,
                        'so_created_date': so_created_date,
                        'id': result[0].get('id'),
                        'status': constants.INVOICE_PENDING
                        }
                    po_processing_so_creation_model.update_header_data(so_data)
                    subject = constants.SALES_ORDER_CREATE_SUCCESS_MSG
                    body ={
                        'po_number': po_number,
                        'so_number': sales_order_number,
                        'so_created_date': so_created_date,
                        'id': result[0].get('id'),
                        'so_details': mail_data
                    }
                    mail_helper.send_mail(body, subject)
                    if receipt_handle:
                        sqs_helper.delete_message(receipt_handle,'so')
                    return response_handlers.send(200,  constants.SALES_ORDER_CREATE_SUCCESS_MSG)
            except Exception as e:
                return response_handlers.send(400,  str(e))
        except Exception as e:
            print("Exception in po_processing_so_creation_service",e)
            raise e