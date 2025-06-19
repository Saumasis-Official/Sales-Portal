import concurrent.futures
from datetime import datetime, timedelta
from typing import List, Optional

from src.config.configurations import ARS_ALLOCATION, PEGASUS_AUTH_URLS, EMAIL_CONFIG
from src.config.constants import CUSTOMER_GROUPS_FOR_ARS
from src.config.global_configs import GlobalConfigs
from src.enums.allocation_sales_type import AllocationSalesType
from src.enums.forecast_dump_method import ForecastDumpMethod
from src.libs.email_helper import EmailHelper
from src.libs.loggers import Logger, log_decorator
from src.libs.pdp import PDPHelper
from src.libs.pdp import PDPWindows
from src.model.ars_model import ArsModel
from src.model.audit_model import AuditModel
from src.service.api_service import ApiService
from src.service.ars_service import ArsService
from src.service.ars_snow_park_service import ArsSnowParkService

logger = Logger("ArsController")


class ArsController:
    GLOBAL_CONFIGS = None
    AREA_CODES = None
    CUSTOMER_GROUP = None
    ARS_MODEL = None
    AUDIT_MODEL = None
    ARS_SERVICE = None
    API_SERVICE = None
    ARS_SNOW_PARK_SERVICE = None
    PDP_HELPER = None
    EMAIL_HELPER = None

    def __init__(self):
        self.GLOBAL_CONFIGS = GlobalConfigs()
        self.ARS_SERVICE = ArsService()
        self.ARS_MODEL = ArsModel()
        self.AUDIT_MODEL = AuditModel()
        self.ARS_SNOW_PARK_SERVICE = ArsSnowParkService()
        self.AREA_CODES = self.ARS_SERVICE.all_area_codes()
        self.CUSTOMER_GROUP = CUSTOMER_GROUPS_FOR_ARS
        self.API_SERVICE = ApiService()
        self.PDP_HELPER = PDPHelper()
        self.EMAIL_HELPER = EmailHelper()

    def fetch_phasing(self, area_code: str, customer_groups: str):
        return self.ARS_SNOW_PARK_SERVICE.phasing(area_code, customer_groups)

    def phasing(
        self,
        req_area_codes=None,
        req_customer_groups=None,
        phasing_for_month: str = None,
    ):
        """
        Perform phasing for all area codes and customer groups.
        """

        self.AREA_CODES = (
            req_area_codes
            if req_area_codes is not None
            else self.ARS_SERVICE.all_area_codes()
        )
        self.CUSTOMER_GROUP = (
            req_customer_groups
            if req_customer_groups is not None
            else self.CUSTOMER_GROUP
        )

        for area in self.AREA_CODES:
            for customer_group in self.CUSTOMER_GROUP:
                self.ARS_SERVICE.phasing_dump(
                    area, 3, customer_group, phasing_for_month
                )

    def monthly_sales(
        self,
        sales_months,
        sales_type: AllocationSalesType,
        req_area_codes=None,
        remove_deleted_customers: bool = False,
        db_codes: Optional[List[str]] = None,
    ):
        """
        Fetch monthly sales data for all area codes.
        """
        self.AREA_CODES = (
            req_area_codes
            if req_area_codes is not None
            else self.ARS_SERVICE.all_area_codes()
        )

        for area in self.AREA_CODES:
            self.ARS_SERVICE.monthly_sales(
                area=area,
                sales_months=sales_months,
                remove_deleted_customers=remove_deleted_customers,
                db_codes=db_codes,
                sales_type=sales_type,
            )

    def sales_allocation(
        self,
        forecast_dump_method: ForecastDumpMethod,
        sales_type: AllocationSalesType,
        sales_months: List[str],
        req_area_codes=None,
        forecast_month: str = None,
        remove_deleted_customers: bool = False,
        weightages: Optional[dict] = None,
        db_codes: Optional[List[str]] = None,
    ):
        """
        Perform sales allocation for all area codes.
        """
        self.AREA_CODES = (
            req_area_codes
            if req_area_codes is not None
            else self.ARS_SERVICE.all_area_codes()
        )

        for area in self.AREA_CODES:
            self.ARS_SERVICE.sales_allocation(
                area=area,
                forecast_dump_method=forecast_dump_method,
                forecast_for_month=forecast_month,
                remove_deleted_customers=remove_deleted_customers,
                sales_months=sales_months,
                weightages=weightages,
                db_codes=db_codes,
                sales_type=sales_type,
            )

    def post_program_apis(
        self,
        applicable_month: Optional[str] = None,
        stock_norm_sync: Optional[bool] = True,
        forecast_total_sync: Optional[bool] = True,
        forecast_allocation_sync: Optional[bool] = True,
    ):
        """
        Post data to the program APIs of the ARS service.
        """
        self.ARS_SERVICE.post_program_apis(
            applicable_month,
            stock_norm_sync,
            forecast_total_sync,
            forecast_allocation_sync,
        )

    @log_decorator
    def fetch_holdings(self, request_body):
        customer = request_body["customer"]
        doctype = request_body["doctype"]
        sku_list = request_body["sku_list"]
        return self.ARS_SNOW_PARK_SERVICE.fetch_holdings(customer, sku_list, doctype)

    @log_decorator
    def fetch_in_transit(self, request_body):
        logger.info("Request Body", request_body)
        customer = request_body["customer"]
        sku_list = []
        for sku in request_body["sku_list"]:
            sku_list.append(sku["sku"])
        return self.ARS_SNOW_PARK_SERVICE.fetch_in_transit(customer, sku_list)

    @log_decorator
    def fetch_in_hand(self, request_body):
        logger.info(request_body)
        customer = request_body["customer"]
        doctype = request_body["doctype"]
        sku_list = []
        for sku in request_body["sku_list"]:
            sku_list.append(sku["sku"])
        return self.ARS_SNOW_PARK_SERVICE.fetch_in_hand(customer, sku_list, doctype)

    @log_decorator
    def fetch_open(self, request_body):
        logger.info(request_body)
        customer = request_body["customer"]
        doctype = request_body["doctype"]
        sku_list = []
        for sku in request_body["sku_list"]:
            sku_list.append(sku["sku"])
        return self.ARS_SNOW_PARK_SERVICE.fetch_open(customer, sku_list, doctype)

    @log_decorator
    def fetch_mtd(self, request_body):
        logger.info(request_body)
        sku = request_body["sku"]
        doctype = request_body["doctype"]
        psku_customer = []
        for customer in request_body["customer_list"]:
            psku_customer.append({"customer": customer["customer"], "sku": sku})
        return self.ARS_SNOW_PARK_SERVICE.get_mtd(psku_customer, doctype)

    def fetch_time(self):
        sync_time = self.ARS_SNOW_PARK_SERVICE.fetch_time()
        table_status = self.ARS_SNOW_PARK_SERVICE.fetch_table_status()
        return {"sync_time": sync_time, "table_status": table_status}

    @log_decorator
    def fetch_mtd_bulk(self, request_body):
        logger.info(request_body)
        doctype = request_body["doctype"]
        psku_customer = request_body["psku_customer"]
        end_date = request_body["end_date"]
        return self.ARS_SNOW_PARK_SERVICE.fetch_mtd_bulk(
            psku_customer, doctype, end_date
        )

    @log_decorator
    def aos_warehouse_payload_orchestration(self, distributor_codes: List[str] = None):
        """
        Description: This function will do the orchestration of the ARS auto-submit JOB2(creation of order payload with warehouse details) process
            - Find the list of db for whom ARS and AOS flags are ON
            - Create batched by region id.
            - Create threads on each batch and call the worker function
            - In worker function a loop will run on all the DB in the batch and create the payload
        """
        execution_start = datetime.now()
        region_db_dict = {}
        pdp_windows = {}
        try:
            # finding list of applicable distributors
            db_df = self.ARS_MODEL.db_list_for_aos_warehouse_payload(distributor_codes)
            unique_regions = db_df["region_id"].unique()

            # crating batches of distributors by region
            for index, db in db_df.iterrows():
                region_id = db.get("region_id")
                if region_id not in region_db_dict:
                    region_db_dict[region_id] = []
                region_db_dict[region_id].append(db)

            # fetching global PDP flag
            res = self.ARS_MODEL.app_settings(["ENABLE_PDP_RESTRICTION"])
            global_pdp_flag = res.iloc[0]["value"] == "YES"

            # fetching and calculating PDP for each region
            for region_id in unique_regions:
                pdp_window_api = (
                    f"{PEGASUS_AUTH_URLS.get('PDP_WINDOW_API')}/{region_id}"
                )
                pdp_window_details = self.API_SERVICE.make_api_call_to_portal(
                    "GET", pdp_window_api
                )
                if pdp_window_details.get("success"):
                    window = PDPWindows()
                    window.setPdpWindowSettings(pdp_window_details.get("data"))
                    pdp_windows[region_id] = window.pdp_config

            region_order_windows = self.PDP_HELPER.day_wise_pdp_window(pdp_windows)

            with concurrent.futures.ThreadPoolExecutor() as executor:
                futures = [
                    executor.submit(
                        self.ARS_SERVICE.aos_warehouse_worker,
                        region_db_dict.get(region_id),
                        pdp_windows.get(region_id, []),
                        region_order_windows.get(region_id, {}),
                        global_pdp_flag,
                    )
                    for region_id in unique_regions
                ]
                concurrent.futures.wait(futures)
            execution_end = datetime.now()
            execution_time = str(
                timedelta(seconds=(execution_end - execution_start).total_seconds())
            )
            self.AUDIT_MODEL.insert_sync_log(
                sync_type="AOS_WAREHOUSE_PAYLOAD",
                result="SUCCESS",
                data={"upsert_count": len(db_df)},
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
                sync_type="AOS_WAREHOUSE_PAYLOAD",
                result="FAIL",
                error=str(e),
                is_cron_job=True,
                execution_time=execution_time,
            )
            return None

        # return self.ARS_SERVICE.aos_warehouse_payload()

    @log_decorator
    def aos_submit_orchestration(
        self,
        distributor_codes: List[str] = None,
        debug: bool = False,
        skip_sqs: bool = False,
    ):
        """
        Description: This function will do the orchestration of the ARS auto-submit(AOS) process
            - Find list of db for whom auto-submit will happen
            - Create batch for each region
            - One thread will be created for each region
        Params:
            - debug: bool -> When True, it will return the payload of the SQS and not append to the actual SQS
        """
        execution_start = datetime.now()
        region_db_dict = {}
        try:
            self.GLOBAL_CONFIGS.set_is_aos_submit_running(True)
            db_df = self.ARS_SERVICE.db_list_for_aos_submit(distributor_codes)
            logger.info("Number of DBs for AOS submit", str(len(db_df)))

            # crating batches of distributors by region
            for index, db in db_df.iterrows():
                region_id = db.get("region_id")
                if region_id not in region_db_dict:
                    region_db_dict[region_id] = []
                region_db_dict[region_id].append(db)

            with concurrent.futures.ThreadPoolExecutor(
                max_workers=int(ARS_ALLOCATION.get("AOS_MAX_THREADS"))
            ) as executor:
                futures = [
                    executor.submit(
                        self.ARS_SERVICE.aos_submit_worker,
                        dbs,
                        skip_sqs,
                    )
                    for dbs in region_db_dict.values()
                ]
                concurrent.futures.wait(futures)
            execution_end = datetime.now()
            execution_time = str(
                timedelta(seconds=(execution_end - execution_start).total_seconds())
            )
            self.AUDIT_MODEL.insert_sync_log(
                sync_type="AOS_ORDER_SUBMIT",
                result="SUCCESS",
                data={"upsert_count": len(db_df)},
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
                sync_type="AOS_ORDER_SUBMIT",
                result="FAIL",
                error=str(e),
                is_cron_job=True,
                execution_time=execution_time,
            )
            return None
        finally:
            self.GLOBAL_CONFIGS.set_is_aos_submit_running(False)

    def holding_sync_validation(self) -> bool:
        try:
            holding_sync = self.ARS_SNOW_PARK_SERVICE.holding_sync_validation()
            if isinstance(holding_sync, str) or not holding_sync:
                email_data = {
                    "sender": EMAIL_CONFIG.get("EMAIL_SENDER"),
                    "email": EMAIL_CONFIG.get("DL_HOLDINGS_SYNC_ERROR_TO"),
                    "subject": "Datalake holding sync failed",
                    "html_body": f"<h1>Error!!!</h1><p>Datalake holdings sync validation failed.</p><p>LOG: {holding_sync}</p>",
                    "text_body": "Hello\nThis is a test email.",
                }
                logger.error(
                    "Datalake holding sync validation failed", "holding_sync_validation"
                )
                response = self.EMAIL_HELPER.send_email(email_data)
                if response:
                    logger.info("Email sent successfully!")
                else:
                    logger.error("Failed to send email.", "email")
                return False
            return True
        except Exception as e:
            logger.exception(e)
            return False

    def update_forecast_phasing(self, data):
        try:
            res = self.ARS_SERVICE.uniform_forecast_phasing(data)
            return res
        except Exception as e:
            logger.exception(e)
            return None
