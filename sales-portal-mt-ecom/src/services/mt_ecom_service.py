from src.models.mt_ecom_model import MTECOMModel
from src.utils.error_helper import ErrorHelper
import src.utils.constants as constants
from src.utils.sap_service import SapService
from boto3.dynamodb.conditions import Key, Attr,AttributeNotExists
from datetime import datetime,timedelta
import pandas as pd
import json
from src.config.configurations import S3_BUCKET_NAME
import boto3
import os
from src.utils.mail_helper import MailHelper
from src.services.ean_mapping_service import EanMappingService
from src.models.po_processing_so_creation_model import PoProcessingSoCreationModel
import openpyxl
import calendar
from datetime import date
from src.services.mulesoft_service import MulesoftService
from src.services.po_processing_so_creation_service import PoProcessingSoCreationService
import copy
import requests
from src.config.configurations import ISO_STATE
from src.libs.loggers import log_decorator, Logger

mt_ecom_model = MTECOMModel()
error_helper = ErrorHelper()
sap_service = SapService()
mail_helper = MailHelper()
ean_mapping_service = EanMappingService()
po_processing_so_creation_model = PoProcessingSoCreationModel()
mulesoft_service = MulesoftService()
po_processing_so_creation_service = PoProcessingSoCreationService()
s3_client = boto3.client('s3')
bucket_name = S3_BUCKET_NAME
logger = Logger("MTECOMService")
class MTECOMService:
    def get_mt_ecom_po_list(self, data):
        try:
            response = mt_ecom_model.get_mt_ecom_po_list(data)
            if response:
                return response
            else:
                return error_helper.add_error(400,"Error in get_mt_ecom_data")
        except Exception as e:
            print(e)
            return error_helper.add_error(500,"Error in get_mt_ecom_data")
    def get_mt_ecom_po_details(self, data):
        log_data = []
        updated_data = []
        status = []
        try:
            response = mt_ecom_model.get_mt_ecom_po_details(data)
            if response:
                log_data = response.get('log_data')
                created_date = response.get('status')
                if log_data and len(log_data) > 0:
                    for log in log_data:
                        status.append(log.get('status'))
                updated_data = [
                    self.log_data({'status':status,'success':constants.XSD_SUCCESS,'failed':constants.XSD_FAILED,'pending':'','date':created_date,'title':'PO Validation','workflow_name':'po_format'}),
                    self.log_data({'status':status,'success':constants.ACKNOWLEDGEMENT_SUCCESS,'failed':constants.ACKNOWLEDGEMENT_FAILED,'pending':'','date':created_date,'title':'PO Acknowledgement','workflow_name':'acknowledgement'}),
                    self.log_data({'status':status,'success':constants.ARTICLE_SUCCESS,'failed':constants.ARTICLE_FAILED,'pending':'','date':created_date,'title':'Article Lookup','workflow_name':'article'}),
                    self.log_data({'status':status,'success':constants.TOT_SUCCESS,'failed':constants.TOT_FAILED,'pending':'','date':created_date,'title':'ToT Check','workflow_name':'tot'}),
                    self.log_data({'status':status,'success':constants.MRP_SUCCESS,'failed':constants.MRP_FAILED,'pending':'','date':created_date,'title':'MRP Check-1','workflow_name':'mrp_1'}),
                    self.log_data({'status':status,'success':constants.BASE_PRICE_SUCCESS,'failed':constants.BASE_PRICE_FAILED,'pending':'','date':created_date,'title':'Base Price Check','workflow_name':'base_price'}),
                    self.log_data({'status':status,'success':constants.CASELOT_SUCCESS,'failed':constants.CASELOT_FAILED,'pending':'','date':created_date,'title':'Caselot Check','workflow_name':'caselot'}),
                    self.log_data({'status':status,'success':constants.SO_SUCCESS,'failed':constants.SO_FAILED,'pending':'','date':created_date,'title':'SO Creation','workflow_name':'po_format'}),
                    self.log_data({'status':status,'success':constants.PARTIAL_INVOICE,'failed':constants.INVOICE_FAILED,'pending':constants.INVOICE_PENDING,'date':created_date,'title':'Invoicing','invoice_count':response.get('invoice_count'),'invoice_data':response.get('invoice_data'),'workflow_name':'invoice'}),
                    self.log_data({'status':status,'success':constants.MRP2_SUCCESS,'failed':constants.MRP2_FAILED,'pending':'','date':created_date,'title':'MRP Check-2','workflow_name':'mrp_2'}),
                    self.log_data({'status':status,'success':constants.ASN_SENT,'failed':'','pending':'','date':created_date,'title':'ASN','workflow_name':'asn'}),
                ]               
                return {"item_data":response.get('item_data'),"log_data":updated_data,"total_count":response.get('total_count')}
            else:
                return error_helper.add_error(400,"Error in get_mt_ecom_data")
        except Exception as e:
            print(e)
            return error_helper.add_error(500,"Error in get_mt_ecom_data")
    def log_data(self,status):     
        if status.get('success') in status.get('status') and status.get('failed') in status.get('status'):
            res = {
                'status' : 'failedSuccess',
                'title' : status.get('title'),
                'date': '',
                'request_count': 0,
                'workflow_name' : status.get('workflow_name')
            }
        elif status.get('success') in status.get('status') or status.get('pending') in status.get('status'):
            res ={
                'status' : 'success',
                'title' : status.get('title'),
                'date': '',
                'request_count': 0,
                'workflow_name' : status.get('workflow_name')
            }
        elif status.get('failed') in status.get('status'):    
            res= {
                'status' : 'failed',
                'title' : status.get('title'),
                'date': '',
                'request_count': 0,
                'workflow_name' : status.get('workflow_name')
            }
        else:
            res= {
                'status' : 'pending',
                'title' : status.get('title'),
                'date': '',
                'request_count': 0,
                'workflow_name' : status.get('workflow_name')
            }
        for item in status.get('date'):
            if status.get('success') in item["status"]:
                res['date'] = item["latest_date"]
                res['request_count'] = item["count"]
            elif status.get('failed') and status.get('failed') in item["status"] and not res['date']:
                res['date'] = item["latest_date"]
                res['request_count'] = item["count"]
        if status.get('title') == 'Invoicing':
            res['request_count'] = status.get('invoice_count')
            res['invoice_data'] = status.get('invoice_data') if status.get('invoice_data') else []
        return res
    def mt_ecom_reports(self):
        try:
            # customer = mt_ecom_model.get_customer_list()
            # if customer == constants.RELIANCE:
            self.edi_daily_reports()
            date = self.week_determination()
            self.edi_daily_reports(date) if date else print('Not a week') # for weekly reports
            return True
            # else:
            #     return False
        except Exception as e:
            print(e)
            return False
    def edi_daily_reports(self,date = False):
        try:
            now = datetime.now()
            from_date = now - timedelta(days = 1)
            to_date = now + timedelta(days = 1)
            if date:
                to_date = date.get('previous_day','')
                from_date = date.get('next_day','')
            from_date = from_date.strftime("%Y-%m-%d")
            to_date = to_date.strftime("%Y-%m-%d")
            header_data = mt_ecom_model.get_header_data(from_date,to_date)
            df_asn_report = pd.DataFrame(columns = ['CFA Code', 'Site code' , 'Customer Code' , 'Customer Name', 'PO Date' , 'PO Number' , 'PO Qty' , 'PO Value in Lac (Tentative)' , 'PO line Count' , 'SO number' , 'SO Qty in cv' , 'SO Value in lac' , 'SO line Count' , 'Invoice' , 'ASN'])
            df_error_report = pd.DataFrame(columns=['PO Date', 'PONumber','Article code','Parent SKU Code','Parent SKU Description','System SKU Code','System SKU Description','Line Item','PO QTY','PO CASELOT','Status','ROR','ROR description','PoC details','SO Number','Invoice','ASN','MRP 2'])
            for header in header_data:
                item_data = mt_ecom_model.get_item_data(header.get('id'))
                row ={}
                po_row = {}
                # for item in item_data:
                po_number = header.get('po_number','')
                site_code = header.get('site_code','')
                customer_code = ''
                cfa_code = ''
                if site_code :
                    customer_data = mt_ecom_model.get_customer_list(site_code)
                    customer_code = customer_data.get('customer_code','')
                    cfa_code = customer_data.get('plant_code','')
                customer = header.get('customer','')
                po_date = header.get('po_created_date','')
                # po_date = datetime.strptime(po_date, "%Y-%m-%d")
                # po_date = po_date.strftime("%Y-%m-%d")
                po_qty, po_value = 0,0
                s3_object = s3_client.get_object(Bucket=bucket_name, Key=header.get('json_file_name'))
                json_data = s3_object['Body'].read().decode('utf-8')
                json_data = json.loads(json_data)
                if customer == constants.RELIANCE:
                    idoc = json_data.get('ORDERS05_VEN').get('IDOC').get('E1EDP01')
                    for i, item in enumerate(idoc):
                        if type(item) is dict:
                            for itemKey, itemValue in item.items():
                                if itemKey == 'NETWR':
                                    po_value += float(itemValue) if itemValue else 0
                        elif type(item) is str:
                            for item_1 , key_1 in idoc.items():
                                if item_1 == 'NETWR':
                                    po_value = float(key_1) 
                else:
                    for item in item_data:
                        po_value += item.get('item_total_amount',0.0) if item.get('item_total_amount',0.0) else 0
                po_line_count, so_qty, so_value, so_line_count = 0, 0, 0, 0
                so_number = header.get('so_number','')
                if so_number:
                    so_details = sap_service.get_sale_order_details({'so_number':so_number})
                    so_details = so_details.json()
                    for res in so_details.get('data').get('data').get('d').get('results'):
                        so_qty = so_qty + float(res.get('Sales_Order_QTY').strip()) if res.get('Sales_Order_QTY',0) else 0
                        so_value = so_value + float(res.get('Net_value').strip()) if res.get('Net_value',0) else 0
                        so_line_count = so_line_count + 1
                invoice, asn = 'Not Generated', 'Not Generated'
                if header.get('invoice_number',''):
                    invoice = header.get('invoice_number','')
                    asn = header.get('invoice_number','')
                for item in item_data:
                    po_qty = po_qty + float(item.get('target_qty', "")) if item.get('target_qty') else 0
                    po_line_count = po_line_count + 1
                    if item.get('message','') != constants.SALES_ORDER_CREATE_SUCCESS_MSG:
                        row = {
                        'PO Date': po_date,
                        'PONumber': po_number,
                        'Article code': item.get('customer_product_id',''),
                        'Parent SKU Code': item.get('psku_code',""),
                        'Parent SKU Description': item.get('psku_description',""),
                        'System SKU Code': item.get('system_sku_code',''),
                        'System SKU Description': item.get('system_sku_description',''),
                        'Line Item': item.get('item_number',''),
                        'PO QTY': item.get('target_qty', 0),
                        'PO CASELOT': item.get('caselot', 0),
                        'Status': item.get('status',''),
                        'ROR': item.get('message',''),
                        'ROR description': item.get('ror_description',''),
                        'PoC details': item.get('ror_spoc',''),
                        'Invoice': item.get('invoice_number',''),
                        'SO Number': item.get('sales_order',''),
                        'ASN': 'Generated' if item.get('invoice_number') else 'Not Generated',
                        'MRP 2': 'Failed' if item.get('updated_mrp2') else ('Passed' if item.get('psku_code',"") and item.get('invoice_number','') else '')
                        }
                    if row :
                        df_error_report = pd.concat([df_error_report, pd.DataFrame([row], columns=df_error_report.columns)], ignore_index=True)
                        df_error_report.index = range(1, len(df_error_report)+1)
                po_value = po_value/100000
                po_value = round(po_value,2)
                so_value = so_value/100000
                so_value = round(so_value,2)
                po_row ={
                    'CFA Code': cfa_code,
                    'Site code': site_code,
                    'Customer Code': customer_code,
                    'Customer Name': customer,
                    'PO Date': po_date,
                    'PO Number': po_number,
                    'PO Qty': po_qty,
                    'PO Value in Lac (Tentative)': po_value,
                    'PO line Count': po_line_count,
                    'SO number': so_number,
                    'SO Qty in cv': so_qty,
                    'SO Value in lac': so_value,
                    'SO line Count': so_line_count,
                    'Invoice': invoice,
                    'ASN': asn
                }
                df_asn_report = pd.concat([df_asn_report, pd.DataFrame([po_row], columns=df_asn_report.columns)], ignore_index=True)
                df_asn_report.index = range(1, len(df_asn_report)+1)
            df_error_report_sorted = df_error_report.sort_values(by=["PO Date", "PONumber", "Line Item"], ascending=True)
            df_asn_report_sorted = df_asn_report.sort_values(by=["PO Date"], ascending=True)
            mail_helper.send_reports(df_asn_report_sorted,df_error_report_sorted,date)

        except Exception as e:
            print(e)
            return error_helper.add_error(500,"Error in edi_daily_reports")
    def week_determination(self):
        now = datetime.now()
        date = {
            8:{
                'previous_day' : now.replace(day=1),
                'next_day' : now.replace(day=8)
            },
            15:{
                'previous_day' : now.replace(day=8),
                'next_day' : now.replace(day=15)
            },
            22:{
                'previous_day' : now.replace(day=15),
                'next_day' : now.replace(day=22)
            },
            1:{
                'previous_day' : now.replace(day=22),
                'next_day' : now.replace(day=29) if now.month in [2] else now.replace(day=31) if now.month in [1,3,5,7,8,10,12] else now.replace(day=30)
            }
        }
        return date[now.day] if now.day in date else False
    def mt_ecom_upload(self, data,user_id):
        rows = []
        try:
            workbook = openpyxl.load_workbook(data)
            sheet = workbook.active
            header = [cell.value for cell in sheet[1]]
            for row in sheet.iter_rows(min_row=2, values_only=True):
                row_dict = dict(zip(header, row))
                rows.append(row_dict)
        except Exception as e:
            print(e)
            return error_helper.add_error(500,"Error in mt_ecom_upload")


        try:
            row = {}
            upload_data = []
            for item in rows:
                if all(item.get(key) is not None for key in constants.RELIANCE_EXCEL_FORMAT):

                    row = {
                    'psku' : int(item.get('Parent SKU Code',0)),
                    'sku' : int(item.get('Child SKU Code',0)),
                    'site_code' :  str(item.get('Store ID','')),
                    'customer_code' : int(item.get('Customer Code',0)),
                    'article_id' :  str(item.get('Reliance Article ID','')),
                    'vendor_code' : str(item.get('VendorCode',0)),
                    'psku_desc' : str(item.get('ParentSKUDescription','')),
                    'sku_desc' :  str(item.get('SystemSKUDescription','')),
                    'vendor_name' : str(item.get('Vendor Name','')),
                    'plant_code' : int(item.get('Plant Code',0)),
                    'division' : str(item.get('Division','')),
                    'article_desc' : str(item.get('RRL Article Description','')),
                    'customer_name': constants.RELIANCE,
                    'region': 'INDIA',
                    'priority' : 1,
                    'id' : str(item.get('Parent SKU Code',0)) + str(item.get('Child SKU Code',0)) + constants.RELIANCE + str(item.get('Reliance Article ID',0)) + str(item.get('Customer Code',0)) + str(item.get('Store ID','')) + str(item.get('Plant Code',0)) + str(item.get('VendorCode','')) + '1'
                    }
                elif all(item.get(key) is not None for key in constants.ECOM_EXCEL_FORMAT):
                    row = {
                    'psku' : int(item.get('PSKU',0)),
                    'sku' : int(item.get('SKU',0)),
                    'site_code' :  str(item.get('Site Code','')),
                    'customer_code' : int(item.get('Customer Code',0)),
                    'article_id' :  str(item.get('Article ID','')),
                    'vendor_code' : str(item.get('Vendor Code','')),
                    'psku_desc' : str(item.get('PSKU Description','')),
                    'sku_desc' :  str(item.get('SKU Description','')),
                    'vendor_name' : 'TCPL',
                    'plant_code' : int(item.get('Plant Code',0)),
                    'division' : str(item.get('Division','')),
                    'article_desc' : str(item.get('Article Description','')),
                    'customer_name': str(item.get('Customer Name','')),
                    'region': 'INDIA',
                    'priority' : int(item.get('Priority',1)) if item.get('Priority') else 1,
                    'id' : str(item.get('PSKU',0)) + str(item.get('SKU',0)) + str(item.get('Customer Name','')) + str(item.get('Article ID','')) + str(item.get('Customer Code',0)) + str(item.get('Site Code','')) + str(item.get('Plant Code',0)) + str(item.get('Vendor Code','')),
                    'sku_id' : str(item.get('PSKU',0)) + str(item.get('Customer Name','')) + str(item.get('Article ID','')) + str(item.get('Customer Code',0)) + str(item.get('Site Code','')) + str(item.get('Plant Code',0)) + str(item.get('Vendor Code','')) + str(item.get('Priority',1))
                    }
                if row:
                    upload_data.append(row)
                row = {}
                excluded_items = []
                unique_dict = {}
                count = len(upload_data)
            if len(upload_data) > 0:
                for item in upload_data:
                    item_id = item.get('id')
                    if item_id not in unique_dict:
                        unique_dict[item_id] = item
                    else:
                        excluded_items.append(item)
                unique_list = list(unique_dict.values())
                data_by_id = {}
                if upload_data[0].get('customer_name') != constants.RELIANCE:
                    for item in unique_list:
                        if item.get('sku_id') in data_by_id:
                            data_by_id[item.get('sku_id')].append(item)
                        else:
                            data_by_id[item.get('sku_id')] = [item]
                    upload_data = []
                    for item_id, items in data_by_id.items():
                        items.sort(key=lambda x: x['priority'])
                        upload_data.append(copy.deepcopy(items[0]))
                        if len(items) > 1:
                            excluded_items.extend(copy.deepcopy(items[1:]))
                    excluded_data = mt_ecom_model.get_mismatch_data(upload_data)
                else :
                    excluded_data = mt_ecom_model.get_mismatch_data(unique_list)
                    upload_data = copy.deepcopy(unique_list)
                excluded_items += excluded_data
                excluded_ids= [self.create_unique_key(item) for item in excluded_data]
                excluded_ids_set = set(excluded_ids)
                upload_data = [item for item in upload_data if self.create_unique_key(item) not in excluded_ids_set]
                for excluded_obj in excluded_items:
                    if 'id' in excluded_obj:
                        excluded_obj.pop('id')
                    if 'sku_id' in excluded_obj:
                        excluded_obj.pop('sku_id')
                for upload_obj in upload_data:
                    if 'id' in upload_obj:
                        upload_obj.pop('id')
                    if 'sku_id' in upload_obj:
                        upload_obj.pop('sku_id')
                if len(upload_data) > 0:
                    response = mt_ecom_model.upload_data(upload_data,user_id) 
                return {"uploaded_data": count - len(excluded_items),"excluded_data": excluded_items,"total_data" : count}
            else:
                return False
        except Exception as e:
            print(e)
            return error_helper.add_error(500,"Error in mt_ecom_upload")

    def get_mt_ecom_rdd_list(self,data):
            try:
                data = json.loads(data)
                so_item_data = []
                so_value = 0
                plant_code = []
                plant_name = []
                plant_location = []
                if'soNumbers' in data.keys() and len(data.get('soNumbers')) > 0 :
                    po_numbers = mt_ecom_model.get_po_numbers(data.get('soNumbers'))
                    rdd = datetime.strptime(data.get('rdd'), '%Y-%m-%dT%H:%M:%S.%fZ').date()
                    for po in po_numbers:
                        amendment_resp = sap_service.get_amendment_details(po)
                        if (amendment_resp and amendment_resp.json() 
                            and amendment_resp.json().get('data').get('data').get('d').get('results') 
                            and len(amendment_resp.json().get('data').get('data').get('d').get('results')[0].get('NAVITEM').get('results')) > 0
                            ) :
                            amendment_resp = amendment_resp.json().get('data').get('data').get('d').get('results')[0]
                            sales_order = amendment_resp.get('Sales_Order_Number','')
                            po_number = amendment_resp.get('PoNumber','')
                            so_value = so_value +  int(float(amendment_resp.get('NetValue',0)))
                            so_expiry_date = amendment_resp.get('PoDateTo','')
                            if so_expiry_date == '00000000':
                                so_expiry_date = amendment_resp.get('PoDate','')
                            num_days_in_month = int(mt_ecom_model.get_app_level_settings(constants.MT_ECOM_DEFAULT_RDD_DATE))
                            default_rdd = (datetime.strptime(so_expiry_date, '%Y%m%d') + timedelta(days= num_days_in_month)).date()
                            po_creation_date = amendment_resp.get('PoDate','')
                            for item_data in amendment_resp.get('NAVITEM').get('results'):
                                open_qty = 0
                                plant_name.append(f"{item_data.get('PlantName', '')} ({item_data.get('PlantLocation', '')})")
                                plant_code.append(item_data.get('Plant',''))
                                po_qty = int(float(item_data.get('TargetQty','')))
                                schedule_lines = item_data.get('NAVSCHLINES').get('results')
                                unscheduled_qty = [int(float(schedule_item.get('ConfirmedQuantity', '0.0'))) for schedule_item in schedule_lines if datetime.strptime(schedule_item.get('DeliveryDate'), '%Y%m%d').date() == default_rdd][0] if [int(float(schedule_item.get('ConfirmedQuantity', '0.0'))) for schedule_item in schedule_lines if datetime.strptime(schedule_item.get('DeliveryDate'), '%Y%m%d').date() == default_rdd] else 0
                                material_data = mt_ecom_model.get_material_data(sales_order,int(item_data.get('ItemNumber','')))
                                undelivered_qty = sum([int(float(schedule_item.get('ConfirmedQuantity'))) - int(float(schedule_item.get('DeliveredQuantity'))) for schedule_item in schedule_lines if datetime.strptime(schedule_item.get('DeliveryDate'), '%Y%m%d').date() != default_rdd and int(float(schedule_item.get('DeliveredQuantity'))) != 0])
                                open_qty = abs( undelivered_qty + unscheduled_qty)
                                default_schedule_line =  next((schedule_item.get('ScheduleLineNumber','') for schedule_item in schedule_lines if datetime.strptime(schedule_item.get('DeliveryDate'), '%Y%m%d').date() == default_rdd), '')
                                so_item_data.extend([{
                                    'sales_order' : sales_order,
                                    'po_number' : po_number,
                                    'po_expiry_date' : str(datetime.strptime(so_expiry_date, '%Y%m%d').strftime('%d-%m-%Y')),
                                    'rdd' : '' if datetime.strptime(schedule_item.get('DeliveryDate'), '%Y%m%d').date() == default_rdd else str(datetime.strptime(schedule_item.get('DeliveryDate',''), '%Y%m%d').strftime('%d-%m-%Y')),
                                    'confirmed_qty': 0 if datetime.strptime(schedule_item.get('DeliveryDate'), '%Y%m%d').date() == default_rdd else int(float(schedule_item.get('ConfirmedQuantity',0))),
                                    'schedule_line_number': schedule_item.get('ScheduleLineNumber',''),
                                    'po_qty' : po_qty,
                                    'open_qty' : open_qty,
                                    'psku_code' : material_data[0].get('psku_code','') if len(material_data) > 0  else '',
                                    'article_id' : material_data[0].get('customer_product_id','') if len(material_data) > 0 else '',
                                    'sku_name': material_data[0].get('system_sku_description','') if len(material_data) > 0 else '',
                                    'item_number' : material_data[0].get('item_number','') if len(material_data) > 0 else '',
                                    'system_sku' : material_data[0].get('system_sku_code','') if len(material_data) > 0 else '',
                                    'mrp' : item_data.get('MRP',''),
                                    'base_price' : item_data.get('BasePrice',''),
                                    'case_lot' : item_data.get('case_lot'),
                                    'sap_item_number' :item_data.get('ItemNumber',''),
                                    'submitted_qty' : 0 if datetime.strptime(schedule_item.get('DeliveryDate'), '%Y%m%d').date() == default_rdd else int(float(schedule_item.get('ConfirmedQuantity',0))),
                                    'po_creation_date' : po_creation_date,
                                    'ror_message' : 'EDI - Base Price match condition fail' if item_data.get('ROR') == 'ED' else 'Pack size issue (PO vs SAP)' if item_data.get('ROR') == 'ZE' else '',
                                    'buom_to_cs' : material_data[0].get('pak_to_cs','') if len(material_data) > 0 else '',
                                    'default_rdd' : default_rdd.strftime('%Y%m%d'),
                                    'default_schedule_line': default_schedule_line,
                                } for schedule_item in schedule_lines if int(float(schedule_item.get('DeliveredQuantity'))) == 0 and datetime.strptime(schedule_item.get('DeliveryDate',''),'%Y%m%d').date() >= rdd])

                response = mt_ecom_model.get_mt_ecom_rdd_list(data)
                if response:
                    response['item_data'] = so_item_data or []
                    response['so_value'] = so_value/100000 or 0
                    response['plant_code'] = list(set(plant_code))
                    response['plant_name'] = list(set(plant_name))
                    return response
                else:
                    return error_helper.add_error(400,"Error in get_mt_ecom_data")
            except Exception as e:
                print(e)
                return error_helper.add_error(500,"Error in get_mt_ecom_data")
    def get_mt_ecom_customer_list(self,data):
        try:
            response = mt_ecom_model.get_mt_ecom_customer_list(data)
            if response:
                return response
            else:
                return error_helper.add_error(400,"Error in get_mt_ecom_data")
        except Exception as e:
            print(e)
            return error_helper.add_error(500,"Error in get_mt_ecom_data")
    def add_update_customer(self,data):
        try:
            response = mt_ecom_model.add_update_customer(data)
            if response:
                return response
            else:
                return False
        except Exception as e:
            print(e)
            return False
    def add_update_rdd(self,data):
        try:
            data = json.loads(data)
            error_so = []
            temp_data = [item for item in data.get('data') if item.get('submitted_qty') != item.get('confirmed_qty') ]
            if len(temp_data) == 0 :
                temp_data = [item for item in data.get('data') if item.get('temp_submitted_qty') != item.get('confirmed_qty') ]
            if len(temp_data) > 0 :
                data['data'] = temp_data
                payload_data = ean_mapping_service.prepare_rdd_payload(data)
                so_object = payload_data.get('so_object')
                for so_number in payload_data.get('so_numbers'):
                    response = sap_service.create_amendment(so_object.get(so_number))
                    if response:
                        rdd_data = {
                            'req' : json.dumps(so_object.get(so_number)),
                            'res' : json.dumps(response.json())
                        }
                        po_processing_so_creation_model.save_req_res(rdd_data,{'type':'RDD Request and Response','po_number':so_number})
                    else:
                        print('Error in create_amendment')
                        rdd_data = {
                            'req' : json.dumps(so_object.get(so_number))
                        }
                        po_processing_so_creation_model.save_req_res(rdd_data,{'type':'RDD Error Request','po_number':so_number})
                        error_so.append(so_number)
                mt_ecom_model.add_rdd(data)
                return error_so

        except Exception as e:
            print(e)
            return False
    
    def get_mt_ecom_rdd_item_list(self,data):
        try:
            response = mt_ecom_model.get_mt_ecom_rdd_item_list(data)
            if response:
                return response
            else:
                return error_helper.add_error(400,"Error in get_mt_ecom_rdd_item_list")
        except Exception as e:
            print(e)
            return error_helper.add_error(500,"get_mt_ecom_rdd_item_list")
    def get_mt_ecom_customer_workflow_list(self,data):
        try:
            response = mt_ecom_model.get_mt_ecom_customer_workflow_list(data)
            if response:
                return response
            else:
                return error_helper.add_error(400,"Error in get_mt_ecom_data")
        except Exception as e:
            print(e)
            return error_helper.add_error(500,"Error in get_mt_ecom_data")
    def add_update_customer_workflow(self,data):
        try:
            response = mt_ecom_model.add_update_customer_workflow(data)
            if response:
                return response
            else:
                return False
        except Exception as e:
            print(e)
            return False
    def get_mt_ecom_customer_workflow(self,data):
        try:
            response = mt_ecom_model.get_mt_ecom_customer_workflow(data)
            if response:
                return response
            else:
                return error_helper.add_error(400,"Error in get_mt_ecom_data")
        except Exception as e:
            print("Exception in MTECOMService.get_mt_ecom_customer_workflow",e)
            return error_helper.add_error(500,"Error in get_mt_ecom_data")
    def so_sync(self,data):
        try:
            so_sync_switch = mt_ecom_model.get_app_level_settings(constants.ENABLE_MT_ECOM_SO_SYNC)
            if so_sync_switch:
                po_data = []
                lastSync = datetime.now()
                exclusion = mt_ecom_model.get_exclusion_customer_codes()
                exclusion_codes = [obj["customer_code"] for obj in exclusion]
                customer_codes = mt_ecom_model.get_customer_codes(data).get('customer_code')
                filtered_list = list(set(customer_codes) - set(exclusion_codes))
                sync_flag = False
                run_at = mt_ecom_model.sync_logs('',False,data.get('user_id'))
                if run_at and len(run_at) and run_at[0].get('diff'):
                    if int(run_at[0].get('diff')) >= 7200:
                        sync_flag = True
                    else:
                        lastSync = run_at[0].get('run_at') 
                else:
                    sync_flag = True
                if sync_flag and len(filtered_list):
                    for customer_code in filtered_list:
                        sync_date = run_at[0].get('run_at').to_pydatetime().strftime('%Y%m%d') if len(run_at) else ''
                        so_sync_date = mt_ecom_model.get_app_level_settings(constants.MT_ECOM_DEFAULT_SYNC_DATE)
                        sync_date = sync_date if sync_date else (datetime.now() - timedelta(days=60)).strftime('%Y%m%d')
                        # response = mulesoft_service.so_sync(customer_code,sync_date,data.get('user_id'))
                        response = sap_service.so_sync(customer_code,sync_date,data.get('user_id'))
                        if response and response.json():
                            so_data = response.json()
                            so_data = so_data.get('data',[])
                            default_expiry_date = mt_ecom_model.get_app_level_settings(constants.MT_ECOM_DEFAULT_PO_EXPIRY_DATE)
                            for items in so_data:
                                try:
                                    item_data = []
                                    try:
                                        po_date  = datetime.strptime(items.get('PO_Date'), '%Y%m%d').strftime('%Y-%m-%d')
                                    except Exception as e:
                                        print("Exception in MTECOMService.so_sync.po_date",e)
                                        continue
                                    header_data = {
                                            'po_created_date' : po_date ,
                                            'delivery_date' : datetime.strptime(items.get('PO_Expiry_Date'), '%Y%m%d').strftime('%Y-%m-%d') if items.get('PO_Expiry_Date') != '00000000' else (datetime.strptime(po_date, '%Y-%m-%d') + timedelta(days=int(default_expiry_date))).strftime('%Y-%m-%d'),
                                            'so_created_date': datetime.strptime(items.get('Created_on'), '%Y%m%d').strftime('%Y-%m-%d'),
                                            'po_number' : items.get('PO_Number'),
                                            'so_number' : '0' + items.get('SO_Number'), 
                                            'invoice_number' : items.get('Invoice_Number',[]) if items.get('Invoice_Number') else [],
                                            'status' : items.get('PO_Status'),
                                            'customer': items.get('Customer_Name'),
                                            'customer_code' : items.get('Customer').lstrip('0'),       
                                            }  
                                    item_data.extend([
                                        {
                                            'item_number': str(int(item.get('ItemNumber'))//10).zfill(5),
                                            'plant_code' : int(item.get('Depot_Code',0)),
                                            'plant_name' : item.get('Depot_Name'),
                                            'system_sku_code' : int(item.get('SKU_Code')),
                                            'system_sku_description' : item.get('SKU_Description'),
                                            'psku_code' : int(item.get('Parent_Code')) if item.get('Parent_Code') else 0,
                                            'psku_description' : item.get('Parent_Description',''),
                                            'mrp' : item.get('Seller_MRP',0),
                                            'caselot' : item.get('CaseSize') if item.get('CaseSize') else 0,
                                            'sales_order' : '0' + items.get('SO_Number'),
                                            'sales_unit' : item.get('Buyer_UOM'),
                                            'response_item_number' : item.get('ItemNumber').lstrip('0'),
                                            'message' : item.get('ROR'),
                                            'so_qty' : int(float(item.get('PO_Qty',0))),
                                            'target_qty' : int(float(item.get('PO_Qty',0))),
                                            'uom' : item.get('Buyer_UOM','CV'),
                                            'allocated_qty' : int(float(item.get('Allocated_Qty',0))) if item.get('Allocated_Qty') else 0,
                                        } for item in items.get('NAV_ITEMS').get('results')
                                    ])
                                    header_data['item_data'] = item_data
                                    po_data.append(header_data)
                                except Exception as e:
                                    print("Exception in MTECOMService.so_sync",e)
                                    continue
                        else:
                            print("No Data for customer code " +customer_code+" in MTECOMService.so_sync")
                    if len(po_data):
                        po_response =  mt_ecom_model.so_sync_data(po_data)   
                        if po_response:
                            sync_data ={
                                'type' : "MT ECOM SO Sync",
                                'run_at' : datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                                'status' : 'SUCCESS',
                            }
                            mt_ecom_model.sync_logs(sync_data,True,data.get('user_id'))
                        else:
                            sync_data ={
                                'type' : "MT ECOM SO Sync",
                                'run_at' : datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                                'status' : 'FAIL',
                            }
                            mt_ecom_model.sync_logs(sync_data,True,data.get('user_id')) 
                return lastSync
            else:
                print("SO Sync is disabled")
                return False                  
        except Exception as e:
            print("Exception in MTECOMService.so_sync",e)
            return False
    def customer_codes(self,data):
        try:
            emails = []
            data = json.loads(data)
            response = mt_ecom_model.customer_codes(data)
            # role = data.get('role', '')
            # if role in ['SUPER_ADMIN', 'SUPPORT', 'KAMS', 'NKAMS']:
            emails = mt_ecom_model.get_kams_mail()
            if response:
                response['emails'] = emails
                return response
            else:
                return False
        except Exception as e:
            print("Exception in MTECOMController.customer_codes",e)
            return False
    def add_update_kams(self,data):
        payer_code = []
        data = json.loads(data)
        try:
            if data.get('payerCode'):
                payer_code = [{'payer_code': code, 'credit_limit': data.get('creditLimit')} for code in data.get('payerCode', [])]
            response = mt_ecom_model.add_update_kams(data,payer_code)
            return response
        except Exception as e:
            print(e)
            return False
    def getKamsData(self,data):
        try:
            response = mt_ecom_model.getKamsData(data)
            return response
        except Exception as e:
            print(e)
            return False
        
    def retrigger(self,data):
        try:
            mt_ecom_model.retrigger(data)
            return True
        except Exception as e:
            print(e)
            return False
        

    def create_unique_key(self,item):
        return (
            str(item.get('psku',0)) +
            str(item.get('customer_name','')) +
            str(item.get('article_id','')) +
            str(item.get('customer_code',0)) +
            str(item.get('site_code','')) +
            str(item.get('plant_code',0)) +
            str(item.get('vendor_code','')) +
            str(item.get('priority',1))
        )
    def sync_iso_state(self):
        try:
            logger.info("MTECOMService.sync_iso_state")
            iso_url = ISO_STATE.get('URL')
            iso_data = requests.get(iso_url)
            if iso_data.status_code != 200:
                return False
            iso_data = iso_data.json()
            state_data = []
            for iso_code, details in iso_data.get("IN").items():
                data = {
                    'iso_code': iso_code.split('-')[1],
                    'state_name': details.get('name'),
                    'type': details.get('type')
                }
                state_data.append(data)
            if len(state_data):
                response = mt_ecom_model.sync_iso_state(state_data)
                return 'ISO State Synced Succesfully' if response else 'NO Data To Sync'
            else:
                return 'State Data Not Found'
            
        except Exception as e:
            logger.error("MTECOMService.sync_iso_state",e)
            return "Error in sync_iso_state"
        
    def rdd_sync(self,data):
        try:
            logger.info("MTECOMService.rdd_sync")
            from_date = data.get('from_date') if 'from_date' in data else (datetime.now() - timedelta(days=int(mt_ecom_model.get_app_level_settings(constants.MT_ECOM_DEFAULT_RDD_SYNC_FROM_DATE)))).strftime('%Y-%m-%d')
            to_date = data.get('to_date')  if 'to_date' in data else (datetime.now() - timedelta(days=int(mt_ecom_model.get_app_level_settings(constants.MT_ECOM_DEFAULT_RDD_SYNC_TO_DATE)))).strftime('%Y-%m-%d')
            po_numbers = mt_ecom_model.get_rdd_data(from_date,to_date)
            current_date = datetime.now().date()
            if len(po_numbers):
                for po in po_numbers:
                    amendment_resp = sap_service.get_amendment_details(po)
                    if (amendment_resp and amendment_resp.json() 
                            and amendment_resp.json().get('data').get('data').get('d').get('results') 
                            and len(amendment_resp.json().get('data').get('data').get('d').get('results')[0].get('NAVITEM').get('results')) > 0
                            ) :
                            amendment_resp = amendment_resp.json().get('data').get('data').get('d').get('results')[0]
                            so_expiry_date = amendment_resp.get('PoDateTo','')
                            if so_expiry_date == '00000000':
                                so_expiry_date = amendment_resp.get('PoDate','')
                            num_days_in_month = int(mt_ecom_model.get_app_level_settings(constants.MT_ECOM_DEFAULT_RDD_DATE))
                            default_rdd = (datetime.strptime(so_expiry_date, '%Y%m%d') + timedelta(days= num_days_in_month)).date()
                            amendment_payload = {
                                                "Sales_Order_Number": amendment_resp.get('Sales_Order_Number',''),
                                                "SalesOrg":"1010",
                                                "SoldTo": amendment_resp.get('SoldTo',''),
                                                "ShipTo": amendment_resp.get('ShipTo',''),
                                                "DistChannel":"10",
                                                "Division":"10",
                                                "PoDate": amendment_resp.get('PoDate',''),
                                                "OrderReason":"001",
                                                "PoNumber": amendment_resp.get('PoNumber',''),
                                                "ReqDate": amendment_resp.get('ReqDate',''),
                                                "PoDateTo": datetime.strptime(amendment_resp.get('PoDateTo', ''), '%Y%m%d').strftime('%d.%m.%Y'),
                                                "NAVRES":[],
                                                "NAVITEM":[]
                                                }
                            for item_data in amendment_resp.get('NAVITEM').get('results'):
                                open_qty = 0
                                delete_schedule_line_data = []
                                default_line = {}
                                for schedule_item in item_data.get('NAVSCHLINES').get('results'):
                                    if datetime.strptime(schedule_item.get('DeliveryDate'), '%Y%m%d').date() <= current_date and default_rdd > current_date:
                                        if int(float(schedule_item.get('ConfirmedQuantity'))) - int(float(schedule_item.get('DeliveredQuantity'))) and int(float(schedule_item.get('OrderQuantity','0'))):
                                            open_qty = open_qty + int(float(schedule_item.get('ConfirmedQuantity'))) - int(float(schedule_item.get('DeliveredQuantity')))
                                            if int(float(schedule_item.get('DeliveredQuantity'))):
                                                delete_schedule_line_data.append(
                                                {
                                                    "ItemNumber": schedule_item.get('ItemNumber',''),
                                                    "ScheduleLineNumber": schedule_item.get('ScheduleLineNumber',''),
                                                    "DeliveryDate": schedule_item.get('DeliveryDate',''),
                                                    "OrderQuantity": str(int(float(schedule_item.get('DeliveredQuantity')))),
                                                    "Delete_Flag":""
                                                    })
                                            else:
                                                delete_schedule_line_data.append(
                                                {
                                                    "ItemNumber": schedule_item.get('ItemNumber',''),
                                                    "ScheduleLineNumber": schedule_item.get('ScheduleLineNumber',''),
                                                    "DeliveryDate": schedule_item.get('DeliveryDate',''),
                                                    "OrderQuantity":"0",
                                                    "Delete_Flag":"X"
                                                    })
                                    if default_rdd == datetime.strptime(schedule_item.get('DeliveryDate'), '%Y%m%d').date():
                                        default_line = {
                                                    "ItemNumber": item_data.get('ItemNumber',''),
                                                    "ScheduleLineNumber": schedule_item.get('ScheduleLineNumber',''),
                                                    "DeliveryDate": default_rdd.strftime('%Y%m%d'),
                                                    "OrderQuantity": schedule_item.get('OrderQuantity',''),
                                                    "Delete_Flag":""
                                                }
                                if len(delete_schedule_line_data):
                                    if default_line:
                                        default_line['OrderQuantity'] = str(int(float(default_line.get('OrderQuantity','0'))) + open_qty)
                                        delete_schedule_line_data.append(default_line)
                                    else:
                                        delete_schedule_line_data.append(
                                            {
                                                "ItemNumber": item_data.get('ItemNumber',''),
                                                "ScheduleLineNumber": "",
                                                "DeliveryDate": default_rdd.strftime('%Y%m%d'),
                                                "OrderQuantity": str(open_qty),
                                                "Delete_Flag":""
                                            }
                                        )
                                    line_item_data = {
                                                        "ItemNumber": item_data.get('ItemNumber',''),
                                                        "SystemSKUCode": item_data.get('SystemSKUCode',''),
                                                        "TargetQty": item_data.get('TargetQty',''),
                                                        "SalesUnit": item_data.get('SalesUnit',''),
                                                        "MRP": item_data.get('MRP',''),
                                                        "BasePrice": item_data.get('BasePrice',''),
                                                        "case_lot": item_data.get('case_lot',''),
                                                        "NAVSCHLINES": delete_schedule_line_data
                                                    }
                                    amendment_payload['NAVITEM'].append(line_item_data)
                            if len(amendment_payload.get('NAVITEM',[])):
                                response = sap_service.create_amendment(amendment_payload)
                                if response.status_code == 200:
                                    rdd_data = {
                                        'req' : json.dumps(amendment_payload),
                                        'res' : json.dumps(response.json())
                                    }
                                    po_processing_so_creation_model.save_req_res(rdd_data,{'type':'RDD Sync Request and Response','po_number':amendment_payload.get('PoNumber','')})
                                    rdd_response = mt_ecom_model.save_rdd_data(amendment_payload)
                                else:
                                    print('Error in create_amendment')
                                    rdd_data = {
                                                'req' : json.dumps(amendment_payload)
                                            }
                                    po_processing_so_creation_model.save_req_res(rdd_data,{'type':'RDD Sync Error Request','po_number': amendment_payload.get('PoNumber','')})
                return "RDD Synced Successfully"           
                                                                    
            else:
                logger.info("No PO Numbers Found to Sync")
                return "No PO Numbers Found to Sync"             
        except Exception as e:
            logger.error("Exception in MTECOMService.rdd_sync",e)
            return "Error in RDD Sync"
        
    @log_decorator
    def edit_kams_data(self, data):
        try:
            data = json.loads(data)
            if isinstance(data, list) and data[0].get('is_deleted'):
                response = mt_ecom_model.delete_kams_data(data)
            else:
                response = mt_ecom_model.edit_kams_data(data)
            return response
        except Exception as e:
            print(e)
            return False
        
    @log_decorator
    def tot_tolerance(self, data):
        try:
            data = json.loads(data)
            if data and data.get('type'):
                return mt_ecom_model.add_update_tot_tolerance(data)
            else:
                return mt_ecom_model.get_tolerance(data)
        except Exception as e:
            print(e)
            return False