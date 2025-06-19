from typing import Literal

import requests

from src.config.configurations import (
    PEGASUS_SAP_URLS,
    PEGASUS_ARS_URLS,
    PEGASUS_ORDER_URLS,
)
from src.libs.loggers import Logger, log_decorator

logger = Logger("API_SERVICE")


class ApiService:

    def make_api_call_to_portal(
        self, request_type: str, api: str, payload: dict = None
    ):
        request_type = request_type.upper()
        request_params = {"method": request_type, "url": api, "verify": True}
        if payload is not None:
            request_params["json"] = payload

        try:
            response = requests.request(**request_params)
            response.raise_for_status()  # Raise an HTTPError for bad responses (4xx and 5xx)

            # Check if the response content is empty
            if response.content:
                return response.json()
            else:
                logger.error("Empty response received from API", api)
                return {"error": "Empty response received from API"}

        except requests.exceptions.HTTPError as http_err:
            logger.error(f"HTTP error occurred: {http_err}", api)
            return {"error": f"HTTP error occurred: {http_err}"}
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Request error occurred: {req_err}", api)
            return {"error": f"Request error occurred: {req_err}"}
        except ValueError as json_err:
            logger.error(f"JSON decode error: {json_err}", api)
            return {"error": f"JSON decode error: {json_err}"}

    def report_issue(self, dist_id, payload):
        try:
            api = f"{PEGASUS_SAP_URLS.get('REPORT_ISSUE')}/{dist_id}"
            self.make_api_call_to_portal("POST", api, payload)
        except Exception as e:
            logger.exception(e, "report_issue")

    def distributor_profile(self, distributor_id: str):
        try:
            api = f"{PEGASUS_ARS_URLS.get('DISTRIBUTOR_PROFILE')}/{distributor_id}"
            response = self.make_api_call_to_portal("GET", api)
            if response.get("success", False):
                return response.get("data")
            else:
                return None
        except Exception as e:
            logger.exception(e, "distributor_profile")
            return None

    def auto_closure_sap(self, audit_id, customer_type: Literal["MT", "GT"]):
        try:
            api = f"""{PEGASUS_SAP_URLS.get("AUTO_CLOSURE_SAP")}?audit_id={audit_id}&customer_type={customer_type}"""
            response = self.make_api_call_to_portal("GET", api)
            return response
        except Exception as e:
            logger.exception(e, "auto_closure_sap")
            return None

    def rdd_auto_closure(self, payload):
        try:
            api = PEGASUS_ORDER_URLS.get("RDD_AUTO_CLOSURE")
            batch_size = 100
            response = []
            for i in range(0, len(payload), batch_size):
                payload_batch = payload[i : i + batch_size]
                res = self.make_api_call_to_portal("POST", api, payload_batch)
                response.extend(r for r in res.get("data"))
            return response
        except Exception as e:
            logger.exception(e, "rdd_auto_closure")
            return None

    @log_decorator
    def allocation_from_staging(self):
        try:
            api = PEGASUS_ARS_URLS.get("ALLOCATION_FROM_STAGING")
            response = self.make_api_call_to_portal("POST", api)
            return response
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def sync_stock_norm(self):
        try:
            api = PEGASUS_ARS_URLS.get("SYNC_STOCK_NORM")
            response = self.make_api_call_to_portal("GET", api)
            return response
        except Exception as e:
            logger.exception(e)
            return None
