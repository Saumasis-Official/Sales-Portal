import json
import pandas as pd
from typing import List, Literal
from datetime import datetime

from src.exceptions.data_persisting_exception import DataPersistingException
from src.utils.database_helper import DatabaseHelper
from src.models.dto.upsert_po_key_interface import UpsertPoKey
from src.enums.customers_enum import Customers
from src.models.dto.po_dto import PoItemsDTO, PoDTO
from src.enums.mt_ecom_status_type import MtEcomStatusType
from src.libs.loggers import Logger, log_decorator
from src.utils import constants
from src.utils.helper import HelperClass
from psycopg2.extras import execute_values

logger = Logger("PersistModel")


class PersistModel:
    DATABASE_HELPER = None

    def __init__(self):
        self.DATABASE_HELPER = DatabaseHelper()
        self.HELPER = HelperClass()

    @log_decorator
    def upsert_po_key(self, data: List[UpsertPoKey]):
        logger.info("inside PersistModel -> upsert_po_key")
        sql_statement = """
        INSERT
            INTO
            mt_ecom_header_table (
                unique_id ,
                po_number ,
                request_count ,
                status ,
                json_file_name,
                po_created_date,
                xml_file_name,
                customer,
                customer_code,
                site_code,
                delivery_date,
                others,
                location,
                po_created_timestamp
            )
        SELECT
            unique_id ,
            po_number ,
            1 AS request_count ,
            status ,
            json_file_name ,
            po_created_date ,
            xml_file_name ,
            customer,
            customer_code,
            site_code,
            delivery_date,
            others,
            location,
            po_created_timestamp
        FROM
            json_populate_recordset(NULL:: mt_ecom_header_table, %s)
            ON
            CONFLICT (po_number) DO
        UPDATE
        SET
            request_count = mt_ecom_header_table.request_count + 1,
            xml_file_name = EXCLUDED.xml_file_name,
            json_file_name = EXCLUDED.json_file_name,
            delivery_date = EXCLUDED.delivery_date,
            updated_on = now()
        Returning id;
        """
        try:
            # convert List[UpsertPoKey] to json string
            data_dicts = [obj.model_dump() for obj in data]
            json_data = json.dumps(data_dicts, default=str)

            with self.DATABASE_HELPER.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                cur.execute(sql_statement, (json_data,))
                conn_write.commit()
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return rows[0].get("id")
        except Exception as e:
            logger.error("EXCEPTION in PersistModel -> upsert_po_key: ", e)
            raise DataPersistingException("PersistModel -> upsert_po_key", e)

    @log_decorator
    def fetch_po_key(self, po_number: str):
        sql_statement = """
        SELECT
            meht.xml_file_name ,
            meht.json_file_name,
            meht.customer,
            meht.id
        FROM
            mt_ecom_header_table meht
        WHERE
            meht.po_number = %s
        """
        try:
            logger.info("inside PersistModel -> fetch_po_key")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                cur.execute(
                    sql_statement, (po_number,)
                )  # Note the comma to make it a tuple
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return rows[0]
        except Exception as e:
            logger.error("EXCEPTION: in DataPersistModel -> fetch_po_key", e)
            raise DataPersistingException(po_number, e)

    @log_decorator
    def fetch_workflow_configurations(self, customer: Customers):
        sql_statement = """
        SELECT
            po_format,
            article,
            mrp_1,
            mrp_2,
            caselot,
            base_price,
            invoice,
            asn,
            acknowledgement,
            tot
        FROM
            public.mt_ecom_workflow_type
        WHERE customer = %s;
        """
        try:
            logger.info("inside PersistModel -> fetch_workflow_configurations")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement, (customer,))
                rows = pd.DataFrame(
                    cur.fetchall(),
                    columns=[
                        "po_format",
                        "article",
                        "mrp_1",
                        "mrp_2",
                        "caselot",
                        "base_price",
                        "invoice",
                        "asn",
                        "acknowledgement",
                        "tot",
                    ],
                ).to_dict("records")
                return rows[0] if len(rows) else False
        except Exception as e:
            logger.error("EXCEPTION: in DataPersistModel -> fetch_workflow_configurations", e)
            raise DataPersistingException(customer, e)

    @log_decorator
    def fetch_article_details(
        self, order_items: List[PoItemsDTO], site_code: str, vendor_code: str
    ):
        # convert List[PoItemsDTO] to json string
        data_dicts = [obj.model_dump() for obj in order_items]
        json_str = json.dumps(data_dicts, default=str)
        sql_statement = """
        WITH article_ids AS (
            SELECT
                customer_product_id::TEXT
            FROM
                json_populate_recordset(NULL::mt_ecom_item_table, %s	)
        )
        SELECT
            mdm.article_id,
            mdm.psku,
            mdm.psku_desc,
            mdm.sku,
            mdm.sku_desc,
            mdm.plant_code
        FROM
            mdm_material_data mdm
        INNER JOIN article_ids ai ON
            ai.customer_product_id = mdm.article_id
            AND mdm.site_code = %s
            AND mdm.vendor_code = %s
            where mdm.priority = 1
            and is_deleted = false;
        """
        try:
            logger.info("inside PersistModel -> fetch_article_details")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement, (json_str, site_code, vendor_code))
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names)
                result = {row["article_id"]: row for row in rows.to_dict("records")}
                return result
        except Exception as e:
            logger.error("EXCEPTION: in DataPersistModel -> fetch_article_details", e)
            raise DataPersistingException(json_str, e)

    @log_decorator
    def update_status(
        self,
        id: int,
        message: str,
        status: MtEcomStatusType,
        item_number: str,
        mrp: int = 0,
        caselot: int = 0,
    ):
        if status:
            sql_statement = """Select status,message from mt_ecom_item_table where po_id = %s and item_number = %s"""
            try:
                with self.DATABASE_HELPER.get_write_connection() as conn_write, self.DATABASE_HELPER.get_read_connection() as conn_read:
                    cur = conn_read.cursor()
                    cur_write = conn_write.cursor()
                    cur.execute(sql_statement, (id, item_number))
                    column_names = [desc[0] for desc in cur.description]
                    result = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                        "records"
                    )
                    if len(result) and result[0].get('message',''):
                        sql_statement = """
                                        UPDATE
                                        public.mt_ecom_item_table
                                    SET
                                        updated_mrp = %s,
                                        updated_caselot = %s
                                    WHERE
                                        po_id = %s
                                        and item_number = %s;
                                    """
                        cur_write.execute(sql_statement,(
                            int(float(mrp)),
                            int(float(caselot)),
                            id,
                            item_number,
                        ),)
                        conn_write.commit()
                    else:
                        sql_statement = """
                                        UPDATE
                                            public.mt_ecom_item_table
                                        SET
                                            status = %s,
                                            message = %s,
                                            updated_mrp = %s,
                                            updated_caselot = %s
                                        WHERE
                                            po_id = %s
                                            and item_number = %s;
                                        """
                        cur_write.execute(
                                sql_statement,
                                (
                                    status,
                                    message,
                                    int(float(mrp)),
                                    int(float(caselot)),
                                    id,
                                    item_number,
                                ),
                            )
                        conn_write.commit()
            except Exception as e:
                logger.error("EXCEPTION: in DataPersistModel -> update_status inside if", e)
                raise DataPersistingException(id, e)
        else :
            sql_statement = """
            UPDATE
                public.mt_ecom_item_table
            SET
                updated_mrp = %s,
                updated_caselot = %s
            WHERE
                po_id = %s
                and item_number = %s;
            """
            try:
                with self.DATABASE_HELPER.get_write_connection() as conn:
                    cur = conn.cursor()
                    cur.execute(
                        sql_statement,
                        (
                            int(float(mrp)),
                            int(float(caselot)),
                            id,
                            item_number,
                        ),
                    )
                    conn.commit()
                    return True
            except Exception as e:
                logger.error("EXCEPTION: in DataPersistModel -> update_status inside else", e)
                raise DataPersistingException(id, e)

    @log_decorator
    def get_customer_code(self, site_code: str):
        sql_statement = """
                        SELECT
                            distinct(customer_code)
                        FROM
                            public.mdm_material_data
                        WHERE
                            site_code = %s
                            and is_deleted = false;
                        """
        try:
            logger.info("inside PersistModel -> get_customer_code")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement, (site_code,))
                rows = pd.DataFrame(cur.fetchall(), columns=["customer_code"]).to_dict(
                    "records"
                )
                return rows[0] if len(rows) else ''
        except Exception as e:
            logger.error("EXCEPTION: in DataPersistModel -> get_customer_code", e)
            raise DataPersistingException(site_code, e)

    @log_decorator
    def save_req_res(self, data: dict, log_type: dict,request_id: str=""):
        try:
            logger.info("inside PersistModel -> save_req_res")
            with self.DATABASE_HELPER.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                sql_statement: str = """ Insert into mt_ecom_audit_trail (type,reference_column,
                column_values,request_id) values (%s,%s,%s,%s)"""
                cur.execute(
                    sql_statement,
                    (log_type.get("type"), log_type.get("po_number"), json.dumps(data),request_id),
                )
                conn_write.commit()
                return True
        except Exception as e:
            logger.error("Exception in DataPersistModel -> save_req_res", e)
            raise DataPersistingException(log_type.get("po_number"), e)

    @log_decorator
    def create_logs(self, data: dict):
        """
        Description: This method will create a log entry in the database.
        Params:
            - data: dict{ "po_number": str, "log": str, "status": MtEcomStatusType }
        Returns:
            - bool
        """
        try:
            logger.info("inside PersistModel -> create_logs")
            with self.DATABASE_HELPER.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                sql_statement: str = """ Insert into mt_ecom_logs (po_number,log_type,status,updated_on) values (%s,%s,%s,%s) """
                cur.execute(
                    sql_statement,
                    (
                        data.get("po_number"),
                        data.get("log"),
                        data.get("status"),
                        datetime.now(),
                    ),
                )
                conn_write.commit()
                return True
        except Exception as e:
            logger.error("Exception in DataPersistModel -> create_logs", e)
            raise DataPersistingException(data.get("po_number"), e)

    @log_decorator
    def get_so_number(self, po_number):
        """
        Description: This method will get So Number from database for the given Po Number
        Params:
            - po_number :str
        Returns:
            - bool
        """
        try:
            logger.info("inside PersistModel -> get_so_number")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement: str = (
                    """ SELECT so_flag from mt_ecom_header_table WHERE po_number = %s"""
                )
                cur.execute(sql_statement, (po_number,))
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return rows[0].get("so_flag") if rows and len(rows) else False
        except Exception as e:
            logger.error("Exception in DataPersistModel -> create_logs", e)
            raise DataPersistingException(po_number, e)

    @log_decorator
    def save_item_details(self, order_details: PoDTO, id: str):
        """
        Description: This method will save item details in database
        Params:
            - order_details :PoDTO
        """
        try:
            logger.info("inside PersistModel -> save_item_details")
            with self.DATABASE_HELPER.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                sql_statement: str = """ Insert into mt_ecom_item_table (
                item_number, caselot, customer_product_id,
                target_qty, ean, mrp ,po_item_description,base_price,landing_price,sales_unit,
                po_id, status, created_on, updated_on,uom,item_total_amount
                ) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) on
                conflict on constraint mt_ecom_item_table_un do nothing"""
                for item in order_details.items:
                    cur.execute(
                        sql_statement,
                        (
                            item.item_number,
                            item.caselot,
                            item.customer_product_id,
                            item.target_qty,
                            item.ean,
                            item.mrp,
                            item.po_item_description,
                            item.base_price,
                            item.landing_price,
                            item.sales_unit,
                            id,
                            MtEcomStatusType.ACKNOWLEDGEMENT_SUCCESS,
                            datetime.now(),
                            datetime.now(),
                            item.uom,
                            item.item_total_amount,
                        ),
                    )
                conn_write.commit()
        except Exception as e:
            logger.error("Exception in DataPersistModel -> save_item_details", e)

    @log_decorator
    def fetch_non_invoiced_items(self, po_number: str = None, id: str = None):
        """
        Description: This method will fetch non invoiced items for the given po_number
        Params:
            - po_number :str
        Returns:
            - bool
        """
        try:
            logger.info("inside PersistModel -> fetch_non_invoiced_items")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                if po_number:
                    sql_statement = """SELECT id , customer,so_number FROM mt_ecom_header_table where po_number = %s and (so_number is not null or so_number != '')"""
                    cur.execute(sql_statement, (po_number,))
                    column_names = [desc[0] for desc in cur.description]
                    data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                        "records"
                    )
                    return data
                elif id:
                    sql_statement = """SELECT * FROM mt_ecom_item_table where po_id = %s and status not in (%s,%s) and (sales_order is not null or sales_order != '') """
                    cur.execute(
                        sql_statement,
                        (
                            id,
                            MtEcomStatusType.INVOICE_SUCCESS,MtEcomStatusType.SO_PENDING
                        ),
                    )
                    column_names = [desc[0] for desc in cur.description]
                    non_invoiced_items = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
                    return non_invoiced_items
                else:
                    sql_statement = """SELECT id, po_number,customer,so_number FROM mt_ecom_header_table where status in (%s,%s) and (so_number is not null or so_number != '') and po_created_date >= current_date - interval '30 days' and customer != 'Reliance' """
                    cur.execute(
                        sql_statement,
                        (
                            MtEcomStatusType.INVOICE_PENDING,
                            MtEcomStatusType.PARTIAL_INVOICE,
                        ),
                    )
                    column_names = [desc[0] for desc in cur.description]
                    non_invoiced_pos = pd.DataFrame(
                        cur.fetchall(), columns=column_names
                    ).to_dict("records")
                    return non_invoiced_pos

        except Exception as e:
            logger.error("Exception in DataPersistModel -> fetch_non_invoiced_items", e)
            raise DataPersistingException(po_number, e)

    @log_decorator
    def update_po_status(self, id: str):
        """
        Description: This method will update the status of the given po to Invoice Success
        Params:
            - id :str
        """
        try:
            logger.info("inside PersistModel -> update_po_status")
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                sql_statement = (
                    """UPDATE mt_ecom_header_table SET status = %s where id = %s"""
                )
                cur.execute(sql_statement, (MtEcomStatusType.INVOICE_SUCCESS, id))
                conn.commit()
                return True
        except Exception as e:
            logger.error("Exception in DataPersistModel -> update_po_status", e)
            raise DataPersistingException(id, e)

    @log_decorator
    def get_invoice_status(self, data: dict):
        """
        Description: This method will get the invoice status of the given so number and item number
        Params:
            - data :dict
        Returns:
            - bool
        """
        try:
            logger.info("inside PersistModel -> get_invoice_status")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """SELECT ean,invoice_number,customer_product_id,po_item_description FROM mt_ecom_item_table where response_item_number = %s and sales_order = %s"""
                cur.execute(
                    sql_statement,
                    (
                        data.get("item_number").lstrip('0'),
                        data.get("so_number"),
                    ),
                )
                column_names = [desc[0] for desc in cur.description]
                result = pd.DataFrame(
                    cur.fetchall(), columns=column_names
                ).to_dict("records")
                # if (
                #     len(result) and
                #     result[0].get("invoice_number") != None
                #     and result[0].get("invoice_number") != ""
                # ):
                #     return False
                if len(result):
                    return result[0]
                else:
                    return False
        except Exception as e:
            logger.error("Exception in DataPersistModel -> get_invoice_status", e)
            raise DataPersistingException(data.get("po_number"), e)

    @log_decorator
    def update_header_status(self, id: int, status: MtEcomStatusType):
        sql_statement = """
        UPDATE
            public.mt_ecom_header_table
        SET
            status = %s
        WHERE
            id = %s
        """
        try:
            logger.info("inside PersistModel -> update_header_status")
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement, (status, id))
                conn.commit()
                return True
        except Exception as e:
            logger.error("EXCEPTION: in DataPersistModel -> update_header_status", e)
            raise DataPersistingException(id, e)

    @log_decorator
    def save_or_update_item_details(self, data: dict):
        try:
            logger.info("inside PersistModel -> save_or_update_item_details")
            with self.DATABASE_HELPER.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                item_number = (
                   str(int(data.get("data").get("PoItemNumber"))).zfill(5)
                    if data.get("data").get("PoItemNumber")
                    else str(int(data.get("data").get("Item_Number"))).zfill(5)
                )
                sql_statement = """Select message, system_sku_code from mt_ecom_item_table where po_id = %s and item_number = %s """
                cur.execute(sql_statement, (data.get("id"), item_number))
                column_names = [desc[0] for desc in cur.description]
                result = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                # Check if sku_code is different from the one in the database if yes then save it in switchover_sku
                sku_code = 0
                if data.get("data").get("SKU_Code") and int(result[0].get("system_sku_code")) != int(
                    data.get("data").get("SKU_Code")
                ):
                    sku_code = int(data.get("data").get("SKU_Code"))
                if len(result) and result[0].get("message"):
                    message = []
                    mes = ''
                    for error in constants.ERROR_MASTER:
                        if error in data.get("data").get("Message"):
                            message.append(error)
                    if len(message):
                        message = set(message)
                        mes = "Missing - "+ ', '.join(message)
                    else:
                        mes = data.get("data").get("Message")
                    result = self.HELPER.get_ror_description(data.get("data", {}).get("Message", ''))
                    description = result.get('description')
                    spoc = result.get('spoc')
                    sql_statement: str = (
                        """ Update mt_ecom_item_table set sales_order =%s, response_item_number = %s , switchover_sku = %s,ror_description = %s, ror_spoc = %s """
                    )
                    if description and data.get('data').get('Sales_Order_Number') == '':
                            sql_statement += ''',status = ''' + "'" + MtEcomStatusType.SO_PENDING + "' "
                    sql_statement += """where po_id = %s and item_number = %s"""
                    cur.execute(
                        sql_statement,
                        (
                            data.get("so_number"),
                            data.get("data").get("Item_Number"),
                            sku_code,
                            description if description else mes,
                            spoc,
                            data.get("id"),
                            item_number,
                        ),
                    )
                    conn_write.commit()
                    sql_statement : str = """ Select * from mt_ecom_audit_trail where item_number = %s and reference_column = %s """
                    cur.execute(sql_statement,(item_number,data.get("po_number")))
                    column_names = [desc[0] for desc in cur.description]
                    audit_result = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                        "records"
                    )
                    if len(audit_result) and audit_result[0].get("message_logs"):
                        message = audit_result[0].get("message_logs") + " , " + data.get("data").get("Message")
                        sql_statement : str = """ Update mt_ecom_audit_trail set message_logs = %s where item_number = %s and reference_column = %s """
                        cur.execute(sql_statement,(message,item_number,data.get("po_number")))
                        conn_write.commit()

                    else:
                        sql_statement : str = """ Insert into mt_ecom_audit_trail (reference_column,item_number,message_logs,type) values (%s,%s,%s,%s) """
                        cur.execute(sql_statement,(data.get("po_number"),item_number,data.get("data").get("Message"),"Message logs"))
                        conn_write.commit()
                # elif constants.ORDER_ALREADY_EXIST in data.get("data").get("Message"):
                #     return False
                elif data.get("data").get("Message") == constants.ORDER_MSG:
                    sql_statement: str = (
                        """ Update mt_ecom_item_table set message = %s,sales_order =%s, response_item_number = %s,status = %s, switchover_sku = %s where po_id = %s and item_number = %s"""
                    )
                    cur.execute(
                        sql_statement,
                        (
                            data.get("data").get("Message"),
                            data.get("data").get("Sales_Order_Number"),
                            data.get("data").get("Item_Number"),
                            data.get("status"),
                            sku_code,
                            data.get("id"),
                            item_number,
                        ),
                    )
                    conn_write.commit()
                else:
                    message = []
                    mes = ''
                    for error in constants.ERROR_MASTER:
                        if error in data.get("data").get("Message"):
                            message.append(error)
                    if len(message):
                        message = set(message)
                        mes = "Missing - "+ ', '.join(message)
                    else:
                        mes = data.get("data").get("Message")
                    result = self.HELPER.get_ror_description(data.get("data", {}).get("Message", ''))
                    description = result.get('description')
                    spoc = result.get('spoc')
                    sql_statement: str = (
                        """ Update mt_ecom_item_table set response_item_number = %s, switchover_sku = %s , status = %s,sales_order = %s,ror_description = %s, ror_spoc = %s where po_id = %s and item_number = %s"""
                    )
                    cur.execute(
                        sql_statement,
                        (
                            data.get("data").get("Item_Number"),
                            sku_code,
                            MtEcomStatusType.INVOICE_PENDING if data.get("data").get("Sales_Order_Number") else MtEcomStatusType.SO_PENDING,
                            data.get("data").get("Sales_Order_Number"),
                            description if description else mes,
                            spoc,
                            data.get("id"),
                            item_number,
                        ),
                    )
                    conn_write.commit()
                    sql_statement : str = """ Select * from mt_ecom_audit_trail where item_number = %s and reference_column = %s """
                    cur.execute(sql_statement,(item_number,data.get("po_number")))
                    column_names = [desc[0] for desc in cur.description]
                    audit_result = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                        "records"
                    )
                    if len(audit_result) and audit_result[0].get("message_logs"):
                        message = audit_result[0].get("message_logs") + " , " + data.get("data").get("Message")
                        sql_statement : str = """ Update mt_ecom_audit_trail set message_logs = %s where item_number = %s and reference_column = %s """
                        cur.execute(sql_statement,(message,item_number,data.get("po_number")))
                        conn_write.commit()

                    else:
                        sql_statement : str = """ Insert into mt_ecom_audit_trail (reference_column,item_number,message_logs,type) values (%s,%s,%s,%s) """
                        cur.execute(sql_statement,(data.get("po_number"),item_number,data.get("data").get("Message"),"Message logs"))
                        conn_write.commit()
        except Exception as e:
            logger.error("Exception in data_persist_model", e)
            raise e

    @log_decorator
    def update_materials(self, data: list):
        """
        Description: This method will persist the material details in the database
        Params:
            - data :list
        """
        try:
            logger.info("inside PersistModel -> update_materials")
            with self.DATABASE_HELPER.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                sql_statement: str = (
                    """ Update mt_ecom_item_table set system_sku_code = %s, system_sku_description = %s, psku_code = %s, psku_description = %s,status = %s,plant_code = %s,site_code = %s where po_id = %s and item_number = %s"""
                )
                for material in data:
                    cur.execute(
                        sql_statement,
                        (
                            material.get("system_sku_code"),
                            material.get("system_sku_description"),
                            material.get("psku_code"),
                            material.get("psku_description"),
                            material.get("status"),
                            material.get("plant_code"),
                            material.get("site_code"),
                            material.get("id"),
                            material.get("item_number"),
                        ),
                    )
                conn_write.commit()
        except Exception as e:
            logger.error("Exception in update_materials", e)
            raise e

    @log_decorator
    def fetch_items(self, id: str):
        """
        Description: This method will fetch the items for the given id
        Params:
            - id :str
        """
        try:
            logger.info("inside PersistModel -> fetch_items")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """SELECT * FROM mt_ecom_item_table WHERE po_id = %s AND status NOT IN (%s, %s, %s, %s, %s) AND (sales_order IS NOT NULL OR sales_order = '')"""
                cur.execute(
                    sql_statement,
                    (
                        id,
                        MtEcomStatusType.INVOICE_SUCCESS,
                        MtEcomStatusType.ARTICLE_FAILED,
                        MtEcomStatusType.NOT_YET_PROCESSED,
                        MtEcomStatusType.PARTIALLY_PROCESSED,
                        MtEcomStatusType.SO_PENDING
                    ),
                )
                column_names = [desc[0] for desc in cur.description]
                non_invoiced_items = pd.DataFrame(
                    cur.fetchall(), columns=column_names
                ).to_dict("records")
                return {"data": non_invoiced_items}
        except Exception as e:
            logger.error("Exception in fetch_items", e)
            raise e

    @log_decorator
    def download_reports(self, data: dict):
        """
        Description: This method will download the reports for the given po_number
        Params:
            - data :dict
        """
        try:
            logger.info("inside PersistModel -> download_reports")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """select
                                COALESCE(header.customer, '') as customer,
                                COALESCE(item.plant_code, 0) as plant_code,
                                COALESCE(pm.description, '') as plant_name,
                                COALESCE(header.site_code, '') as site_code,
                                COALESCE(header.customer_code, '') as customer_code,
                                COALESCE(header.po_number, '') as po_number,
                                COALESCE(item.sales_order, '') as so_number,
                                COALESCE(item.item_number, '') as item_number,
                                COALESCE(item.invoice_number, '') as invoice_number,
                                DATE(header.po_created_date) as po_created_date,
                                DATE(header.delivery_date) as delivery_date,
                                DATE(header.so_created_date) as so_created_date,
                                DATE(item.invoice_date) as invoice_date,
                                COALESCE(item.customer_product_id, '') as customer_product_id,
                                COALESCE(item.po_item_description, '') as po_item_description,
                                COALESCE(item.psku_code, 0) as psku_code,
                                COALESCE(item.psku_description, '') as psku_description,
                                COALESCE(item.system_sku_code, 0) as system_sku_code,
                                COALESCE(item.system_sku_description, '') as system_sku_description,
                                COALESCE(item.switchover_sku, 0) as switchover_sku,
                                COALESCE(item.mrp, 0) as mrp,
                                item.updated_mrp as sap_mrp,
                                COALESCE(item.base_price,0) as base_price,
                                item.updated_base_price as tcpl_base_price,
                                COALESCE(item.caselot, 0) as caselot ,
                                item.updated_caselot as sap_caselot,
                                COALESCE(item.target_qty, 0) as target_qty,
                                COALESCE(item.so_qty, 0) as so_qty,
                                COALESCE(item.invoice_quantity, 0) as invoice_quantity,
                                COALESCE(item.delivery_quantity, 0) as delivery_quantity,
                                COALESCE(item.sales_unit, '') as sales_unit,
                                item.status,
                                (case when (item.message != 'Order Created Succesfully')
                                then item.message 
                                else
                                ''
                                end) as ror,
                                COALESCE(item.remaining_caselot, '') as remaining_caselot,
                                item.uom,
                                item.invoice_base_price,
                                item.invoice_uom,
                                item.invoice_mrp,
                                item.ror_description as ror_description,
                                item.ror_spoc,
                                item.tot,
                                item.sap_tot
                            from
                                mt_ecom_header_table as header
                            join mt_ecom_item_table as item on
                                header.id = item.po_id
                            left join plant_master pm on
                                pm."name"::varchar = item.plant_code::varchar
                                where (header.po_created_date >= %s::timestamp and header.po_created_date <= %s::timestamp + interval '1 day') and header.customer in %s """
                cur.execute(sql_statement, (data.get("from_date"), data.get("to_date"),tuple(constants.MT_ECOM_CUSTOMERS)))
                column_names = [desc[0] for desc in cur.description]
                items = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return items
        except Exception as e:
            logger.error("Exception in download_reports", e)
            raise e

    @log_decorator
    def update_invoice_status(self, data: dict):
        """
        Description: This method will update the invoice status of the given so number and item number
        Params:
            - data :dict
        Returns:
            - bool
        """
        try:
            logger.info("inside PersistModel -> update_invoice_status") 
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                sql_statement = """UPDATE mt_ecom_item_table SET invoice_number = %s, invoice_date = %s, invoice_quantity = %s,invoice_mrp = %s,status = %s,invoice_base_price = %s,invoice_uom = %s where response_item_number = %s and sales_order = %s"""
                cur.execute(
                    sql_statement,
                    (
                        data.get("invoice_number"),
                        data.get("invoice_date"),
                        data.get("invoice_quantity"),
                        data.get("invoice_mrp"),
                        constants.INVOICE_SUCCESS,
                        data.get("invoice_base_price",""),
                        data.get("invoice_uom",""),
                        data.get("item_number"),
                        data.get("so_number"),
                    ),
                )
                conn.commit()
                sql_statement = '''UPDATE mt_ecom_header_table 
                                SET status = %s,
                                    invoice_number = CASE 
                                        WHEN NOT %s = ANY(COALESCE(invoice_number, ARRAY[]::VARCHAR[])) THEN array_append(COALESCE(invoice_number, ARRAY[]::VARCHAR[]), %s)
                                        ELSE invoice_number
                                    END
                                WHERE po_number = %s'''
                cur.execute(sql_statement,(constants.PARTIAL_INVOICE,data.get("invoice_number"),data.get("invoice_number"),data.get('po_number')))
                conn.commit()
                return True
        except Exception as e:
            logger.error("Exception in update_invoice_status", e)
            raise e

    @log_decorator  
    def export_po_data(self, data: dict):
        sql_statement = f'''Select customer as "Customer",po_number as "PO Number" ,so_number as "SO Number" ,site_code as "Site Code",customer_code as "Customer Code",DATE(po_created_date) as "PO Date",DATE(delivery_date) as "Expiry Date",status as "Status" from mt_ecom_header_table where customer = '{data.get('customer_name')}' and po_created_date >= current_date - interval '90 days' '''
        try: 
            logger.info("inside PersistModel -> export_po_data")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                return data
        except Exception as e:
            logger.error("Exception in export_po_data", e)
            raise e
   
    @log_decorator    
    def fetch_conversion_factor(self,sku:int):
        sql_statement = '''select pak_to_cs from material_master where code = '%s' '''
        try:
            logger.info("inside PersistModel -> fetch_conversion_factor")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement,(sku,))
                column_names = [desc[0] for desc in cur.description]
                data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                return data[0].get('pak_to_cs') if len(data) else ''
        except Exception as e:
            logger.error("Exception in fetch_conversion_factor", e)
            raise e
        
    @log_decorator
    def save_remaining_caselot(self,remainder:int,po_number:str,item_number:str,so_qty:int,sap_caselot:int,message:str = ''):
        sql_statement = '''UPDATE mt_ecom_item_table SET remaining_caselot = %s, so_qty = %s,updated_caselot = %s '''
        if message:
            sql_statement += f''',message = '{message}',ror_spoc = '{constants.MDM_SPOC}',status = 'SO Pending' ''' 
        sql_statement +=   '''WHERE po_id = (SELECT id FROM mt_ecom_header_table WHERE po_number = %s) AND item_number = %s'''
        try:
            logger.info("inside PersistModel -> save_remaining_caselot")
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement,(remainder,so_qty,sap_caselot,po_number,item_number))
                conn.commit()
                return cur.rowcount
        except Exception as e:
            logger.error("Exception in save_remaining_caselot", e)
            raise e
    @log_decorator
    def delete_po(self,data:dict):
        sql_statement = '''select id,po_number FROM mt_ecom_header_table WHERE customer = %s and po_created_date >= %s and po_created_date <= %s '''
        try:
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement,(data.get('customer'),data.get('from_date') + ' 00:00:00',data.get('to_date') + ' 23:59:59'))
                column_names = [desc[0] for desc in cur.description]
                po_data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                for po in po_data:
                    sql_statement = '''DELETE FROM mt_ecom_item_table WHERE po_id = %s'''
                    cur.execute(sql_statement,(po.get('id'),))
                    conn.commit()
                    sql_statement = '''DELETE FROM mt_ecom_logs WHERE po_number = %s'''
                    cur.execute(sql_statement,(po.get('po_number'),))
                    conn.commit()
                    sql_statement = '''DELETE FROM mt_ecom_header_table WHERE id = %s'''
                    cur.execute(sql_statement,(po.get('id'),))
                    conn.commit()
                return len(po_data)
        except Exception as e:
            print("Exception in delete_po", e)
            raise e

    @log_decorator    
    def change_po_status(self):
        sql_statement = '''UPDATE mt_ecom_item_table SET status = %s WHERE status in (%s,%s,%s,%s)'''
        try:
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement,(MtEcomStatusType.SO_PENDING,MtEcomStatusType.ARTICLE_SUCCESS,MtEcomStatusType.MRP_SUCCESS,MtEcomStatusType.CASELOT_SUCCESS,MtEcomStatusType.VALIDATION_SUCCESS))
                conn.commit()
                return cur.rowcount
        except Exception as e:
            print("Exception in change_po_status", e)
            raise e

    @log_decorator    
    def update_base_price(self,data:dict):
        sql_statement = """Select status,message from mt_ecom_item_table where po_id = %s and item_number = %s"""
        try:
            with self.DATABASE_HELPER.get_write_connection() as conn_write, self.DATABASE_HELPER.get_read_connection() as conn_read:
                cur = conn_read.cursor()
                cur_write = conn_write.cursor()
                cur.execute(sql_statement, (data.get('id', 0), data.get('item_number', "")))
                column_names = [desc[0] for desc in cur.description]
                result = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                if len(result) and result[0].get('message',''):
                    sql_statement = '''UPDATE mt_ecom_item_table SET updated_base_price = %s WHERE po_id = %s and item_number = %s'''
                    cur_write.execute(sql_statement,(data.get('correct_base_price',""),data.get('id',0),data.get('item_number',"")))
                    conn_write.commit()
                else:
                    sql_statement = '''UPDATE mt_ecom_item_table SET updated_base_price = %s, message = %s, status = %s WHERE po_id = %s and item_number = %s'''
                    cur_write.execute(sql_statement,(data.get('correct_base_price',""),data.get("message", ""),data.get('status',""),data.get('id',0),data.get('item_number',"")))
                    conn_write.commit()
                    
        except Exception as e:
            print("Exception in update_base_price", e)
            raise e

    @log_decorator    
    def get_header_data(self,po:str):
        sql_statement = '''SELECT mth.site_code, mmd.vendor_code,mth.location 
                        FROM mt_ecom_header_table mth 
                        INNER JOIN mdm_material_data mmd 
                        ON mth.site_code = mmd.site_code 
                        WHERE mth.po_number = %s 
                        LIMIT 1;'''
        try:
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement,(po,))
                column_names = [desc[0] for desc in cur.description]
                data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                return data[0] if len(data) else ''
        except Exception as e:
            print("Exception in get_header_data", e)
            raise e

    @log_decorator    
    def create_audit_logs(self,data:dict):
        sql_statement = '''INSERT INTO mt_ecom_audit_trail (type,reference_column,column_values,request_id) VALUES (%s,%s,%s,%s)'''
        try:
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement,(data.get('type'),data.get('po_number'),json.dumps(data.get('data')),data.get('id')))
                conn.commit()
                return True
        except Exception as e:
            print("Exception in create_audit_logs", e)
            raise e
        
    @log_decorator    
    def check_vendor_code(self,vendor_code:str):
        sql_statement = '''SELECT vendor_code FROM mdm_material_data WHERE vendor_code = %s and is_deleted = false'''
        try:
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement,(vendor_code,))
                column_names = [desc[0] for desc in cur.description]
                data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                return True if len(data) else False
        except Exception as e:
            print("Exception in check_vendor_code", e)
            raise e
        
    @log_decorator
    def update_so_flag(self,po:str):
        try:
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                sql_statement = '''Update mt_ecom_header_table set so_flag = true where po_number = %s'''
                cur.execute(sql_statement,(po,))
                conn.commit()
                return cur.rowcount
        except Exception as e:
            logger.error("Exception in update_so_flag",e)
            raise e
        
    @log_decorator
    def get_po_copy(self,po:str):
        try:
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = '''SELECT customer,xml_file_name,json_file_name FROM mt_ecom_header_table WHERE po_number = %s'''
                cur.execute(sql_statement,(po,))
                column_names = [desc[0] for desc in cur.description]
                data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                return data[0] if len(data) else ''
        except Exception as e:
            logger.error("Exception in get_po_copy",e)
            raise e
        
    @log_decorator
    def save_invoice_headers(self,data:dict):
        try:
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                header_query = """
                                UPDATE mt_ecom_header_table AS meh 
                                SET invoice_number = CASE
                                    WHEN meh.invoice_number IS NULL THEN ARRAY[upd.invoice_number]::varchar[]
                                    WHEN NOT upd.invoice_number = ANY(meh.invoice_number) THEN 
                                        array_append(meh.invoice_number, upd.invoice_number)
                                    ELSE meh.invoice_number
                                END,
                                updated_on = now(),
                                status = 'Partial Invoice'
                                FROM (VALUES %s) AS upd(so_number, invoice_number)
                                WHERE meh.so_number = upd.so_number
                                AND upd.invoice_number IS NOT NULL
                                """
                
                header_values = [(
                        str(h.get("so_number")), 
                        str(h.get("invoice_number"))
                    ) for h in data]
                execute_values(cur, header_query, header_values)
                conn.commit()
                return cur.rowcount
        except Exception as e:
            logger.error("Exception in save_invoice_headers",e)
            raise e
    @log_decorator
    def save_invoice_items(self, data: list):
        """Update invoice details for multiple items"""
        try:
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                for item in data:
                    sql_statement = '''
                                    update mt_ecom_item_table
                                    set invoice_number = %s,
                                        invoice_quantity = %s,
                                        invoice_date = %s,
                                        invoice_uom = %s,
                                        invoice_tax = %s,
                                        invoice_mrp = %s,
                                        updated_on = now(),
                                        updated_caselot = %s
                                    where sales_order = %s
                                    and response_item_number = %s
                                    '''
                    cur.execute(sql_statement, (
                        item.get("invoice_number"),
                        float(item.get("invoice_quantity")),
                        item.get("invoice_date"),
                        item.get("invoice_uom"),
                        json.dumps(item.get("invoice_tax")),
                        float(item.get("invoice_mrp")),
                        item.get("updated_caselot"),
                        item.get("sales_order"),
                        str(int(item.get("response_item_number")))
                    ))
                    conn.commit()
                return cur.rowcount

                
        except Exception as e:
            logger.error("Exception in save_invoice_items", e)
            raise e
        
    @log_decorator
    def get_po_details(self,po:str):
        try:
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = '''select
                                    meh.po_number "PO Number",
                                    to_char(meh.po_created_date, 'DD/MM/YYYY') "PO Date",
                                    meh.site_code "Site Code",
                                    mei.sales_order "SO Number",
                                    meh.customer_code "Customer Code",
                                    mei.item_number "Line Item ID",
                                    mei.ean "EAN",
                                    mei.customer_product_id "Customer Product ID",
                                    mei.po_item_description "Customer Product Description",
                                    mei.psku_code "PSKU",
                                    mei.psku_description "PSKU Description",
                                    mei.system_sku_code "Child SKU",
                                    mei.system_sku_description "Child SKU Description",
                                    mei.status "Status",
                                    mei.message "Message",
                                    mei.ror_description "SAP Error",
                                    mei.target_qty  "PO Qty",
                                    mei.uom "PO UOM",
                                    mei.so_qty  "SO Qty (CV)",
                                    mei.allocated_qty "Allocated Qty (CV)",
                                    COALESCE(mei.so_qty, 0) - COALESCE(mei.allocated_qty, 0) "ROR Qty (CV)",
                                    mei.remaining_caselot "Remaining Qty (Pieces)",
                                    mei.mrp "MRP",
                                    mei.updated_mrp "SAP MRP",
                                    mei.switchover_sku "Switch Over SKU",
                                    mei.caselot "Caselot",
                                    mei.updated_caselot "SAP Caselot",
                                    mei.base_price "Base Price",
                                    mei.updated_base_price "SAP Base price",
                                    mei.landing_price "Landing Price",
                                    mei.updated_landing_price "SAP Landing Price",
                                    mei.invoice_number "Invoice Number",
                                    to_char(mei.invoice_date, 'DD/MM/YYYY') "Invoice Date",
                                    mei.invoice_quantity  "Invoice Qty",
                                    mei.invoice_uom "Invoice UOM",
                                    mei.invoice_mrp "Invoice MRP",
                                    mei.invoice_base_price "Invoice Base Price"
                                from
                                    mt_ecom_header_table meh
                                left join mt_ecom_item_table mei on
                                    meh.id = mei.po_id
                                where
                                    meh.po_number =  %s'''
                cur.execute(sql_statement,(po,))
                column_names = [desc[0] for desc in cur.description]
                data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                return data if len(data) else ''
        except Exception as e:
            logger.error("Exception in get_po_details",e)
            raise e
    @log_decorator
    def update_customer_code(self,po:str,customer_code:str):
        try:
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                customer_code = self.HELPER.remove_custom_types(customer_code)
                sql_statement = '''Update mt_ecom_header_table set customer_code = %s where po_number = %s returning id'''
                cur.execute(sql_statement,(customer_code.get('customer_code'),po))
                result = cur.fetchone()
                header_id = result[0] if result else None
                conn.commit()
                sql_statement = '''Update mt_ecom_item_table set message = '' where po_id = %s'''
                cur.execute(sql_statement,(header_id,))
                conn.commit()
                return customer_code.get('customer_code')
        except Exception as e:
            logger.error("Exception in update_customer_code",e)
            raise e
    @log_decorator
    def insert_json_key(self,key:str,po:str):
        try:
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                sql_statement = '''update  mt_ecom_header_table set json_file_name = %s where po_number = %s '''
                cur.execute(sql_statement,(key,po))
                conn.commit()
                return cur.rowcount
        except Exception as e:
            logger.error("Exception in insert_json_keys",e)
            raise e
    
    @log_decorator
    def check_maintenance(self):
        logger.info("inside PersistModel -> check_maintenance")
        try:
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = '''SELECT * FROM maintenance_history order by id DESC limit 1'''
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                return data
        except Exception as e:
            logger.error("Exception in check_maintenance",e)
            raise e
        
    @log_decorator
    def get_asn_data(self,data,type:str):
        customer = ''
        so_number = ''
        asn_data = {}
        try:
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                if type == 'customer':
                    sql_statement = '''SELECT so_number FROM mt_ecom_header_table where customer = %s and po_created_date >= %s and po_created_date <= %s and so_number IS NOT NULL and so_number != '' '''
                    cur.execute(sql_statement,(data.get('customer'),data.get('from_date') + ' 00:00:00',data.get('to_date') + ' 23:59:59'))
                    column_names = [desc[0] for desc in cur.description]
                    so_number = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                if type == 'so_number':
                    sql_statement = '''SELECT 
                                        ht.so_number,
                                        jsonb_agg(
                                            jsonb_build_object(
                                                'PO Number', ht.po_number,
                                                'Quantity in CV', it.invoice_quantity,
                                                'SAP Caselot', it.updated_caselot,
                                                'Quantity in Units', (it.invoice_quantity * it.updated_caselot),
                                                'Customer Article Code', it.customer_product_id,
                                                'SKU Description', it.system_sku_description,
                                                'Invoice Number', it.invoice_number,
                                                'Invoice Date', it.invoice_date,
                                                'Invoice MRP', it.invoice_mrp,
                                                'Value include tax', (it.invoice_tax->>'netAmt')
                                            )
                                        ) as items
                                    FROM 
                                        mt_ecom_header_table ht
                                    JOIN 
                                        mt_ecom_item_table it ON ht.id = it.po_id
                                    WHERE 
                                        ht.so_number IN %s 
                                        and it.invoice_number IS NOT NULL
                                    GROUP BY 
                                        ht.so_number'''
                    cur.execute(sql_statement,(tuple(data.get('so_number')),))
                    column_names = [desc[0] for desc in cur.description]
                    asn_data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                    sql_statement = '''SELECT so_number FROM mt_ecom_header_table where customer = %s and po_created_date >= %s and po_created_date <= %s and so_number IS NOT NULL and so_number != '' '''
                    cur.execute(sql_statement,(data.get('customer'),data.get('from_date') + ' 00:00:00',data.get('to_date') + ' 23:59:59'))
                    column_names = [desc[0] for desc in cur.description]
                    so_number = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                sql_statement = '''SELECT distinct customer from mt_ecom_header_table'''
                cur.execute(sql_statement,)
                column_names = [desc[0] for desc in cur.description]
                customer = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                return {"customer": customer, "so_number": so_number,"asn_data": asn_data}
        except Exception as e:
            logger.error("Exception in get_asn_data",e)
            raise e

    @log_decorator
    def get_tot_tolerance(self,customer:str):
        try:
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = '''SELECT tot_tolerance FROM mt_ecom_workflow_type where customer = %s'''
                cur.execute(sql_statement,(customer,))
                column_names = [desc[0] for desc in cur.description]
                tot_tolernace = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                return tot_tolernace[0].get('tot_tolerance') if len(tot_tolernace) else 0
        except Exception as e:
            logger.error("Exception in get_tot_tolerance",e)
            raise e
        
    @log_decorator
    def update_tot(self,data:dict):
        try:
            sql_statement = """Select status,message from mt_ecom_item_table where po_id = %s and item_number = %s"""
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement, (data.get('id', 0), data.get('item_number', "")))
                column_names = [desc[0] for desc in cur.description]
                result = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                if len(result) and result[0].get('message',''):
                    sql_statement = '''UPDATE mt_ecom_item_table SET sap_tot = %s, tot= %s WHERE po_id = %s and item_number = %s'''
                    cur.execute(sql_statement,(data.get('sap_tot',""),data.get('tot_margin'),data.get('id',0),data.get('item_number',"")))
                    conn.commit()
                else:
                    sql_statement = '''UPDATE mt_ecom_item_table SET sap_tot = %s,tot= %s, message = %s, status = %s WHERE po_id = %s and item_number = %s'''
                    cur.execute(sql_statement,(data.get('sap_tot',""),data.get('tot_margin'),data.get("message", ""),data.get('status',""),data.get('id',0),data.get('item_number',"")))
                    conn.commit()
        except Exception as e:
            logger.error("Exception in update_tot",e)
            raise e
        
    @log_decorator
    def update_landing_price(self,data:dict):
        try:
            sql_statement = """Update mt_ecom_item_table set landing_price = %s where po_id = %s and item_number = %s"""
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                cur.execute(sql_statement, (data.get('landing_price', 0), data.get('id', 0), data.get('item_number', "")))
                conn.commit()
                return cur.rowcount
        except Exception as e:
            logger.error("Exception in update_landing_price",e)
            raise e
    
    @log_decorator
    def save_sap_data(self, data: dict):
        """
        Description: This method will save the SAP data for the given PO number and item number
        Params:
            - data :dict
        Returns:
            - bool
        """
        try:
            logger.info("inside PersistModel -> save_sap_data")
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                sql_statement = """UPDATE mt_ecom_item_table SET updated_mrp = %s, updated_caselot = %s, updated_base_price = %s, sap_tot = %s, 
                                    updated_on = now() WHERE po_id = (SELECT id FROM mt_ecom_header_table WHERE po_number = %s)
                                    AND item_number = %s"""
                cur.execute(
                    sql_statement,
                    (
                        data.get("mrp",0),
                        data.get("caselot",0),
                        data.get("base_price",0),
                        data.get("tot",0),
                        data.get('po',0),
                        data.get("item_number",0),
                    ),
                )
                conn.commit()
                return True
        except Exception as e:
            logger.error("Exception in save_sap_data", e)
            raise e
        
    @log_decorator
    def get_so_req_res(self,po: str):
        """
        Description: This method will fetch the SO request and response data for the given PO number
        Params:
            - po : str
        Returns:
            - list
        """
        try:
            logger.info("inside PersistModel -> get_so_req_res")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """SELECT column_values FROM mt_ecom_audit_trail WHERE reference_column = %s and type ='SO Request and Response' order by created_on desc limit 1  """
                cur.execute(sql_statement, (po,))
                column_names = [desc[0] for desc in cur.description]
                data = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict("records")
                return data if len(data) else []
        except Exception as e:
            logger.error("Exception in get_so_req_res", e)
            raise e
        