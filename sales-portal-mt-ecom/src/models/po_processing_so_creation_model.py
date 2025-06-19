from src.utils.database_helper import DatabaseHelper
from psycopg2.extras import Json
from src.utils import constants
import pandas as pd
from decimal import Decimal
import json
import datetime
from src.libs.loggers import log_decorator, Logger
from src.utils.helper import HelperClass
from src.enums.mt_ecom_status_type import MtEcomStatusType

database_helper = DatabaseHelper()
logger = Logger("PoProcessingSoCreationModel")
helper = HelperClass()

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return json.JSONEncoder.default(self, obj)
class PoProcessingSoCreationModel:
    @log_decorator
    def save_or_update_line_item_details(self, data):
        with database_helper.get_read_connection() as conn_read, database_helper.get_write_connection() as conn_write:
            cur = conn_read.cursor()
            cur_write = conn_write.cursor()
            try:
                logger.info("Inside po_processing_so_creation_model -> save_or_update_line_item_details")
                if data.get('type') == 'Insert':
                    for line_item in data.get('data'):
                        sql_statement = '''Select id from mt_ecom_item_table where po_id = %s and item_number = %s '''
                        cur.execute(sql_statement,(data.get('id'),line_item.get('ItemNumber')))
                        result = pd.DataFrame(cur.fetchall(),columns=['id']).to_dict('records')
                        if len(result) > 0:
                            result = json.dumps(result[0], cls=DecimalEncoder)
                            result = json.loads(result)
                            if result.get('psku_code') != line_item.get('ParentSKUCode'):
                                print("Parent SKU change is Not Allowed")
                            elif result.get('system_sku_code') != line_item.get('SystemSKUCode'):
                                print("SKU Change is not Not Allowed")
                            elif result.get('customer_product_id') != line_item.get('CustomerProductID'):
                                print("Article id change is Not Allowed") 
                            elif result.get('mrp') != line_item.get('MRP'):
                                sql_statement: str = ''' Insert into mt_ecom_audit_trail (type,reference_column,column_values) values (%s,%s,%s)'''
                                cur_write.execute(sql_statement,('MRP','mrp',result))
                                conn_write.commit()
                                sql_statement: str = ''' Update mt_ecom_item_table set mrp = %s where po_id = %s and item_number = %s'''
                                cur_write.execute(sql_statement,(line_item.get('MRP'),data.get('id'),line_item.get('ItemNumber')))
                                conn_write.commit()
                            elif result.get('caselot') != line_item.get('CaseLot'):
                                sql_statement: str = ''' Insert into mt_ecom_audit_trail (type,reference_column,column_values) values (%s,%s,%s)'''
                                cur_write.execute(sql_statement,('Caselot','caselot',result))
                                conn_write.commit()
                                sql_statement: str = ''' Update mt_ecom_item_table set mrp = %s where po_id = %s and item_number = %s'''
                                cur_write.execute(sql_statement,(line_item.get('CaseLot'),data.get('id'),line_item.get('ItemNumber')))
                                conn_write.commit()
                            elif result.get('target_qty') != line_item.get('TargetQty'):
                                sql_statement: str = ''' Insert into mt_ecom_audit_trail (type,reference_column,column_values) values (%s,%s,%s)'''
                                cur_write.execute(sql_statement,('Quantity','target_qty',result))
                                conn_write.commit()
                                sql_statement: str = ''' Update mt_ecom_item_table set mrp = %s where po_id = %s and item_number = %s'''
                                cur_write.execute(sql_statement,(line_item.get('TargetQty'),data.get('id'),line_item.get('ItemNumber')))
                                conn_write.commit()
                            elif result.get('base_price') != line_item.get('BasePrice'):
                                sql_statement: str = ''' Insert into mt_ecom_audit_trail (type,reference_column,column_values) values (%s,%s,%s)'''
                                cur_write.execute(sql_statement,('BasePrice','base_price',result))
                                conn_write.commit()
                                sql_statement: str = ''' Update mt_ecom_item_table set base_price = %s where po_id = %s and item_number = %s'''
                                cur_write.execute(sql_statement,(line_item.get('BasePrice'),data.get('id'),line_item.get('ItemNumber')))
                                conn_write.commit()
                        else :
                            sql_statement = '''Update mt_ecom_header_table set customer_code = %s where id = %s '''
                            cur_write.execute(sql_statement,(data.get('customer_code'),data.get('id')))
                            conn_write.commit()
                            sql_statement: str = ''' Insert into mt_ecom_item_table (po_id,item_number,caselot,customer_product_id,ean,message,status,mrp,psku_code,
                            psku_description,plant_code,po_item_description,sales_unit,site_code,system_sku_code,system_sku_description,target_qty,unique_id,base_price,uom) values (%s,%s,
                            %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) '''
                            cur_write.execute(sql_statement,(data.get('id'),line_item.get('ItemNumber'),line_item.get('CaseLot'),line_item.get('CustomerProductID'),line_item.get('EAN'),line_item.get('Message') if line_item.get('Message') else '',
                                data.get('status'),line_item.get('MRP'),line_item.get('ParentSKUCode') if line_item.get('ParentSKUCode') else 0,line_item.get('ParentSKUDescription') if line_item.get('ParentSKUDescription') else '',line_item.get('Plant') if line_item.get('Plant') else 0,line_item.get('PO_Item_description'),
                                line_item.get('SalesUnit'),line_item.get('SiteCode'),line_item.get('SystemSKUCode') if line_item.get('SystemSKUCode') else 0,line_item.get('SystemSKUDescription') if line_item.get('SystemSKUDescription') else '',line_item.get('TargetQty'),data.get('unique_id'),line_item.get('BasePrice'),line_item.get('SalesUnit',"")))
                            conn_write.commit()
                            sql_statement: str = ''' Update mt_ecom_header_table set site_code = %s,delivery_date = %s,updated_on = %s where id = %s '''
                            cur_write.execute(sql_statement,(line_item.get('SiteCode'),data.get('delivery_date'),datetime.datetime.now(),data.get('id')))
                            conn_write.commit()
                elif data.get('type') == 'Update':
                    item_number = self.pad_number(int(data.get('data').get('PoItemNumber'))) if data.get('data').get('PoItemNumber') else self.pad_number(int(data.get('data').get('Item_Number')))
                    sql_statement = '''Select message from mt_ecom_item_table where po_id = %s and item_number = %s '''
                    cur.execute(sql_statement,(data.get('id'),item_number))
                    result = pd.DataFrame(cur.fetchall(),columns=['message']).to_dict('records')
                    if len(result) > 0 and result[0].get('message'):
                        mes = ''
                        description = ''
                        if data.get('data').get('Message') != constants.ORDER_MSG and data.get('data').get('Message') != constants.BASE_PRICE_ROR_ERROR and data.get('data').get('Message') != constants.CASELOT_ROR_ERROR:
                            message = []
                            mes = ''
                            for error in constants.ERROR_MASTER:
                                if error in data.get('data').get('Message'):
                                    message.append(error)
                            if len(message):
                                message = set(message)
                                mes = "Missing - "+ ', '.join(message)
                            else:
                                mes = data.get("data").get("Message")
                        spoc_result = helper.get_ror_description(data.get('data',{}).get('Message',''))
                        description = spoc_result.get('description')
                        spoc = spoc_result.get('spoc')
                        sql_statement: str = ''' Update mt_ecom_item_table set sales_order =%s, response_item_number = %s,so_qty = %s,ror_description = %s,ror_spoc = %s ''' 
                        if description and data.get('data').get('Sales_Order_Number') == '':
                            sql_statement += ''',status = ''' + "'" + MtEcomStatusType.SO_PENDING + "' "
                        sql_statement += '''where po_id = %s and item_number = %s'''
                        cur_write.execute(sql_statement,
                                          (
                                              data.get('data').get('Sales_Order_Number'),
                                              data.get('data').get('Item_Number'),
                                              int(float(data.get('data').get('Order_Qty',0))) if data.get('data').get('Order_Qty',0) else 0,
                                              description if description else mes,
                                              spoc,
                                              data.get('id'),
                                              item_number
                                              ))
                        conn_write.commit()
                    elif constants.ORDER_ALREADY_EXIST in data.get('data').get('Message'):
                        return False
                    elif data.get('data').get('Message') == constants.ORDER_MSG:
                        sql_statement: str = ''' Update mt_ecom_item_table set message = %s,sales_order =%s, response_item_number = %s,status = %s,so_qty = %s where po_id = %s and item_number = %s'''
                        cur_write.execute(sql_statement,(data.get('data').get('Message'),data.get('so_number'),data.get('data').get('Item_Number'),data.get('status'),int(float(data.get('data').get('Order_Qty',0))) if data.get('data').get('Order_Qty',0) else 0,data.get('id'),item_number))
                        conn_write.commit()
                    else:
                        # if data.get('data').get('Message') != constants.ORDER_MSG and data.get('data').get('Message') != constants.BASE_PRICE_ROR_ERROR and data.get('data').get('Message') != constants.CASELOT_ROR_ERROR:
                        message = []
                        mes = ''
                        for error in constants.ERROR_MASTER:
                            if error in data.get('data').get('Message'):
                                message.append(error)
                        if len(message):
                            message = set(message)
                            mes = "Missing - "+ ', '.join(message)
                        else:
                            mes = data.get("data").get("Message")
                        spoc_result = helper.get_ror_description(data.get('data',{}).get('Message',''))
                        description = spoc_result.get('description')
                        spoc = spoc_result.get('spoc')
                        sql_statement: str = ''' Update mt_ecom_item_table set ror_description = %s,sales_order =%s, response_item_number = %s,so_qty = %s,status = %s,ror_spoc = %s where po_id = %s and item_number = %s'''
                        cur_write.execute(sql_statement,(
                            description if description else mes,
                            data.get('data').get('Sales_Order_Number'),
                            data.get('data').get('Item_Number'),
                            int(float(data.get('data').get('Order_Qty',0))) if data.get('data').get('Order_Qty',0) else 0,
                            MtEcomStatusType.INVOICE_PENDING if data.get('data').get('Sales_Order_Number') else MtEcomStatusType.SO_PENDING,
                            spoc,
                            data.get('id'),
                            item_number
                            ))
                        conn_write.commit()
                elif data.get('type') == 'Date':
                    sql_statement: str = ''' Update mt_ecom_header_table set delivery_date = %s where id = %s '''
                    cur_write.execute(sql_statement,(data.get('delivery_date'),data.get('id')))
                    conn_write.commit()
                return True
            except Exception as e:
                logger.error("Exception in po_processing_so_creation_model",e)
                raise e
    
    def so_check(self, po_number):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement: str = ''' Select json_file_name,so_number,unique_id,id,delivery_date from mt_ecom_header_table where po_number = %s '''
                cur.execute(sql_statement,(po_number,))
                result = pd.DataFrame(cur.fetchall(),columns=['json_file_name','so_number','unique_id','id','delivery_date']).to_dict('records')
                return result
            except Exception as e:
                print("Exception in so_check",e)
                raise e
    
    def get_master_data(self, data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement: str = ''' Select psku,sku,psku_desc,sku_desc,vendor_code,customer_code,plant_code from mdm_material_data where article_id = %s and site_code = %s and vendor_code = %s and is_deleted = false'''
                cur.execute(sql_statement,(data.get('CustomerProductID'),data.get('SiteCode'),data.get('VendorCode')))
                result = pd.DataFrame(cur.fetchall(),columns=['psku','sku','psku_desc','sku_desc','vendor_code','customer_code','plant_code']).to_dict('records')
                result = json.dumps(result[0], cls=DecimalEncoder) if len(result) > 0 else {}
                result = json.loads(result) if len(result) > 0 else {}
                return result
            except Exception as e:
                print("Exception in get_master_data",e)
                raise e
    
    def update_failed_message(self, data):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                if data.get('type') == 'EAN Failed':
                    sql_statement: str = ''' Update mt_ecom_item_table set message = %s , status = %s where po_id = %s and item_number = %s '''
                    cur.execute(sql_statement,(data.get('message'),constants.ARTICLE_FAILED,data.get('id'),data.get('item_number')))
                    conn_write.commit()
                    sql_statement: str = ''' Update mt_ecom_header_table set status = %s where id = %s '''
                    cur.execute(sql_statement,(constants.ARTICLE_FAILED,data.get('id')))
                    conn_write.commit()
                elif data.get('type') == constants.MRP_FAILED:
                    sql_statement: str = ''' Update mt_ecom_item_table set message = %s , status = %s , updated_mrp = %s where po_id = %s and item_number = %s '''
                    cur.execute(sql_statement,(data.get('message'),constants.MRP_FAILED,data.get('updated_mrp'),data.get('id'),data.get('item_number')))
                    conn_write.commit()
                    sql_statement: str = ''' Update mt_ecom_header_table set status = %s where id = %s '''
                    cur.execute(sql_statement,(constants.MRP_FAILED,data.get('id')))
                    conn_write.commit()
                elif data.get('type') == constants.CASELOT_FAILED:
                    sql_statement: str = ''' Update mt_ecom_item_table set message = %s , status = %s , updated_caselot = %s where po_id = %s and item_number = %s '''
                    cur.execute(sql_statement,(data.get('message'),constants.CASELOT_FAILED,data.get('updated_caselot'),data.get('id'),data.get('item_number')))
                    conn_write.commit()
                    sql_statement: str = ''' Update mt_ecom_header_table set status = %s where id = %s '''
                    cur.execute(sql_statement,(constants.CASELOT_FAILED,data.get('id')))
                    conn_write.commit()
                elif data.get('type') == constants.BASE_PRICE_FAILED:
                    sql_statement: str = ''' Update mt_ecom_item_table set message = %s , status = %s , updated_base_price = %s where po_id = %s and item_number = %s '''
                    cur.execute(sql_statement,(data.get('message'),constants.BASE_PRICE_FAILED,data.get('updated_base_price'),data.get('id'),data.get('item_number')))
                    conn_write.commit()
                    sql_statement: str = ''' Update mt_ecom_header_table set status = %s where id = %s '''
                    cur.execute(sql_statement,(constants.BASE_PRICE_FAILED,data.get('id')))
                    conn_write.commit()
                elif data.get('type') == '':
                    sql_statement: str = ''' Update mt_ecom_item_table set updated_base_price = %s,updated_mrp = %s,updated_caselot = %s where po_id = %s and item_number = %s '''
                    cur.execute(sql_statement,(data.get('updated_base_price'),data.get('updated_mrp'),data.get('updated_caselot'),data.get('id'),data.get('item_number')))
                    conn_write.commit()
            except Exception as e:
                print("Exception in update_failed_message",e)  
    
    @log_decorator
    def create_logs(self,data):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                logger.info("Inside po_processing_so_creation_model -> create_logs")
                if 'data' in data.keys() and len(data.get('data')) > 0:
                    sql_statement: str = ''' Insert into mt_ecom_logs (po_number,log_type,status,updated_on,data) values (%s,%s,%s,%s,%s) '''
                    cur.execute(sql_statement,(data.get("po_number"),data.get("log"),data.get("status"),datetime.datetime.now(),Json(data.get('data'))))
                    conn_write.commit()
                    return True
                else:
                    sql_statement: str = ''' Insert into mt_ecom_logs (po_number,log_type,status,updated_on) values (%s,%s,%s,%s) '''
                    cur.execute(sql_statement,(data.get("po_number"),data.get("log"),data.get("status"),datetime.datetime.now()))
                    conn_write.commit()
                    return True
            except Exception as e:
                logger.error("Exception in create_logs",e)
                raise e
    
    @log_decorator
    def save_req_res(self, data,type):
        try:
            logger.info("Inside po_processing_so_creation_model -> save_req_res")
            with database_helper.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                sql_statement: str = ''' Insert into mt_ecom_audit_trail (type,reference_column,column_values) values (%s,%s,%s)'''
                cur.execute(sql_statement,(type.get('type'),type.get('po_number'),json.dumps(data)))
                conn_write.commit()
                return True
        except Exception as e:
            logger.error("Exception in save_mrp_req_res",e)
            raise e
    
    @log_decorator
    def update_header_data(self, data):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                logger.info("Inside po_processing_so_creation_model -> update_header_data")
                sql_statement: str = ''' Update mt_ecom_header_table set so_number = %s, status = %s,so_created_date = %s where id = %s '''
                cur.execute(sql_statement,(data.get('so_number'),data.get('status'),data.get('so_created_date'),data.get('id')))
                conn_write.commit()
                return True
            except Exception as e:
                logger.error("Exception in update_header_data",e)
                raise e
            
    def pad_number(self,number):
        return f'{number:05d}'
    
    @log_decorator
    def get_so_mail_recipients(self,id):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                logger.info("Inside po_processing_so_creation_model -> get_so_mail_receipients")
                sql_statement: str = ''' Select site_code from mt_ecom_header_table where id = %s '''
                cur.execute(sql_statement,(id,))
                result = pd.DataFrame(cur.fetchall(),columns=['site_code']).to_dict('records')
                sql_statement: str = ''' Select email from mt_ecom_mail_recipients where site_code = %s and type = 'Success' '''
                cur.execute(sql_statement,(result[0].get('site_code'),))
                email = pd.DataFrame(cur.fetchall(),columns=['email']).to_dict('records')
                return email[0].get('email') if len(email) else ''
            except Exception as e:
                logger.error("Exception in get_so_mail_receipients",e)
                raise e
    
    @log_decorator
    def get_error_or_exception_mail_recipients(self):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                logger.info("Inside po_processing_so_creation_model -> get_error_or_exception_mail_recipients")
                sql_statement: str = ''' Select email from mt_ecom_mail_recipients where type = 'Error' '''
                cur.execute(sql_statement)
                email = pd.DataFrame(cur.fetchall(),columns=['email']).to_dict('records')
                return email[0].get('email') if len(email) else ''
            except Exception as e:
                logger.error("Exception in get_error_or_exception_mail_recipients",e)
                raise e
    
    @log_decorator
    def get_reports_recipients(self):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                logger.info("Inside po_processing_so_creation_model -> get_reports_recipients")
                sql_statement: str = ''' Select email from mt_ecom_mail_recipients where type = 'Reports' '''
                cur.execute(sql_statement)
                email = pd.DataFrame(cur.fetchall(),columns=['email']).to_dict('records')
                return email[0].get('email','') if len(email) else ''
            except Exception as e:
                logger.error("Exception in get_reports_recipients",e)
                raise e
    
    def get_so_status(self, po_number):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement: str = ''' Select so_flag from mt_ecom_header_table where po_number = %s '''
                cur.execute(sql_statement,(po_number,))
                result = pd.DataFrame(cur.fetchall(),columns=['so_flag']).to_dict('records')
                return result
            except Exception as e:
                print("Exception in get_so_status",e)
                raise e
            
    def update_so_status(self, po_number):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                sql_statement: str = ''' Update mt_ecom_header_table set so_flag = %s where po_number = %s '''
                cur.execute(sql_statement,(True,po_number))
                conn_write.commit()
                return True
            except Exception as e:
                print("Exception in update_so_status",e)
                raise e
            
    def get_ecom_reports_recipients(self):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement: str = ''' Select email from mt_ecom_mail_recipients where type = 'Ecom Reports' '''
                cur.execute(sql_statement)
                email = pd.DataFrame(cur.fetchall(),columns=['email']).to_dict('records')
                return email[0].get('email','') if len(email) else ''
            except Exception as e:
                print("Exception in get_reports_recipients",e)
                raise e
            
    def check_site_code(self,site_code):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement: str = ''' Select customer_code from mdm_material_data where site_code = %s and is_deleted = false'''
                cur.execute(sql_statement,(site_code,))
                result = pd.DataFrame(cur.fetchall(),columns=['customer_code']).to_dict('records')
                return True if len(result) else False
            except Exception as e:
                print("Exception in check_site_code",e)
                raise e
            
    def check_vendor_code(self,data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement: str = '''Select vendor_code from mdm_material_data where vendor_code = %s and is_deleted = false'''
                cur.execute(sql_statement,(data.get('VendorCode',''),))
                result = pd.DataFrame(cur.fetchall(),columns=['vendor_code']).to_dict('records')
                return True if len(result) else False
            except Exception as e:
                print("Exception in check_vendor_code",e)
                raise e