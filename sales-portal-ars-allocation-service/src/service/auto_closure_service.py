import json
import math
from datetime import datetime
from typing import List

import numpy as np
import pandas as pd
import pytz

import src.libs.auto_closure_rules as AutoClosureRules
import src.libs.helpers as Helpers
import src.libs.transformers as Transformers
from src.dto.auto_closure_gt_so_audit import AutoClosureGtSoAudit
from src.dto.auto_closure_mt_ecom_so_audit import AutoClosureMtEcomSoAudit
from src.libs.loggers import Logger, log_decorator
from src.model.audit_model import AuditModel
from src.model.auto_closure_model import AutoClosureModel
from src.service.api_service import ApiService

logger = Logger("AutoClosureService")
ist = pytz.timezone("Asia/Kolkata")


class AutoClosureService:
    AUTO_CLOSURE_MODEL = None
    AUDIT_MODEL = None
    API_SERVICE = None

    def __init__(self):
        self.AUTO_CLOSURE_MODEL = AutoClosureModel()
        self.AUDIT_MODEL = AuditModel()
        self.API_SERVICE = ApiService()

    @log_decorator
    def fetch_auto_closure_gt(self):
        return self.AUTO_CLOSURE_MODEL.auto_closure_gt_settings()

    @log_decorator
    def fetch_auto_closure_mt_settings(self):
        return self.AUTO_CLOSURE_MODEL.auto_closure_mt_settings()

    @log_decorator
    def fetch_payer_codes(self):
        return self.AUTO_CLOSURE_MODEL.payer_codes()

    @log_decorator
    def fetch_auto_closure_mt_ecom(self):
        return self.AUTO_CLOSURE_MODEL.fetch_auto_closure_mt_ecom()

    def auto_closure_gt_worker(self, rule):
        current_date_ist = datetime.now(ist).date()
        rule_id = rule.get("id")
        revision_id = rule.get("revision_id")
        short_close = (
            None
            if rule.get("short_close") is None or math.isnan(rule.get("short_close"))
            else int(rule.get("short_close"))
        )
        customer_group = rule.get("customer_group")
        order_type = rule.get("order_type")
        datalake_response = None
        sap_payload = None
        error = None
        audit_id = None
        so_df = pd.DataFrame()
        try:
            so_df = self.AUTO_CLOSURE_MODEL.fetch_gt_so(
                order_type, customer_group, int(short_close)
            )
            so_df_response = so_df.to_json(orient="records", date_format="iso")
            datalake_response = json.loads(so_df_response)

            if so_df is None or so_df.empty:
                logger.info("No data found in datalake: GT: Rule-ID: ", rule_id)
                return None

            # #################### PROCESS RULES ######################
            rdd_payload = (
                so_df[so_df["REQUESTEDDELIVERYDATE"].isna()]
                .groupby("SOLDTOPARTY", as_index=False)
                .apply(
                    lambda x: pd.Series(
                        {
                            "SO_DETAILS": x[["SALESORDER", "ORDERDATE"]].to_dict(
                                orient="records"
                            )
                        }
                    )
                )
                .to_dict(orient="records")
            )
            rdd_response = self.API_SERVICE.rdd_auto_closure(
                Helpers.to_serializable_json(rdd_payload)
            )

            rdd_response_dict = Helpers.build_dict(rdd_response, "so_number")

            so_df["rdd"] = so_df.apply(
                AutoClosureRules.find_applicable_rdd, args=(rdd_response_dict,), axis=1
            )
            so_df["so_validity"] = so_df.apply(
                AutoClosureRules.calculate_so_validity, args=(short_close,), axis=1
            )
            so_df.dropna(subset=["so_validity"], inplace=True)
            so_df["age"] = so_df["so_validity"].apply(
                lambda x: (x - current_date_ist).days
            )

            logger.info(so_df.to_dict("records"))

            # apply filter where so_validity is not null and so_validity is less than today
            filtered_so_df = so_df[so_df["age"] < 0]

            sap_payload = Transformers.generate_auto_closure_sap_payload(filtered_so_df)
        except Exception as e:
            logger.exception(e, rule_id)
            error = str(e)
            # return None
        finally:
            # #################### AUDIT LOGS ##########################
            try:
                log = AutoClosureGtSoAudit(
                    rule_id=rule_id,
                    revision_id=revision_id,
                    datalake_response=datalake_response,
                    sap_payload=Helpers.to_serializable_json(sap_payload),
                    error=error,
                    rdd_details=Helpers.to_serializable_json(
                        so_df.to_dict(orient="records")
                    ),
                )
                audit_id = self.AUDIT_MODEL.auto_closure_gt_so_audit(log)
            except Exception as e:
                logger.exception(e, rule_id)

        try:
            # ################### SAP API ##############################

            if sap_payload and len(sap_payload) > 0 and audit_id:
                logger.info(
                    f"""Send to SAP: GT:- Audit ID: {audit_id}""",
                    rule_id,
                )
                self.API_SERVICE.auto_closure_sap(audit_id, "GT")
            else:
                logger.info("No data to send to SAP: GT", rule_id)
            return None
        except Exception as e:
            logger.exception(e, rule_id)
            error = str(e)
            return None

    @log_decorator
    def auto_closure_mt_ecom_worker(self, rule):
        current_date_ist = datetime.now(ist).date()
        datalake_response = None
        sap_payload = None
        error = None
        audit_id = None
        rule_id = rule.get("id")
        revision_id = rule.get("revision_id")
        so_df = None
        try:
            customer_group = rule.get("customer_group")
            short_close_single_grn = (
                None
                if rule.get("short_close_single_grn") is None
                or math.isnan(rule.get("short_close_single_grn"))
                else int(rule.get("short_close_single_grn"))
            )
            short_close_multi_grn = (
                None
                if rule.get("short_close_multi_grn") is None
                or math.isnan(rule.get("short_close_multi_grn"))
                else int(rule.get("short_close_multi_grn"))
            )
            customers = self.AUTO_CLOSURE_MODEL.fetch_customers_with_customer_group(
                customer_group
            )
            if customers is None or customers.empty:
                logger.info(
                    "No data found of customers: MT: Customer-Group: ", customer_group
                )
                return None

            so_df = self.AUTO_CLOSURE_MODEL.fetch_mt_ecom_so(customer_group)
            if so_df is None or so_df.empty:
                logger.info(
                    "No data found in datalake: MT: Customer-Group: ", customer_group
                )
                return None
            so_df_records = so_df.to_json(orient="records", date_format="iso")
            datalake_response = json.loads(so_df_records)

            # #################### PROCESS RULES ######################
            customer_type_dict = Helpers.build_dict(
                customers.to_dict(orient="records"), "customer_code"
            )
            so_df["customer_type"] = so_df["SOLDTOPARTY"].apply(
                lambda x: customer_type_dict.get(x, {}).get("customer_type", None)
            )
            so_df["so_validity"] = so_df.apply(
                AutoClosureRules.calculate_so_validity_mt,
                args=(
                    short_close_single_grn,
                    short_close_multi_grn,
                ),
                axis=1,
            )
            so_df.dropna(subset=["so_validity"], inplace=True)
            so_df["age"] = so_df["so_validity"].apply(
                lambda x: (x - current_date_ist).days
            )

            # logger.info(so_df.to_dict("records"))

            filtered_so_df = so_df[so_df["age"] < 0]

            sap_payload = Transformers.generate_auto_closure_sap_payload(filtered_so_df)

        except Exception as e:
            logger.exception(e, rule_id)
            error = str(e)
        finally:
            # #################### AUDIT LOGS ##########################
            try:
                log = AutoClosureMtEcomSoAudit(
                    rule_id=rule_id,
                    revision_id=revision_id,
                    datalake_response=datalake_response,
                    sap_payload=Helpers.to_serializable_json(sap_payload),
                    error=error,
                    process_details=(
                        Helpers.to_serializable_json(so_df.to_dict(orient="records"))
                        if so_df is not None
                        else None
                    ),
                )
                audit_id = self.AUDIT_MODEL.auto_closure_mt_ecom_so_audit(log)
            except Exception as e:
                logger.exception(e, rule_id)

        try:
            # ################### SAP API ##############################

            if sap_payload and len(sap_payload) > 0 and audit_id:
                logger.info(
                    f"""Send to SAP: MT:- Audit ID: {audit_id}""",
                    rule_id,
                )
                self.API_SERVICE.auto_closure_sap(audit_id, "MT")
            else:
                logger.info("No data to send to SAP: MT", rule_id)
            return None
        except Exception as e:
            logger.exception(e, rule_id)
            error = str(e)
            return None

    def fetch_sap_holidays(self):
        try:
            sap_holidays_df = self.AUTO_CLOSURE_MODEL.sap_holidays()

            # Convert holiday_date to the same format as validity_date
            sap_holidays_df["holiday_date"] = sap_holidays_df["holiday_date"].apply(
                lambda x: datetime.strptime(x, "%d-%m-%Y").date()
            )
            return sap_holidays_df
        except Exception as e:
            logger.exception(e)
            return None

    def fetch_gt_audit_ids(self):
        return self.AUTO_CLOSURE_MODEL.fetch_gt_audit_ids()

    @log_decorator
    def process_auto_closure_gt_report(self, audit_id):
        try:
            audit_df = self.AUTO_CLOSURE_MODEL.get_gt_audit_details(audit_id)

            # Fetch and process datalake_response
            # audit_df["datalake_response"] = audit_df["datalake_response"].apply(
            #     lambda x: pd.json_normalize(x)
            # )
            # datalake_response_df = pd.concat(
            #     audit_df["datalake_response"].tolist(), ignore_index=True
            # )

            # Fetch and process rdd_details
            audit_df["rdd_details"] = audit_df["rdd_details"].apply(
                lambda x: pd.json_normalize(x)
            )
            rdd_details_df = pd.concat(
                audit_df["rdd_details"].tolist(), ignore_index=True
            )

            # Fetch and process sap_payload
            if audit_df["sap_payload"].notna().any():
                audit_df["sap_payload"] = audit_df["sap_payload"].apply(
                    lambda x: (pd.json_normalize(x, "NAVSALEORDERS"))
                )
                sap_payload_df = pd.concat(
                    audit_df["sap_payload"].tolist(), ignore_index=True
                )
                sap_payload_df["so_sent_to_sap"] = True
            else:
                sap_payload_df = pd.DataFrame(columns=["SaleOrder", "so_sent_to_sap"])

            # Fetch and process sap_response
            if audit_df["sap_response"].notna().any():
                audit_df["sap_response"] = audit_df["sap_response"].apply(
                    lambda x: pd.json_normalize(x)
                )
                df_sap_response_raw = pd.concat(
                    audit_df["sap_response"].tolist(), ignore_index=True
                )
                df_sap_response_raw["response"] = df_sap_response_raw[
                    "data.d.NAVRESULT.results"
                ].apply(lambda x: pd.json_normalize(x))
                sap_response_df = pd.concat(
                    df_sap_response_raw["response"].tolist(), ignore_index=True
                )
            else:
                sap_response_df = pd.DataFrame(columns=["SaleOrder"])

            # Ensure SaleOrder column is always present in sap_response_df
            if "SaleOrder" not in sap_response_df.columns:
                sap_response_df["SaleOrder"] = None

            audit_id = audit_df.loc[0, "audit_id"]

            result_df = (
                # datalake_response_df.merge(rdd_details_df, on="SALESORDER", how="left")
                rdd_details_df.merge(
                    sap_payload_df,
                    left_on="SALESORDER",
                    right_on="SaleOrder",
                    how="left",
                ).merge(sap_response_df, on="SaleOrder", how="left")
            )
            result_df["audit_id"] = audit_df.loc[0, "audit_id"]
            result_df["short_close_days"] = int(audit_df.loc[0, "short_close"])
            result_df["job_run"] = audit_df.loc[0, "created_on"]
            result_df["order_type"] = audit_df.loc[0, "order_type"]

            # Ensure all required columns are present
            required_columns = [
                "SALESORDER",
                "PURCHASEORDERBYCUSTOMER",
                "SOLDTOPARTY",
                "CUSTOMERGROUP",
                "ORDERDATE",
                "order_type",
                "SALESORDERTYPE",
                "rdd",
                "so_validity",
                "so_sent_to_sap",
                "Material",
                "ItemStatus",
                "OverallStatus",
                "job_run",
                "audit_id",
                "CREATEDBYUSER",
                "short_close_days",
                "Message",
            ]
            for col in required_columns:
                if col not in result_df.columns:
                    result_df[col] = None

            # Rename columns to match AutoClosureGTReportDTO
            result_df = result_df.rename(
                columns={
                    "SALESORDER": "so_number",
                    "PURCHASEORDERBYCUSTOMER": "po_number",
                    "SOLDTOPARTY": "db_code",
                    "CUSTOMERGROUP": "customer_group",
                    "ORDERDATE": "order_date",
                    "SALESORDERTYPE": "sales_order_type",
                    "Material": "material",
                    "ItemStatus": "item_status",
                    "OverallStatus": "overall_status",
                    "CREATEDBYUSER": "created_by_user",
                    "Message": "sap_message",
                }
            )

            # Select and reorder columns to match AutoClosureGTReportDTO
            result_df = result_df[
                [
                    "so_number",
                    "po_number",
                    "db_code",
                    "customer_group",
                    "order_date",
                    "order_type",
                    "sales_order_type",
                    "rdd",
                    "so_validity",
                    "so_sent_to_sap",
                    "material",
                    "item_status",
                    "overall_status",
                    "job_run",
                    "audit_id",
                    "created_by_user",
                    "short_close_days",
                    "sap_message",
                ]
            ]

            result_df = result_df.replace(np.nan, None)
            result_df["so_sent_to_sap"] = result_df["so_sent_to_sap"].fillna(False)
            result_df.drop_duplicates(inplace=True)

            self.AUTO_CLOSURE_MODEL.upsert_auto_closure_gt_report(result_df)
        except Exception as e:
            logger.exception(e, audit_id)
            return None

    def so_closure_status(self, so: List[str]):
        return self.AUTO_CLOSURE_MODEL.so_closure_status(so)
