from src.utils.database_helper import DatabaseHelper
import pandas as pd
import json
import decimal as Decimal
from datetime import datetime,timedelta
from collections import defaultdict
import src.utils.constants as constants
from psycopg2.extras import execute_values
from datetime import datetime
from src.utils.helper import HelperClass
from src.libs.loggers import log_decorator, Logger
from src.enums.success_message import SuccessMessage
from src.enums.error_message import ErrorMessage

database_helper = DatabaseHelper()
helper = HelperClass()
logger = Logger("MTECOMModel")
class MTECOMModel:
    def get_mt_ecom_po_list(self, data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                data = json.loads(data)
                if data.get('search') and data.get('search').get('fromDate') and data.get('search').get('fromDate') == data.get('search').get('toDate'):
                    data['search']['toDate'] = datetime.strptime(data.get('search').get('toDate'), '%Y-%m-%d')
                    data['search']['toDate'] = data.get('search').get('toDate').strftime('%Y-%m-%d')
                status_condition = ""
                if data.get('status') == "Closed":
                    status_condition = f"status::TEXT = '{constants.INVOICE_SUCCESS}' AND po_created_date >= current_date - interval '30 days'"
                elif data.get('status') == "Open":
                    status_condition = f"status::TEXT != '{constants.INVOICE_SUCCESS}' AND po_created_date >= current_date - interval '30 days'"
                
                # Fetch distinct customer names and statuses
                if data.get('status') == "RDD":
                    query = '''
                        SELECT DISTINCT mt_header.customer,
                            (CASE
                                WHEN mer.po_number IS NOT NULL THEN 'Submitted'
                                ELSE 'Not Submitted'
                            END) AS status
                        FROM (
                            SELECT DISTINCT invoice_number, po_id
                            FROM mt_ecom_item_table
                        ) mt_item
                        JOIN mt_ecom_header_table mt_header ON mt_item.po_id = mt_header.id
                        LEFT JOIN mt_ecom_rdd mer ON mt_header.po_number = mer.po_number
                        WHERE mt_header.po_created_date >= current_date - interval '60 days'
                    '''
                    
                    # Fetch the full list of customer names and statuses first
                    cur.execute(query)
                    results = cur.fetchall()
                    customer_names = list(set(row[0] for row in results))
                    statuses = list(set(row[1] for row in results))
                
                    # Apply filters based on selectedCustomerNames or selectedStatuses
                    if data.get('selectedCustomerNames'):
                        selected_customer_names = ', '.join([f"'{name}'" for name in data.get('selectedCustomerNames')])
                        query += f" AND mt_header.customer IN ({selected_customer_names})"
                        cur.execute(query)
                        results = cur.fetchall()
                        statuses = list(set(row[1] for row in results))
                    elif data.get('selectedStatuses'):
                        selected_statuses = ', '.join([f"'{status}'" for status in data.get('selectedStatuses')])
                        if "True" in selected_statuses and "False" not in selected_statuses:
                            query += "and mer.po_number is not null"
                        elif "True" not in selected_statuses and "False" in selected_statuses:
                            query += "and mer.po_number is null"
                        cur.execute(query)
                        results = cur.fetchall()
                        customer_names = list(set(row[0] for row in results))
                else:
                    if data.get('status') in ["Open", "Closed"]:
                        if data.get('selectedCustomerNames'):
                            selected_customer_names = ', '.join([f"'{name}'" for name in data.get('selectedCustomerNames')])
                            cur.execute(f"SELECT DISTINCT status FROM mt_ecom_header_table WHERE {status_condition} AND customer IN ({selected_customer_names})")
                        else:
                            cur.execute(f"SELECT DISTINCT status FROM mt_ecom_header_table WHERE {status_condition}")
                        statuses = [row[0] for row in cur.fetchall()]
                
                        if data.get('selectedStatuses'):
                            selected_statuses = ', '.join([f"'{status}'" for status in data.get('selectedStatuses')])
                            cur.execute(f"SELECT DISTINCT customer FROM mt_ecom_header_table WHERE {status_condition} AND status IN ({selected_statuses})")
                        else:
                            cur.execute(f"SELECT DISTINCT customer FROM mt_ecom_header_table WHERE {status_condition}")
                        customer_names = [row[0] for row in cur.fetchall()]

                if data.get('status') == "Closed":
                    sql_statement : str = '''SELECT * FROM mt_ecom_header_table where'''
                    sql_statement += f" status::TEXT = '{constants.INVOICE_SUCCESS}'"
                    if data.get('search') and data.get('search').get('po_number'):
                        sql_statement += f" and (po_number ilike '%{data.get('search').get('po_number')}%' or so_number ilike '%{data.get('search').get('po_number')}%')"
                    if data.get('search') and data.get('search').get('fromDate') and data.get('search').get('toDate'):
                        sql_statement += f" and po_created_date >= '{data.get('search').get('fromDate')}' and po_created_date <= '{data.get('search').get('toDate')}  23:59:59'"
                    else:
                        sql_statement += ''' and po_created_date >= current_date - interval '30 days' '''
                    if data.get('selectedCustomerNames'):
                        selected_customer_names = ', '.join([f"'{name}'" for name in data.get('selectedCustomerNames')])
                        sql_statement += f" and customer in ({selected_customer_names})"
                    if data.get('selectedStatuses'):
                        selected_statuses = ', '.join([f"'{status}'" for status in data.get('selectedStatuses')])
                        sql_statement += f" and status in ({selected_statuses})"
                    if data.get('id') and "KAMS" in data.get("role"):
                        sql_statement += f" AND customer_code = ANY (SELECT UNNEST(customer_code) FROM kams_customer_mapping WHERE user_id = '{data.get('id')}')" 
                    sql_statement += f" order by po_created_date desc limit {data.get('limit')} offset {data.get('offset')}"
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description] 
                    header_data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict('records')
                    sql_statement = ''' select count(*) from mt_ecom_header_table where'''
                    sql_statement += f" status::TEXT = '{constants.INVOICE_SUCCESS}'"
                    if data.get('search') and data.get('search').get('po_number'):
                        sql_statement += f" and (po_number ilike '%{data.get('search').get('po_number')}%' or so_number ilike '%{data.get('search').get('po_number')}%')"
                    if data.get('search') and data.get('search').get('fromDate') and data.get('search').get('toDate'):
                        sql_statement += f" and po_created_date >= '{data.get('search').get('fromDate')}' and po_created_date <= '{data.get('search').get('toDate')}  23:59:59'"
                    else:
                        sql_statement += ''' and po_created_date >= current_date - interval '30 days' '''
                    if data.get('selectedCustomerNames'):
                        selected_customer_names = ', '.join([f"'{name}'" for name in data.get('selectedCustomerNames')])
                        sql_statement += f" and customer in ({selected_customer_names})"
                    if data.get('selectedStatuses'):
                        selected_statuses = ', '.join([f"'{status}'" for status in data.get('selectedStatuses')])
                        sql_statement += f" and status in ({selected_statuses})"
                    if data.get('id') and "KAMS" in data.get("role"):
                        sql_statement += f" AND customer_code = ANY (SELECT UNNEST(customer_code) FROM kams_customer_mapping WHERE user_id = '{data.get('id')}')" 
                    cur.execute(sql_statement)
                    count = pd.DataFrame(cur.fetchall(), columns=['count']).to_dict('records')
                elif data.get('status') == "RDD":
                    sql_statement : str = '''SELECT 
                                                mt_item.invoice_number, 
                                                mt_header.po_number, 
                                                mt_header.po_created_date,
                                                mt_header.so_number, 
                                                mt_header.so_created_date, 
                                                mt_header.id, 
                                                mt_header.site_code, 
                                                mt_header.customer,
                                                (CASE 
                                                    WHEN mer.po_number is not null THEN true 
                                                    ELSE false
                                                END) AS status
                                            FROM (
                                                SELECT DISTINCT invoice_number, po_id
                                                FROM mt_ecom_item_table
                                            ) mt_item
                                            JOIN mt_ecom_header_table mt_header ON mt_item.po_id = mt_header.id
                                            LEFT JOIN mt_ecom_rdd mer ON mt_header.po_number = mer.po_number'''
                    if data.get('search') and data.get('search').get('po_number'):
                        sql_statement += f" where (mt_header.po_number ilike '%{data.get('search').get('po_number')}%' or mt_header.so_number ilike '%{data.get('search').get('po_number')}%' or mt_item.invoice_number ilike '%{data.get('search').get('po_number')}%') and mt_header.po_created_date >= current_date - interval '60 days'"
                    else:
                        sql_statement += ''' where mt_header.po_created_date >= current_date - interval '60 days' '''
                    if data.get('selectedCustomerNames'):
                        selected_customer_names = ', '.join([f"'{name}'" for name in data.get('selectedCustomerNames')])
                        sql_statement += f" and customer in ({selected_customer_names})"
                    if data.get('selectedStatuses'):
                        selected_statuses = ', '.join([f"'{status}'" for status in data.get('selectedStatuses')])
                        sql_statement += f" and (CASE WHEN mer.po_number is not null THEN true ELSE false END) in ({selected_statuses})"
                    
                    if data.get('id') and "KAMS" in data.get("role"):
                        sql_statement += f" AND mt_header.customer_code = ANY (SELECT UNNEST(customer_code) FROM kams_customer_mapping WHERE user_id = '{data.get('id')}')" 
                    sql_statement += f" GROUP BY mt_item.invoice_number, mt_header.po_number , mt_header.po_created_date ,mt_header.so_number , mt_header.so_created_date , mt_header.id , mt_header.site_code, mer.po_number order by mt_header.created_on desc limit {data.get('limit')} offset {data.get('offset')}"
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description] 
                    header_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                    sql_statement = '''SELECT SUM(cnt) AS count
                                    FROM (
                                        SELECT COUNT(DISTINCT mt_header.po_number) AS cnt
                                        FROM (
                                            SELECT DISTINCT invoice_number, po_id
                                            FROM mt_ecom_item_table
                                        ) mt_item
                                        JOIN mt_ecom_header_table mt_header ON mt_item.po_id = mt_header.id
                                        LEFT JOIN mt_ecom_rdd mer ON mt_header.po_number = mer.po_number '''
                    if data.get('search') and data.get('search').get('po_number'):
                        sql_statement += f"where mt_header.po_number ilike '%{data.get('search').get('po_number')}%' or mt_header.so_number ilike '%{data.get('search').get('po_number')}%' or mt_item.invoice_number ilike '%{data.get('search').get('po_number')}%' and mt_header.po_created_date >= current_date - interval '60 days' "
                    else:
                        sql_statement += ''' where mt_header.po_created_date >= current_date - interval '60 days' '''
                    if data.get('selectedCustomerNames'):
                        sql_statement += f" and customer in ({selected_customer_names})"
                    if data.get('selectedStatuses'):
                        sql_statement += f" and (CASE WHEN mer.po_number is not null THEN true ELSE false END) in ({selected_statuses})"
                    if data.get('id') and  "KAMS" in data.get("role"):
                        sql_statement += f" AND mt_header.customer_code = ANY (SELECT UNNEST(customer_code) FROM kams_customer_mapping WHERE user_id = '{data.get('id')}')" 
                    sql_statement += f"GROUP BY mt_item.invoice_number, mt_header.po_number, mt_header.po_created_date, mt_header.so_number, mt_header.so_created_date, mt_header.id) AS counts "
                    cur.execute(sql_statement)
                    count = pd.DataFrame(cur.fetchall(),columns = ['count']).to_dict('records')
                    return {"poList":header_data,"total_count":count[0].get('count'), "customerNames": customer_names, "statuses": statuses}
                else:
                    sql_statement : str = '''SELECT * FROM mt_ecom_header_table where'''
                    sql_statement += f" status::TEXT != '{constants.INVOICE_SUCCESS}'"
                    if data.get('search') and data.get('search').get('po_number'):
                        sql_statement += f" and (po_number ilike '%{data.get('search').get('po_number')}%' or so_number ilike '%{data.get('search').get('po_number')}%')"
                    if data.get('search') and data.get('search').get('fromDate') and data.get('search').get('toDate'):
                        sql_statement += f" and po_created_date >= '{data.get('search').get('fromDate')}' and po_created_date <= '{data.get('search').get('toDate')}  23:59:59'"
                    else:
                        sql_statement += ''' and po_created_date >= current_date - interval '30 days' '''
                    if data.get('selectedCustomerNames'):
                        selected_customer_names = ', '.join([f"'{name}'" for name in data.get('selectedCustomerNames')])
                        sql_statement += f" and customer in ({selected_customer_names})"
                    if data.get('selectedStatuses'):
                        selected_statuses = ', '.join([f"'{status}'" for status in data.get('selectedStatuses')])
                        sql_statement += f" and status in ({selected_statuses})"
                    if data.get('id') and "KAMS" in data.get("role"):
                        sql_statement += f" AND customer_code = ANY (SELECT UNNEST(customer_code) FROM kams_customer_mapping WHERE user_id = '{data.get('id')}')" 
                    sql_statement += f" order by po_created_date desc limit {data.get('limit')} offset {data.get('offset')}"
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description] 
                    header_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                    sql_statement = ''' select count(*) from mt_ecom_header_table where'''
                    sql_statement += f" status::TEXT != '{constants.INVOICE_SUCCESS}'"
                    if data.get('search') and data.get('search').get('po_number'):
                        sql_statement += f" and (po_number ilike '%{data.get('search').get('po_number')}%' or so_number ilike '%{data.get('search').get('po_number')}%')"
                    if data.get('search') and data.get('search').get('fromDate') and data.get('search').get('toDate'):
                        sql_statement += f" and po_created_date >= '{data.get('search').get('fromDate')}' and po_created_date <= '{data.get('search').get('toDate')}  23:59:59'"
                    else:
                        sql_statement += ''' and po_created_date >= current_date - interval '30 days' '''
                    if data.get('selectedCustomerNames'):
                        selected_customer_names = ', '.join([f"'{name}'" for name in data.get('selectedCustomerNames')])
                        sql_statement += f" and customer in ({selected_customer_names})"
                    if data.get('selectedStatuses'):
                        selected_statuses = ', '.join([f"'{status}'" for status in data.get('selectedStatuses')])
                        sql_statement += f" and status in ({selected_statuses})"
                    if data.get('id') and "KAMS" in data.get("role"):
                        sql_statement += f" AND customer_code = ANY (SELECT UNNEST(customer_code) FROM kams_customer_mapping WHERE user_id = '{data.get('id')}')" 
                    cur.execute(sql_statement)
                    count = pd.DataFrame(cur.fetchall(),columns = ['count']).to_dict('records')
                return {"poList":header_data,"total_count":count[0].get('count'), "customerNames": customer_names, "statuses": statuses}
            except Exception as e:
                print("Error in po list",e)
                return False
    def get_mt_ecom_po_details(self, data):
        try:
            data = json.loads(data)
            with database_helper.get_read_connection() as conn_read:
                cur = conn_read.cursor()
                if(data.get('type') == 'Invoice' and data.get('invoice_number')):
                    sql_statement = "SELECT * FROM mt_ecom_item_table where invoice_number = %s order by item_number asc limit %s offset %s"
                    cur.execute(sql_statement, (data.get('invoice_number'),data.get('limit'),data.get('offset')))
                    column_names = [desc[0] for desc in cur.description] 
                    item_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                    sql_statement = ''' select count(*) from mt_ecom_item_table where invoice_number = %s '''
                    cur.execute(sql_statement, (data.get('invoice_number'),))
                    count = pd.DataFrame(cur.fetchall(),columns = ['count']).to_dict('records')
                else:
                    if data.get('status'):
                        sql_statement = "SELECT * FROM mt_ecom_item_table where po_id = %s and status = %s order by item_number asc limit %s offset %s"
                        cur.execute(sql_statement, (data.get('po_id'), data.get('status'), data.get('limit'), data.get('offset')))
                    else:
                        sql_statement = "SELECT * FROM mt_ecom_item_table where po_id = %s order by item_number asc limit %s offset %s"
                        cur.execute(sql_statement, (data.get('po_id'),data.get('limit'),data.get('offset')))
                    column_names = [desc[0] for desc in cur.description] 
                    item_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                    
                    if data.get('status'):
                        sql_statement = ''' select count(*) from mt_ecom_item_table where po_id = %s and status = %s'''
                        cur.execute(sql_statement, (data.get('po_id'), data.get('status')))
                    else:
                        sql_statement = ''' select count(*) from mt_ecom_item_table where po_id = %s '''
                        cur.execute(sql_statement, (data.get('po_id'),))
                    count = pd.DataFrame(cur.fetchall(),columns = ['count']).to_dict('records')
                sql_statement = "SELECT * FROM mt_ecom_logs where po_number = %s order by created_on desc"
                cur.execute(sql_statement, (data.get('po_number'),))
                column_names = [desc[0] for desc in cur.description] 
                log_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                sql_statement = ''' SELECT DISTINCT status, MAX(created_on) AS latest_date,count(*) as count FROM mt_ecom_logs where po_number = %s GROUP BY status'''
                cur.execute(sql_statement, (data.get('po_number'),))
                column_names = [desc[0] for desc in cur.description] 
                status = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                sql_statement = ''' SELECT invoice_number FROM mt_ecom_header_table where po_number = %s and invoice_number is not null'''
                cur.execute(sql_statement, (data.get('po_number'),))
                invoice_count = pd.DataFrame(cur.fetchall(),columns = ['invoice_number']).to_dict('records')
                sql_statement = ''' SELECT distinct invoice_number,invoice_date FROM mt_ecom_item_table where po_id = %s and invoice_number is not null'''
                cur.execute(sql_statement, (data.get('po_id'),))
                invoice_data = pd.DataFrame(cur.fetchall(),columns = ['invoice_number','invoice_date']).to_dict('records')
                return {"item_data":item_data,"log_data":log_data,"total_count":count[0].get('count'),"status":status,'invoice_count':len(invoice_count[0].get('invoice_number')) if len(invoice_count) > 0 else 0,'invoice_data':invoice_data}
        except Exception as e:
            print("Error in po details",e)
            return False
    def get_so_mail_receipients(self,id):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement: str = ''' Select site_code from mt_ecom_header_table where id = %s '''
                cur.execute(sql_statement,(id,))
                result = pd.DataFrame(cur.fetchall(),columns=['site_code']).to_dict('records')
                sql_statement: str = ''' Select email from mt_ecom_mail_recipients where site_code = %s and type = 'Success' '''
                cur.execute(sql_statement,(result[0].get('site_code'),))
                email = pd.DataFrame(cur.fetchall(),columns=['email']).to_dict('records')
                return email[0].get('email')
            except Exception as e:
                print("Exception in get_so_mail_receipients",e)
                raise e
    def get_customer_list(self,site_code = False):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                if site_code:
                    sql_statement: str = ''' Select customer_code,plant_code from mdm_material_data where site_code = %s'''
                    cur.execute(sql_statement,(site_code,))
                    result = pd.DataFrame(cur.fetchall(),columns=['customer_code','plant_code']).to_dict('records')
                    return result[0] if len(result) else {'customer_code':'','plant_code':''}
                else:    
                    sql_statement: str = f"Select distinct customer from mt_ecom_header_table where customer = 'Reliance' "
                    cur.execute(sql_statement)
                    result = pd.DataFrame(cur.fetchall(),columns=['customer']).to_dict('records')
                    return result[0].get('customer','')
            except Exception as e:
                print("Exception in get_customer_list",e)
                raise e
    def get_header_data(self,from_date,to_date):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                customer = constants.MT_ECOM_CUSTOMERS
                sql_statement: str = ''' Select * from mt_ecom_header_table where po_created_date between %s and %s and customer in  %s '''
                cur.execute(sql_statement,(from_date,to_date,tuple(customer)))
                column_names = [desc[0] for desc in cur.description] 
                header_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                return header_data
            except Exception as e:
                print("Exception in get_header_data",e)
                raise e
    def get_item_data(self,id):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement: str = ''' Select * from mt_ecom_item_table where po_id = %s '''
                cur.execute(sql_statement,(id,))
                column_names = [desc[0] for desc in cur.description] 
                item_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                return item_data
            except Exception as e:
                print("Exception in get_item_data",e)
                raise e
    def upload_data(self,data,user_id):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                row_data = [tuple(row.values()) for row in data]
                sql_statement:str = '''INSERT INTO mdm_material_data (
                                psku, sku, site_code, customer_code, article_id,
                                vendor_code, psku_desc, sku_desc, vendor_name,
                                plant_code, division, article_desc, customer_name,region,priority
                            ) VALUES %s on conflict (psku, sku, region, customer_name, article_id,customer_code, site_code, plant_code,vendor_code) 
                do update set is_deleted = FALSE,priority = EXCLUDED.priority,updated_on = now(),sku_desc = excluded.sku_desc, psku_desc = excluded.psku_desc RETURNING *'''
                existing_data_query = '''
                    SELECT * FROM mdm_material_data 
                    WHERE (psku, sku, region, customer_name, article_id, customer_code, site_code, plant_code, vendor_code) 
                    IN %s
                '''
                in_clause_values = [
                                    (
                                        item.get("psku"),
                                        item.get("sku"),
                                        item.get("region"),
                                        item.get("customer_name"),
                                        item.get("article_id"),
                                        item.get("customer_code"),
                                        item.get("site_code"),
                                        item.get("plant_code"),
                                        item.get("vendor_code"),
                                    )
                                    for item in data
                                ]
                cur.execute(existing_data_query, (tuple(in_clause_values),))
                existing_data = cur.fetchall()
                existing_column_names = [desc[0] for desc in cur.description]
                existing_data_df = pd.DataFrame(existing_data, columns=existing_column_names).to_dict('records')

                execute_values(
                        cur,
                        sql_statement,
                        row_data,
                        template=None,
                        page_size=10000
                    )         
                conn_write.commit()
                updated_rows = cur.fetchall()
                updated_column_names = [desc[0] for desc in cur.description]
                updated_data_df = pd.DataFrame(updated_rows, columns=updated_column_names).to_dict('records')
                audit_data = {"old_values": helper.remove_custom_types(existing_data_df), "new_values": helper.remove_custom_types(updated_data_df)}
                audit_sql = '''
                    INSERT INTO mt_ecom_audit_trail (type, updated_by, column_values)
                    VALUES ('Uploaded MDM Data', %s, %s)
                '''
                cur.execute(audit_sql, (user_id, json.dumps(audit_data)))

                conn_write.commit()
                response = cur.rowcount
                return response
            except Exception as e:
                print("Exception in upload_data",e)
                conn_write.rollback()
                raise e
    def get_mt_ecom_rdd_list(self,data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                so_data = ''
                item_data = ''
                filter_data = ''
                # data = json.loads(data)
                rdd_date_str = data.get('rdd')
                rdd_date = None
                customer_type = ''
                if rdd_date_str is not None:
                    rdd_date_str = data.get('rdd')[:10]  
                    rdd_date = datetime.strptime(rdd_date_str, '%Y-%m-%d').date()   
                else:
                    rdd_date = None  
                if  rdd_date is None and data.get('user_id'): 
                    sql_statement = f" select customer_code  from kams_customer_mapping where user_id =  '{data.get('user_id')}' "
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description] 
                    filter_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                if'customer_code' in data.keys() and data.get('customer_code') and rdd_date:
                    sql_statement = '''select so_number  from mt_ecom_header_table where customer_code = %s and delivery_date >= %s and so_number is not null and so_number != '' '''
                    cur.execute(sql_statement,[data.get('customer_code'),rdd_date])
                    column_names = [desc[0] for desc in cur.description] 
                    so_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                if 'customer_code' in data.keys() and data.get('customer_code'):
                    sql_statement = '''select customer_type from mt_ecom_customer_type where customer_code = %s '''
                    cur.execute(sql_statement,[data.get('customer_code'),])
                    column_names = [desc[0] for desc in cur.description]
                    customer_type = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
            
                 # added to fetch customer data from mt_ecom_header_table
                sql_statement = '''select customer from mt_ecom_header_table where customer_code = %s '''
                cur.execute(sql_statement,[data.get('customer_code'),])
                column_names = [desc[0] for desc in cur.description]
                customer_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')

                return {'filter_data':filter_data,"so_data":so_data,"item_data":item_data,"customer_type": customer_type[0].get('customer_type') if len(customer_type) > 0 else '', 
                        "customer_data": customer_data[0] if len(customer_data) > 0 else ''} 
            except Exception as e:
                    print("Exception in  get_mt_ecom_rdd_list",e)
                    conn_read.rollback()
                    raise e
    def get_mt_ecom_customer_list(self,data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                data = json.loads(data)
                sql_statement = '''SELECT * ,true as is_disabled FROM mt_ecom_customer_type '''
                if data.get('search') and (data.get('search').get('customerCode') and data.get('search').get('customerName')):
                    sql_statement += f"where (customer_code ilike '%{data.get('search').get('customerCode')}%' and customer_name ilike '%{data.get('search').get('customerName')}%') limit {data.get('limit')} offset {data.get('offset')}" 
                elif data.get('search') and data.get('search').get('customerCode'):
                    sql_statement += f"where customer_code ilike '%{data.get('search').get('customerCode')}%' limit {data.get('limit')} offset {data.get('offset')}"
                elif data.get('search') and data.get('search').get('customerName'):
                    sql_statement += f"where customer_name ilike '%{data.get('search').get('customerName')}%' limit {data.get('limit')} offset {data.get('offset')}"
                else:
                    sql_statement += f"limit {data.get('limit')} offset {data.get('offset')}"
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description] 
                customer_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                sql_statement = '''select count(*) from mt_ecom_customer_type ''' 
                if data.get('search') and (data.get('search').get('customerCode') and data.get('search').get('customerName')):
                    sql_statement += f"where (customer_code ilike '%{data.get('search').get('customerCode')}%' and customer_name ilike '%{data.get('search').get('customerName')}%') " 
                elif data.get('search') and data.get('search').get('customerCode'):
                    sql_statement += f"where customer_code ilike '%{data.get('search').get('customerCode')}%' "
                elif data.get('search') and data.get('search').get('customerName'):
                    sql_statement += f"where customer_name ilike '%{data.get('search').get('customerName')}%' "
                cur.execute(sql_statement)
                count = pd.DataFrame(cur.fetchall(),columns = ['count']).to_dict('records')
                return {"customerList":customer_data,"count":count[0].get('count')}
            except Exception as e:
                print("Exception in get_mt_ecom_customer_type",e)
                raise e
    def add_update_customer(self,data):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                data = json.loads(data)
                if data.get('id'):
                    sql_statement = '''UPDATE mt_ecom_customer_type SET customer_type = %s, customer_name = %s, customer_code = %s, updated_on = %s WHERE id = %s'''
                    cur.execute(sql_statement,(data.get('customer_type'),data.get('customer_name'),data.get('customer_code'),datetime.now(), data.get('id')))
                    conn_write.commit()
                    return {'message':'Customer Updated Successfully'}
                else:
                    sql_statement = '''INSERT INTO mt_ecom_customer_type (customer_type,customer_name,customer_code,created_on) VALUES (%s,%s,%s,%s)'''   
                    cur.execute(sql_statement,(data.get('customerType'),data.get('customer_name'),data.get('customer_code'),datetime.now()))
                    conn_write.commit()
                    return {'message':'Customer Added Successfully'}
            except Exception as e:
                print("Exception in add_update_customer",e)
                return False
    def get_po_numbers(self,data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = '''SELECT po_number FROM mt_ecom_header_table where so_number in %s '''
                cur.execute(sql_statement,(tuple(data),))
                column_names = [desc[0] for desc in cur.description] 
                po_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                return po_data
            except Exception as e:
                print("Exception in get_po_numbers",e)
                raise e
    def get_material_data(self, so,item_number):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = '''SELECT 
                    psku_code,
                    customer_product_id,
                    system_sku_description,
                    item_number,
                    system_sku_code,
                    mc.pak_to_cs  
                FROM 
                    mt_ecom_item_table mt
                LEFT JOIN 
                    material_master mc ON mc.code = mt.psku_code::varchar 
                WHERE 
                    mt.sales_order = %s AND mt.response_item_number = '%s' '''
                cur.execute(sql_statement,[so,item_number])
                column_names = [desc[0] for desc in cur.description] 
                po_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                return po_data
            except Exception as e:
                print("Exception in get_po_numbers",e)
                raise e
    
    def get_ror_data(self, so,item_number):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = '''SELECT message FROM mt_ecom_item_table where sales_order = %s and response_item_number = '%s' '''
                cur.execute(sql_statement,[so,item_number])
                column_names = [desc[0] for desc in cur.description] 
                po_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                return po_data[0].get('message','')
            except Exception as e:
                print("Exception in get_po_numbers",e)
                raise e

    def add_rdd(self,data):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                for item in data.get('data'):
                    if item.get('po_expiry_date',None) == '00000000':
                        item['po_expiry_date'] = None
                    sql_statement = '''INSERT INTO mt_ecom_rdd (po_number,so_number,po_expiry_date,rdd,po_item_number,
                    sap_item_number,customer_code,system_sku,sku_name,psku,schedule_line_number,confirmed_quantity,
                    po_qty,open_qty,article_id,created_on,updated_on,updated_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)'''
                    cur.execute(sql_statement,(item.get('po_number',''),item.get('sales_order',''),datetime.strptime(item.get('po_expiry_date',None), '%d-%m-%Y').strftime('%Y-%m-%d'),data.get('rdd',None),item.get('item_number',''),
                                               item.get('sap_item_number',''),str(data.get('customer_code','')),item.get('system_sku',0),item.get('sku_name',''),item.get('psku_code',0),
                                               item.get('schedule_line_number',''),item.get('confirmed_qty',0),item.get('po_qty',0),item.get('balance_qty',0),item.get('article_id',0),
                                               datetime.now(),datetime.now(),data.get('user_id','')))
                    conn_write.commit()
                return True
            except Exception as e:
                print("Exception in add_rdd",e)
                conn_write.rollback()
    def get_mt_ecom_rdd_item_list(self, data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = '''SELECT * FROM mt_ecom_rdd WHERE po_number = %s LIMIT %s OFFSET %s'''
                cur.execute(sql_statement, (data.get('po_number'), data.get('limit'), data.get('offset')))
                column_names = [desc[0] for desc in cur.description]
                rdd_data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict('records')

                sql_statement = '''SELECT COUNT(*) FROM mt_ecom_rdd WHERE po_number = %s'''
                cur.execute(sql_statement, (data.get('po_number'),))
                count = pd.DataFrame(cur.fetchall(), columns=['count']).to_dict('records')

                return {"rddList": rdd_data, "count": count[0].get('count')}
            except Exception as e:
                print("Exception in get_mt_ecom_rdd_item_list", e)
                raise e
    def get_mt_ecom_customer_workflow_list(self,data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = ''' Select *,true as is_disabled from mt_ecom_workflow_type LIMIT %s OFFSET %s'''
                cur.execute(sql_statement,(data.get('limit'),data.get('offset')))
                column_names = [desc[0] for desc in cur.description] 
                customer_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                sql_statement = ''' select count(*) from mt_ecom_workflow_type '''
                cur.execute(sql_statement)
                count = pd.DataFrame(cur.fetchall(),columns = ['count']).to_dict('records')
                sql_statement = '''SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'mt_ecom_po_type') '''
                cur.execute(sql_statement)
                po_type = pd.DataFrame(cur.fetchall(),columns = ['enumlabel']).to_dict('records')
                sql_statement = '''SELECT distinct (customer_name) as customer
                                FROM mdm_material_data mmd
                                WHERE NOT EXISTS (
                                    SELECT 1
                                    FROM mt_ecom_workflow_type mvt
                                    WHERE mmd.customer_name = mvt.customer);'''
                cur.execute(sql_statement)
                customer = pd.DataFrame(cur.fetchall(),columns = ['customer']).to_dict('records')
                return {"customerWorkflowList":customer_data,"count":count[0].get('count'),"poType":po_type,"customer":customer}
            except Exception as e:
                print("Exception in get_mt_ecom_customer_type",e)
                return
    def add_update_customer_workflow(self,data):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                data = json.loads(data)
                if data.get('id'):
                    sql_statement = '''UPDATE mt_ecom_workflow_type SET customer = %s, po_format = %s, acknowledgement =%s, article = %s,tot= %s, mrp_1 = %s, mrp_2 = %s, caselot = %s, base_price = %s, invoice = %s, asn = %s , po_type = %s, updated_at = %s WHERE id = %s'''
                    cur.execute(sql_statement,(data.get('customer'),data.get('po_format'),data.get('acknowledgement') ,data.get('article'),data.get('tot',False), data.get('mrp_1'), data.get('mrp_2'), data.get('caselot'), data.get('base_price'), data.get('invoice'), data.get('asn'), data.get('po_type'),datetime.now(), data.get('id')))
                    conn_write.commit()
                    return {'message':'Customer Updated Successfully'}  
                else:
                    columns = ", ".join(data.get('workflow_type'))
                    values = ", ".join("True" for _ in data.get('workflow_type'))
                    sql_statement = F"INSERT INTO mt_ecom_workflow_type (customer,{columns},po_type,created_at) VALUES ('{data.get('customer_name')}',{values},'{data.get('po_type')}','{datetime.now()}')"
                    cur.execute(sql_statement)
                    conn_write.commit()
                    return {'message':'Customer Added Successfully'}
            except Exception as e:
                print("Exception in add_update_customer",e)
                return False

    def get_mt_ecom_customer_workflow(self, data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                if data.get("customer_name") != "0":
                    sql_statement = """ Select *,true as is_disabled from mt_ecom_workflow_type where customer = %s"""
                    cur.execute(sql_statement, (data.get("customer_name"),))
                    column_names = [desc[0] for desc in cur.description]
                    customer_data = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
                    return {"customerData": customer_data}
                elif data.get("user_id") != "0":
                    sql_statement = """ Select customer_name from kams_customer_mapping where user_id = %s"""
                    cur.execute(sql_statement, (data.get("user_id"),))
                    column_names = [desc[0] for desc in cur.description]
                    customer_names = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
                    return {"customerNames": customer_names}
                else:
                    sql_statement = (
                        """ Select distinct customer_name from mdm_material_data """
                    )
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description]
                    customer_names = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
                    return {"customerNames": customer_names}
            except Exception as e:
                print("Exception in get_mt_ecom_customer_workflow", e)
                return
    def get_customer_codes(self,data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = f"SELECT customer_code from kams_customer_mapping where user_id = '{data.get('user_id')}'"
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                customer_data = pd.DataFrame(
                    cur.fetchall(), columns=column_names
                ).to_dict("records")
                return customer_data[0] if len(customer_data) else ''
            except Exception as e:
                print("Exception in get_customer_codes", e)
                return
    def so_sync_data(self,data):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                for header_data in data:
                    sql_statement = '''INSERT INTO mt_ecom_header_table (po_created_date,delivery_date,so_created_date,po_number,so_number,invoice_number,status,customer,customer_code) VALUES (%s,%s,%s,%s,%s,ARRAY[%s],%s,%s,%s) on conflict(po_number) do nothing returning id'''
                    cur.execute(sql_statement,(header_data.get('po_created_date',''),header_data.get('delivery_date',''),header_data.get('so_created_date',''),header_data.get('po_number',''),header_data.get('so_number',''),header_data.get('invoice_number',''),header_data.get('status',''),header_data.get('customer',''),header_data.get('customer_code','')))
                    conn_write.commit()
                    column_names = [desc[0] for desc in cur.description]
                    id = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
                    if not len(id):
                        sql_statement = '''SELECT id FROM mt_ecom_header_table WHERE po_number = %s'''
                        cur.execute(sql_statement,(header_data.get('po_number',''),))
                        column_names = [desc[0] for desc in cur.description]
                        id = pd.DataFrame(
                            cur.fetchall(), columns=column_names
                        ).to_dict("records")
                    header_data['item_data'] = [{'po_id': id[0].get('id'), **row} for row in header_data.get('item_data')]
                    row_data = [tuple(row.values()) for row in header_data.get('item_data')]
                    id = []
                    sql_statement:str = '''INSERT INTO mt_ecom_item_table (po_id,item_number, plant_code, plant_name, system_sku_code, system_sku_description,
                                    psku_code, psku_description, mrp, caselot,
                                    sales_order, sales_unit,response_item_number,message,so_qty,target_qty,uom,allocated_qty
                                ) VALUES %s on conflict (po_id,item_number)
                                    do update set allocated_qty= Excluded.allocated_qty,message = Excluded.message,updated_on = now()'''
                    execute_values(
                            cur,
                            sql_statement,
                            row_data,
                            template=None,
                            page_size=10000
                        )
                    conn_write.commit()
                return True
            except Exception as e:
                print("Exception in so_sync_data",e)
                conn_write.rollback()
                return False
            
    def customer_codes(self, data):
        """
        Retrieves customer codes, names, groups, and payer codes based on the provided filters and user role.
        """
        user_id = data['user_id']
        role = data.get('role', '')
    
        customer_groups = []
        payer_codes = []
    
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                if role == 'NKAMS':
                    cur.execute("SELECT customer_group FROM kams_customer_mapping WHERE user_id = %s", (user_id,))
                    result = cur.fetchone()
                    if result:
                        customer_groups_nkams = [group.strip() for group in result[0].strip('{}').split(',')]
                    else:
                        customer_groups_nkams = []
    
                    customer_groups_str = ', '.join(f"'{group}'" for group in customer_groups_nkams)
                    cur.execute(f"SELECT DISTINCT payer_code FROM mt_ecom_payer_code_mapping WHERE customer_group IN ({customer_groups_str}) and is_deleted is false")
                    payer_codes_nkams = [{"payer_code": row[0]} for row in cur.fetchall()]
    
                    payer_codes = payer_codes_nkams
                    customer_groups = [{"customer_group": group} for group in customer_groups_nkams]
    
                    sql_statement = f"select customer_code,customer_name,customer_group,payer_code from mt_ecom_payer_code_mapping where (customer_name ilike '%{data.get('headerFilter', {}).get('customerName', '')}%' and customer_code ilike '%{data.get('headerFilter', {}).get('customerCode', '')}%') and is_deleted is false "
                    if data.get('payerCode'):
                        payer_code = data['payerCode']
                        filtered_customer_group = []
    
                        if isinstance(payer_code, str):
                            payer_code = [code.strip() for code in payer_code.strip("[]").split(",")]
    
                        payer_code_str = ', '.join(f"'{code}'" for code in payer_code)
                    
                        # Extract all customer_group values from customer_groups_nkams
                        customer_group_values = [group for group in customer_groups_nkams]
                    
                        query = f"""
                        SELECT DISTINCT customer_group 
                        FROM mt_ecom_payer_code_mapping 
                        WHERE customer_group IN ({','.join(['%s'] * len(customer_group_values))}) 
                        AND payer_code IN ({payer_code_str}) and is_deleted is false
                        """
                    
                        cur.execute(query, customer_group_values)
                    
                        result_set = cur.fetchall()
                    
                        result_customer_groups = {row[0] for row in result_set}
                    
                        filtered_customer_group = [{"customer_group": group} for group in customer_group_values if group in result_customer_groups]
                    
                        customer_groups = filtered_customer_group
    
                        if payer_code:
                            sql_statement += f" AND payer_code IN ({payer_code_str})"
                            payer_codes = [{"payer_code": code["payer_code"]} for code in payer_codes_nkams]
    
                    if data.get('customerGroup'):
                        filtered_payer_codes = []
                        customer_group = data['customerGroup']
    
                        if isinstance(customer_group, str):
                            customer_group = [group.strip() for group in customer_group.strip("[]").split(",")]
    
                        customer_group_str = ', '.join(f"'{group}'" for group in customer_group)
    
                        # Extract all payer_code values from payer_codes_nkams
                        payer_code_values = [payer_code['payer_code'] for payer_code in payer_codes_nkams]
                        query = f"""
                        SELECT payer_code 
                        FROM mt_ecom_payer_code_mapping 
                        WHERE payer_code IN ({','.join(['%s'] * len(payer_code_values))}) 
                        AND customer_group IN ({customer_group_str}) and is_deleted is false
                        """
                        cur.execute(query, payer_code_values)
                        result_set = cur.fetchall()
                        result_payer_codes = {row[0] for row in result_set}
                        filtered_payer_codes = [payer_code for payer_code in payer_codes_nkams if payer_code['payer_code'] in result_payer_codes]

                        payer_codes = filtered_payer_codes
                        customer_groups = [{"customer_group": group} for group in customer_groups_nkams]
    
                        sql_statement += f" AND customer_group IN ({customer_group_str})"
                        customer_groups = [{"customer_group": group} for group in customer_groups_nkams]
    
                    # Ensure only customer groups in customer_groups_nkams are included
                    customer_groups_str = ', '.join(f"'{group}'" for group in customer_groups_nkams)
                    sql_statement += f" AND customer_group IN ({customer_groups_str})"
    
                    sql_statement += f" limit {data.get('limit')} offset {data.get('offset')}"
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description]
                    customer_data = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
    
                    sql_statement = f"SELECT COUNT(*) from mt_ecom_payer_code_mapping where (customer_name ilike '%{data.get('headerFilter', {}).get('customerName', '')}%' and customer_code ilike '%{data.get('headerFilter', {}).get('customerCode', '')}%') and is_deleted is false "
                    if data.get('payerCode'):
                        payer_codes = data.get('payerCode')
                        if payer_codes:
                            payer_codes_str = ', '.join(f"'{code}'" for code in payer_codes)
                            sql_statement += f" AND payer_code IN ({payer_codes_str})"
                            payer_codes = [{"payer_code": code["payer_code"]} for code in payer_codes_nkams]
    
                    if data.get('customerGroup'):
                        customer_groups = data.get('customerGroup')
                        if isinstance(customer_groups, list):
                            customer_groups_str = ', '.join(f"'{group}'" for group in customer_groups)

                        sql_statement += f" AND customer_group IN ({customer_groups_str})"
                        customer_groups = [{"customer_group": group} for group in customer_groups_nkams]
    
                        # Ensure only customer groups in customer_groups_nkams are included
                    customer_groups_str = ', '.join(f"'{group}'" for group in customer_groups_nkams)
                    sql_statement += f" AND customer_group IN ({customer_groups_str})"
    
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description]
                    count = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
                    return {
                        "customer_data": customer_data,
                        "count": count[0].get('count'),
                        "payer_code": payer_codes,
                        "customer_group": customer_groups
                    }
                else:
                    payer_codes = ', '.join(f"'{code}'" for code in data['payerCode'])
                    customer_groups = ', '.join(f"'{group}'" for group in data['customerGroup'])
                    sql_statement = f"select customer_code,customer_name,customer_group,payer_code from mt_ecom_payer_code_mapping where (customer_name ilike '%{data.get('headerFilter',{}).get('customerName','')}%' and customer_code ilike '%{data.get('headerFilter',{}).get('customerCode','')}%') and is_deleted is false "
                    if payer_codes:
                        sql_statement += f" AND payer_code IN ({payer_codes})"
                    if customer_groups:
                        sql_statement += f" AND customer_group IN ({customer_groups})"
                    sql_statement += f"limit {data.get('limit')} offset {data.get('offset')}"
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description]
                    customer_data = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
                    sql_statement =  f"SELECT COUNT(*) from mt_ecom_payer_code_mapping where (customer_name ilike '%{data.get('headerFilter',{}).get('customerName','')}%' and customer_code ilike '%{data.get('headerFilter',{}).get('customerCode','')}%') and is_deleted is false "
                    if payer_codes:
                        sql_statement += f" AND payer_code IN ({payer_codes})"
                    if customer_groups:
                        sql_statement += f" AND customer_group IN ({customer_groups})"
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description]
                    count = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
                    sql_statement = '''SELECT distinct payer_code FROM mt_ecom_payer_code_mapping where '''
                    if customer_groups:
                        sql_statement += f" customer_group IN ({customer_groups}) and "
                    sql_statement += "is_deleted is false"
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description]
                    payer_code = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
                    sql_statement = '''SELECT distinct customer_group FROM mt_ecom_payer_code_mapping where '''
                    if payer_codes:
                        sql_statement += f" payer_code IN ({payer_codes}) and "
                    sql_statement += "is_deleted is false"
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description]
                    customer_group = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
    
                    return {
                        "customer_data": customer_data,
                        "count": count[0].get('count'),
                        "payer_code": payer_code,
                        "customer_group": customer_group
                    }
    
            except Exception as e:
                print("Exception in customer_codes", e)
                return
    def sync_logs(self,data,flag,user_id):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                if flag:
                    sql_statement = '''INSERT INTO sync_logs (type,run_at,result,user_id) VALUES (%s,%s,%s,%s)'''
                    cur.execute(sql_statement,(data.get('type',''),data.get('run_at',''),data.get('status',''),user_id))
                    conn_write.commit()
                    return True
                else:
                    sql_statement = f" SELECT run_at, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - run_at)) AS diff FROM sync_logs WHERE type='MT ECOM SO Sync' AND result='SUCCESS' AND user_id = '{user_id}' order by created_on desc limit 1"
                    cur.execute(sql_statement)
                    column_names = [desc[0] for desc in cur.description]
                    run_at = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
                    return run_at
                    
            except Exception as e:
                print("Exception in sync_logs",e)
                conn_write.rollback()
                return False
    def add_update_kams(self,data,payer_code):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            error_emails = []
            try:
                if 'code' in data.keys() and data.get('code'):
                    sql_statement = f"UPDATE kams_customer_mapping SET customer_code = array_remove(customer_code, '{data.get('code')}') WHERE user_id = '{data.get('user_id')}'"
                    cur.execute(sql_statement)
                    conn_write.commit()
                    return {'message': SuccessMessage.REMOVE_KAMS_NKAMS_CUSTOMER_SUCCESS}
                else:    
                    for email in data.get('email',[]):
                        sql_statement = f"SELECT user_id FROM sales_hierarchy_details WHERE email ILIKE '{email}' AND deleted = false AND status = 'ACTIVE'"                       
                        cur.execute(sql_statement)
                        column_names = [desc[0] for desc in cur.description]
                        response = pd.DataFrame(
                                cur.fetchall(), columns=column_names
                            ).to_dict("records")
                        if len(response)>0:
                            sql_statement = '''SELECT payer_code, customer_group FROM kams_customer_mapping WHERE user_id = %s'''
                            cur.execute(sql_statement,(response[0].get('user_id'),))
                            column_names = [desc[0] for desc in cur.description]
                            payer_codes = pd.DataFrame(
                                cur.fetchall(), columns=column_names
                            ).to_dict("records")
                            if payer_codes and payer_codes[0].get('payer_code', []) != None and payer_codes[0].get('payer_code', []) != [None] and len(payer_codes[0].get('payer_code', [])):
                                payer_code_list = payer_codes[0].get('payer_code', [])[0] if payer_codes[0].get('payer_code', []) != None else []
                                dict1 = {item['payer_code']: item for item in payer_code_list}
                                for item in payer_code:
                                    if item['payer_code'] in dict1:
                                        dict1[item['payer_code']]['credit_limit'] = item['credit_limit']
                                    else:
                                        dict1[item['payer_code']] = item
                                payer = []
                                for key, value in dict1.items():
                                    payer.append(value.get('payer_code'))
                                customer_group_array = data.get('customerGroup')
                                if customer_group_array:
                                    sql_statement = '''SELECT customer_code FROM mt_ecom_payer_code_mapping WHERE payer_code IN %s AND customer_group IN %s and is_deleted is false '''
                                    cur.execute(sql_statement, (tuple(payer), tuple(customer_group_array)))
                                else:
                                    sql_statement = '''SELECT customer_code FROM mt_ecom_payer_code_mapping WHERE payer_code IN %s and is_deleted is false '''
                                    cur.execute(sql_statement, (tuple(payer),))
                                column_names = [desc[0] for desc in cur.description]
                                customer_codes = pd.DataFrame(
                                    cur.fetchall(), columns=column_names
                                ).to_dict("records")
                                customer_code_list = [code['customer_code'] for code in customer_codes]
    
                                # Merge customer groups
                                existing_customer_group = payer_codes[0].get('customer_group', [])
                                new_customer_group = data.get('customerGroup', [])
                                # existing_customer_group = existing_customer_group.strip('{}').split(',') if isinstance(existing_customer_group, str) else existing_customer_group
                                if existing_customer_group is None:
                                    existing_customer_group = []
                                elif isinstance(existing_customer_group, str):
                                    existing_customer_group = [x.strip() for x in existing_customer_group.strip('{}').split(',') if x.strip()]
                                new_customer_group = new_customer_group.strip('[]').split(',') if isinstance(new_customer_group, str) else new_customer_group
                                merged_customer_group = list(set(existing_customer_group + new_customer_group))
    
                                sql_statement = '''UPDATE kams_customer_mapping SET payer_code = ARRAY[%s]::jsonb[], customer_code = %s, customer_group = %s WHERE user_id = %s'''
                                cur.execute(sql_statement, (json.dumps(list(dict1.values())), customer_code_list, merged_customer_group, response[0].get('user_id')))
                                conn_write.commit()
                                
                                audit_sql = '''
                                    INSERT INTO mt_ecom_audit_trail (type, updated_by, column_values)
                                    VALUES ('ADD KAMS/NKAMS details', %s, %s)
                                '''
                                audit_data = {
                                    'user_id': response[0].get('user_id'),
                                    'payer_code': list(dict1.values()),
                                    'customer_code': customer_code_list,
                                    'customer_group': merged_customer_group
                                }
                                cur.execute(audit_sql, (data.get('id'), json.dumps(audit_data)))
                                conn_write.commit()
    
                            else:
                                payer  = [item['payer_code'] for item in payer_code]
                                payer_code_jsonb_array = json.dumps(payer_code)
                                customer_group_array = data.get('customerGroup')
                                if customer_group_array:
                                    sql_statement = '''SELECT customer_code FROM mt_ecom_payer_code_mapping WHERE payer_code IN %s AND customer_group IN %s and is_deleted is false '''
                                    cur.execute(sql_statement, (tuple(payer), tuple(customer_group_array)))
                                else:
                                    sql_statement = '''SELECT customer_code FROM mt_ecom_payer_code_mapping WHERE payer_code IN %s and is_deleted is false '''
                                    cur.execute(sql_statement, (tuple(payer),))
                                column_names = [desc[0] for desc in cur.description]
                                customer_codes = pd.DataFrame(
                                    cur.fetchall(), columns=column_names
                                ).to_dict("records")
                                customer_code_list = [code['customer_code'] for code in customer_codes]
                                sql_statement = '''INSERT INTO kams_customer_mapping (user_id, payer_code, customer_code, customer_group, updated_by) 
                                                VALUES (%s, ARRAY[%s]::jsonb[], %s, %s, %s)
                                                ON CONFLICT (user_id) 
                                                DO UPDATE SET customer_code = EXCLUDED.customer_code, payer_code = EXCLUDED.payer_code, customer_group = EXCLUDED.customer_group'''
    
                                cur.execute(sql_statement, (
                                    response[0].get('user_id'), 
                                    payer_code_jsonb_array, 
                                    customer_code_list, 
                                    data.get('customerGroup'),
                                    data.get('id')
                                ))
                                conn_write.commit()
                            audit_sql = '''
                                INSERT INTO mt_ecom_audit_trail (type, updated_by, column_values)
                                VALUES (%s, %s, %s)
                            '''
                            audit_data = {
                                'user_id': response[0].get('user_id'),
                                'payer_code': payer_code,
                                'customer_code': customer_code_list,
                                'customer_group': data.get('customerGroup')
                            }
                            cur.execute(audit_sql, (constants.MT_ECOM_AUDIT_TRAIL_ADD_KAMS_NKAMS, data.get('id'), json.dumps(audit_data)))
                            conn_write.commit()  
                        else:
                            print("Email not found")
                            error_emails.append(email)
                    return error_emails if len(error_emails) else {'message': SuccessMessage.ADD_KAMS_NKAMS_CUSTOMER_SUCCESS}
            except Exception as e:
                logger.error("Exception in add_update_kams",e)
                return {"message": ErrorMessage.ADD_KAMS_NKAMS_CUSTOMER_ERROR}
            
    def getKamsData(self, data):
        data = json.loads(data.decode('utf-8'))
        
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                # Base SQL query to fetch KAMS data
                base_sql = '''WITH json_data AS (
                                SELECT
                                    user_id,
                                    json_array_elements_text(unnest(payer_code)::json) AS json_element,
                                    TRIM(BOTH '{}' FROM customer_group) AS customer_group
                                FROM
                                    kams_customer_mapping
                            ),
                            payer_codes AS (
                                SELECT
                                    user_id,
                                    customer_group,
                                    (json_element::json)->>'payer_code' AS payer_code,
                                    (json_element::json)->>'credit_limit' AS credit_limit
                                FROM
                                    json_data
                            )
                            SELECT
                                pc.user_id,
                                t2.first_name,
                                t2.email,
                                t2.last_name,
                                pc.payer_code,
                                pc.credit_limit,
                                o.customer_group,
                                o.customer_code
                            FROM
                                payer_codes pc
                            JOIN
                                mt_ecom_payer_code_mapping o
                            ON
                                o.payer_code = pc.payer_code
                                AND o.customer_group = ANY(string_to_array(pc.customer_group, ','))
                            JOIN
                                sales_hierarchy_details t2
                            ON
                                t2.user_id = pc.user_id
                            WHERE
                                t2.deleted IS FALSE AND t2.status = 'ACTIVE' and o.is_deleted is false '''
    
                # Build the WHERE clause based on search parameters
                where_condition = []
                search = data.get('search', {})
                if search.get('kamsName', ''):
                    where_condition.append(f"(t2.first_name ILIKE '%{search.get('kamsName', '')}%' OR t2.last_name ILIKE '%{search.get('kamsName', '')}%')")
                if search.get('customerCode', ''):
                    where_condition.append(f"o.customer_code ILIKE '%{search.get('customerCode', '')}%'")
                if search.get('email', ''):
                    where_condition.append(f"t2.email ILIKE '%{search.get('email', '')}%'")
                if search.get('payerCode', ''):
                    where_condition.append(f"pc.payer_code ILIKE '%{search.get('payerCode', '')}%'")
                if search.get('customerGroup', []):
                    customer_groups = "','".join(search.get('customerGroup', []))
                    where_condition.append(f"o.customer_group IN ('{customer_groups}')")
                if where_condition:
                    base_sql += f" AND {' AND '.join(where_condition)}"
    
                # Main query with limit and offset
                sql_statement = base_sql
                if 'limit' in data:
                    sql_statement += f" LIMIT {data['limit']}"
                if 'offset' in data:
                    sql_statement += f" OFFSET {data['offset']}"
    
                # Execute the main query to fetch KAMS data
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                kams_data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
    
                # Count query to get the total number of records
                count_sql_statement = f"SELECT COUNT(*) FROM ({base_sql}) AS count_query"
                cur.execute(count_sql_statement)
                count = cur.fetchone()[0]
    
                # Fetch all customer groups without offset, limit, and customerGroup filters
                sql_statement_all_groups = '''WITH json_data AS (
                                                SELECT
                                                    user_id,
                                                    json_array_elements_text(unnest(payer_code)::json) AS json_element,
                                                    TRIM(BOTH '{}' FROM customer_group) AS customer_group
                                                FROM
                                                    kams_customer_mapping
                                            ),
                                            payer_codes AS (
                                                SELECT
                                                    user_id,
                                                    customer_group,
                                                    (json_element::json)->>'payer_code' AS payer_code,
                                                    (json_element::json)->>'credit_limit' AS credit_limit
                                                FROM
                                                    json_data
                                            )
                                            SELECT
                                                DISTINCT o.customer_group
                                            FROM
                                                payer_codes pc
                                            JOIN
                                                mt_ecom_payer_code_mapping o
                                            ON
                                                o.payer_code = pc.payer_code
                                                AND o.customer_group = ANY(string_to_array(pc.customer_group, ','))
                                            JOIN
                                                sales_hierarchy_details t2
                                            ON
                                                t2.user_id = pc.user_id
                                            WHERE
                                                t2.deleted IS FALSE AND t2.status = 'ACTIVE' and o.is_deleted is false '''
                
                if search.get('kamsName', ''):
                    sql_statement_all_groups += f" AND (t2.first_name ILIKE '%{search.get('kamsName', '')}%' OR t2.last_name ILIKE '%{search.get('kamsName', '')}%')"
                if search.get('customerCode', ''):
                    sql_statement_all_groups += f" AND o.customer_code ILIKE '%{search.get('customerCode', '')}%'"
                if search.get('email', ''):
                    sql_statement_all_groups += f" AND t2.email ILIKE '%{search.get('email', '')}%'"
                if search.get('payerCode', ''):
                    sql_statement_all_groups += f" AND pc.payer_code ILIKE '%{search.get('payerCode', '')}%'"
                
                cur.execute(sql_statement_all_groups)
                all_customer_groups = [row[0] for row in cur.fetchall()]

                return {"kams_data": kams_data, "customer_groups": all_customer_groups, "count": count}
            except Exception as e:
                print("Exception in getKamsData", e)
                return False
            
    def get_exclusion_customer_codes(self):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = '''SELECT customer_code FROM public.mt_ecom_exclusion_customer_codes'''
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                exclusion_codes = pd.DataFrame(
                    cur.fetchall(), columns=column_names
                ).to_dict("records")
                return exclusion_codes
            except Exception as e:
                print("Exception in get_exclusion_customer_codes",e)
                return False

    def get_app_level_settings(self,type:str):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = f"SELECT * FROM public.app_level_settings where key = '{type}' "
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                app_level_settings = pd.DataFrame(
                    cur.fetchall(), columns=column_names
                ).to_dict("records")
                return True if app_level_settings[0].get('value') == 'YES' else  app_level_settings[0].get('value') if app_level_settings[0].get('value') else False
            except Exception as e:
                print("Exception in get_app_level_settings",e)
                return False
            
    def retrigger(self,data:str):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                sql_statement = f"Update mt_ecom_header_table set so_flag = False where po_number = '{data.get('PO NUMBER')}' "
                cur.execute(sql_statement)
                return True
            except Exception as e:
                raise "Exception in retrigger "+e
            

    def get_mismatch_data(self,data):
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            excluded_data = []
            excluded_id = []
            if data[0].get('customer_name') == constants.RELIANCE:
                records = [
                        (
                            item.get('psku'),
                            item.get('sku'),
                            item.get('region'),
                            item.get('customer_name'),
                            item.get('article_id'),
                            item.get('customer_code'),
                            item.get('site_code'),
                            item.get('plant_code'),
                            str(item.get('vendor_code')),
                            item.get('priority')
                        )
                        for item in data
                    ]
                sql_statement = '''WITH input_data (
                                psku,
                                sku,
                                region,
                                customer_name,
                                article_id,
                                customer_code,
                                site_code,
                                plant_code,
                                vendor_code,
                                priority
                            ) AS (
                                VALUES %s
                            )
                            SELECT mdm.*
                            FROM mdm_material_data mdm
                            JOIN input_data id ON 
                                mdm.psku = id.psku AND
                                mdm.sku = id.sku AND
                                mdm.region = id.region AND
                                mdm.customer_name = id.customer_name AND
                                mdm.article_id = id.article_id AND
                                mdm.customer_code = id.customer_code AND
                                mdm.site_code = id.site_code AND
                                mdm.plant_code = id.plant_code AND
                                mdm.vendor_code = id.vendor_code AND
                                mdm.priority = id.priority
                            WHERE mdm.is_deleted = false;'''
                formatted_records = ', '.join(cur.mogrify("(%s, %s, %s, %s, %s,%s,%s,%s,%s,%s)", record).decode('utf-8') for record in records)
            else :
                records = [
                (
                    item.get('psku'),
                    item.get('region'),
                    item.get('customer_name'),
                    item.get('article_id'),
                    item.get('customer_code'),
                    item.get('site_code'),
                    item.get('plant_code'),
                    str(item.get('vendor_code')),
                    item.get('priority')
                )
                for item in data
            ]
                sql_statement = '''WITH input_data 
                    (psku,
                    region,
                    customer_name,
                    article_id,
                    customer_code,
                    site_code,
                    plant_code,
                    vendor_code,
                    priority) AS (
                VALUES %s
            )
            SELECT mdm.*
            FROM mdm_material_data mdm
            JOIN input_data id ON 
                mdm.psku = id.psku
                AND mdm.region = id.region
                AND mdm.customer_name = id.customer_name
                AND mdm.article_id = id.article_id
                AND mdm.customer_code = id.customer_code 
                AND mdm.site_code = id.site_code 
                AND mdm.plant_code = id.plant_code 
                AND mdm.vendor_code = id.vendor_code 
                AND mdm.priority = id.priority 
                where mdm.is_deleted = false
                '''
                formatted_records = ', '.join(cur.mogrify("(%s, %s, %s, %s, %s,%s,%s,%s,%s)", record).decode('utf-8') for record in records)
            cur.execute(sql_statement % formatted_records)
            column_names = [desc[0] for desc in cur.description] 
            item_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
            if data[0].get('customer_name') == constants.RELIANCE:
                return item_data
            else :
                excluded_id= [str(item.get('psku',0)) + str(item.get('customer_name','')) + str(item.get('article_id','')) + str(item.get('customer_code',0)) + str(item.get('site_code','')) + str(item.get('plant_code',0)) + str(item.get('vendor_code','')) + str(item.get('priority',1)) for item in item_data]
                for item in data:
                    if item.get('sku_id') in excluded_id:
                        excluded_data.append(item)
                return excluded_data
            
    def sync_iso_state(self,data):
        logger.info("Inside MTECOMModel->sync_iso_state")
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                row_data = [tuple(row.values()) for row in data]
                sql_statement = '''INSERT INTO iso_state (iso_code,state_name,type) VALUES %s on conflict(iso_code) do nothing '''
                execute_values(
                                cur,
                                sql_statement,
                                row_data,
                                template=None,
                                page_size=10000
                            )
                conn_write.commit()
                return cur.rowcount
            except Exception as e:
                logger.error("Exception in sync_iso_state",e)
                conn_write.rollback()
                return "Error in sync_iso_state"
            
    def get_rdd_data(self,from_date,to_date):
        logger.info("Inside MTECOMModel->get_rdd_data")
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s '''
                cur.execute(sql_statement,(from_date,to_date + " 23:59:59"))
                column_names = [desc[0] for desc in cur.description] 
                rdd_data = pd.DataFrame(cur.fetchall(),columns = column_names).to_dict('records')
                return rdd_data
            except Exception as e:
                logger.error("Exception in get_rdd_data",e)
                return "Error in get_rdd_data"
    
    def save_rdd_data(self,data):
        logger.info("Inside MTECOMModel->save_rdd_data")
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                for items in data.get('NAVITEM',[]):
                    sql_statement: str = ''' INSERT INTO public.mt_ecom_rdd
                    (po_number, so_number, po_expiry_date, rdd, sap_item_number, customer_code, system_sku, schedule_line_number, confirmed_quantity, po_qty, open_qty, created_on, updated_on, updated_by)
                    VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, now(), now(), 'PORTAL_MANAGED'); '''
                    cur.executemany(
                        sql_statement,
                        [
                            (
                                data.get('PoNumber',''),
                                data.get('Sales_Order_Number',''),
                                datetime.strptime(data.get('PoDateTo',''), '%d.%m.%Y').strftime('%Y-%m-%d'),
                                datetime.strptime(item.get('DeliveryDate',''), '%Y%m%d').strftime('%Y-%m-%d'),
                                items.get('ItemNumber',''),
                                data.get('SoldTo',''),
                                items.get('SystemSKUCode',''),
                                item.get('ScheduleLineNumber',''),
                                item.get('OrderQuantity',''),
                                items.get('TargetQty',''),
                                '0',
                            )
                            for item in items.get('NAVSCHLINES')
                        ],
                    )
                    conn_write.commit()
                return cur.rowcount
            except Exception as e:
                logger.error("Exception in save_rdd_data",e)
                raise e

    @log_decorator        
    def get_kams_mail(self):
        logger.info("Inside MTECOMModel->get_kams_mail")
        sql_statement = "Select email from sales_hierarchy_details sh where roles && ARRAY['KAMS', 'NKAMS']::_roles_type AND sh.status = 'ACTIVE' AND sh.deleted = FALSE"
        try:
            with database_helper.get_read_connection() as conn_read:
                cur = conn_read.cursor()
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                email_data = pd.DataFrame(
                    cur.fetchall(), columns=column_names
                ).to_dict("records")
                return email_data
        except Exception as e:
            logger.error("Exception in get_kams_mail",e)
            return False
        

    @log_decorator
    def delete_kams_data(self, data):
        logger.info("Inside MTECOMModel->delete_kams_data")
    
        # Map user_id to a list of payer_codes
        payer_code_map = defaultdict(list)
        for item in data:
            payer_code_map[item['user_id']].append(item['payer_code'])
        updated_by = data[0]['updated_by']
    
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                # SQL query to remove specified payer_code(s) for each user_id
                sql_statement = '''
                    WITH unnested_outer AS (
                        SELECT
                            kcm.user_id,
                            jsonb_array_elements(unnest(kcm.payer_code)::jsonb) AS payer_code_json 
                        FROM
                            kams_customer_mapping kcm
                        WHERE
                            kcm.user_id = ANY(%s)
                    ),
                    filtered_payer_codes AS (
                        SELECT
                            uo.user_id,
                            JSONB_AGG(uo.payer_code_json) FILTER (
                                WHERE NOT (
                                    (uo.payer_code_json->>'payer_code') = ANY(%s)
                                )
                            ) AS new_payer_codes
                        FROM
                            unnested_outer uo
                        GROUP BY
                            uo.user_id
                    )
                    UPDATE kams_customer_mapping kcm
                    SET 
                        payer_code = COALESCE(ARRAY[fp.new_payer_codes], ARRAY[]::jsonb[]),
                        updated_by = %s
                    FROM 
                        filtered_payer_codes fp
                    WHERE 
                        kcm.user_id = fp.user_id
                    RETURNING 
                        kcm.user_id, kcm.payer_code
                '''
    
                # Execute the query for each user_id and payer_code pair
                updated_results = []
                for user_id, payer_codes in payer_code_map.items():
                    parameters = ([user_id], payer_codes, updated_by)
                    cur.execute(sql_statement, parameters)
                    updated_results.extend(cur.fetchall())
    
                # Process updated payer_codes and update customer_code accordingly
                for item in updated_results:
                    if item[1] and item[1] != [None]:
                        # Flatten payer_codes for processing
                        payer_code_list = [
                            code.get('payer_code', '') for sublist in item[1] for code in sublist
                        ]
                        cur.execute(
                            '''SELECT customer_code 
                            FROM mt_ecom_payer_code_mapping 
                            WHERE payer_code = ANY(%s) and is_deleted is false ''',
                            (payer_code_list,),
                        )
                        customer_codes = [row[0] for row in cur.fetchall()]
    
                        update_query = '''UPDATE kams_customer_mapping 
                                          SET customer_code = %s 
                                          WHERE user_id = %s'''
                        update_values = (customer_codes, item[0])
                        cur.execute(update_query, update_values)
                    else:
                        # If payer_code is empty, clear customer_code
                        clear_query = '''UPDATE kams_customer_mapping 
                                         SET customer_code = ARRAY[]::text[] 
                                         WHERE user_id = %s'''
                        clear_values = (item[0],)
                        cur.execute(clear_query, clear_values)
    
                # Update customer groups based on user_id
                for user_id in payer_code_map.keys():
                    cur.execute(
                        '''SELECT DISTINCT o.customer_group
                        FROM mt_ecom_payer_code_mapping o
                        JOIN (
                            SELECT (jsonb_array_elements(payer_code_json)->>'payer_code')::text AS payer_code
                            FROM kams_customer_mapping, unnest(payer_code) AS payer_code_json
                            WHERE user_id = %s
                        ) AS kcm_payer_codes ON o.payer_code = kcm_payer_codes.payer_code where o.is_deleted is false ''',
                        (user_id,)
                    )
                    customer_groups = [row[0] for row in cur.fetchall()]
    
                    update_customer_group_query = '''UPDATE kams_customer_mapping 
                                                     SET customer_group = %s 
                                                     WHERE user_id = %s'''
                    cur.execute(update_customer_group_query, (customer_groups, user_id))
    
                conn_write.commit()
                return {'message': SuccessMessage.KAMS_NKAMS_DELETE_SUCCESS}
            except Exception as e:
                conn_write.rollback()
                logger.error("Exception in delete_kams_data: %s", str(e))
                return {'message': ErrorMessage.KAMS_NKAMS_DELETE_ERROR}
  
    @log_decorator
    def edit_kams_data(self,data):
        logger.info("Inside MTECOMModel->edit_kams_data")
        try:
            sql_statement = '''with unnested_outer as (
                                select
                                    user_id,
                                    unnest(payer_code) as outer_elem
                                from
                                    kams_customer_mapping
                                where
                                    user_id = %s
                                                ),
                                                unnested_inner as (
                                select
                                    user_id,
                                    outer_elem,
                                    jsonb_array_elements(outer_elem) as inner_elem
                                from
                                    unnested_outer
                                                ),
                                                updated_inner as (
                                select
                                    user_id,
                                    outer_elem,
                                    case
                                        when inner_elem->>'payer_code' = %s then jsonb_set(inner_elem,
                                        '{credit_limit}',
                                        to_jsonb(%s)::jsonb)
                                        else inner_elem
                                    end as new_inner_elem
                                from
                                    unnested_inner
                                                ),
                                                reaggregated_inner as (
                                select
                                    user_id,
                                    outer_elem,
                                    jsonb_agg(new_inner_elem) as new_inner_array
                                from
                                    updated_inner
                                group by
                                    user_id,
                                    outer_elem
                                                ),
                                                reaggregated_outer as (
                                select
                                    user_id,
                                    array_agg(new_inner_array) as new_outer_array
                                from
                                    reaggregated_inner
                                group by
                                    user_id
                                                )
                                                update
                                    kams_customer_mapping
                                set
                                    payer_code = reaggregated_outer.new_outer_array,
                                    updated_by = %s
                                from
                                    reaggregated_outer
                                where
                                    kams_customer_mapping.user_id = reaggregated_outer.user_id
                                    and kams_customer_mapping.user_id = %s '''
            with database_helper.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                cur.execute(sql_statement,(data.get('user_id'),data.get('payer_code'),data.get('credit_limit'),data.get('updated_by'),data.get('user_id')))
                conn_write.commit()

                audit_sql = '''
                    INSERT INTO mt_ecom_audit_trail (type, updated_by, column_values)
                    VALUES (%s, %s, %s)
                '''
                audit_data = {
                    'user_id': data.get('user_id'),
                    'payer_code': data.get('payer_code'),
                    'credit_limit': data.get('credit_limit')
                }
                cur.execute(audit_sql, (constants.MT_ECOM_EDIT_KAMS_NKAMS_detail, data.get('updated_by'), json.dumps(audit_data)))
                conn_write.commit()

                return {'message': SuccessMessage.KAMS_NKAMS_EDIT_SUCCESS}
        except Exception as e:
            logger.error("Exception in edit_kams_data",e)
            return {'message': ErrorMessage.KAMS_NKAMS_EDIT_ERROR}
    
    @log_decorator
    def get_tolerance(self, data):
        logger.info("Inside MTECOMModel->get_tolerance")
        with database_helper.get_read_connection() as conn_read:
            cur = conn_read.cursor()
            try:
                sql_statement = '''SELECT customer FROM public.mt_ecom_workflow_type where tot_tolerance is null ORDER BY customer'''
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                customer = pd.DataFrame(
                    cur.fetchall(), columns=column_names
                ).to_dict("records")
                base_sql = '''SELECT customer, tot_tolerance FROM public.mt_ecom_workflow_type where tot_tolerance is not null ORDER BY customer'''
                if data and data.get('limit') is not None:
                    base_sql += f" LIMIT {data.get('limit')}"
                if data and data.get('offset') is not None:
                    base_sql += f" OFFSET {data.get('offset')}"
                cur.execute(base_sql)
                column_names = [desc[0] for desc in cur.description]
                tolerance_data = pd.DataFrame(
                    cur.fetchall(), columns=column_names
                    ).to_dict("records")
                count_sql = '''SELECT count(*) FROM public.mt_ecom_workflow_type where tot_tolerance is not null'''
                cur.execute(count_sql)
                count = cur.fetchone()[0]
    
                return {"customer": customer, "tolerance_data": tolerance_data, "count": count}
            except Exception as e:
                logger.error("Exception in get_tolerance",e)
                return False
            
    @log_decorator
    def add_update_tot_tolerance(self,data):
        logger.info("Inside MTECOMModel->add_update_tot_tolerance")
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                sql_statement = '''Update public.mt_ecom_workflow_type set tot_tolerance = %s where customer = %s '''
                cur.execute(sql_statement,(data.get('tot_tolerance'),data.get('customer')))
                conn_write.commit()
                return {'message': SuccessMessage.ADD_TOT_TOLERANCE_SUCCESS if data.get('type') == 'add' else SuccessMessage.UPDATE_TOT_TOLERANCE_SUCCESS}
            except Exception as e:
                logger.error("Exception in add_update_tot_tolerance",e)
                return {'message': ErrorMessage.ADD_UPDATE_TOT_TOLERANCE_ERROR}