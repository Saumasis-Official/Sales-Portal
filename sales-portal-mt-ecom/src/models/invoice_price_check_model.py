from src.utils.database_helper import DatabaseHelper
import src.utils.constants as constants
import pandas as pd
import datetime
database_helper = DatabaseHelper()
class InvoicePriceCheckModel:
    def get_item_status(self,id):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = '''SELECT * FROM mt_ecom_item_table where po_id = %s and status != %s and invoice_number is null'''
                cur.execute(sql_statement, (id,constants.INVOICE_SUCCESS,))
                column_names = [desc[0] for desc in cur.description] 
                status = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                return status
            except Exception as e:
                print("Error in getting item status",e)
                return None
    def change_po_status_to_pending(self):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                sql_statement = '''SELECT id, po_number FROM mt_ecom_header_table where so_number != '' and so_number is not null and status != %s and status != %s and status != %s '''
                cur.execute(sql_statement,(constants.INVOICE_PENDING,constants.PARTIAL_INVOICE,constants.INVOICE_SUCCESS))
                column_names = [desc[0] for desc in cur.description] 
                non_pending_records = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                for record in non_pending_records:
                    sql_statement = '''UPDATE mt_ecom_header_table set status = %s where id = %s'''
                    cur.execute(sql_statement,(constants.INVOICE_PENDING,record.get('id')))
                    conn_write.commit()
            except Exception as e:
                print("Error in changing po status to pending",e)
                return False
    def get_non_invoiced_items(self,id = False):
        non_invoiced_records = []
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                if id:
                    sql_statement = '''SELECT * FROM mt_ecom_item_table where po_id = %s and status != %s'''    
                    cur.execute(sql_statement, (id,constants.INVOICE_SUCCESS,))
                    column_names = [desc[0] for desc in cur.description] 
                    non_invoiced_records = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                    return non_invoiced_records
                else:
                    sql_statement = '''SELECT id, po_number FROM mt_ecom_header_table where (status = %s or status = %s) and po_created_date >= current_date - interval '30 days' and customer = 'Reliance' '''    
                    cur.execute(sql_statement,(constants.INVOICE_PENDING,constants.PARTIAL_INVOICE))
                    column_names = [desc[0] for desc in cur.description] 
                    non_invoiced_records = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                    return non_invoiced_records
            except Exception as e:
                print("Error in getting non invoiced items",e)
                return non_invoiced_records
    def get_header_data(self,po_number):
        non_invoiced_records = []
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = '''SELECT id, po_number FROM mt_ecom_header_table where po_number = %s '''    
                cur.execute(sql_statement, (po_number,))
                column_names = [desc[0] for desc in cur.description] 
                non_invoiced_records = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                return non_invoiced_records
            except Exception as e:
                print("Error in getting header data",e)
                return non_invoiced_records
    def check_amendment_status(self,data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                if data.get('type') == 'MRP2':
                    sql_statement = '''SELECT status FROM mt_ecom_item_table where item_number = %s and sales_order = %s and status = %s'''
                    cur.execute(sql_statement,(data.get('item_number'),data.get('so_number'),constants.MRP2_FAILED))
                    column_names = [desc[0] for desc in cur.description] 
                    amendment_status = pd.DataFrame(cur.fetchone(),columns = column_names).to_dict('records')
                    if len(amendment_status) > 0 and 'status' in amendment_status[0].keys():
                        return True
                    else:
                        return False
                elif data.get('type') == 'ASN':
                    sql_statement = '''SELECT asn_date FROM mt_ecom_item_table where item_number = %s and sales_order = %s and asn_date is not null'''
                    cur.execute(sql_statement,(data.get('item_number'),data.get('so_number')))
                    column_names = [desc[0] for desc in cur.description] 
                    amendment_status = pd.DataFrame(cur.fetchone(),columns = column_names).to_dict('records')
                    if len(amendment_status) > 0 and 'asn_date' in amendment_status[0].keys():
                        return True
                    else:
                        return False
            except Exception as e:
                print("Error in getting amendment status",e)
                return None
    def create_logs(self,data):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                if 'data' in data.keys() and len(data.get('data')) > 0:
                    sql_statement: str = ''' Insert into mt_ecom_logs (po_number,log_type,status,updated_on,data) values (%s,%s,%s,%s,%s) '''
                    cur.execute(sql_statement,(data.get("po_number"),data.get("log"),data.get("status"),datetime.datetime.now(),data.get('data')))
                    conn_write.commit()
                    return True
                else:
                    sql_statement: str = ''' Insert into mt_ecom_logs (po_number,log_type,status,updated_on) values (%s,%s,%s,%s) '''
                    cur.execute(sql_statement,(data.get("po_number"),data.get("log"),data.get("status"),datetime.datetime.now()))
                    conn_write.commit()
                    return True
            except Exception as e:
                print("Exception in create_logs",e)
                raise e
    def update_status_of_item(self,data):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                if data.get('type') == 'error':
                    sql_statement = '''UPDATE mt_ecom_item_table set status = %s,invoice_number = %s,invoice_mrp = %s,delivery_quantity = %s,invoice_date = to_date(%s, 'DD.MM.YYYY'),asn_date = now(),updated_mrp2 = %s,invoice_base_price = %s,invoice_uom = %s where item_number = %s and sales_order = %s'''
                    cur.execute(sql_statement,(data.get('status'),data.get('invoice_number'),data.get('invoice_mrp'),data.get('invoice_quantity'),data.get('invoice_date'),data.get('invoice_mrp'),data.get("invoice_base_price",""),data.get("invoice_uom",""),data.get('item_number'),data.get('so_number')))
                    conn_write.commit()
                elif data.get('type') == 'success':
                    sql_statement = '''UPDATE mt_ecom_item_table set status = %s , invoice_number = %s,invoice_mrp = %s, delivery_quantity = %s,invoice_date = to_date(%s, 'DD.MM.YYYY'),asn_date = now(),invoice_base_price = %s,invoice_uom = %s  where item_number = %s and sales_order = %s'''
                    cur.execute(sql_statement,(data.get('status'),data.get('invoice_number'),data.get('invoice_mrp'),data.get('invoice_quantity'),data.get('invoice_date'),data.get("invoice_base_price",""),data.get("invoice_uom",""),data.get('item_number'),data.get('so_number')))
                    conn_write.commit()
                return True
            except Exception as e:
                print("Error in updating status of item",e)
                return False
    def update_invoice_in_header(self,data):
        with database_helper.get_write_connection() as conn_write, database_helper.get_read_connection() as conn_read:
            cur = conn_write.cursor()
            cur_read = conn_read.cursor()
            try:
                sql_statement = '''SELECT invoice_number FROM mt_ecom_header_table WHERE po_number = %s and invoice_number is not null'''
                cur_read.execute(sql_statement,(data.get('po_number'),))
                column_names = [desc[0] for desc in cur_read.description]
                invoice_number = pd.DataFrame(cur_read.fetchall(),columns = column_names).to_dict('records')
                if len(invoice_number) == 0 :
                        sql_statement = '''UPDATE mt_ecom_header_table set status = %s,invoice_number = array_append(invoice_number, %s) where po_number = %s'''
                        cur.execute(sql_statement,(data.get('status'),data.get('invoice_number')[0],data.get('po_number')))
                        conn_write.commit()
                        return True
                elif data.get('invoice_number')[0] not in invoice_number[0].get('invoice_number'):
                    sql_statement = '''UPDATE mt_ecom_header_table set status = %s,invoice_number = array_append(invoice_number, %s) where po_number = %s'''
                    cur.execute(sql_statement,(data.get('status'),data.get('invoice_number')[0],data.get('po_number')))
                    conn_write.commit()
                    return True
                else:
                    print('Invoice Already Exists')
                    return False
            except Exception as e:
                print("Error in updating invoice in header",e)
                return False
    def change_po_status_to_completed(self,po_number):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                sql_statement = '''UPDATE mt_ecom_header_table set status = %s where po_number = %s'''
                cur.execute(sql_statement,(constants.INVOICE_SUCCESS,po_number))
                conn_write.commit()
                return True
            except Exception as e:
                print("Error in changing po status to completed",e)
                return False
    def get_line_item(self,data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = '''SELECT * FROM mt_ecom_item_table where item_number = %s and sales_order = %s'''
                cur.execute(sql_statement,(data.get('item_number'),data.get('sales_order')))
                column_names = [desc[0] for desc in cur.description] 
                item_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                return item_data
            except Exception as e:
                print("Error in getting line item",e)
                return None
    def get_invoice_status(self,data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = '''SELECT invoice_number FROM mt_ecom_item_table where item_number = %s and sales_order = %s'''
                cur.execute(sql_statement,(data.get('item_number'),data.get('so_number'),))
                result = pd.DataFrame(cur.fetchall(),columns=['invoice_number']).to_dict('records')
                if (result[0].get('invoice_number') != None and result[0].get('invoice_number') != ''):
                    return True
                else:
                    return False
            except Exception as e:
                print("Error in getting invoice status",e)
                return None
            

    def get_items(self,po_numbers: list, status: list, customers: list):
        print("inside InvoicePriceCheckModel -> get_items, po_numbers: ", po_numbers, " , status: ", status, " , customers: ", customers)
        po_string = ', '.join([f"'{po_number}'" for po_number in po_numbers])
        status_string = ', '.join([f"'{stat}'" for stat in status])
        customer_string = ', '.join([f"'{customer}'" for customer in customers])
        item_records = []
        try:
            status_query = f" AND mti.status IN ({status_string})" if len(status) > 0 else ""
            customer_query = f" AND mth.customer IN ({customer_string})" if len(customers) > 0 else ""
            po_query = f" AND mth.po_number IN ({po_string})" if len(po_numbers) > 0 else ""
            with database_helper.get_read_connection() as conn_read:
                cur = conn_read.cursor()
                sql_statement: str = '''SELECT mth.id
                            ,mth.customer
                            ,mth.po_number
                            ,mti.request_count 
                            ,mti.item_number 
                            ,mti.caselot
                            ,mti.updated_caselot 
                            ,mti.status AS item_status
                            ,mti.message AS item_message
                            ,mti.ean
                            ,mti.mrp 
                            ,mti.customer_product_id 
                            ,mti.po_item_description AS customer_product_desc
                            ,mti.psku_code AS psku
                            ,mti.psku_description AS psku_desc
                            ,mti.sales_unit 
                            ,mti.plant_code 
                            ,mti.site_code 
                            ,mti.sales_order AS so_number 
                            ,mti.response_item_number
                            ,mti.system_sku_code AS system_sku
                            ,mti.system_sku_description AS system_sku_desc
                            ,mti.unique_id 
                            ,mti.invoice_number 
                            ,mti.invoice_date 
                            ,mti.target_qty 
                            ,mti.invoice_quantity AS invoice_qty
                            ,mti.delivery_quantity AS delivery_qty
                            ,mti.asn_date 
                            ,mti.invoice_mrp 
                            ,mti.updated_mrp 
                            ,mti.updated_mrp2 
                        FROM mt_ecom_header_table mth
                        INNER JOIN mt_ecom_item_table mti ON (mth.id = mti.po_id)
                        WHERE mth.is_deleted = FALSE ''' + customer_query + status_query + po_query  
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description] 
                item_records = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                return item_records
        except Exception as e:
            print("inside InvoicePriceCheckModel -> get_items, Error: ",e)
            return None
        
    def change_status_to_pending(self,customers: list):
        print("inside InvoicePriceCheckModel -> change_status_to_pending")
        try:
            pending,partial,success = constants.INVOICE_PENDING,constants.PARTIAL_INVOICE,constants.INVOICE_SUCCESS
            to_status = pending
            excluded_status = ' ,'.join([f"'{status}'" for status in [pending,partial,success]])
            customer_string = ', '.join([f"'{customer}'" for customer in customers])
            with database_helper.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                sql_statement = '''UPDATE mt_ecom_header_table 
                                    SET status = '{to_status}' 
                                    WHERE so_number != ''  AND status NOT IN ({excluded_status}) AND customer IN ({customer_string});'''
                cur.execute(sql_statement)
                conn_write.commit()
            return True
        except Exception as e:
            print("inside InvoicePriceCheckModel -> change_status_to_pending, Error: ",e)
            return False
        
    def change_status_to_success(self,po_numbers: list) -> bool:
        print("inside InvoicePriceCheckModel -> change_status_to_success")
        try:
            if len(po_numbers) == 0:
                raise ValueError("Po Numbers list is empty")
            
            po_string = ', '.join([f"'{po_number}'" for po_number in po_numbers])
            with database_helper.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                sql_statement = '''UPDATE mt_ecom_header_table 
                                SET status = '{constants.INVOICE_SUCCESS}' 
                                WHERE po_number IN ({po_string});'''
                cur.execute(sql_statement)
                conn_write.commit()
            return True
        except Exception as e:
            print("inside InvoicePriceCheckModel -> change_status_to_success, Error: ",e)
            return False
        
    def get_so_items(self,so_numbers: list = []) -> dict:
        print("inside InvoicePriceCheckModel -> get_so_items, so_number: ",so_numbers )
        try:
            
            with database_helper.get_read_connection() as conn_read:
                so_string = ', '.join([f"'{so}'" for so in so_numbers])
                so_query = f" AND meit.sales_order IN ({so_string})" if len(so_numbers) > 0 else ""
                sql_statement = '''SELECT * 
                        FROM mt_ecom_item_table meit
                        WHERE meit.is_deleted = FALSE ''' + so_query
                cur = conn_read.cursor()
                
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description] 
                item_records = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                return item_records
        except Exception as e:
            print("inside InvoicePriceCheckModel -> get_so_items, Error: ",e)
            return {}