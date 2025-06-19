import calendar
import json
from datetime import datetime, timedelta
from typing import List, Union, Dict, Optional

import numpy as np
import pandas as pd
import pytz
from dateutil import parser
from dateutil.relativedelta import relativedelta

import src.libs.helpers as Helpers
from src.config.constants import ESSENTIAL_DATALAKE_TABLES
from src.enums.allocation_sales_type import AllocationSalesType
from src.enums.forecast_dump_method import ForecastDumpMethod
from src.libs.email_helper import EmailHelper
from src.libs.loggers import Logger, log_decorator
from src.model.ars_model import ArsModel
from src.model.ars_snow_park_model import ArsSnowParkModel

logger = Logger("ArsSnowParkService")


def adjust_to_100(values):
    # Calculate the sum of the input list
    total_sum = sum(values)
    # Calculate the difference from 100
    delta = 100 - total_sum

    # Check if the delta is within the +-3 range
    if -3 <= delta <= 3:
        # Adjust the last value to make the sum equal to 100
        values[-1] += delta
    # Return the adjusted list
    return values


def categorize(value):
    if value < 85:
        return "A"
    elif 85 <= value <= 95:
        return "B"
    else:
        return "C"


def format_billing_date(data):
    if data == 0:
        return 000000
    else:
        return int(data.strftime("%Y%m"))


def calculate_weighted_sales(row, weighted_percentage):
    sales = row["BILLINGQUANTITYINBASEUNIT"]
    weight = weighted_percentage.get(str(row["PO_PERIOD"]), 0)
    weighted_sales = sales * weight / 100
    return weighted_sales if weighted_sales > 0 else 0


