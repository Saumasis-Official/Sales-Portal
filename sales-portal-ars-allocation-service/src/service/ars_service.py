import json
import math
import sys
from datetime import datetime
from typing import List, Optional, Dict

from fastapi import HTTPException
from pandas import DataFrame

import src.libs.helpers as Helpers
import src.libs.transformers as Transformers
from src.config.configurations import (
    PEGASUS_SAP_URLS,
    PEGASUS_ARS_URLS,
)
from src.dto.aos_logs_dto import AosLogsDto
from src.dto.pdp_dto import PDPOrderWindowRegionDTO, PDPConfig
from src.dto.validate_dto import OrderDataDTO, PartnersDTO, ItemsDTO
from src.enums.allocation_sales_type import AllocationSalesType
from src.enums.forecast_dump_method import ForecastDumpMethod
from src.libs.ars_business_rules import ArsBusinessRules
from src.libs.email_helper import EmailHelper
from src.libs.loggers import Logger, log_decorator
from src.libs.pdp import PDPHelper
from src.libs.sqs_helper import SQSHelper
from src.model.ars_model import ArsModel
from src.model.audit_model import AuditModel
from src.service.api_service import ApiService
from src.service.ars_snow_park_service import ArsSnowParkService

logger = Logger("ArsService")


class ArsService:
    ARS_SNOW_PARK_SERVICE = None
    API_SERVICE = None
    ARS_MODEL = None
    EMAIL_HELPER = None
    AUDIT_MODEL = None
    PDP_HELPER = None
    SQS_HELPER = None
    ARS_BUSINESS_RULES = None

    def __init__(self) -> None:
        self.ARS_SNOW_PARK_SERVICE = ArsSnowParkService()
        self.API_SERVICE = ApiService()
        self.ARS_MODEL = ArsModel()
        self.EMAIL_HELPER = EmailHelper()
        self.AUDIT_MODEL = AuditModel()
        self.PDP_HELPER = PDPHelper()
        self.SQS_HELPER = SQSHelper()
        self.ARS_BUSINESS_RULES = ArsBusinessRules()

    def all_area_codes(self):
        """
        Calls the all_area_codes method of the ArsModel instance.

        Returns:
            list: A list of tuples representing area codes. Returns None if an exception occurs.
        """
        return self.ARS_MODEL.all_area_codes()

    def phasing_dump(
        self, area: str, months: int, cg: str, phasing_for_month: str = None
    ):
        print(f"inside phasing {area} {cg}")
        try:
            response_json = self.ARS_SNOW_PARK_SERVICE.phasing(
                area, cg, phasing_for_month
            )
            self.ARS_MODEL.phasing(response_json, area, phasing_for_month)
        except Exception as e:
            error_message: str = "EXCEPTION: ArsService -> phasing: {} {}".format(
                sys.exc_info()[0], sys.exc_info()[1]
            )
            self.handle_exception(area, error_message)

    def monthly_sales(
        self,
        area: str,
        sales_months: List[str],
        sales_type: AllocationSalesType,
        remove_deleted_customers: bool = False,
        db_codes: Optional[List[str]] = None,
    ):
        try:
            response_df = self.ARS_SNOW_PARK_SERVICE.monthly_sales(
                area, sales_months, sales_type, remove_deleted_customers
            )
            unique_id = datetime.now().strftime("%y%m%d%H%M%S")
            now = datetime.now()
            response_df["created_on"] = now
            response_df["key"] = response_df.index.astype(str) + unique_id
            if db_codes is not None and len(db_codes) > 0:
                response_df = self.refactor_db_level_monthly_sales(
                    db_codes, response_df
                )
            self.ARS_MODEL.monthly_sales(response_df, area)
        except Exception as e:
            error_message: str = "EXCEPTION: ArsService -> monthly_sales: {} {}".format(
                sys.exc_info()[0], sys.exc_info()[1]
            )
            self.handle_exception(area, error_message)

    def sales_allocation(
        self,
        area: str,
        forecast_dump_method: ForecastDumpMethod,
        sales_type: AllocationSalesType,
        sales_months: List[str],
        weightages: Optional[Dict] = None,
        forecast_for_month: str = None,
        remove_deleted_customers: bool = False,
        db_codes: Optional[List[str]] = None,
    ):
        try:
            response_df = self.ARS_SNOW_PARK_SERVICE.sales_allocation(
                area_code=area,
                forecast_for_month=forecast_for_month,
                remove_deleted_customers=remove_deleted_customers,
                forecast_dump_method=forecast_dump_method,
                sales_months=sales_months,
                weightages=weightages,
                sales_type=sales_type,
            )

            now = datetime.now()
            unique_id = now.strftime("%y%m%d%H%M%S")
            response_df["key"] = response_df.index.astype(str) + unique_id
            response_df["created_on"] = now

            if db_codes is not None and len(db_codes) > 0:
                response_df = self.refactor_db_level_sales_allocation(
                    db_codes, response_df
                )

            response: bool = self.ARS_MODEL.sales_allocation(
                response_df, area, sales_months, forecast_dump_method
            )
            if response and db_codes is not None and len(db_codes) > 0:
                allocation_staging_df = response_df[
                    ["sold_to_party", "parent_sku", "by_allocation"]
                ].copy()
                allocation_staging_df["updated_by"] = "PORTAL_MANAGED"
                allocation_staging_df.rename(
                    columns={
                        "sold_to_party": "distributor_code",
                        "parent_sku": "psku",
                        "by_allocation": "adjusted_allocation",
                    },
                    inplace=True,
                )
                insertion_status: bool = self.ARS_MODEL.upload_allocation_staging(
                    allocation_staging_df
                )
                if insertion_status:
                    self.API_SERVICE.allocation_from_staging()
                    self.API_SERVICE.sync_stock_norm()
        except Exception as e:
            error_message: str = (
                "EXCEPTION: ArsService -> sales_allocation: {} {}".format(
                    sys.exc_info()[0], sys.exc_info()[1]
                )
            )
            self.handle_exception(area, error_message)

    def refactor_db_level_sales_allocation(self, db_codes: List[str], allocation):
        area_code = allocation.iloc[0].get("asm_code")
        last_record = self.ARS_MODEL.last_sales_allocation_keys(area_code)
        filtered_allocation = allocation[
            allocation["sold_to_party"].isin(db_codes)
        ].copy()
        last_forecast_date = last_record.iloc[0].get("created_on")
        filtered_allocation["created_on"] = last_forecast_date
        # logic to update the key in filtered_allocation, where if key is found in last_record based on sold_to_party and parent_sku
        # Create a lookup dictionary for (sold_to_party, parent_sku) -> KEY from last_record
        key_lookup = {
            (row["sold_to_party"], row["parent_sku"]): row["key"]
            for _, row in last_record.iterrows()
        }
        # Update the 'key' in filtered_allocation if match found
        filtered_allocation["key"] = filtered_allocation.apply(
            lambda row: key_lookup.get(
                (row["sold_to_party"], row["parent_sku"]), row.get("key")
            ),
            axis=1,
        )
        return filtered_allocation

    def refactor_db_level_monthly_sales(self, db_codes: List[str], monthly_sales):
        area_code = monthly_sales.iloc[0].get("asm_code")
        last_record = self.ARS_MODEL.last_monthly_sales_keys(area_code)
        filtered_monthly_sales = monthly_sales[
            monthly_sales["sold_to_party"].isin(db_codes)
        ].copy()
        last_forecast_date = last_record.iloc[0].get("created_on")
        filtered_monthly_sales["created_on"] = last_forecast_date
        key_lookup = {
            (row["sold_to_party"], row["parent_sku"], row["year_month"]): row["key"]
            for _, row in last_record.iterrows()
        }
        filtered_monthly_sales["key"] = filtered_monthly_sales.apply(
            lambda row: key_lookup.get(
                (row["sold_to_party"], row["parent_sku"], row["year_month"]),
                row.get("key"),
            ),
            axis=1,
        )
        return filtered_monthly_sales

    def post_program_apis(
        self,
        applicable_month,
        stock_norm_sync,
        forecast_total_sync,
        forecast_allocation_sync,
    ):
        try:
            execution_order = []
            if stock_norm_sync:
                api = (
                    f"""{PEGASUS_ARS_URLS.get("STOCK_NORM_SYNC")}?month={applicable_month}"""
                    if applicable_month
                    else PEGASUS_ARS_URLS.get("STOCK_NORM_SYNC")
                )
                execution_order.append(api)
            if forecast_total_sync:
                api = (
                    f"""{PEGASUS_ARS_URLS.get("FORECAST_TOTAL_SYNC")}?applicable_month={applicable_month}"""
                    if applicable_month
                    else PEGASUS_ARS_URLS.get("FORECAST_TOTAL_SYNC")
                )
                execution_order.append(api)

            execution_order.append(PEGASUS_ARS_URLS.get("FORECAST_DUMP_VALIDATION"))

            if forecast_allocation_sync:
                api = PEGASUS_ARS_URLS.get("AUTO_SUBMIT_FORECAST")
                execution_order.append(api)

            for api in execution_order:
                print("post-program api: ", api)
                self.API_SERVICE.make_api_call_to_portal("GET", api)
        except Exception as e:
            error_message: str = (
                "EXCEPTION: ArsService -> post_program_apis: {} {}".format(
                    sys.exc_info()[0], sys.exc_info()[1]
                )
            )
            self.handle_exception("post_program_apis", error_message)

    def handle_exception(self, area: str, message: str):
        print(message)
        self.ARS_MODEL.forecast_sync_status(area, False, 0, message)
        # EMAIL_HELPER.send_email({
        #     "subject": "ARS Sync Service - Exception",
        #     "body": message,
        #     'email': EMAIL_HELPER.get_email_list()
        # })
        raise HTTPException(status_code=500, detail=message)

    def process_db_warehouse_entry(
        self,
        db,
        pdp_window: PDPConfig,
        computed_pdp_days: PDPOrderWindowRegionDTO,
        global_pdp_flag: bool,
    ):
        error = ""
        db_code = db.get("id")
        divisions = db.get("divisions")
        cg = db.get("cg")
        warehouse_details = None
        pdp_details = {}
        applicable_divisions = {}
        division_order_window = {}
        order_data = None

        try:
            division_str = ",".join(map(str, divisions))
            warehouse_api = (
                f"{PEGASUS_SAP_URLS.get('WAREHOUSE_API')}/{db_code}/10/{division_str}"
            )
            warehouse_details = self.API_SERVICE.make_api_call_to_portal(
                "GET", warehouse_api
            )
            if not warehouse_details.get("success"):
                error = "Warehouse details api failed"
                return
            # ########################## WAREHOUSE COMPUTATION ###########################
            # map the AG(Sold-To), WE(Ship-To) and Y1(Unloading point)
            partners_list = [PartnersDTO(partner_role="AG", partner_number=db_code)]

            # Find the ship_to object
            shipping_points = warehouse_details.get("data", {}).get(
                "shipping_point", []
            )
            ship_to = next(
                (
                    item
                    for item in shipping_points
                    if item.get("partner_code") == db_code
                ),
                None,
            )

            if cg == "11" and not ship_to:
                error = "Ship-To = Sold-To for Super Stockiest is not available"
                return

            if not ship_to and shipping_points:
                ship_to = shipping_points[0]

            if ship_to:
                partners_list.append(
                    PartnersDTO(
                        partner_role="WE",
                        partner_number=ship_to.get("partner_code"),
                        partner_name=ship_to.get("partner_name"),
                    )
                )
            else:
                error = "Ship-To unavailable"
                return
            # UNLOADING POINT TO BE ALWAYS CONSIDERED AS EMPTY
            # # Find the unloading point
            # unloading_points = warehouse_details.get("data", {}).get(
            #     "unloading_point", []
            # )
            # unloading_point = next(
            #     (
            #         item
            #         for item in unloading_points
            #         if item.get("partner_coe") == db_code
            #     ),
            #     None,
            # )
            #
            # if not unloading_point and unloading_points:
            #     unloading_point = unloading_points[0]
            #
            # if unloading_point:
            #     partners_list.append(
            #         PartnersDTO(
            #             partner_role="Y1",
            #             partner_number=unloading_point.get("partner_code"),
            #         )
            #     )

            # ########################## PDP COMPUTATION ###########################

            # map the divisions and pdp window and reference date for each division where distribution_channel = 10
            # main objective is to find the divisions for which order to be placed and their associated order windows
            div_pdp = {}

            for div in ship_to.get("distribution_details"):
                if div.get("Distribution_channel_Code") == "10":
                    div_pdp[div.get("Division_Code")] = {
                        "pdp": div.get("PDP_Day"),
                        "reference_date": div.get("Reference_date"),
                    }

            pdp_details["db_flag"] = db.get("enable_pdp")
            pdp_details["global_pdp_flag"] = global_pdp_flag
            pdp_details["pdp"] = div_pdp
            pdp_details["pdp_windows"] = pdp_window.model_dump()
            pdp_details["computed_pdp_days"] = json.loads(
                json.dumps(computed_pdp_days.model_dump(), default=str)
            )

            for div in div_pdp.keys():
                pdp_type = div_pdp[div]["pdp"][:2]
                pdp_days = div_pdp[div]["pdp"][2:]
                frequency = self.PDP_HELPER.pdp_frequency_counter(pdp_days)
                if pdp_type == "WE":
                    if frequency <= pdp_window.pdp_weekly.THRESHOLD_FREQUENCY:
                        applicable_days = (
                            computed_pdp_days.days_with_window_ending_today_exception
                        )
                        applicable_order_window = computed_pdp_days.pdp_we_exception
                    else:
                        applicable_days = (
                            computed_pdp_days.days_with_window_ending_today
                        )
                        applicable_order_window = computed_pdp_days.pdp_we_general
                    pdp_present = self.PDP_HELPER.pdp_frequency_counter(
                        pdp_days, applicable_days
                    )
                    if pdp_present > 0:
                        # applicable_divisions.append(div)
                        nearest_pdp_day = self.PDP_HELPER.nearest_pdp_day(pdp_days)
                        nearest_pdp_day_order_window = getattr(
                            applicable_order_window, nearest_pdp_day, {}
                        )
                        applicable_divisions[div] = json.loads(
                            json.dumps(
                                nearest_pdp_day_order_window.model_dump(), default=str
                            )
                        )
                elif pdp_type == "FN":
                    applicable_divisions = (
                        self.PDP_HELPER.division_wise_order_window_fortnightly(
                            div_pdp, pdp_window
                        )
                    )

            if not len(applicable_divisions):
                error = "Applicable divisions for today is empty"
                # pdp_details["applicable_divisions"] = []
                return None
            else:
                pdp_details["applicable_divisions"] = applicable_divisions

            # ########################## MATERIAL LIST COMPUTATION ###########################

            forecasted_psku = self.ARS_MODEL.forecasted_psku(
                db_code, list(applicable_divisions.keys())
            )

            if forecasted_psku.empty:
                error = "Forecasted PSKU is empty"
                return None
            else:
                logger.info(
                    f"Forecasted PSKU fetched successfully DB: {db_code}:",
                    str(len(forecasted_psku)),
                )

            mapped_item_details = Transformers.map_order_details(forecasted_psku)
            order_data = OrderDataDTO(
                pdp="ON" if db.get("enable_pdp") and global_pdp_flag else "OFF",
                partners=partners_list,
                items=[],
                original_items=mapped_item_details,
            )
            return True
        except Exception as e:
            logger.exception("process_db_warehouse_entry", e)
            error = str(e)
            return None
        finally:
            try:
                self.AUDIT_MODEL.upsert_aos_logs(
                    AosLogsDto(
                        distributor_code=db_code,
                        pdp=Helpers.to_serializable_json(pdp_details),
                        warehouse_response=warehouse_details,
                        errors=error,
                        order_payload=order_data,
                    )
                )
            except Exception as e:
                logger.exception("Log insertion failed", e)
                return None

    @log_decorator
    def aos_warehouse_worker(
        self,
        dbs_list: List[DataFrame],
        pdp_windows,
        region_order_windows,
        global_pdp_flag: bool,
    ):
        """
        Description: This function received a list of DBs in dataframe. Iterated over each db and send for payload creation
            - This is called with list of distributors belonging to one region at a time
        """
        try:
            for db in dbs_list:
                self.process_db_warehouse_entry(
                    db, pdp_windows, region_order_windows, global_pdp_flag
                )
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def db_list_for_aos_submit(self, distributor_codes: List[str]):
        return self.ARS_MODEL.db_list_for_aos_submit(distributor_codes)

    @log_decorator
    def aos_submit_worker(self, db_list, skip_sqs: bool):
        """
        Description: This function is called with a list of distributors for whom auto-submit will happen
            - This function will be running in a thread
        """
        try:
            for db in db_list:
                self.aos_submit_process(db, skip_sqs)
        except Exception as e:
            logger.exception(e)
            return None

    def aos_submit_process(self, db, skip_sqs: bool):
        """
        Description: This function will be called by the aos_submit_worker function to do order submit processing
            - Find the forecasted psku for the distributor
            - Fetch the holdings for the psku
            - Call order service -> auto-submit-quantity api with the holdings to get the SOQ(Suggested Order Quantity)
            - Generate the validate order payload
            - Call sap service -> validate-order api with the validate order payload
            - Handle validation errors
            - Call sap service -> validate-order api 2nd time if there was any error
            - Handle validation errors
            - Generate the submit order payload
            - send the order payload to SQS
        """
        error = ""
        sap_validation_response_1 = None
        sap_validation_errors_1 = None
        sap_validation_response_2 = None
        sap_validation_errors_2 = None
        db_code = db.get("distributor_code")
        order_data = db.get("order_payload", {})
        order_id = None
        now = datetime.now()
        sap_validation_1_execution_start = now
        sap_validation_1_execution_end = now
        sap_validation_1_execution_time = now
        sap_validation_2_execution_start = now
        sap_validation_2_execution_end = now
        sap_validation_2_execution_time = now
        sap_submit_execution_start = now
        sap_submit_execution_end = now
        sap_submit_execution_time = now

        try:
            psku_list = [
                item["material_code"]
                for item in db.get("order_payload", {}).get("original_items", [])
            ]
            distributor_profile = self.API_SERVICE.distributor_profile(db_code)
            holding = self.ARS_SNOW_PARK_SERVICE.fetch_holdings(
                db_code, psku_list, "ZOR"
            )
            self.AUDIT_MODEL.upsert_aos_logs(
                AosLogsDto(
                    distributor_code=db_code,
                    holdings=holding,
                )
            )
            aos_soq_api = PEGASUS_ARS_URLS.get("AOS_SOQ")
            payload = {
                "holdings": holding,
                "distributor_code": db_code,
                "id": db.get("id"),
            }
            aos_soq_response = self.API_SERVICE.make_api_call_to_portal(
                "POST", aos_soq_api, payload
            )
            if not aos_soq_response.get("success"):
                error = "Error in fetching suggested order quantity"
                return None

            soq = {
                item["productCode"]: item for item in aos_soq_response.get("data", [])
            }
            holding_dict = {item["SKU"]: item for item in holding}
            item_list: List[ItemsDTO] = []
            original_items_list: List[ItemsDTO] = []
            for item in db.get("order_payload", {}).get("original_items", []):
                sih = holding_dict.get(item["material_code"], {}).get("SIH_QTY", "")
                sit = holding_dict.get(item["material_code"], {}).get("SIT_QTY", "")
                oo = holding_dict.get(item["material_code"], {}).get("OO_QTY", "")
                soq_value = soq.get(item["material_code"], {}).get("qty", "0")
                stock_norm_days = soq.get(item["material_code"], {}).get(
                    "stock_norm_days", ""
                )
                item["original_quantity"] = soq_value
                item["target_qty"] = soq_value
                item["stock_in_hand"] = str(math.ceil(max(sih, 0))) if sih else "0"
                item["stock_in_transit"] = str(math.ceil(max(sit, 0))) if sit else "0"
                item["open_order"] = str(math.ceil(max(oo, 0))) if oo else "0"
                index = len(item_list)
                item["item_number"] = str((index + 1) * 10).zfill(6)
                item_data = ItemsDTO(
                    original_quantity=soq_value,
                    material_code=item["material_code"],
                    item_number=str((index + 1) * 10).zfill(6),
                    required_qty=soq_value,
                    target_qty=soq_value,
                    pack_type=item["pack_type"],
                    sales_unit=item["sales_unit"],
                    description=item["description"],
                    division=item["division"],
                    stock_in_hand=item["stock_in_hand"],
                    stock_in_transit=item["stock_in_transit"],
                    open_order=item["open_order"],
                    stock_norm_days=stock_norm_days,
                )
                if int(soq_value) > 0:
                    item_list.append(item_data)
                else:
                    serial = str((len(original_items_list) + 1) * 10).zfill(6)
                    setattr(item_data, "item_number", serial)

                original_items_list.append(item_data)

            order_data["items"] = item_list
            order_data["original_items"] = original_items_list
            self.AUDIT_MODEL.upsert_aos_logs(
                AosLogsDto(distributor_code=db_code, order_payload=order_data)
            )
            if len(item_list) > 0:
                validate_order_api = f"""{PEGASUS_SAP_URLS.get("VALIDATE_ORDER_API")}/{db_code}?aos_order=true&validation_counter=1"""
                validation_payload = Helpers.to_serializable_json(order_data)
                sap_validation_1_execution_start = datetime.now()
                validate_order_response = self.API_SERVICE.make_api_call_to_portal(
                    "POST", validate_order_api, validation_payload
                )
                sap_validation_1_execution_end = datetime.now()
                if validate_order_response.get(
                    "success"
                ) and validate_order_response.get("data", {}).get("d", {}).get(
                    "PURCH_NO"
                ):
                    order_res = validate_order_response.get("data", {}).get("d", {})
                    order_data["po_number"] = order_res.get("PURCH_NO")
                    order_data["req_date"] = order_res.get("REQ_DATE_H")
                    order_data["po_date"] = order_res.get("PURCH_DATE")

                sap_validation_response_1 = validate_order_response
                error_handler = self.ARS_BUSINESS_RULES.handle_validation(
                    order_items=item_list,
                    validation_response=validate_order_response,
                    order_data=OrderDataDTO(**order_data),
                    distributor_profile=distributor_profile,
                )

                if not error_handler.get("status"):
                    # TODO: address second validation attempt
                    sap_validation_errors_1 = error_handler
                    self.API_SERVICE.report_issue(
                        db_code,
                        Helpers.to_serializable_json(error_handler.get("report_issue")),
                    )

                    # remove items with error
                    non_error_items: List[ItemsDTO] = []
                    items: List[ItemsDTO] = order_data.get("items", [])
                    error_items_material_code: List[str] = [
                        getattr(item.get("material"), "material_code")
                        for item in error_handler.get("error_items", [])
                    ]
                    for item in items:
                        psku = getattr(item, "material_code")
                        if psku not in error_items_material_code:
                            index = len(non_error_items)
                            item_sequence = str((index + 1) * 10).zfill(6)
                            setattr(item, "item_number", item_sequence)
                            non_error_items.append(item)
                    if len(non_error_items) > 0:
                        order_data["items"] = non_error_items
                        validate_order_api = f"""{PEGASUS_SAP_URLS.get("VALIDATE_ORDER_API")}/{db_code}?aos_order=true&validation_counter=2"""
                        validation_payload = Helpers.to_serializable_json(order_data)
                        sap_validation_2_execution_start = datetime.now()
                        validate_order_response = (
                            self.API_SERVICE.make_api_call_to_portal(
                                "POST", validate_order_api, validation_payload
                            )
                        )
                        sap_validation_2_execution_end = datetime.now()
                        sap_validation_response_2 = validate_order_response
                        error_handler = self.ARS_BUSINESS_RULES.handle_validation(
                            item_list,
                            validate_order_response,
                            OrderDataDTO(**order_data),
                            distributor_profile,
                        )

                if error_handler.get("status"):
                    # prepare submit payload
                    submit_payload = Transformers.generate_submit_payload(
                        OrderDataDTO(**order_data), error_handler.get("tonn")
                    )
                    order_id = error_handler.get("order_id")
                    sap_submit_execution_start = datetime.now()
                    if skip_sqs:
                        submit_order_api = PEGASUS_SAP_URLS.get("SUBMIT_ORDER_API")
                        mock_sqs_payload = {
                            "messageId": "",
                            "receiptHandle": "",
                            "body": json.dumps(
                                Helpers.to_serializable_json(submit_payload)
                            ),
                        }
                        logger.info("Order sent for submission", db_code)
                        self.API_SERVICE.make_api_call_to_portal(
                            "POST",
                            submit_order_api,
                            mock_sqs_payload,
                        )
                    else:
                        self.SQS_HELPER.send_data_to_sqs(
                            Helpers.to_serializable_json(submit_payload)
                        )
                    sap_submit_execution_end = datetime.now()
                else:
                    error = "2nd validation failed with error. Aborting AOS"
                    self.API_SERVICE.report_issue(
                        db_code,
                        Helpers.to_serializable_json(error_handler.get("report_issue")),
                    )
            return None
        except Exception as e:
            logger.exception("aos_submit_process", e)
            return None
        finally:
            try:
                sap_validation_1_execution_time = (
                    sap_validation_1_execution_end - sap_validation_1_execution_start
                ).total_seconds()
                sap_validation_2_execution_time = (
                    sap_validation_2_execution_end - sap_validation_2_execution_start
                ).total_seconds()
                sap_submit_execution_time = (
                    sap_submit_execution_end - sap_submit_execution_start
                ).total_seconds()
                logger.info(
                    f"EXECUTION TIME:- Validation 1: {sap_validation_1_execution_time}s Validation 2: {sap_validation_2_execution_time}s Submit: {sap_submit_execution_time}s",
                    db_code,
                )
                self.AUDIT_MODEL.upsert_aos_logs(
                    AosLogsDto(
                        distributor_code=db_code,
                        errors=error,
                        order_payload=(
                            order_data if len(order_data.get("items")) > 0 else None
                        ),
                        sap_validation_response_1=sap_validation_response_1,
                        sap_validation_errors_1=Helpers.to_serializable_json(
                            sap_validation_errors_1
                        ),
                        sap_validation_response_2=sap_validation_response_2,
                        sap_validation_errors_2=sap_validation_errors_2,
                        order_id=order_id,
                    )
                )
            except Exception as e:
                logger.exception("Log insertion failed", e)

    @log_decorator
    def uniform_forecast_phasing(self, data):
        try:
            w1 = data.w1
            w2 = data.w2
            w3 = data.w3
            w4 = data.w4
            f12 = data.fn12
            f34 = data.fn34
            applicable_month = data.applicableMonth

            if not (w1 + w2 + w3 + w4) == 100:
                return False
            res = self.ARS_MODEL.uniform_forecast_phasing(
                w1=w1,
                w2=w2,
                w3=w3,
                w4=w4,
                f12=f12,
                f34=f34,
                applicable_month=applicable_month,
            )
            return res
        except Exception as e:
            logger.exception(e)
            return None

    def material_conversion_factors(self):
        return self.ARS_MODEL.material_conversion_factors()
