from src.utils.database_helper import DatabaseHelper
import math
from typing import Dict
from typing import Optional
import json
from src.libs.loggers import Logger, log_decorator
from src.utils.helper import DecimalEncoder
from decimal import Decimal

database_helper = DatabaseHelper()
logger =Logger("LogModel")


class LogModel:
    def insert_sync_log(log_type, result, data=None, distributorId=None, error=None, isCronJob=False):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                sqlStatement = '''INSERT INTO sync_logs(type, run_at, result, error_log,
                is_cron_job,upsert_count,delete_count,distributor_id) VALUES(%s,now(),%s,%s,%s,
                %s,%s,%s)'''
                resArr = [log_type, result, error, isCronJob, data.get('upsertCount',
                                                                   0) if data and 'upsertCount'
                                                                         in data.keys() else None,
                          data.get('deleteCount',
                                   0) if data and 'deleteCount' in data.keys() else None,
                          distributorId]
                if log_type == 'SO':
                    sqlStatement += (" ON CONFLICT (distributor_id) DO UPDATE SET run_at = "
                                     "EXCLUDED.run_at, result = EXCLUDED.result, upsert_count = "
                                     "EXCLUDED.upsert_count, delete_count = EXCLUDED.delete_count")
                cur.execute(sqlStatement, resArr)
                return True
            except Exception as e:
                print("Exception in  insertSyncLog", e)
                return False

    @log_decorator
    def insert_email_log(data):
        with database_helper.get_write_connection() as conn_write:
            cur = conn_write.cursor()
            try:
                sql_statement = '''INSERT INTO email_logs(type, status, subject, recipients, 
                reference, email_data, error_logs) VALUES(%s,%s, %s, %s, %s, %s, %s)'''

                  # Ensure recipients and email_data are serialized to JSON strings
                recipients = json.dumps(data.get('recipients')) if data.get('recipients') else "{}"
                email_data = json.dumps(data.get('email_data'), cls=DecimalEncoder) if data.get('email_data') else "{}"
                error_logs = json.dumps(data.get('error')) if data.get('error') else None
            
                res_arr = [data.get('type'), 
                           data.get('status'), 
                           data.get('subject'),
                           recipients,
                           data.get('reference'),
                           email_data,
                           error_logs]
                cur.execute(sql_statement, res_arr)
                return True
            except Exception as e:
                print("Exception in  insert_email_log", e)
                return False