class ArsSnowParkService:
    ARS_SPARK_MODEL = None
    ARS_MODEL = None
    EMAIL_HELPER = None

    def __init__(self) -> None:
        self.ARS_SPARK_MODEL = ArsSnowParkModel()
        self.ARS_MODEL = ArsModel()
        self.EMAIL_HELPER = EmailHelper()

    def phasing(
        self, area_code: str, customer_group: str, phasing_for_month: str = None
    ):
        today = (
            Helpers.previous_forecast_month(phasing_for_month, "date")
            if phasing_for_month is not None
            else datetime.today()
        )
        last_three_months = pd.date_range(
            end=today, periods=3, freq="ME", normalize=True
        )[::-1]
        sales_data = {
            "week1_sales": [],
            "week2_sales": [],
            "week3_sales": [],
            "week4_sales": [],
            "monthly_sales": [],
        }

        for date_ob in last_three_months:
            year = date_ob.strftime("%Y")
            month = date_ob.strftime("%B")
            _, last_day = calendar.monthrange(int(year), date_ob.month)

            week_ranges = [
                ("1-" + month + "-" + year, "7-" + month + "-" + year),
                ("8-" + month + "-" + year, "14-" + month + "-" + year),
                ("15-" + month + "-" + year, "21-" + month + "-" + year),
                ("22-" + month + "-" + year, str(last_day) + "-" + month + "-" + year),
            ]

            for i, (week_start, week_end) in enumerate(week_ranges):
                week_results = self.ARS_SPARK_MODEL.phasing_date_wise(
                    area_code, customer_group, week_start, week_end
                )
                week_pd = week_results.toPandas()
                week_first_element = (
                    week_pd.iloc[0, 0]
                    if not week_pd.empty and pd.notnull(week_pd.iloc[0, 0])
                    else 0
                )
                sales_data[f"week{i + 1}_sales"].append(week_first_element)

            total_monthly_sales = self.ARS_SPARK_MODEL.phasing_date_wise(
                area_code, customer_group, week_ranges[0][0], week_ranges[-1][1]
            )
            monthly_sales_pd = total_monthly_sales.toPandas()
            monthly_sales_first_element = (
                monthly_sales_pd.iloc[0, 0] if not monthly_sales_pd.empty else 0
            )
            sales_data["monthly_sales"].append(monthly_sales_first_element)

        monthly_sum = sum(sales_data["monthly_sales"])
        percentages = [
            (
                round(sum(sales_data[f"week{i + 1}_sales"]) / monthly_sum * 100, 2)
                if monthly_sum != 0
                else 0
            )
            for i in range(4)
        ]
        # SOPE-2022: Incorrect phasing percentage
        adjusted_percentages = adjust_to_100(percentages)

        phasing_df = pd.DataFrame(
            {
                "WEEK_NUM": list(range(1, 5)),
                "PERCENTAGE_OF_SALES": adjusted_percentages,
                "CUSTOMERGROUP": [customer_group] * 4,
            }
        )

        json_out = phasing_df.to_json(orient="records")
        json_object = json.loads(json_out)
        return json_object

    @log_decorator
    def customers_products_sales_data(
        self,
        area_code,
        start_year,
        start_month,
        end_year,
        end_month,
        remove_deleted_customers: bool = False,
        sales_type: AllocationSalesType = AllocationSalesType.SECONDARY_SALES,
    ):
        try:
            deleted_customers_pd = self.ARS_SPARK_MODEL.fetch_customer_master()

            product_master_pd = self.ARS_SPARK_MODEL.fetch_product_master()

            if sales_type == AllocationSalesType.PRIMARY_SALES:
                sales_pd = self.ARS_SPARK_MODEL.fetch_primary_sales(
                    start_year, start_month, end_year, end_month
                )
            else:
                sales_pd = self.ARS_SPARK_MODEL.fetch_secondary_sales(
                    start_year, start_month, end_year, end_month
                )

            customer_hierarchy_pd = self.ARS_SPARK_MODEL.fetch_customer_hierarchy(
                area_code
            )

            if remove_deleted_customers:
                remove_from_sales = sales_pd["SOLD_TO_PARTY"].isin(
                    deleted_customers_pd["CUSTOMER"]
                )
                sales_pd.drop(remove_from_sales[remove_from_sales].index, inplace=True)

                remove_from_customer_hierarchy = customer_hierarchy_pd["CUSTOMER"].isin(
                    deleted_customers_pd["CUSTOMER"]
                )
                customer_hierarchy_pd.drop(
                    remove_from_customer_hierarchy[
                        remove_from_customer_hierarchy
                    ].index,
                    inplace=True,
                )

            customer_hierarchy_pd = customer_hierarchy_pd.dropna()
            customer_hierarchy_pd = customer_hierarchy_pd.drop_duplicates()

            product_hierarchy_pd = self.ARS_SPARK_MODEL.fetch_product_hierarchy()
            product_hierarchy_pd = product_hierarchy_pd.dropna()

            product_master_pd = product_master_pd.merge(
                product_hierarchy_pd,
                left_on="PRODUCTHIERARCHY",
                right_on="PRD_HIER_LVL8",
                how="left",
            )
            product_master_pd.rename(
                columns={
                    "P_DESC": "PARENT_SKU_DESCR",
                    "PRODUCTHIERARCHY": "product_hierarchy",
                    "P_HIER_LVL7_BRND_VAR": "brand_variant",
                    "P_HIER_LVL6_REG_BRND": "regional_brand",
                    "P_HIER_LVL8_SKU": "grammage",
                    "BASEUNIT": "base_unit",
                    "WEIGHTUNIT": "weight_unit",
                },
                inplace=True,
            )
            product_master_pd.drop(columns=["MATNR", "PRD_HIER_LVL8"], inplace=True)
            product_master_pd.drop_duplicates(inplace=True)

            return [customer_hierarchy_pd, product_master_pd, sales_pd]

        except Exception as e:
            logger.exception(e)
            raise e

    def fetch_by_forecast(self, area_code: str, forecast_month: str, customers_df):
        """
        Description: Fetch BlueYonder(B.Y.) forecast
        """
        try:
            # forecast fetched at Area/PSKU level
            forecast_result = self.ARS_SPARK_MODEL.fetch_forecast(
                area_code, forecast_month
            )
            forecast_pd = forecast_result.toPandas()
            forecast_pd["PARENT_SKU"] = forecast_pd["PARENT_SKU"].astype(str)

            # SOPE-1885: QUANTITY NORM: All DB to be mapped for each forecasted PSKUs
            forecast_pd = forecast_pd.merge(customers_df, how="cross")
            forecast_pd.drop_duplicates(inplace=True)
            return forecast_pd
        except Exception as e:
            logger.exception(e)
            raise e

    def sales_calculation_prev_month_adj(
        self, area_code, forecast_month, forecast_df, products_df, sales_df
    ):
        try:
            # SOPE-2741: Current month forecast allocation to be based on the previous month updated forecast contribution%
            prev_forecast_month = Helpers.previous_forecast_month(forecast_month, "str")
            prev_forecast_contribution = self.ARS_MODEL.previous_month_updated_forecast(
                area_code, prev_forecast_month
            )
            allocation_df = forecast_df.merge(
                prev_forecast_contribution,
                left_on=["CUSTOMER", "PARENT_SKU"],
                right_on=["SOLD_TO_PARTY", "PARENT_SKU"],
                how="left",
            )
            allocation_df["by_allocation"] = (
                allocation_df["contribution"] * allocation_df["QTY"] / 100
            )
            allocation_df.drop(
                columns=["SOLD_TO_PARTY", "contribution"], axis=1, inplace=True
            )
            allocation_df.rename(columns={"CUSTOMER": "SOLD_TO_PARTY"}, inplace=True)
            allocation_df.fillna(0, inplace=True)

            allocation_df = allocation_df.merge(
                products_df, left_on="PARENT_SKU", right_on="PRODUCT", how="left"
            )

            # sum of billing quantity. Sum of total quantity sold at area/psku/DB level for month
            # range start to end months
            customer_sku_sales = (
                sales_df.groupby(
                    [
                        "SOLD_TO_PARTY",
                        "PARENT_SKU",
                    ]
                )
                .agg({"BILLINGQUANTITYINBASEUNIT": "sum"})
                .reset_index()
            )
            area_level_psku_sales_pd = (
                customer_sku_sales.groupby(["PARENT_SKU"])
                .agg({"BILLINGQUANTITYINBASEUNIT": "sum"})
                .add_suffix("_Sum")
                .reset_index()
            )

            customer_sales_area_sales = customer_sku_sales.merge(
                area_level_psku_sales_pd,
                on=["PARENT_SKU"],
                how="left",
            )
            # find the %Sales at DB/psku level for the L3M. The % should sum up to 100% for a
            # Area/PSKU level
            customer_sales_area_sales["%Sales"] = (
                customer_sales_area_sales["BILLINGQUANTITYINBASEUNIT"]
                / customer_sales_area_sales["BILLINGQUANTITYINBASEUNIT_Sum"]
                * 100
            )

            psku_total_billing_df = customer_sales_area_sales[
                ["PARENT_SKU", "BILLINGQUANTITYINBASEUNIT_Sum"]
            ].drop_duplicates()
            customer_sales_area_sales.drop(
                columns=["BILLINGQUANTITYINBASEUNIT_Sum"], inplace=True
            )

            allocation_df = allocation_df.merge(
                psku_total_billing_df,
                on=["PARENT_SKU"],
                how="left",
            )

            allocation_df = allocation_df.merge(
                customer_sales_area_sales,
                on=["SOLD_TO_PARTY", "PARENT_SKU"],
                how="left",
            )

            allocation_df.fillna(0, inplace=True)
            allocation_df.drop_duplicates(inplace=True)
            columns_to_drop = ["PRODUCT", "CUSTOMERGROUP"]
            allocation_df.drop(columns=columns_to_drop, inplace=True)
            allocation_df["forecast_month"] = forecast_month
            allocation_df.rename(
                columns={
                    "SOLD_TO_PARTY": "sold_to_party",
                    "ASM_CODE": "asm_code",
                    "PARENT_SKU": "parent_sku",
                    "CUSTOMERNAME": "customer_name",
                    "BILLINGQUANTITYINBASEUNIT": "billing_quantity_in_base_unit",
                    "BILLINGQUANTITYINBASEUNIT_Sum": "billing_quantity_in_base_unit_sum",
                    "%Sales": "percentage_sales",
                    "QTY": "forecast_qty",
                    "UOM": "forecast_uom",
                    "PARENT_SKU_DESCR": "parent_desc",
                },
                inplace=True,
            )

            return allocation_df
        except Exception as e:
            logger.exception(e)
            raise e

    def sales_calculation_by_l3m(
        self,
        forecast_month,
        forecast_dump_method: ForecastDumpMethod,
        forecast_df,
        sales_df,
        product_df,
        weightages,
    ):
        try:
            customer_sales_pd = forecast_df.merge(
                sales_df,
                left_on=["CUSTOMER", "PARENT_SKU"],
                right_on=["SOLD_TO_PARTY", "PARENT_SKU"],
                how="left",
            )
            customer_sales_pd.drop(columns=["SOLD_TO_PARTY"], axis=1, inplace=True)
            customer_sales_pd.rename(
                columns={"CUSTOMER": "SOLD_TO_PARTY"}, inplace=True
            )
            customer_sales_pd.fillna(0, inplace=True)

            customer_sales_pd["PO_PERIOD"] = customer_sales_pd["BILLING_DATE"].apply(
                format_billing_date
            )

            # sum of billing quantity. Sum of total quantity sold at (AREA x PSKU x DB) level for month range start to end months
            customer_sku_sales = (
                customer_sales_pd.groupby(
                    [
                        "SOLD_TO_PARTY",
                        "PARENT_SKU",
                        "QTY",
                        "UOM",
                        "CUSTOMERNAME",
                        "ASM_CODE",
                        "PO_PERIOD",
                    ]
                )
                .agg({"BILLINGQUANTITYINBASEUNIT": "sum"})
                .reset_index()
            )
            customer_sku_sales["WEIGHTED_SALES"] = customer_sku_sales.apply(
                calculate_weighted_sales, args=(weightages,), axis=1
            )

            customer_sku_sales = (
                customer_sku_sales.groupby(
                    [
                        "SOLD_TO_PARTY",
                        "PARENT_SKU",
                        "QTY",
                        "UOM",
                        "CUSTOMERNAME",
                        "ASM_CODE",
                    ]
                )
                .agg({"WEIGHTED_SALES": "sum", "BILLINGQUANTITYINBASEUNIT": "sum"})
                .reset_index()
            )

            area_level_psku_sales_pd = (
                customer_sku_sales.groupby(["ASM_CODE", "PARENT_SKU"])
                .agg({"WEIGHTED_SALES": "sum"})
                .add_suffix("_Sum")
                .reset_index()
            )

            allocation_df = customer_sku_sales.merge(
                area_level_psku_sales_pd,
                left_on=["ASM_CODE", "PARENT_SKU"],
                right_on=["ASM_CODE", "PARENT_SKU"],
                how="left",
            )
            # find the %Sales at DB/psku level for the L3M. The % should sum up to 100% for a
            # Area/PSKU level
            allocation_df["%Sales"] = (
                allocation_df["WEIGHTED_SALES"]
                / allocation_df["WEIGHTED_SALES_Sum"]
                * 100
            )
            allocation_df.fillna(0, inplace=True)

            if forecast_dump_method == ForecastDumpMethod.L3M_SALES_AVG:
                allocation_df["by_allocation"] = allocation_df["WEIGHTED_SALES"]
            else:
                allocation_df["by_allocation"] = (
                    allocation_df["%Sales"] * allocation_df["QTY"] / 100
                )

            # Setting by_allocation to 0 if the calculated value is negative
            allocation_df["by_allocation"] = np.where(
                allocation_df["by_allocation"] < 0, 0, allocation_df["by_allocation"]
            )

            allocation_df = allocation_df.merge(
                product_df, left_on="PARENT_SKU", right_on="PRODUCT", how="inner"
            )
            allocation_df.fillna(0, inplace=True)
            allocation_df.drop(
                columns=[
                    "PRODUCT",
                    "WEIGHTED_SALES",
                ],
                inplace=True,
            )
            allocation_df["forecast_month"] = forecast_month
            allocation_df.drop_duplicates()
            allocation_df.rename(
                columns={
                    "SOLD_TO_PARTY": "sold_to_party",
                    "ASM_CODE": "asm_code",
                    "PARENT_SKU": "parent_sku",
                    "PRODUCTHIERARCHY": "product_hierarchy",
                    "CUSTOMERNAME": "customer_name",
                    "BILLINGQUANTITYINBASEUNIT": "billing_quantity_in_base_unit",
                    "WEIGHTED_SALES_Sum": "billing_quantity_in_base_unit_sum",
                    "%Sales": "percentage_sales",
                    "QTY": "forecast_qty",
                    "UOM": "forecast_uom",
                    "PARENT_SKU_DESCR": "parent_desc",
                },
                inplace=True,
            )
            return allocation_df
        except Exception as e:
            logger.exception(e)
            raise e

    @log_decorator
    def sales_allocation(
        self,
        area_code: str,
        sales_months: List[str],
        forecast_for_month: ForecastDumpMethod,
        sales_type: AllocationSalesType,
        remove_deleted_customers: bool = None,
        forecast_dump_method: ForecastDumpMethod = ForecastDumpMethod.FORECAST_L3M_CONTRIBUTION,
        weightages: Optional[Dict] = None,
    ):
        """
        Description: As per SOPE-2741:
            - Current month forecast allocation will be based on the previous month updated allocation percentage
        """
        """
        Description: This function fetch forecast and then do the allocation for each distributor
        Params:
            - remove_deleted_customers: bool: Determines whether to remove the deleted customers
            - forecast_for_month: str: eg '01-Oct-24': If forecast need to be dumped for a specific month
            - sales_month: List[str]: List of sales months in YYYY-MM format. Determines the start and end month to be considered to calculate the sales
        Conditions:
            - Based on the remove_deleted_customers param, either all customers or only non-deleted customers to be considered
            - Every forecasted PSKU to be mapped for each distributor
        """
        """
            Columns for customers_df:
            1	ASM_CODE
            2	CUSTOMER
            3	CUSTOMERGROUP
            4	CUSTOMERNAME

            Columns for products_df:
            1	PRODUCT
            2	base_unit
            3	brand_variant
            4	grammage
            5	product_hierarchy
            6	regional_brand
            7	weight_unit
            8   PARENT_SKU_DESCR
            
            Columns for sales_df:
            1	BILLING_DATE
            2	BILLINGQUANTITYINBASEUNIT
            3	PARENT_SKU
            4	SOLD_TO_PARTY
            
            Columns for forecast_df:
            1   ASM_CODE
            2   CUSTOMER
            3   CUSTOMERGROUP
            4   CUSTOMERNAME
            5   PARENT_SKU
            6   QTY
            7   UOM
            
            Columns for allocation_df:
            1	asm_code
            2	base_unit
            3	billing_quantity_in_base_unit
            4	billing_quantity_in_base_unit_sum
            5	brand_variant
            6	by_allocation
            7	customer_name
            8	forecast_month
            9	forecast_qty
            10	forecast_uom
            11	grammage
            12	parent_desc
            13	parent_sku
            14	percentage_sales
            15	product_hierarchy
            16	regional_brand
            17	sold_to_party
            18	weight_unit
            
            Columns for sales_allocation:
            1	asm_code
            2	base_unit
            3	billing_quantity_in_base_unit
            4	billing_quantity_in_base_unit_sum
            5	brand_variant
            6	by_allocation
            7	class
            8	contribution
            9	cummulative_sum
            10	customer_name
            11	forecast_month
            12	forecast_qty
            13	forecast_uom
            14	grammage
            15	parent_desc
            16	parent_sku
            17	percentage_sales
            18	product_hierarchy
            19	regional_brand
            20	sold_to_party
            21	weight_unit
        """
        try:
            # ####################### SETTING PARAMETERS #######################################
            today = (
                Helpers.previous_forecast_month(forecast_for_month, "date")
                if forecast_for_month is not None
                else datetime.today()
            )
            current_year = f"{today.year:02d}"
            start_year, start_month = sales_months[0].split("-")
            end_year, end_month = sales_months[1].split("-")
            # if current month is June then forecast month is July(eg. 01-Jul-24)
            forecast_date = today + relativedelta(months=+1)
            forecast_month = (
                f"01-{forecast_date.strftime('%b')}-{current_year[2:4]}"
                if not forecast_for_month
                else forecast_for_month
            )
            # ####################### FETCHING DB & PSKU DATA #######################################

            customers_df, products_df, sales_df = self.customers_products_sales_data(
                area_code=area_code,
                start_year=start_year,
                start_month=start_month,
                end_year=end_year,
                end_month=end_month,
                remove_deleted_customers=remove_deleted_customers,
                sales_type=sales_type,
            )

            # ####################### FETCHING FORECAST #############################################

            forecast_df = self.fetch_by_forecast(
                area_code=area_code,
                forecast_month=forecast_month,
                customers_df=customers_df,
            )
            # ####################### ALLOCATION CALCULATION #############################################
            if forecast_dump_method == ForecastDumpMethod.PREV_MONTH_ADJ:
                allocation_df = self.sales_calculation_prev_month_adj(
                    area_code=area_code,
                    forecast_month=forecast_month,
                    forecast_df=forecast_df,
                    products_df=products_df,
                    sales_df=sales_df,
                )
            elif (
                forecast_dump_method == ForecastDumpMethod.FORECAST_L3M_CONTRIBUTION
                or forecast_dump_method == ForecastDumpMethod.L3M_SALES_AVG
            ):
                allocation_df = self.sales_calculation_by_l3m(
                    forecast_month=forecast_month,
                    forecast_dump_method=forecast_dump_method,
                    forecast_df=forecast_df,
                    sales_df=sales_df,
                    product_df=products_df,
                    weightages=weightages,
                )
            # ####################### SETTING CATEGORIZATION ###########################################
            db_total_sales = (
                allocation_df.groupby(["sold_to_party"])
                .agg({"billing_quantity_in_base_unit": "sum"})
                .reset_index()
            )
            sales_allocation = allocation_df.merge(
                db_total_sales,
                left_on="sold_to_party",
                right_on="sold_to_party",
                how="left",
            )
            # contribution = sales for a PSKU per DB / total sales for the DB
            sales_allocation["contribution"] = (
                sales_allocation["billing_quantity_in_base_unit_x"]
                / sales_allocation["billing_quantity_in_base_unit_y"]
            ) * 100
            sales_allocation.fillna(0, inplace=True)

            # arrange the contribution in descending order for each DB
            sales_allocation = (
                sales_allocation.groupby(["sold_to_party"])
                .apply(lambda x: x.sort_values(by="contribution", ascending=False))
                .reset_index(drop=True)
            )

            sales_allocation["cumulative_sum"] = sales_allocation.groupby(
                "sold_to_party"
            )["contribution"].transform(pd.Series.cumsum)
            sales_allocation["class"] = sales_allocation["cumulative_sum"].apply(
                categorize
            )

            sales_allocation.pop("billing_quantity_in_base_unit_y")
            sales_allocation.rename(
                columns={
                    "billing_quantity_in_base_unit_x": "billing_quantity_in_base_unit"
                },
                inplace=True,
            )
            return sales_allocation
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def monthly_sales(
        self,
        area_code,
        sales_months,
        sales_type: AllocationSalesType,
        remove_deleted_customers: bool = False,
    ):
        """
        Columns for percents_df:
        1	asm_code
        2	billing_quantity_in_base_unit
        3	billing_quantity_in_base_unit_sum
        4	brand_variant
        5	customer_name
        6	grammage
        7	parent_desc
        8	parent_sku
        9	percentage_sales
        10	product_hierarchy
        11	regional_brand
        12	sold_to_party
        13	year_month
        """
        try:
            # ####################### SETTING PARAMETERS #######################################
            start_year, start_month = sales_months[0].split("-")
            end_year, end_month = sales_months[1].split("-")

            # ####################### FETCHING DB & PSKU DATA #######################################
            customers_df, products_df, sales_df = self.customers_products_sales_data(
                area_code=area_code,
                start_year=start_year,
                start_month=start_month,
                end_year=end_year,
                end_month=end_month,
                remove_deleted_customers=remove_deleted_customers,
                sales_type=sales_type,
            )

            # ####################### SALES CALCULATION #############################################
            customer_sales_df = sales_df.merge(
                customers_df, left_on="SOLD_TO_PARTY", right_on="CUSTOMER", how="inner"
            )
            customer_sales_df["YearMonth"] = customer_sales_df["BILLING_DATE"].apply(
                format_billing_date
            )
            psku_sales = (
                customer_sales_df.groupby(
                    [
                        "SOLD_TO_PARTY",
                        "ASM_CODE",
                        "YearMonth",
                        "PARENT_SKU",
                        "CUSTOMERNAME",
                    ]
                )
                .agg({"BILLINGQUANTITYINBASEUNIT": "sum"})
                .reset_index()
            )
            sum_group_df = (
                psku_sales.groupby(["ASM_CODE", "YearMonth", "PARENT_SKU"])
                .agg({"BILLINGQUANTITYINBASEUNIT": "sum"})
                .add_suffix("_Sum")
                .reset_index()
            )

            percents_df = pd.merge(psku_sales, sum_group_df)
            percents_df["%Sales"] = (
                percents_df["BILLINGQUANTITYINBASEUNIT"]
                / percents_df["BILLINGQUANTITYINBASEUNIT_Sum"]
                * 100
            )
            percents_df = percents_df.merge(
                products_df, left_on="PARENT_SKU", right_on="PRODUCT", how="inner"
            )
            percents_df = percents_df.drop_duplicates()
            percents_df.drop(
                columns=["PRODUCT", "base_unit", "weight_unit"], axis=1, inplace=True
            )

            percents_df.rename(
                columns={
                    "SOLD_TO_PARTY": "sold_to_party",
                    "ASM_CODE": "asm_code",
                    "YearMonth": "year_month",
                    "PARENT_SKU": "parent_sku",
                    "PARENT_SKU_DESCR": "parent_desc",
                    "PRODUCTHIERARCHY": "product_hierarchy",
                    "CUSTOMERNAME": "customer_name",
                    "BILLINGQUANTITYINBASEUNIT": "billing_quantity_in_base_unit",
                    "BILLINGQUANTITYINBASEUNIT_Sum": "billing_quantity_in_base_unit_sum",
                    "%Sales": "percentage_sales",
                },
                inplace=True,
            )
            return percents_df
        except Exception as e:
            logger.exception(e)
            return None

    def fetch_in_transit(self, customer, sku_list):
        return self.ARS_SPARK_MODEL.fetch_in_transit(customer, sku_list)

    def fetch_in_hand(self, customer, sku_list, doctype):
        return self.ARS_SPARK_MODEL.fetch_in_hand(customer, sku_list, doctype)

    def fetch_open(self, customer, sku_list, doctype):
        return self.ARS_SPARK_MODEL.fetch_open(customer, sku_list, doctype)

    def get_mtd(self, psku_customer, doctype):
        return self.ARS_SPARK_MODEL.get_mtd(psku_customer, doctype)

    def fetch_mtd_bulk(self, psku_db, doctype, end_date):
        return self.ARS_SPARK_MODEL.get_mtd(psku_db, doctype, end_date)

    def fetch_time(self):
        return self.ARS_SPARK_MODEL.fetch_time()

    def fetch_table_status(self):
        mapped_res = {}
        try:
            response = self.ARS_SPARK_MODEL.fetch_table_status()
            for category, tables in ESSENTIAL_DATALAKE_TABLES.items():
                mapped_res[category] = {}
                for table in tables:
                    row_count = response.get(table)
                    mapped_res[category][table] = row_count if row_count else 0

            return mapped_res
        except Exception as e:
            logger.error(e)
            return None

    @log_decorator
    def fetch_holdings(
        self,
        distributor_code: str,
        psku_list: List,
        doctype: str,
        validate_table_update: bool = False,
    ):
        # TODO: Parameterize: validate that the tables have been updated on the current date.
        try:
            holding_df = self.ARS_SPARK_MODEL.fetch_holding(distributor_code, doctype)

            material_df = pd.DataFrame(psku_list, columns=["SKU"])
            material_df.drop_duplicates(inplace=True)
            merged_df = material_df.merge(
                holding_df,
                left_on="SKU",
                right_on="PARENT_SKU_CODE",
                how="inner",
                # validate="one_to_one",
            )
            merged_df.pop("PARENT_SKU_CODE")

            json_out = merged_df.to_json(orient="records")
            json_object = json.loads(json_out)

            # logger.info("Response", json_object)
            return json_object

        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def holding_sync_validation(self) -> Union[bool, str]:
        time_str = ""
        try:
            res = self.fetch_time()

            # Define the timezone
            ist = pytz.timezone("Asia/Kolkata")

            # Parse the dates from the res dictionary using dateutil.parser
            open_order_date = parser.parse(res["OPEN_ORDER"]).astimezone(ist).date()
            stock_in_hand_date = (
                parser.parse(res["STOCK_IN_HAND"]).astimezone(ist).date()
            )
            stock_in_transit_date = (
                parser.parse(res["STOCK_IN_TRANSIT"]).astimezone(ist).date()
            )

            # Get the current date and the previous date in IST

            current_date = datetime.now(ist).date()
            previous_date = current_date - timedelta(days=1)

            time_str = f"OPEN_ORDER: {open_order_date}, STOCK_IN_HAND: {stock_in_hand_date}, STOCK_IN_TRANSIT: {stock_in_transit_date}, CURRENT_DATE: {current_date}, PREVIOUS_DATE: {previous_date}"

            logger.info(time_str, "holding_sync_validation")

            # Check the conditions
            if open_order_date != current_date:
                raise ValueError(
                    f"OPEN_ORDER date {open_order_date} is not the current date {current_date}"
                )
            if stock_in_transit_date < previous_date:
                raise ValueError(
                    f"STOCK_IN_TRANSIT date {stock_in_transit_date} is not the previous date {previous_date}"
                )
            if stock_in_hand_date < previous_date:
                raise ValueError(
                    f"STOCK_IN_HAND date {stock_in_hand_date} is not the previous date {previous_date}"
                )

            # If all conditions are met, return the result
            return True
        except Exception as e:
            logger.exception(e)
            return time_str
