import json

from sqlalchemy import text

from src.dto.aos_logs_dto import AosLogsDto
from src.dto.auto_closure_gt_so_audit import AutoClosureGtSoAudit
from src.dto.auto_closure_mt_ecom_so_audit import AutoClosureMtEcomSoAudit
from src.libs.database_helper import DatabaseHelper
from src.libs.loggers import Logger

logger = Logger("AuditModel")


class AuditModel:
    DB_HELPER = None

    def __init__(self):
        self.DB_HELPER = DatabaseHelper()

    def upsert_aos_logs(self, data: AosLogsDto):
        try:
            columns = []
            values = []
            exclusion = []
            columns.append("distributor_code")
            values.append(f"'{data.distributor_code}'")
            columns.append("order_date")
            values.append("current_date")
            exclusion.append("updated_on = now()")

            columns.append("errors")
            if data.errors:
                values.append(f"""'{data.errors.replace("'", "''")}'""")
            else:
                values.append("NULL")
            exclusion.append("errors = EXCLUDED.errors")

            if data.pdp:
                columns.append("pdp")
                values.append(f"'{json.dumps(data.pdp)}'")
                exclusion.append("pdp = EXCLUDED.pdp")
            if data.warehouse_response:
                columns.append("warehouse_response")
                values.append(
                    f"""'{json.dumps(data.warehouse_response).replace("'", "''")}'"""
                )
                exclusion.append("warehouse_response = EXCLUDED.warehouse_response")
            if data.order_payload:
                columns.append("order_payload")
                # Assuming `data.order_payload` is a Pydantic model
                order_payload_json = json.dumps(data.order_payload.model_dump())
                # Escape single quotes in the JSON string
                order_payload_json = order_payload_json.replace("'", "''")
                values.append(f"'{order_payload_json}'")
                exclusion.append("order_payload = EXCLUDED.order_payload")
            if data.holdings:
                columns.append("holdings")
                values.append(f"'{json.dumps(data.holdings)}'")
                exclusion.append("holdings = EXCLUDED.holdings")
            if data.sap_validation_response_1:
                columns.append("sap_validation_response_1")
                values.append(
                    f"""'{json.dumps(data.sap_validation_response_1).replace("'", "''")}'"""
                )
                exclusion.append(
                    "sap_validation_response_1 = EXCLUDED.sap_validation_response_1"
                )
            if data.sap_validation_errors_1:
                columns.append("sap_validation_errors_1")
                values.append(
                    f"""'{json.dumps(data.sap_validation_errors_1).replace("'", "''")}'"""
                )
                exclusion.append(
                    "sap_validation_errors_1 = EXCLUDED.sap_validation_errors_1"
                )
            if data.sap_validation_response_2:
                columns.append("sap_validation_response_2")
                values.append(
                    f"""'{json.dumps(data.sap_validation_response_2).replace("'", "''")}'"""
                )
                exclusion.append(
                    "sap_validation_response_2 = EXCLUDED.sap_validation_response_2"
                )
            if data.sap_validation_errors_2:
                columns.append("sap_validation_errors_2")
                values.append(
                    f"""'{json.dumps(data.sap_validation_errors_2).replace("'", "''")}'"""
                )
                exclusion.append(
                    "sap_validation_errors_2 = EXCLUDED.sap_validation_errors_2"
                )
            if data.order_id:
                columns.append("order_id")
                values.append(f"{data.order_id}")
                exclusion.append("order_id = EXCLUDED.order_id")

            columns = ", ".join(columns)
            values = ", ".join(values)
            exclusion = ", ".join(exclusion)

            query = f"""
                INSERT INTO audit.aos_workflow ({columns})
                VALUES ({values})
                ON CONFLICT (distributor_code, order_date) DO UPDATE
                    SET {exclusion}
            """
            # The scoped_session ensures that each thread gets its own session, making the operations thread-safe.
            session = self.DB_HELPER.get_session()
            with session() as s:
                s.execute(text(query))
                s.commit()
                logger.info(f"AOS log upsert done {data.distributor_code}", columns)

            # engine = self.DB_HELPER.get_engine()
            # with engine.connect() as conn:
            #     with conn.begin():
            #         conn.execute(text(query))
            #         logger.info(f"AOS log upsert done {data.distributor_code}", columns)

            # sqlalchemy provided better thread-safety than psycopg2
            # with self.DB_HELPER.get_connection() as conn:
            #     with conn.cursor() as cur:
            #         cur.execute(query)
            #         conn.commit()
            #         logger.info("AOS log upsert done")
            return True

        except Exception as e:
            logger.exception(e)
            return False

    def insert_sync_log(
        self,
        sync_type: str,
        result: str,
        data: dict = None,
        distributor_id: str = None,
        error: str = None,
        is_cron_job: bool = False,
        execution_time: str = None,
    ):
        try:
            upsert_count = (
                data["upsert_count"]
                if result == "SUCCESS" and data and "upsert_count" in data
                else None
            )
            delete_count = (
                data["delete_count"]
                if result == "SUCCESS" and data and "delete_count" in data
                else None
            )
            distributor = f"'{distributor_id}'" if distributor_id else "NULL"
            error_log = f"'{error}'" if error else "NULL"
            is_cron_job_value = "TRUE" if is_cron_job else "FALSE"
            execution_time_value = f"'{execution_time}'" if execution_time else "NULL"

            # Replace None with NULL for upsert_count and delete_count
            upsert_count = upsert_count if upsert_count is not None else "NULL"
            delete_count = delete_count if delete_count is not None else "NULL"

            insert_log_statement = f"""
                INSERT INTO sync_logs(type, run_at, result, upsert_count, delete_count, distributor_id, error_log, is_cron_job, execution_time)
                VALUES('{sync_type}', CURRENT_TIMESTAMP, '{result}', {upsert_count}, {delete_count}, {distributor}, {error_log}, {is_cron_job_value}, {execution_time_value})
            """

            if sync_type == "SO":
                insert_log_statement += """
                    ON CONFLICT (distributor_id) DO UPDATE SET
                    run_at = EXCLUDED.run_at,
                    result = EXCLUDED.result,
                    upsert_count = EXCLUDED.upsert_count,
                    delete_count = EXCLUDED.delete_count,
                    execution_time = EXCLUDED.execution_time
                """

            engine = self.DB_HELPER.get_engine()
            with engine.connect() as conn:
                with conn.begin():
                    conn.execute(text(insert_log_statement))
        except Exception as e:
            logger.exception(e)

    def auto_closure_mt_ecom_so_audit(self, data: AutoClosureMtEcomSoAudit):
        try:
            rule_id = data.rule_id if data.rule_id else "NULL"
            revision_id = f"""'{data.revision_id}'""" if data.revision_id else "NULL"
            datalake_response = (
                f"""'{json.dumps(data.datalake_response).replace("'", "''")}'"""
                if data.datalake_response
                else "NULL"
            )
            process_details = (
                f"""'{json.dumps(data.process_details).replace("'", "''")}'"""
                if data.process_details
                else "NULL"
            )
            sap_payload = (
                f"""'{json.dumps(data.sap_payload).replace("'", "''")}'"""
                if data.sap_payload
                else "NULL"
            )
            sap_response = (
                f"""'{json.dumps(data.sap_response).replace("'", "''")}'"""
                if data.sap_response
                else "NULL"
            )
            error = f"""'{data.error.replace("'", "''")}'""" if data.error else "NULL"

            insert_audit_statement = f"""
                INSERT INTO audit.auto_closure_mt_ecom_so_audit(rule_id, revision_id, datalake_response, sap_payload, sap_response, error, process_details)
                VALUES({rule_id}, {revision_id}, {datalake_response}, {sap_payload}, {sap_response}, {error}, {process_details})
                returning audit_id
            """
            session = self.DB_HELPER.get_session()
            with session() as s:
                result = s.execute(text(insert_audit_statement))
                audit_id = result.fetchone()[0]
                s.commit()
                return audit_id
        except Exception as e:
            logger.exception(e)

    def auto_closure_gt_so_audit(self, data: AutoClosureGtSoAudit):
        try:
            datalake_response = (
                f"""'{json.dumps(data.datalake_response).replace("'", "''")}'"""
                if data.datalake_response
                else "NULL"
            )
            sap_payload = (
                f"""'{json.dumps(data.sap_payload).replace("'", "''")}'"""
                if data.sap_payload
                else "NULL"
            )
            sap_response = (
                f"""'{json.dumps(data.sap_response).replace("'", "''")}'"""
                if data.sap_response
                else "NULL"
            )
            rdd_details = (
                f"""'{json.dumps(data.rdd_details).replace("'", "''")}'"""
                if data.rdd_details
                else "NULL"
            )
            error = f"""'{data.error.replace("'", "''")}'""" if data.error else "NULL"

            insert_audit_statement = f"""
                INSERT INTO audit.auto_closure_gt_so_audit(rule_id, revision_id, datalake_response, sap_payload, sap_response, error, rdd_details)
                VALUES({data.rule_id}, '{data.revision_id}', {datalake_response}, {sap_payload}, {sap_response}, {error}, {rdd_details})
                returning audit_id
            """

            session = self.DB_HELPER.get_session()
            with session() as s:
                result = s.execute(text(insert_audit_statement))
                audit_id = result.fetchone()[0]
                s.commit()
                return audit_id
        except Exception as e:
            logger.exception(e)
