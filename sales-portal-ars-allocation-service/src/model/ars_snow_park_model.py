import json
from calendar import monthrange
from datetime import date, timedelta

import pandas as pd
from snowflake.snowpark import functions as F

from src.config.constants import ESSENTIAL_DATALAKE_TABLES, SUB_CHANNEL_FOR_ARS
from src.libs.loggers import Logger, log_decorator
from src.libs.snowpark_helper import SnowparkHelper

logger = Logger("ArsSnowParkModel")


class ArsSnowParkModel:
    _snow_session = None
    SNOW_PARK_HELPER = None

    def __init__(self) -> None:
        self.SNOW_PARK_HELPER = SnowparkHelper()
        self._snow_session = self.SNOW_PARK_HELPER.get_session()

    def phasing_date_wise(self, area, group, start_date, end_date):
        try:
            self._snow_session.use_database("PRD_SALES_DM_DB")
            self._snow_session.use_schema("SALES_DM_BR")
            query = f"""
                    select
                        sum(price_after_disc_before_tax) as sales
                    from
                        PRIMARY_SALES_FACT_TCPL_IND psf
                    left join PRD_SALES_DM_DB.SALES_DM_BR.CUSTOMER_HIERARCHY_TCPL_IND ch on
                        psf.sold_to_party = ch.customer
                    where BILLING_DATE between '{start_date}' and '{end_date}'
                        and ch.asm_code = '{area}'
                        and SALES_AREA not like '%1010-40%'
                        and CUSTOMERGROUP in ('{group}')
                    """
            result = self._snow_session.sql(query)
            return result
        except Exception as e:
            print("EXCEPTION: ArsSnowParkModel -> phasing_date_wise: ", e)
            return None

    def fetch_customer_master(self):
        try:
            self._snow_session.use_database("PRD_SAPS4_DB")
            self._snow_session.use_schema("SAPS4_CORE")
            cust_master = self._snow_session.table("CUSTOMERMASTER")

            cust_master = cust_master.select("CUSTOMER", "DELETIONINDICATOR").filter(
                F.col("DELETIONINDICATOR") == "TRUE"
            )
            return cust_master.toPandas()
        except Exception as e:
            print("EXCEPTION: ArsSnowParkModel -> fetch_customer_master: ", e)
            return None

    def fetch_product_master(self):
        try:
            self._snow_session.use_database("PRD_SAPS4_DB")
            self._snow_session.use_schema("SAPS4_CORE")
            product = self._snow_session.table("PRODUCT")
            product_master = self._snow_session.table("PRODUCTMASTER")
            product = product.join(
                product_master,
                product["MATNR"] == product_master["P_MATERIAL"],
                "inner",
            )
            product = product.select(
                "MATNR",
                "PRODUCT",
                "PRODUCTHIERARCHY",
                "BASEUNIT",
                "WEIGHTUNIT",
                "P_DESC",
            )
            return product.toPandas()
        except Exception as e:
            print("EXCEPTION: ArsSnowModel -> fetch_product_master: ", e)
            return None

    def fetch_primary_sales(self, start_year, start_month, end_year, end_month):
        try:
            _, last_day = monthrange(int(end_year), int(end_month))
            self._snow_session.use_database("PRD_SALES_DM_DB")
            self._snow_session.use_schema("SALES_DM_BR")
            pri_sales = self._snow_session.table("PRIMARY_SALES_FACT_TCPL_IND")
            # between is both date inclusive
            pri_sales = pri_sales.select(
                "SOLD_TO_PARTY",
                "PARENT_SKU",
                "BILLINGQUANTITYINBASEUNIT",
                "BILLING_DATE",
            ).filter(
                (
                    F.col("BILLING_DATE").between(
                        date(int(start_year), int(start_month), 1),
                        date(int(end_year), int(end_month), last_day),
                    )
                )
            )

            excluded_sales_area = [
                "1010-40-12",
                "1010-40-18",
                "1010-40-13",
                "1010-40-10",
                "1010-40-14",
                "1010-40-99",
            ]
            pri_sales = pri_sales.filter(~F.col("SALES_AREA").isin(excluded_sales_area))
            pri_sales = pri_sales.filter(F.col("PARENT_SKU").isNotNull())
            return pri_sales.toPandas()
        except Exception as e:
            print("EXCEPTION: ArsSnowModel -> fetch_primary_sales: ", e)
            return None

    def fetch_secondary_sales(self, start_year, start_month, end_year, end_month):
        try:
            _, last_day = monthrange(int(end_year), int(end_month))
            sql = f"""
                WITH secondary AS (
                    SELECT DISTINCT
                        DISTRIBUTOR_CODE,PRODUCT_CODE,INVOICE_QUANTITY,INVOICE_QTY_IN_BU, INVOICE_DATE
                    FROM
                        PRD_SALES_DM_DB.SALES_DM_BR.SEC_SALES_FACT ssf
                    WHERE
                        invoice_date BETWEEN '{date(int(start_year), int(start_month), 1)}' AND '{date(int(end_year), int(end_month), last_day)}'
                )
                SELECT
                    DISTRIBUTOR_CODE AS SOLD_TO_PARTY,
                    p.basicmaterial AS PARENT_SKU,
                    INVOICE_DATE as BILLING_DATE,
                    INVOICE_QTY_IN_BU AS BILLINGQUANTITYINBASEUNIT
                FROM
                    secondary s
                INNER JOIN PRD_SAPS4_DB.SAPS4_CORE.PRODUCT p ON
                    p.product = s.product_code
                    AND basicmaterial != '';
                """
            snow_session = self.SNOW_PARK_HELPER.get_session()
            secondary_result = snow_session.sql(sql)
            secondary_pd = secondary_result.toPandas()
            return secondary_pd
        except Exception as e:
            logger.exception(e)
            return None

    def fetch_product_hierarchy(self):
        try:
            self._snow_session.use_database("PRD_SALES_DM_DB")
            self._snow_session.use_schema("SALES_DM_BR")
            prd_hir = self._snow_session.table("PRODUCT_HIERARCHY")
            prd_hir = prd_hir.select(
                "P_HIER_LVL7_BRND_VAR",
                "P_HIER_LVL6_REG_BRND",
                "P_HIER_LVL8_SKU",
                "PRD_HIER_LVL8",
            )
            return prd_hir.toPandas()
        except Exception as e:
            print("EXCEPTION: ArsSnowModel -> fetch_product_hierarchy: ", e)
            return None

    def fetch_customer_hierarchy(self, area_id: str, customer_group=None):
        try:
            # SOPE-2228: Sub-Channel code GTDB and GTSS for Forecast total
            # SOPE-2241: Sub-Channel code GTDB and GTSS for forecast allocation

            self._snow_session.use_database("PRD_SALES_DM_DB")
            self._snow_session.use_schema("SALES_DM_BR")
            cust_hir = self._snow_session.table("CUSTOMER_HIERARCHY_TCPL_IND")
            if customer_group:
                cust_hir = cust_hir.select(
                    "CUSTOMER", "CUSTOMERNAME", "ASM_CODE", "CUSTOMERGROUP"
                ).filter(
                    (F.col("ASM_CODE") == area_id)
                    & (F.col("CUSTOMERGROUP") == customer_group)
                    & (
                        F.col("SUB_CHANNEL_CODE_JDA_REPORTING").isin(
                            SUB_CHANNEL_FOR_ARS
                        )
                    )
                )
            else:
                cust_hir = cust_hir.select(
                    "CUSTOMER", "CUSTOMERNAME", "ASM_CODE", "CUSTOMERGROUP"
                ).filter(
                    (F.col("ASM_CODE") == area_id)
                    & (
                        F.col("SUB_CHANNEL_CODE_JDA_REPORTING").isin(
                            SUB_CHANNEL_FOR_ARS
                        )
                    )
                )
            return cust_hir.toPandas()
        except Exception as e:
            print("EXCEPTION: ArsSnowModel -> fetch_customer_hierarchy: ", e)
            return None

    def fetch_forecast(self, area_id, forecast_month):
        try:
            self._snow_session.use_database("PRD_BLUEYONDER_DB")
            self._snow_session.use_schema("BLUEYONDER_CORE")
            sub_channel_stmt = " OR ".join(
                [f"sub_channel = '{sc}'" for sc in SUB_CHANNEL_FOR_ARS]
            )
            query = f"""
            SELECT
                PARENT_SKU,
                sum(QTY) AS QTY,
                UOM
            FROM
                PRD_BLUEYONDER_DB.BLUEYONDER_CORE.FINAL_FORECAST_PSKU
            WHERE
                MONTH ILIKE '{forecast_month}'
                AND ({sub_channel_stmt})
                AND AREA = '{area_id}'
                AND forecast_create_dt_tm =(
                    SELECT
                        max(forecast_create_dt_tm)
                    FROM
                        PRD_BLUEYONDER_DB.BLUEYONDER_CORE.FINAL_FORECAST_PSKU
                    WHERE
                        MONTH ILIKE '{forecast_month}'
                )
            GROUP BY
                PARENT_SKU,
                UOM
            """
            forecast = self._snow_session.sql(query)
            return forecast
        except Exception as e:
            print("EXCEPTION: ArsSnowModel -> fetch_forecast: ", e)
            return None

    def fetch_in_transit(self, customer, sku_list):
        try:
            material_df = pd.DataFrame(sku_list, columns=["SKU"])
            material_df["customer"] = customer

            snow_session = self.SNOW_PARK_HELPER.get_session()
            # snow_session.use_database('PRD_SALES_DM_DB')
            # snow_session.use_schema('SALES_DM_BR')

            # IN TRANSIT CHANGED ON 15th JUNE (We have removed the filter on the billing type coming
            # from primary sales. Earlier we had a filter for only ZOR billing type. As we noticed a
            # few return type documents were not being taken into account, we removed this filter.)
            # Further changed on 14th July 2024, to consider both Botree and SFDC data for in-transit
            # Further changed on 22nd July 2024, SOPE-2127
            SQL = f"""
            SELECT * FROM PRD_SALES_DM_DB.SALES_DM_CORE.STOCK_IN_TRANSIT where Distr_code = '{customer}';
            """
            transit_stock = snow_session.sql(SQL)
            transit_stock = transit_stock.toPandas()

            merged_df = material_df.merge(
                transit_stock, left_on="SKU", right_on="PARENT_SKU_CODE", how="inner"
            )
            merged_df.pop("PARENT_SKU_CODE")
            merged_df.pop("DISTR_CODE")

            json_out = merged_df.to_json(orient="records")
            json_object = json.loads(json_out)

            self.SNOW_PARK_HELPER.close_session(snow_session)
            logger.info("Response", json_object)
            return json_object
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def fetch_in_hand(self, customer, sku_list, doctype):
        try:
            material_df = pd.DataFrame(sku_list, columns=["SKU"])
            material_df["customer"] = customer

            snow_session = self.SNOW_PARK_HELPER.get_session()

            if doctype == "ZLIQ":
                doctype_condition = "AND PRODBATCHCODE LIKE '%LIQ'"
            else:
                doctype_condition = "AND PRODBATCHCODE NOT LIKE '%LIQ'"

            sql = f"""
                SELECT
                    REPLACE(
                        LTRIM(REPLACE(CAST(DISTRCODE AS VARCHAR(20)),'0',' ')),' ','0'
                    ) AS Distr_Code,
                    P_MATERIAL AS Parent_SKU_Code,
                    SUM(
                        ((SALEABLEQTY/REPLACE(uom.uomconversionfactor, 0, 1))-(RESVSALEQTY/REPLACE(uom.uomconversionfactor, 0, 1)))
                        +((OFFERQTY/REPLACE(uom.uomconversionfactor, 0, 1))-(RESVOFFERQTY/REPLACE(uom.uomconversionfactor, 0, 1)))
                    ) AS QTY,
                    CLOSING_STOCKS_DATE AS SIH_CLOSING_STOCK_DATE
                FROM 
                    PRD_SALES_DM_DB.SALES_DM_BR.CLOSING_STOCKS_HIST_STAGING soh
                LEFT JOIN 
                    PRD_SFDC_DB.SFDC_CORE.PRODUCTMASTER pm ON
                        soh.prodcode = pm.sku_code
                LEFT JOIN 
                    PRD_SFDC_DB.SFDC_CORE.PRODUCT_UOM_MASTER uom ON
                        pm.sku_code = uom.productcode and uom.uomcode = 'CV'
                LEFT JOIN 
                    PRD_SAPS4_DB.SAPS4_CORE.PRODUCTMASTER_PSKU pro_mas_psku_sku ON
                        pro_mas_psku_sku.c_material = soh.prodcode
                WHERE 
                    Distr_code = '{customer}'
                    {doctype_condition}
                    AND CLOSING_STOCKS_DATE = (
                        SELECT 
                            max(closing_stocks_date)
                        FROM
                            PRD_SALES_DM_DB.SALES_DM_BR.CLOSING_STOCKS_HIST_STAGING
                    )
                GROUP BY
                    ALL
                """

            in_hand_stock = snow_session.sql(sql)
            in_hand_stock = in_hand_stock.toPandas()

            merged_df = material_df.merge(
                in_hand_stock,
                left_on="SKU",
                right_on="PARENT_SKU_CODE",
                how="inner",
                validate="one_to_one",
            )
            merged_df.pop("PARENT_SKU_CODE")
            merged_df.pop("DISTR_CODE")

            json_out = merged_df.to_json(orient="records")
            json_object = json.loads(json_out)

            self.SNOW_PARK_HELPER.close_session(snow_session)
            logger.info("Response", json_object)
            return json_object
        except Exception as e:
            logger.exception(e)
            return None

    def fetch_open(self, customer, sku_list, doctype):
        try:
            material_df = pd.DataFrame(sku_list, columns=["SKU"])
            material_df["customer"] = customer

            snow_session = self.SNOW_PARK_HELPER.get_session()
            # snow_session.use_database('PRD_SAPS4_DB')
            # snow_session.use_schema('SAPS4_CORE')

            SQL = f"""
                SELECT * FROM PRD_SALES_DM_DB.SALES_DM_CORE.OPEN_ORDDER_ARS 
                where Distr_code = '{customer}';
                """
            open_stock = snow_session.sql(SQL)
            open_stock = open_stock.toPandas()

            merged_df = material_df.merge(
                open_stock,
                left_on="SKU",
                right_on="PARENT_SKU_CODE",
                how="inner",
                validate="one_to_one",
            )
            merged_df.pop("PARENT_SKU_CODE")
            merged_df.pop("DISTR_CODE")

            json_out = merged_df.to_json(orient="records")
            json_object = json.loads(json_out)

            self.SNOW_PARK_HELPER.close_session(snow_session)
            logger.info("Response", json_object)
            return json_object
        except Exception as e:
            logger.exception(e)
            return None

    def get_mtd(self, psku_customer, doctype, mtdTillToday=0):
        try:
            snow_session = self.SNOW_PARK_HELPER.get_session()
            snow_session.use_database("PRD_SALES_DM_DB")
            snow_session.use_schema("SALES_DM_BR")

            first_day_of_month = date.today().replace(day=1)
            current_date = date.today() - timedelta(days=mtdTillToday)
            formatted_first_day = first_day_of_month.strftime("%Y-%m-%d")
            formatted_current_date = current_date.strftime("%Y-%m-%d")

            if doctype == "ZLIQ":
                billing_type = "BILLING_TYPE LIKE '%LIQ'"
            else:
                billing_type = "BILLING_TYPE NOT LIKE '%LIQ'"

            sql = f"""
                with json_data as (
                    select
                        parse_json(
                        '{json.dumps(psku_customer)}'
                        ) as data
                ),
                dataset as (
                    select
                        value:sku::string as sku,
                        value:customer::string as customer
                    from 
                        json_data,
                        lateral flatten(input => json_data.data)
                )
                select 
                    sold_to_party as "CUSTOMER",
                    PARENT_SKU,
                    sum(BILLINGQUANTITY) AS "MTD"
                from
                    PRD_SALES_DM_DB.SALES_DM_BR.PRIMARY_SALES_FACT_TCPL_IND
                    inner join dataset on
                        sold_to_party = customer
                        and parent_sku = sku
                    where
                        billing_date between '{formatted_first_day}' and '{formatted_current_date}'
                    and LTRIM(sales_area,6) != '1010-40' 
                    AND {billing_type}
                group by
                    sold_to_party, PARENT_SKU;
                """
            mtd = snow_session.sql(sql)
            mtd = mtd.toPandas()

            json_out = mtd.to_json(orient="records")
            json_object = json.loads(json_out)

            self.SNOW_PARK_HELPER.close_session(snow_session)
            logger.info("Response", json_object)
            return json_object
        except Exception as e:
            logger.exception(e)
            return None

    def fetch_time(self):
        try:
            sql = """
            with sih_time as (
                SELECT MAX(closing_stocks_date)::text AS STOCK_IN_HAND FROM PRD_SALES_DM_DB.SALES_DM_BR.CLOSING_STOCKS_HIST_STAGING
            )
            , OO_TIME AS (
                SELECT max(last_modified_dt)::text AS OPEN_ORDER FROM PRD_SALES_DM_DB.SALES_DM_CORE.OPEN_ORDDER_ARS
            )
            , SIT_TIME AS (
                SELECT max(last_modified_dt)::text AS STOCK_IN_TRANSIT FROM PRD_SALES_DM_DB.SALES_DM_CORE.STOCK_IN_TRANSIT
            )
            SELECT * FROM SIH_TIME, OO_TIME, SIT_TIME;
            """

            snow_session = self.SNOW_PARK_HELPER.get_session()
            time_response = snow_session.sql(sql)
            time_response_df = time_response.toPandas()
            json_out = time_response_df.to_json(orient="records")
            json_object = json.loads(json_out)
            return json_object[0] if len(json_object) > 0 else None
        except Exception as e:
            logger.exception(e)
            return None

    def fetch_table_status(self, table_dict: dict = ESSENTIAL_DATALAKE_TABLES):
        """
        Description: This function finds the total row counts of multiple tables
        """
        try:
            table_template = """ ( SELECT COUNT(*) FROM TABLE ) AS "ALIAS" """
            table_list = []
            for category, tables in table_dict.items():
                for table in tables:
                    table_statement = table_template.replace("TABLE", table).replace(
                        "ALIAS", table
                    )
                    table_list.append(table_statement)

            sql = f"""
                SELECT
                {", ".join(table_list)}
                """

            snow_session = self.SNOW_PARK_HELPER.get_session()
            response = snow_session.sql(sql)
            response_df = response.toPandas()
            json_out = response_df.to_json(orient="records")
            json_object = json.loads(json_out)
            return json_object[0] if len(json_object) else None
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def fetch_holding(self, customer: str, doctype: str):
        try:
            if doctype == "ZLIQ":
                doctype_condition = "AND PRODBATCHCODE LIKE '%LIQ'"
            else:
                doctype_condition = "AND PRODBATCHCODE NOT LIKE '%LIQ'"

            sql = f"""
            WITH SIH AS (
                SELECT
                    REPLACE(
                        LTRIM(REPLACE(CAST(DISTRCODE AS VARCHAR(20)),'0',' ')),' ','0'
                    ) AS Distr_Code,
                    P_MATERIAL AS Parent_SKU_Code,
                    SUM(
                        ((SALEABLEQTY/REPLACE(uom.uomconversionfactor, 0, 1))-(RESVSALEQTY/REPLACE(uom.uomconversionfactor, 0, 1)))
                        +((OFFERQTY/REPLACE(uom.uomconversionfactor, 0, 1))-(RESVOFFERQTY/REPLACE(uom.uomconversionfactor, 0, 1)))
                    ) AS QTY,
                    CLOSING_STOCKS_DATE AS SIH_CLOSING_STOCK_DATE
                FROM 
                    PRD_SALES_DM_DB.SALES_DM_BR.CLOSING_STOCKS_HIST_STAGING soh
                LEFT JOIN 
                    PRD_SFDC_DB.SFDC_CORE.PRODUCTMASTER pm ON
                        soh.prodcode = pm.sku_code
                LEFT JOIN 
                    PRD_SFDC_DB.SFDC_CORE.PRODUCT_UOM_MASTER uom ON
                        pm.sku_code = uom.productcode and uom.uomcode = 'CV'
                LEFT JOIN 
                    PRD_SAPS4_DB.SAPS4_CORE.PRODUCTMASTER_PSKU pro_mas_psku_sku ON
                        pro_mas_psku_sku.c_material = soh.prodcode
                WHERE 
                    Distr_code = '{customer}'
                    {doctype_condition}
                    AND CLOSING_STOCKS_DATE = (
                        SELECT 
                            max(closing_stocks_date)
                        FROM
                            PRD_SALES_DM_DB.SALES_DM_BR.CLOSING_STOCKS_HIST_STAGING
                    )
                GROUP BY
                    ALL
            ),
            sit AS (
                SELECT
                    *
                FROM
                    PRD_SALES_DM_DB.SALES_DM_CORE.STOCK_IN_TRANSIT
                WHERE
                    Distr_code = '{customer}'
            ),
            oo AS (
                SELECT
                    *
                FROM
                    PRD_SALES_DM_DB.SALES_DM_CORE.OPEN_ORDDER_ARS
                WHERE
                    Distr_code = '{customer}'
            )
            SELECT 
                COALESCE(
                    SIH.Distr_Code,
                    oo.distr_code,
                    sit.distr_code
                ) AS distr_code,
                COALESCE(
                    sih.Parent_SKU_Code,
                    oo.parent_sku_code,
                    sit.parent_sku_code
                ) AS parent_sku_code,
                sih.qty AS sih_qty,
                sit.qty AS sit_qty,
                oo.qty AS oo_qty,
                sit.units AS sit_units,
                oo.units AS oo_units,
                sih.sih_closing_stock_date::text as sih_closing_stock_date,
                sit.last_modified_dt::text as sit_update_time,
                oo.last_modified_dt::text as oo_update_time
            FROM
                sih
            FULL OUTER JOIN sit ON
                sit.distr_code = sih.distr_code
                AND sit.parent_sku_code = sih.parent_sku_code
            FULL OUTER JOIN oo ON
                (
                    oo.distr_code = sih.distr_code
                        AND oo.parent_sku_code = sih.parent_sku_code
                )
                OR (
                    oo.distr_code = sit.distr_code
                        AND oo.parent_sku_code = sit.parent_sku_code
                )
            WHERE
                (
                    sit.qty IS NOT NULL
                    OR oo.qty IS NOT NULL
                    OR sih.qty IS NOT NULL
                )
                and coalesce(
                    sih.Parent_SKU_Code,
                    oo.parent_sku_code ,
                    sit.parent_sku_code
                ) is not null;
            """

            snow_session = self.SNOW_PARK_HELPER.get_session()
            holding_response = snow_session.sql(sql)
            holding_df = holding_response.toPandas()
            return holding_df
        except Exception as e:
            logger.exception(e)
            return None
        finally:
            # self.SNOW_PARK_HELPER.close_session(snow_session)
            pass
