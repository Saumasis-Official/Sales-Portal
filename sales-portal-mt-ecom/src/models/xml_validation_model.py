from src.utils.database_helper import DatabaseHelper
import pandas as pd
import datetime
import src.utils.constants as constants

database_helper = DatabaseHelper()

class XmlValidationModel:
    def save_or_update_po_details(self,data):
        with database_helper.get_read_connection() as conn_read , database_helper.get_write_connection() as conn_write:
            cur = conn_read.cursor()
            cur_write = conn_write.cursor()
            try:
                sql_statement: str = ''' Select id,request_count from mt_ecom_header_table where po_number = %s '''
                cur.execute(sql_statement,(data.get('po_number'),))
                response_json_obj = pd.DataFrame(cur.fetchall(),columns=['id','request_count']).to_dict('records')
                if len(response_json_obj) > 0:
                    sql_statement: str = ''' Update mt_ecom_header_table set request_count = %s, updated_on = %s, xml_file_name = %s , json_file_name = %s where id = %s
                    '''
                    cur_write.execute(sql_statement,(response_json_obj[0].get('request_count')+1,datetime.datetime.now(),data.get('xml_file_key'),data.get("json_file_key"), response_json_obj[0].get('id')))
                    conn_write.commit()
                    return False
                else:
                    sql_statement: str = ''' Insert into mt_ecom_header_table (unique_id,po_number,request_count,status,json_file_name,po_created_date,xml_file_name,customer) values (%s,%s,%s,%s,%s,%s,%s,%s) '''
                    cur_write.execute(sql_statement,(data.get("unique_id"),data.get("po_number"),1,data.get('status'),data.get("json_file_key"),data.get("po_date"),data.get("xml_file_key"),data.get("customer")))
                    conn_write.commit()
                    return True
            except Exception as e:
                print("Exception in save_or_update_po_details",e)
                raise e
    def create_logs(self,data):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                sql_statement: str = ''' Insert into mt_ecom_logs (po_number,log_type,status,updated_on) values (%s,%s,%s,%s) '''
                cur.execute(sql_statement,(data.get("po_number"),data.get("log"),data.get("status"),datetime.datetime.now()))
                conn_write.commit()
                return True
            except Exception as e:
                print("Exception in create_logs",e)
                raise e