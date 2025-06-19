"""
Module for the ArsModel class which fetches area codes from a database.
"""

from datetime import datetime
from typing import List

import numpy as np
import pandas as pd
import psycopg2
from dateutil.relativedelta import relativedelta
from sqlalchemy import Table, MetaData
from sqlalchemy.dialects.postgresql import insert

import src.libs.helpers as Helpers
from src.config.constants import CUSTOMER_GROUPS_FOR_ARS
from src.enums.forecast_dump_method import ForecastDumpMethod
from src.libs.database_helper import DatabaseHelper
from src.libs.loggers import Logger, log_decorator

logger = Logger("ArsModel")


class ArsModel:
    """
    A class used to represent the ArsModel which interacts with the database.
    """

    DB_HELPER = None

    def __init__(self):
        self.DB_HELPER = DatabaseHelper()

    def all_area_codes(self):
        """
        Fetches all area codes from Pegasus database.

        Returns:
            list: A list of tuples representing area codes. Returns None if an exception occurs.
        """
        query_string = (
            "SELECT * FROM area_codes WHERE ars_applicable = TRUE ORDER BY code;"
        )
        try:
            with self.DB_HELPER.get_connection() as conn:
                cur = conn.cursor()
                cur.execute(query_string)
                rows = cur.fetchall()

                rows = [row[0] for row in rows if row[0]]
            return rows
        except psycopg2.DatabaseError as db_err:
            print("Database error occurred: ", db_err)
            return None
        except psycopg2.OperationalError as op_err:
            print("Operational error occurred: ", op_err)
            return None
        except Exception as exc:
            print("Exception: ", exc)
            return None

    def phasing(self, data, code: str, phasing_for_month: str = None) -> bool:
        """
        Phases the data based on the week number and percentage of sales.

        Args:
            data (list): The data to be phased.
            code (str): The area code.
            phasing_for_month(str | None): The applicable_month

        Returns:
            bool: True if successful, False otherwise.
        """
        today = (
            Helpers.previous_forecast_month(phasing_for_month, "date")
            if phasing_for_month is not None
            else datetime.today()
        )
        next_month = today + relativedelta(months=1)
        applicable_month = next_month.strftime("%Y%m")

        # Initialize week and fortnight variables
        week = [0, 0, 0, 0]
        fortnight = [0, 0]

        try:
            for d in data:
                week_num = d["WEEK_NUM"]
                if week_num in range(1, 5):
                    if d["PERCENTAGE_OF_SALES"] is not None:
                        week[week_num - 1] = round(d["PERCENTAGE_OF_SALES"], 2)

            if all(item is not None for item in week[:2]):
                fortnight[0] = round(sum(week[:2]), 2)
            if all(item is not None for item in week[2:]):
                fortnight[1] = round(sum(week[2:]), 2)

            print(week, fortnight)

            upsert_sql = """
            INSERT INTO public.forecast_configurations (
                area_code,
                applicable_month, 
                weekly_week1, 
                weekly_week2,
                weekly_week3,
                weekly_week4,
                fortnightly_week12,
                fortnightly_week34,
                updated_by,
                customer_group)
            VALUES  ( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s )
            ON CONFLICT (area_code, applicable_month, customer_group)
            DO UPDATE 
            SET 
                weekly_week1=EXCLUDED.weekly_week1,
                weekly_week2=EXCLUDED.weekly_week2,
                weekly_week3=EXCLUDED.weekly_week3,
                weekly_week4=EXCLUDED.weekly_week4,
                fortnightly_week12=EXCLUDED.fortnightly_week12,
                fortnightly_week34=EXCLUDED.fortnightly_week34,
                created_on=EXCLUDED.created_on,
                updated_on=EXCLUDED.updated_on,
                is_deleted=EXCLUDED.is_deleted,
                updated_by=EXCLUDED.updated_by;
            """

            with self.DB_HELPER.get_connection() as conn:
                cur = conn.cursor()
                cur.execute(
                    upsert_sql,
                    (
                        code,
                        applicable_month,
                        *week,
                        *fortnight,
                        "PORTAL_MANAGED",
                        data[0]["CUSTOMERGROUP"],
                    ),
                )
                conn.commit()

            print(f" ==== PHASING FOR CODE: {code} SUCCESSFUL ====")

            return True
        except Exception as err:
            print(f"!!!EXCEPTION: ArsModel -> phasing: AREA: {code}: {err}")
            return False

    @log_decorator
    def uniform_forecast_phasing(self, applicable_month, w1, w2, w3, w4, f12, f34):
        try:
            # TODO: Accept user_id through bearer token and save it in update_by column
            sql = f"""
            INSERT
                INTO
                public.forecast_configurations
            (
                    area_code,
                    applicable_month,
                    weekly_week1,
                    weekly_week2,
                    weekly_week3,
                    weekly_week4,
                    fortnightly_week12,
                    fortnightly_week34,
                    updated_by,
                    customer_group
                )
            SELECT
                src.area_code,
                %s AS applicable_month,
                %s as weekly_week1,
                %s as weekly_week2,
                %s as weekly_week3,
                %s as weekly_week4,
                %s as fortnightly_week12,
                %s as fortnightly_week34,
                'PORTAL_MANAGED',
                src.customer_group
            FROM
                (
                    SELECT
                        code AS area_code,
                        cgm.name AS customer_group
                    FROM
                        area_codes ac
                    CROSS JOIN customer_group_master cgm
                    WHERE
                        cgm.name IN ( {",".join([f"'{customer_group}'" for customer_group in CUSTOMER_GROUPS_FOR_ARS])} )
                        AND ac.ars_applicable = TRUE
                ) AS src
            ON
                CONFLICT (
                    area_code,
                    applicable_month,
                    customer_group
                )
                DO
            UPDATE
            SET
                weekly_week1 = EXCLUDED.weekly_week1,
                weekly_week2 = EXCLUDED.weekly_week2,
                weekly_week3 = EXCLUDED.weekly_week3,
                weekly_week4 = EXCLUDED.weekly_week4,
                fortnightly_week12 = EXCLUDED.fortnightly_week12,
                fortnightly_week34 = EXCLUDED.fortnightly_week34,
                updated_on = now(),
                updated_by = EXCLUDED.updated_by;
            """
            with self.DB_HELPER.get_connection() as conn:
                cur = conn.cursor()
                cur.execute(
                    sql,
                    (
                        applicable_month,
                        w1,
                        w2,
                        w3,
                        w4,
                        f12,
                        f34,
                    ),
                )
                conn.commit()

            return True
        except Exception as e:
            logger.exception(e)
            return None

    def forecast_sync_status(
        self,
        area: str,
        status: bool,
        count: int,
        message: str,
        start_month: str = None,
        end_month: str = None,
        sync_type: str = None,
        forecast_dump_method: str = None,
    ) -> bool:
        """
        Inserts the forecast sync status into the database.

        Args:
            area (str): The area code.
            status (bool): The status of the forecast sync.
            count (int): The count of the forecast sync.
            message (str): The message of the forecast sync.

        Returns:
            bool: True if successful, False otherwise.
        """
        query_string = """
        INSERT INTO forecast_sync_status
        (area_code, status, date, count, message, start_month, end_month, sync_type, forecast_dump_method) 
        VALUES (%s, %s, now(), %s, %s, %s, %s, %s, %s);
        """
        try:
            with self.DB_HELPER.get_connection() as conn:
                cur = conn.cursor()
                cur.execute(
                    query_string,
                    (
                        area,
                        status,
                        count,
                        message,
                        start_month,
                        end_month,
                        sync_type,
                        forecast_dump_method,
                    ),
                )
                conn.commit()
            return True
        except Exception as err:
            print(f"!!!EXCEPTION: ArsModel -> forecast_sync_status: {err}")
            return False

    def monthly_sales(self, df_sales, code: str):
        """
        Inserts monthly sales df_sales into the database.

        Args:
            df_sales (list): The data to be inserted.
            code (str): The area code.

        Returns:
            None
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df_sales = df_sales.replace(np.nan, 0)
            # df_sales.to_sql(
            #     name="monthly_sales", con=engine, if_exists="append", index=False
            # )

            metadata = MetaData()
            monthly_sales_table = Table("monthly_sales", metadata, autoload_with=engine)
            with engine.begin() as conn:
                for row in df_sales.to_dict(orient="records"):
                    stmt = insert(monthly_sales_table).values(**row)
                    upsert_stmt = stmt.on_conflict_do_update(
                        index_elements=[
                            "key"
                        ],  # or the appropriate unique constraint columns
                        set_={
                            col: stmt.excluded[col]
                            for col in row.keys()
                            if col != "key"
                        },
                    )
                    conn.execute(upsert_stmt)

            total_records = len(df_sales.index)
            self.forecast_sync_status(
                code,
                True,
                total_records,
                "Updated monthly_sales",
                sync_type="MONTHLY_SALES",
            )

            print(
                "=========== MONTHLY SALES INSERT SUCCESSFUL FOR CODE: ",
                code,
                " ============",
            )
            return True
        except Exception as err:
            status_error = f"Failed to update monthly_sales - {err}"
            self.forecast_sync_status(
                code, False, 0, status_error, sync_type="MONTHLY_SALES"
            )
            print(f"===========   ERROR   ============{err}")
            return False

    def sales_allocation(
        self,
        df_allocation,
        code: str,
        sales_months: List[str],
        forecast_dump_method: ForecastDumpMethod,
    ):
        """
        Inserts sales allocation data into the database.

        Args:
            df_allocation (dataframe): The data to be inserted.
            code (str): The area code.

        Returns:
            None
        """

        try:
            # now = datetime.now()
            engine = self.DB_HELPER.get_engine()

            df_allocation = df_allocation.replace(np.nan, 0)
            # df_allocation.to_sql(
            #     name="sales_allocation", con=engine, if_exists="append", index=False
            # )

            # Use SQLAlchemy for upsert
            metadata = MetaData()
            sales_allocation_table = Table(
                "sales_allocation", metadata, autoload_with=engine
            )

            with engine.begin() as conn:
                for row in df_allocation.to_dict(orient="records"):
                    stmt = insert(sales_allocation_table).values(**row)
                    # Adjust the conflict columns and update columns as per your table schema
                    upsert_stmt = stmt.on_conflict_do_update(
                        index_elements=[
                            "key"
                        ],  # or the appropriate unique constraint columns
                        set_={
                            col: stmt.excluded[col]
                            for col in row.keys()
                            if col != "key"
                        },
                    )
                    conn.execute(upsert_stmt)

            total_records = len(df_allocation.index)
            self.forecast_sync_status(
                code,
                True,
                total_records,
                "Updated sales_allocation",
                start_month=f"{sales_months[0]}-01",
                end_month=f"{sales_months[1]}-01",
                forecast_dump_method=forecast_dump_method,
                sync_type="SALES_ALLOCATION",
            )

            print(
                "===========   SALES ALLOCATION INSERT SUCCESSFUL FOR CODE: ",
                code,
                "   ============",
            )
            return True
        except Exception as err:
            status_error = f"Failed to update sales_allocation - {err}"
            self.forecast_sync_status(
                code,
                False,
                0,
                status_error,
                start_month=f"{sales_months[0]}-01",
                end_month=f"{sales_months[1]}-01",
                forecast_dump_method=forecast_dump_method,
                sync_type="SALES_ALLOCATION",
            )
            print(f"===========   ERROR   ============{err}")
            return False

    @log_decorator
    def db_list_for_aos_warehouse_payload(self, distributor_codes: List[str] = None):
        try:
            if distributor_codes and len(distributor_codes) > 0:
                db_filter = "AND dm.id IN ({})".format(
                    ", ".join(f"'{code}'" for code in distributor_codes)
                )
            else:
                db_filter = ""
            sql = f"""
                    SELECT
                        dm.id,
                        dm.enable_pdp,
                        cgm.name as cg,
                        gm.id::TEXT as region_id,
                        array_agg(distinct dp.division) as divisions
                    FROM
                        distributor_master dm
                    INNER JOIN customer_group_master cgm ON
                        cgm.id = dm.group_id
                    INNER JOIN group5_master gm ON
                        gm.id = dm.group5_id
                    INNER JOIN ars_configurations ac ON
                        ac.customer_group_id = cgm.id
                        AND gm.id = ac.region_id
                    INNER JOIN distributor_plants dp on 
                        dp.distributor_id = dm.id
                    WHERE
                        dm.ao_enable = TRUE
                        and dm.aos_enable = TRUE
                        AND ac."configuration" = 'SWITCH'
                        AND ac.auto_order = TRUE
                        AND ac.auto_order_submit = TRUE
                        AND dp.distribution_channel = 10
                        {db_filter}
                    GROUP BY
                        dm.id,
                        dm.enable_pdp,
                        cgm.name,
                        gm.id;
                    """
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def db_list_for_aos_submit(self, distributor_codes: List[str]):
        # TODO: need to add a status column in the table and filter "PENDING" records only
        if distributor_codes and len(distributor_codes) > 0:
            db_filter = "AND dm.id IN ({})".format(
                ", ".join(f"'{code}'" for code in distributor_codes)
            )
        else:
            db_filter = ""
        sql = f"""
            SELECT
                aw.id,
                aw.distributor_code,
                dm.group5_id,
                pdp ->> 'applicable_divisions' AS applicable_divisions,
                order_payload
            FROM
                audit.aos_workflow aw
            INNER JOIN distributor_master dm ON dm.id = aw.distributor_code 
            WHERE
                order_date = current_date
                AND order_payload IS NOT NULL 
                AND pdp ->> 'applicable_divisions' IS NOT NULL 
                AND sap_submit_response IS NULL
                {db_filter};
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def app_settings(self, keys: List[str] = None):
        try:
            sql_statement = "SELECT key, value FROM app_level_settings"
            if keys:
                sql_statement += (
                    f""" WHERE key IN ({', '.join([f"'{key}'" for key in keys])}) """
                )
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql_statement, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def forecasted_psku(
        self,
        distributor_code: str,
        divisions: List,
        applicable_month: str = ((datetime.now()).strftime("%Y%m")),
    ):
        if len(divisions) == 0:
            return None

        sql = f"""
                SELECT
                    fd.psku,
                    mm.description,
                    mm.sales_unit,
                    mm.pak_code,
                    mm.pak_type ,
                    mm.appl_area_channel ,
                    mm.ton_to_suom AS ton_to_cv,
                    fd.division,
                    '0' AS qty
                FROM
                    public.forecast_distribution fd
                INNER JOIN material_master mm ON
                    mm.code = fd.psku
                WHERE
                    applicable_month = '{applicable_month}'
                    AND distributor_code = '{distributor_code}'
                    AND division IN ({', '.join([f"'{division}'" for division in divisions])});
            """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def previous_month_updated_forecast(self, area_code: str, forecast_month: str):
        sql = f"""
            WITH latest AS (
                SELECT
                    asm_code,
                    max(created_on) AS created_on
                FROM
                    sales_allocation
                WHERE
                    forecast_month = '{forecast_month}'
                    AND asm_code = '{area_code}'
                GROUP BY
                    asm_code
            )
            SELECT
                sa.sold_to_party as "SOLD_TO_PARTY",
                sa.parent_sku AS "PARENT_SKU",
                (COALESCE(usa.updated_allocation,sa.by_allocation) / COALESCE (NULLIF (sa.forecast_qty, 0), 1) *100) AS contribution
            FROM
                sales_allocation sa
            INNER JOIN latest l ON
                l.created_on = sa.created_on
                AND l.asm_code = sa.asm_code
            LEFT JOIN updated_sales_allocation usa ON
                usa.sales_allocation_key = sa."key"
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def material_conversion_factors(self):
        sql = """
        select mm.code, mm.pak_to_cs, mm.buom_to_cs from material_master mm
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def last_sales_allocation_keys(self, area_code):
        sql = f"""
        WITH latest AS (
            SELECT
                max(created_on) AS max_created,
                asm_code
            FROM
                sales_allocation
            WHERE
                asm_code = '{area_code}'
            GROUP BY
                asm_code
        )
        SELECT
            KEY,
            sold_to_party,
            parent_sku,
            created_on
        FROM
            sales_allocation sa
        INNER JOIN latest l ON
            l.max_created = sa.created_on
            AND l.asm_code = sa.asm_code
            AND sa.asm_code = '{area_code}' 
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def last_monthly_sales_keys(self, area_code):
        sql = f"""
        WITH latest AS (
            SELECT
                max(created_on) AS max_created,
                asm_code
            FROM
                monthly_sales
            WHERE
                asm_code = '{area_code}'
            GROUP BY
                asm_code
        )
        SELECT
            KEY,
            sold_to_party,
            parent_sku,
            year_month,
            created_on
        FROM
            monthly_sales ms 
        INNER JOIN latest l ON
            l.max_created =ms.created_on
            AND l.asm_code = ms.asm_code
            AND ms.asm_code = '{area_code}' 
        """
        try:
            engine = self.DB_HELPER.get_engine()
            df = pd.read_sql_query(sql, engine)
            return df
        except Exception as e:
            logger.exception(e)
            return None

    @log_decorator
    def upload_allocation_staging(self, data_df):
        try:
            engine = self.DB_HELPER.get_engine()
            data_df.to_sql(
                name="updated_sales_allocation_staging",
                schema="staging",
                con=engine,
                index=False,
                if_exists="append",
            )
            return True
        except Exception as e:
            logger.exception(e)
            return False
