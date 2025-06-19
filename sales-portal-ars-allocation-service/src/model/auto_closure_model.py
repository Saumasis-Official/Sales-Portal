from threading import Lock
from typing import List

import pandas as pd
# from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import text

from src.config.configurations import ARS_ALLOCATION
from src.config.constants import SAP_DIRECT_ORDER_TYPES, ORDER_TYPE_PREFIX
from src.libs.database_helper import DatabaseHelper
from src.libs.loggers import Logger, log_decorator
from src.libs.snowpark_helper import SnowparkHelper

logger = Logger("AutoClosureModel")


class AutoClosureModel:
    SNOW_PARK_HELPER = None
    DB_HELPER = None

    def __init__(self):
        self.SNOW_PARK_HELPER = SnowparkHelper()
        self.DB_HELPER = DatabaseHelper()
        self.lock = Lock()  # Lock to ensure thread-safe operations

    @log_decorator
    def auto_closure_gt_settings(self):
        sql = """
         SELECT
            id,
            order_type,
            customer_group,
            short_close,
            revision_id
        FROM
            auto_closure_gt acg
        WHERE
            deleted = FALSE
            AND short_close IS NOT NULL;
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def auto_closure_mt_settings(self):
        sql = """
        SELECT
            id,
            customer_group,
            short_close_single_grn,
            short_close_multi_grn,
            revision_id
        FROM
            public.auto_closure_mt_ecom_config
        WHERE
            deleted = FALSE
            AND (
                short_close_single_grn IS NOT NULL
                OR short_close_multi_grn IS NOT NULL
            );
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def fetch_customers_with_customer_group(self, customer_group):
        sql = f"""
        SELECT
            dm.id as customer_code,
            mect.customer_type
        FROM
            distributor_master dm
        INNER JOIN customer_group_master cgm ON
            cgm.id = dm.group_id
        INNER JOIN mt_ecom_customer_type mect ON
            mect.customer_code = dm.id
        WHERE
            cgm."name" = '{customer_group}'
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def payer_codes(self):
        sql = """
        SELECT
            mepcm.payer_code ,
            array_agg(
                DISTINCT mepcm.customer_code
            ) AS customer_codes
        FROM
            public.mt_ecom_payer_code_mapping mepcm
        WHERE
            customer_group in ('14','16')
            AND payer_code IS NOT NULL
        GROUP BY
            mepcm.payer_code
        ORDER BY
            mepcm.payer_code
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def fetch_auto_closure_mt_ecom(self):
        sql = """
        WITH single_grn_payer_code AS (
            SELECT
                pcm.payer_code,
                'SINGLE_GRN' AS customer_type
            FROM
                public.mt_ecom_payer_code_mapping pcm
            JOIN public.mt_ecom_customer_type ctm ON
                pcm.customer_code = ctm.customer_code
            GROUP BY
                pcm.payer_code
            HAVING
                COUNT(*) = SUM(CASE WHEN ctm.customer_type = 'Single GRN' THEN 1 ELSE 0 END)
        ),
        multi_grn_payer_code AS (
            SELECT
                pcm.payer_code,
                'MULTI_GRN' AS customer_type
            FROM
                public.mt_ecom_payer_code_mapping pcm
            JOIN public.mt_ecom_customer_type ctm ON
                pcm.customer_code = ctm.customer_code
            GROUP BY
                pcm.payer_code
            HAVING
                COUNT(*) != SUM(CASE WHEN ctm.customer_type = 'Single GRN' THEN 1 ELSE 0 END)
        ),
        payer_type AS (
            SELECT
                *
            FROM
                single_grn_payer_code
            UNION ALL
            SELECT
                *
            FROM
                multi_grn_payer_code
        ),
        payer_customers AS (
            SELECT
                pt.payer_code,
                pt.customer_type,
                array_agg(
                    DISTINCT customer_code
                ) AS customer_codes
            FROM
                mt_ecom_payer_code_mapping mepcm
            INNER JOIN payer_type pt ON
                pt.payer_code = mepcm.payer_code
            GROUP BY
                pt.payer_code,
                pt.customer_type
        )
        SELECT
            pc.payer_code,
            pc.customer_codes,
            acme.short_close,
            acme.po_validity,
            acme.id,
            acme.revision_id
        FROM
            payer_customers pc
        INNER JOIN auto_closure_mt_ecom acme ON
            acme.payer_code = pc.payer_code
            AND acme.customer_type = pc.customer_type::customer_type 
        WHERE acme.short_close is not null;
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    def fetch_gt_so(self, order_type: str, customer_group: str, days: int):
        try:
            if not order_type or not customer_group or not days:
                logger.error("Parameter error", "fetch_gt_so")
                return None

            order_type_condition_list = []
            order_prefix = ORDER_TYPE_PREFIX.get(order_type)

            if order_type in SAP_DIRECT_ORDER_TYPES:
                for prefix in order_prefix:
                    stm = f"so.purchaseorderbycustomer NOT ILIKE '{prefix}-%'"
                    order_type_condition_list.append(stm)
                order_type_condition = " AND ".join(order_type_condition_list)
            else:
                for prefix in order_prefix:
                    stm = f"so.purchaseorderbycustomer ILIKE '{prefix}-%'"
                    order_type_condition_list.append(stm)
                order_type_condition = " OR ".join(order_type_condition_list)

            if "LIQ" in order_type:
                so_type_condition = " so.salesordertype = 'ZLIQ' "
            else:
                so_type_condition = " so.salesordertype IN ('ZOR', 'ZSAM') "

            if ARS_ALLOCATION.get("APPLICATION_ENV") == "prod":
                sql = f"""
                    SELECT
                        DISTINCT
                        so.soldtoparty,
                        so.salesorder,
                        ch.salesorganization,
                        ch.customergroup,
                        so.salesorderdate as orderdate,
                        so.purchaseorderbycustomer,
                        so.salesordertype,
                        so.createdbyuser,
                        so.requesteddeliverydate
                    FROM
                        prd_saps4_db.saps4_core.salesorder so
                    LEFT JOIN prd_sales_dm_db.sales_dm_br.customer_hierarchy_tcpl_ind ch ON
                        so.soldtoparty = ch.customer
                    WHERE
                        so.overallstatus in ('A','B')
                        AND (
                            {order_type_condition}
                        )
                        AND {so_type_condition}
                        AND ch.customergroup = '{customer_group}'
                        --AND datediff(DAY,so.salesorderdate,current_date) > {days}
                    """
            else:
                sql = f"""
                    SELECT
                    DISTINCT
                        so.soldtoparty,
                        so.salesorder,
                        so.salesorderdate as orderdate,
                        ch.salesorganization,
                        ch.customergroup,
                        so.purchaseorderbycustomer,
                        so.salesordertype,
                        so.createdbyuser,
                        so.requesteddeliverydate
                    FROM
                        DEV_SAPS4_DB.SAPS4_BR.SALESORDER so
                    LEFT JOIN prd_sales_dm_db.sales_dm_br.customer_hierarchy_tcpl_ind ch ON
                        so.soldtoparty = ch.customer
                    WHERE
                        so.overallstatus != 'C'
                        AND (
                            {order_type_condition}
                        )
                        AND {so_type_condition}
                        AND ch.customergroup = '{customer_group}'
                        --AND datediff(DAY,so.salesorderdate,current_date) > {days}
                    """

            with self.lock:  # Ensure thread-safe access to the Snowpark session
                snow_session = self.SNOW_PARK_HELPER.get_session()
                response = snow_session.sql(sql)
                df = response.toPandas()
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def fetch_mt_ecom_so(self, customer_group: str):
        try:
            if not len(customer_group):
                logger.error("Parameter error customer codes empty", customer_group)
                return None
            sql = f"""
            SELECT
                DISTINCT 
                ch.salesorganization,
                so.soldtoparty,
                so.salesorder,
                ch.customergroup,
                so.salesorderdate AS orderdate,
                bdi.billingdocument,
                bd.billingdocumentdate,
                so.purchaseorderbycustomer,
                so.createdbyuser,
                so.salesordertype
            FROM
                prd_saps4_db.saps4_core.salesorder so
            LEFT JOIN prd_sales_dm_db.sales_dm_br.customer_hierarchy_tcpl_ind ch ON
                so.soldtoparty = ch.customer
            LEFT JOIN prd_saps4_db.saps4_core.salesorderitem soi ON
                so.salesorder = soi.salesorder
            LEFT JOIN prd_saps4_db.saps4_core.billingdocumentitem bdi ON
                ltrim(soi.salesorder, '0') = ltrim(bdi.salesdocument, '0')
                AND ltrim(soi.salesorderitem, '0') = ltrim(bdi.salesdocumentitem, '0')
            LEFT JOIN prd_saps4_db.SAPS4_core.BILLINGDOCUMENT bd ON
                bdi.billingdocument = bd.billingdocument
            WHERE
                so.overallstatus IN ('A', 'B')
                AND so.salesordertype IN ('ZOR', 'ZSAM', 'ZLIQ')
                AND ch.customergroup = '{customer_group}'
            """
            with self.lock:
                snow_session = self.SNOW_PARK_HELPER.get_session()
                response = snow_session.sql(sql)
                df = response.toPandas()
                return df
        except Exception as e:
            logger.exception(e)
            raise e

    @log_decorator
    def sap_holidays(self):
        sql = """
        SELECT * FROM sap_holidays;
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    def fetch_gt_audit_ids(self):
        sql = """
        SELECT distinct audit_id from audit.auto_closure_gt_so_audit
        where datalake_response is not null
        order by audit_id;
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    def get_gt_audit_details(self, audit_id: int):
        sql = f"""
        SELECT
            acgsa.audit_id,
            rule_id,
            acgsa.revision_id,
            datalake_response,
            sap_payload,
            sap_response,
            created_on,
            error,
            rdd_details,
            COALESCE(acg.order_type ,acga.order_type) AS order_type,
            COALESCE(acg.customer_group ,acga.customer_group) AS customer_group,
            COALESCE(acg.short_close ,acga.short_close) AS short_close
        FROM
            audit.auto_closure_gt_so_audit acgsa
        LEFT JOIN public.auto_closure_gt acg ON
            acg.revision_id = acgsa.revision_id
        LEFT JOIN audit.auto_closure_gt_audit acga ON
            acga.revision_id = acgsa.revision_id
        WHERE
            acgsa.audit_id = {audit_id};
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e, audit_id)
            return None

    @log_decorator
    def upsert_auto_closure_gt_report(self, record_df):
        try:
            engine = self.DB_HELPER.get_engine()
            upsert_sql = """
            INSERT INTO audit.auto_closure_gt_so_audit_report (
                    so_number,
                    po_number,
                    db_code,
                    customer_group,
                    order_date,
                    order_type,
                    sales_order_type,
                    rdd,
                    so_validity,
                    so_sent_to_sap,
                    material,
                    item_status,
                    overall_status,
                    job_run,
                    audit_id,
                    created_by_user,
                    short_close_days,
                    sap_message
                ) VALUES (
                    :so_number,
                    :po_number,
                    :db_code,
                    :customer_group,
                    :order_date,
                    :order_type,
                    :sales_order_type,
                    :rdd,
                    :so_validity,
                    :so_sent_to_sap,
                    :material,
                    :item_status,
                    :overall_status,
                    :job_run,
                    :audit_id,
                    :created_by_user,
                    :short_close_days,
                    :sap_message
                )
                ON CONFLICT (so_number, COALESCE(material, ''))
                DO UPDATE
                SET
                    so_number = EXCLUDED.so_number,
                    po_number = EXCLUDED.po_number,
                    db_code = EXCLUDED.db_code,
                    customer_group = EXCLUDED.customer_group,
                    order_date = EXCLUDED.order_date,
                    order_type = EXCLUDED.order_type,
                    sales_order_type = EXCLUDED.sales_order_type,
                    rdd = EXCLUDED.rdd,
                    so_validity = EXCLUDED.so_validity,
                    so_sent_to_sap = EXCLUDED.so_sent_to_sap,
                    material = EXCLUDED.material,
                    item_status = EXCLUDED.item_status,
                    overall_status = EXCLUDED.overall_status,
                    job_run = EXCLUDED.job_run,
                    updated_on = now(),
                    audit_id = EXCLUDED.audit_id,
                    created_by_user = EXCLUDED.created_by_user,
                    short_close_days = EXCLUDED.short_close_days,
                    sap_message = EXCLUDED.sap_message;
            """
            with engine.connect() as conn:
                with conn.begin() as transaction:
                    try:
                        conn.execute(text(upsert_sql), record_df.to_dict("records"))
                        transaction.commit()
                    except Exception as ex:
                        logger.exception(ex)
                        transaction.rollback()
                        return False

            return True
        except Exception as e:
            logger.exception(e)
            return False

    def so_closure_status(self, so: List[str]):
        try:
            if ARS_ALLOCATION.get("APPLICATION_ENV") == "prod":
                sql = f"""
                SELECT
                    so.salesorder,
                    so.overallstatus
                FROM
                    prd_saps4_db.saps4_core.salesorder so
                WHERE
                    so.salesorder IN ('{"' , '".join(so)}')
                """
            else:
                sql = f"""
                SELECT
                    so.salesorder,
                    so.overallstatus
                FROM
                    DEV_SAPS4_DB.SAPS4_BR.SALESORDER so
                WHERE
                    so.salesorder IN ('{"' , '".join(so)}')
                """
            with self.lock:
                snow_session = self.SNOW_PARK_HELPER.get_session()
                response = snow_session.sql(sql)
                df = response.toPandas()
            return df
        except Exception as e:
            logger.exception(e)
            return None
