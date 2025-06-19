import concurrent.futures
from datetime import datetime, timedelta
from typing import List

from src.config.configurations import ARS_ALLOCATION
from src.libs.loggers import Logger, log_decorator
from src.model.audit_model import AuditModel
from src.service.auto_closure_service import AutoClosureService

logger = Logger("AutoClosureController")


class AutoClosureController:
    AUTO_CLOSURE_SERVICE = None
    AUDIT_MODEL = None

    def __init__(self):
        self.AUTO_CLOSURE_SERVICE = AutoClosureService()
        self.AUDIT_MODEL = AuditModel()

    @log_decorator
    def auto_closure_gt_orchestration(self):
        execution_start = datetime.now()
        try:
            gt_settings_df = self.AUTO_CLOSURE_SERVICE.fetch_auto_closure_gt()

            with concurrent.futures.ThreadPoolExecutor(
                max_workers=int(ARS_ALLOCATION.get("AOS_MAX_THREADS"))
            ) as executor:
                futures = {
                    executor.submit(
                        self.AUTO_CLOSURE_SERVICE.auto_closure_gt_worker,
                        rule,
                    )
                    for index, rule in gt_settings_df.iterrows()
                }
                concurrent.futures.wait(futures)

            execution_end = datetime.now()
            execution_time = str(
                timedelta(seconds=(execution_end - execution_start).total_seconds())
            )
            self.AUDIT_MODEL.insert_sync_log(
                sync_type="AUTO_CLOSURE_GT",
                result="SUCCESS",
                is_cron_job=True,
                execution_time=execution_time,
            )
            return None
        except Exception as e:
            logger.exception(e)
            execution_end = datetime.now()
            execution_time = str(
                timedelta(seconds=(execution_end - execution_start).total_seconds())
            )
            self.AUDIT_MODEL.insert_sync_log(
                sync_type="AUTO_CLOSURE_GT",
                result="FAIL",
                error=str(e),
                is_cron_job=True,
                execution_time=execution_time,
            )
            return None

    @log_decorator
    def auto_closure_mt_ecom_orchestration(self):
        execution_start = datetime.now()
        try:
            settings = self.AUTO_CLOSURE_SERVICE.fetch_auto_closure_mt_settings()
            with concurrent.futures.ThreadPoolExecutor(
                max_workers=int(ARS_ALLOCATION.get("AOS_MAX_THREADS"))
            ) as executor:
                futures = {
                    executor.submit(
                        self.AUTO_CLOSURE_SERVICE.auto_closure_mt_ecom_worker, details
                    )
                    for _, details in settings.iterrows()
                }
                concurrent.futures.wait(futures)

            execution_end = datetime.now()
            execution_time = str(
                timedelta(seconds=(execution_end - execution_start).total_seconds())
            )
            self.AUDIT_MODEL.insert_sync_log(
                sync_type="AUTO_CLOSURE_MT_ECOM",
                result="SUCCESS",
                is_cron_job=True,
                execution_time=execution_time,
            )
            return None
        except Exception as e:
            logger.exception(e)
            execution_end = datetime.now()
            execution_time = str(
                timedelta(seconds=(execution_end - execution_start).total_seconds())
            )
            self.AUDIT_MODEL.insert_sync_log(
                sync_type="AUTO_CLOSURE_MT_ECOM",
                result="FAIL",
                error=str(e),
                is_cron_job=True,
                execution_time=execution_time,
            )
            return None

    @log_decorator
    def report_table_initialization(self):
        try:
            audit_id_df = self.AUTO_CLOSURE_SERVICE.fetch_gt_audit_ids()
            for index, df_row in audit_id_df.iterrows():
                self.AUTO_CLOSURE_SERVICE.process_auto_closure_gt_report(
                    df_row.get("audit_id")
                )

            return None
        except Exception as e:
            logger.exception(e)
            return None

    def so_closure_status(self, so: List[str]):
        try:
            return self.AUTO_CLOSURE_SERVICE.so_closure_status(so)
        except Exception as e:
            logger.exception(e)
            return None
