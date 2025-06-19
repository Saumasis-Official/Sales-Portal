import configparser
import calendar
from calendar import monthrange
import json
import os
import warnings
from datetime import date, datetime, timedelta
from dateutil.relativedelta import *
import numpy as np
import pandas as pd
import missingno as msno
from fastapi import FastAPI, Request, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from snowflake.snowpark import Session, functions as F

app = FastAPI()
security = HTTPBasic()


def snowpark_session_create():
    config = configparser.ConfigParser()
    config.read('.env')

    # cnn = {
    #     "account": os.environ.get('SNOW_PARK_ACCOUNT'),
    #     "user": os.environ.get('SNOW_PARK_USER'),
    #     "password": os.environ.get('SNOW_PARK_PASSWORD'),
    #     "role": os.environ.get('SNOW_PARK_ROLE'),
    #     "warehouse": os.environ.get('SNOW_PARK_WAREHOUSE'),

    # }
    cnn = {
        "account": config.get('SPARK', 'account'),
        "user": config.get('SPARK', 'user'),
        "password": config.get('SPARK', 'pass'),
        "role": config.get('SPARK', 'role'),
        "warehouse": config.get('SPARK', 'warehouse'),
    
    }
    session = Session.builder.configs(cnn).create()
    return session


def categorize(value):
    if value < 85:
        return 'A'
    elif 85 <= value <= 95:
        return 'B'
    else:
        return 'C'


def week_of_month(dt):
    first_day = dt.replace(day=1)
    dom = dt.day
    adjusted_dom = dom + first_day.weekday()
    return int(ceil(adjusted_dom / 7.0))


def assign_week_number(df):
    df['WEEK_NUM'] = (df['BILLING_DATE'].dt.day - 1) // 7 + 1
    # Capping the week number to 4
    df['WEEK_NUM'] = df['WEEK_NUM'].apply(lambda x: 4 if x > 4 else x)
    return df


async def fetchdataallocation(area_id, delta_months):
    d = datetime.today()
    # d_last_month = d - relativedelta(months=1)
    # print(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",d_last_month)
    # currentMonth = f"{d_last_month.month:02d}"
    currentMonth = f"{d.month:02d}"
    currentYear = f"{d.year:02d}"
    date_to_get_forecast = str(currentYear) + str('-') + str(currentMonth) + str('-01')

    date_today = datetime.now()
    date_3_months = date_today + relativedelta(months=-int(delta_months))
    start_year = f"{date_3_months.year:02d}"
    start_month = f"{date_3_months.month:02d}"

    end_year = currentYear
    end_month = currentMonth
    end_date = num_days = monthrange(int(end_year), int(end_month))[1]

    snow_session = snowpark_session_create()
    snow_session.use_database('PRD_SAPS4_DB')
    snow_session.use_schema('SAPS4_CORE')
    cust_master = snow_session.table('CUSTOMERMASTER')

    cust_master = cust_master.select('CUSTOMER', 'DELETIONINDICATOR').filter(F.col("DELETIONINDICATOR") == 'TRUE')
    cust_master_PD = cust_master.toPandas()

    prod_master = snow_session.table('PRODUCT')
    prod_master = prod_master.select('MATNR', 'PRODUCT', 'BASEUNIT', 'WEIGHTUNIT')
    prod_master_PD = prod_master.toPandas()

    snow_session.use_database('PRD_SALES_DM_DB')
    snow_session.use_schema('SALES_DM_BR')
    pri_sales = snow_session.table('PRIMARY_SALES_FACT_TCPL_IND')
    cust_hir = snow_session.table('CUSTOMER_HIERARCHY_TCPL_IND')
    prd_hir = snow_session.table('PRODUCT_HIERARCHY')

    prd_hir = prd_hir.select('P_HIER_LVL7_BRND_VAR', 'P_HIER_LVL6_REG_BRND', 'P_HIER_LVL8_SKU', 'PRD_HIER_LVL8')
    prd_hir_PD = prd_hir.toPandas()
    prd_hir_PD = prd_hir_PD.dropna()

    pri_sales = pri_sales.select('SOLD_TO_PARTY', 'PARENT_SKU', 'PARENT_SKU_DESC', 'BILLINGQUANTITY',
                                 'BILLINGQUANTITYINBASEUNIT', 'BILLING_DATE', 'BILLINGDOCUMENT',
                                 'PRODUCT_HIERARCHY').filter((F.col("BILLING_DATE").between(
        date(int(start_year), int(start_month), 1), date(int(end_year), int(end_month), 1))))

    excluded_sales_area = ['1010-40-12', '1010-40-18', '1010-40-13', '1010-40-10', '1010-40-14', '1010-40-99']
    pri_sales = pri_sales.filter(~F.col("SALES_AREA").isin(excluded_sales_area))

    pri_sales_PD = pri_sales.toPandas()
    # pri_sales_PD.to_csv("pri_sales.csv")
    cust_hir = cust_hir.select('CUSTOMER', 'CUSTOMERNAME', 'ASM_CODE', 'CUSTOMERGROUP').filter(
        (F.col("ASM_CODE") == area_id))
    cust_hir_PD = cust_hir.toPandas()

    remove_for_cust_hir = cust_hir_PD['CUSTOMER'].isin(cust_master_PD['CUSTOMER'])
    cust_hir_PD.drop(cust_hir_PD[remove_for_cust_hir].index, inplace=True)
    remove_for_sales = pri_sales_PD['SOLD_TO_PARTY'].isin(cust_master_PD['CUSTOMER'])
    pri_sales_PD.drop(remove_for_sales[remove_for_sales].index, inplace=True)

    cm_df_clean = cust_hir_PD.dropna()
    cm_df_clean = cust_hir_PD.drop_duplicates()

    new_df = pri_sales_PD.merge(cm_df_clean, left_on='SOLD_TO_PARTY', right_on='CUSTOMER', how='inner')

    area_df = new_df.copy()

    area_df = area_df.dropna()

    SKU_Sales = area_df.groupby(
        ['SOLD_TO_PARTY', 'ASM_CODE', 'PARENT_SKU', 'PARENT_SKU_DESC', 'PRODUCT_HIERARCHY', 'CUSTOMERNAME',
         'CUSTOMERGROUP']).agg({'BILLINGQUANTITYINBASEUNIT': 'sum'}).reset_index()

    SumGroup_df = SKU_Sales.groupby(['ASM_CODE', "PARENT_SKU"]).agg({'BILLINGQUANTITYINBASEUNIT': 'sum'}).add_suffix(
        '_Sum').reset_index()

    Percents_df = pd.merge(SKU_Sales, SumGroup_df)
    Percents_df["%Sales"] = Percents_df["BILLINGQUANTITYINBASEUNIT"] / Percents_df[
        "BILLINGQUANTITYINBASEUNIT_Sum"] * 100

    snow_session.use_database('PRD_BLUEYONDER_DB')
    snow_session.use_schema('BLUEYONDER_CORE')

    now = datetime.now()
    now = date_today + relativedelta(months=+1)
    # now = date_today + relativedelta(months=+0)

    forecast_month = '01-' + str(now.strftime('%b')) + str('-') + str(currentYear[2:4])

    # forecast_month="01-Sep-23"
    Q1 = "select PARENT_SKU, sum(QTY) as QTY, UOM from PRD_BLUEYONDER_DB.BLUEYONDER_CORE.FINAL_FORECAST_PSKU where month ilike '" + str(
        forecast_month) + "' and sub_channel = 'GTDB' and AREA='" + str(
        area_id) + "' and forecast_create_dt_tm =(select max(forecast_create_dt_tm) from PRD_BLUEYONDER_DB.BLUEYONDER_CORE.FINAL_FORECAST_PSKU where month ilike '" + str(
        forecast_month) + "') group by PARENT_SKU, UOM"

    # print(Q1)
    forecast = snow_session.sql(Q1)
    forecast_pd = forecast.toPandas()

    forecast_pd['PARENT_SKU'] = forecast_pd['PARENT_SKU'].apply(str)
    Allocation_df = Percents_df.merge(forecast_pd, left_on='PARENT_SKU', right_on='PARENT_SKU', how='inner')
    Allocation_df['BY_Allocation'] = Allocation_df['%Sales'] * Allocation_df['QTY'] / 100

    FinalTable = Allocation_df.merge(prd_hir_PD, left_on='PRODUCT_HIERARCHY', right_on='PRD_HIER_LVL8', how='left')
    FinalTable = FinalTable.drop_duplicates()

    FINAL_PD = FinalTable.merge(prod_master_PD, how='inner', left_on='PARENT_SKU', right_on='MATNR')
    FinalTable.pop('PRD_HIER_LVL8')
    FINAL_PD.pop('PRD_HIER_LVL8')

    FINAL_CALC_PD = FINAL_PD.copy()

    FINAL_CALC_PD.pop('MATNR')
    FINAL_CALC_PD.pop('PRODUCT')
    FINAL_CALC_PD['forecast_month'] = forecast_month

    FINAL_CALC_PD.rename(columns={'SOLD_TO_PARTY': 'sold_to_party',
                                  'ASM_CODE': 'asm_code',

                                  'PARENT_SKU': 'parent_sku',
                                  'PRODUCT_HIERARCHY': 'product_hierarchy',
                                  'CUSTOMERNAME': 'customername',
                                  'CUSTOMERGROUP': 'customer_group',
                                  'BILLINGQUANTITYINBASEUNIT': 'billingquantityinbaseunit',
                                  'BILLINGQUANTITYINBASEUNIT_Sum': 'billingquantityinbaseunit_sum',
                                  '%Sales': 'percentage_sales',
                                  '3Months Avg': 'total_months_avg',
                                  'QTY': 'forecast_qty',
                                  'UOM': 'forecast_uom',
                                  'BY_Allocation': 'by_allocation',
                                  'PARENT_SKU_DESC': 'parent_desc',
                                  'P_HIER_LVL7_BRND_VAR': 'brand_variant',
                                  'P_HIER_LVL6_REG_BRND': 'regional_brand',
                                  'P_HIER_LVL8_SKU': 'grammage',
                                  'BASEUNIT': 'baseunit',
                                  'WEIGHTUNIT': 'weightunit'}, inplace=True)

    ################################# SETTING CATEGORIZATION
    new_df_cat = FINAL_CALC_PD[['parent_sku', 'billingquantityinbaseunit_sum']]
    removed_duplicates_df = new_df_cat.drop_duplicates()
    monthly_summed_df = removed_duplicates_df.groupby('parent_sku')['billingquantityinbaseunit_sum'].sum()
    monthly_summed_df = monthly_summed_df.reset_index()
    monthly_summed_df.columns = ['parent_sku', 'billingquantityinbaseunit_sum']
    total_sum = monthly_summed_df['billingquantityinbaseunit_sum'].sum()
    total_sales = monthly_summed_df['billingquantityinbaseunit_sum'].sum()
    monthly_summed_df['contribution'] = (monthly_summed_df['billingquantityinbaseunit_sum'] / total_sales) * 100
    monthly_summed_df = monthly_summed_df.sort_values(by='billingquantityinbaseunit_sum', ascending=False)
    monthly_summed_df['cumulative_sum'] = monthly_summed_df['contribution'].cumsum()
    monthly_summed_df['classification'] = '-'
    monthly_summed_df = monthly_summed_df.drop('billingquantityinbaseunit_sum', axis=1)

    ##########################################################

    FINAL_PD_WITH_CATEGORIZATION = FINAL_CALC_PD.merge(monthly_summed_df, how='inner', left_on='parent_sku',
                                                       right_on='parent_sku')
    # FINAL_PD_WITH_CATEGORIZATION.to_csv("FINAL.csv")
    customer_groups = ['31', '10']

    for CG in customer_groups:
        customer_group = CG
        GROUP_DF = fetchdataallocationbygroup(area_id, delta_months, customer_group, FINAL_PD_WITH_CATEGORIZATION)
        # GROUP_DF.to_csv("GROUP.csv")
        merged_df = FINAL_PD_WITH_CATEGORIZATION.merge(
            GROUP_DF,
            left_on=['parent_sku', 'customer_group'],
            right_on=['parent_sku_c', 'customer_group_c'],
            how='left'  # left join to keep all rows from FINAL_PD_WITH_CATEGORIZATION
        )
        merged_df.loc[merged_df['classification_y'].notna(), 'classification_x'] = merged_df['classification_y']
        columns_to_remove = ['parent_sku_c', 'customer_group_c', 'contribution_x', 'cumulative_sum_x']

        FINAL_PD_WITH_CATEGORIZATION = merged_df
        # FINAL_PD_WITH_CATEGORIZATION.to_csv('s.csv')

        # FINAL_PD_WITH_CATEGORIZATION = FINAL_PD_WITH_CATEGORIZATION.drop(columns=columns_to_remove)
        # FINAL_PD_WITH_CATEGORIZATION.to_csv('s.csv')

    FINAL_PD_WITH_CATEGORIZATION['classification'].fillna(FINAL_PD_WITH_CATEGORIZATION['classification_y'],
                                                          inplace=True)
    FINAL_PD_WITH_CATEGORIZATION['contribution'].fillna(FINAL_PD_WITH_CATEGORIZATION['contribution_y'], inplace=True)
    FINAL_PD_WITH_CATEGORIZATION['cumulative_sum'].fillna(FINAL_PD_WITH_CATEGORIZATION['cumulative_sum_y'],
                                                          inplace=True)

    # FINAL_PD_WITH_CATEGORIZATION.to_csv('s.csv')

    final_df = FINAL_PD_WITH_CATEGORIZATION

    # final_df = merged_df.drop(columns=['parent_sku_c', 'customer_group_c', 'classification_y'])
    # final_df = final_df.rename(columns={'classification_x': 'classification'})
    # final_df.to_csv('MG.csv')

    final_df.pop('contribution_x')
    final_df.pop('cumulative_sum_x')
    final_df.pop('classification_x')
    final_df.pop('parent_sku_c_x')
    final_df.pop('customer_group_c_x')
    final_df.pop('contribution_y')
    final_df.pop('cumulative_sum_y')
    final_df.pop('classification_y')
    final_df.pop('parent_sku_c_y')
    final_df.pop('customer_group_c_y')
    final_df.pop('customer_group')

    final_df.rename(columns={'classification': 'category'}, inplace=True)

    json_out = final_df.to_json(orient='records')
    json_object = json.loads(json_out)

    snow_session.close()
    return json_object


async def fetchdatasales(area_id, delta_months):
    d = datetime.today()
    currentMonth = f"{d.month:02d}"
    currentYear = f"{d.year:02d}"
    # d_last_month = d - relativedelta(months=1)
    # currentMonth = f"{d_last_month.month:02d}"

    date_to_get_forecast = str(currentYear) + str('-') + str(currentMonth) + str('-01')

    date_today = datetime.now()
    date_3_months = date_today + relativedelta(months=-int(delta_months))
    start_year = f"{date_3_months.year:02d}"
    start_month = f"{date_3_months.month:02d}"

    end_year = currentYear
    end_month = currentMonth
    end_date = num_days = monthrange(int(end_year), int(end_month))[1]

    # start_month ="06"
    # end_month = "08"
    # print("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", start_month)
    # print("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV", end_month)

    snow_session = snowpark_session_create()

    snow_session.use_database('PRD_SAPS4_DB')
    snow_session.use_schema('SAPS4_CORE')
    cust_master = snow_session.table('CUSTOMERMASTER')

    cust_master = cust_master.select('CUSTOMER', 'DELETIONINDICATOR').filter(F.col("DELETIONINDICATOR") == 'TRUE')
    cust_master_PD = cust_master.toPandas()

    # print("===========================  CUSTOMER MASTER DF [PRD_SAPS4_DB\SAPS4_CORE\CUSTOMERMASTER] ===")
    # print(cust_master_PD.head())

    prod_master = snow_session.table('PRODUCT')
    prod_master = prod_master.select('MATNR', 'PRODUCT', 'BASEUNIT', 'WEIGHTUNIT')
    prod_master_PD = prod_master.toPandas()

    # print("===========================  PRODUCT MASTER DF [PRD_SAPS4_DB\SAPS4_CORE\PRODUCT] ===")
    # print(prod_master_PD.head())

    ################################################################## DISABLED FOR NOW
    # prod_calc = snow_session.table('PRODUCTUNITSOFMEASURE')
    # prod_calc = prod_calc.select('PRODUCT','ALTERNATIVEUNIT','QUANTITYNUMERATOR','QUANTITYDENOMINATOR')
    # prod_calc_PD = prod_calc.toPandas()

    # print("===========================  PRODUCT UNIT OF MEASURE [PRD_SAPS4_DB\SAPS4_CORE\PRODUCTUNITSOFMEASURE] ===")
    # print(prod_calc_PD.head())
    ########################################################################## DISABLED SECTION ENDS

    # prod_calc_PD.to_csv("prod_calc_PD.csv")

    # dups = prod_calc_PD.groupby(prod_calc_PD.columns.tolist()).size().reset_index().rename(columns={0:'count'})
    # print(dups['count'].sum() - dups.shape[0])

    snow_session.use_database('PRD_SALES_DM_DB')
    snow_session.use_schema('SALES_DM_BR')
    pri_sales = snow_session.table('PRIMARY_SALES_FACT_TCPL_IND')
    cust_hir = snow_session.table('CUSTOMER_HIERARCHY_TCPL_IND')
    prd_hir = snow_session.table('PRODUCT_HIERARCHY')

    prd_hir = prd_hir.select('P_HIER_LVL7_BRND_VAR', 'P_HIER_LVL6_REG_BRND', 'P_HIER_LVL8_SKU', 'PRD_HIER_LVL8')
    prd_hir_PD = prd_hir.toPandas()
    prd_hir_PD = prd_hir_PD.dropna()

    # print("===========================  PRODUCT HIERERCHY [PRD_SALES_DM_DB\SALES_DM_BR\PRODUCT_HIERARCHY] ===")
    # print(prd_hir_PD.head())

    pri_sales = pri_sales.select('SOLD_TO_PARTY', 'PARENT_SKU', 'PARENT_SKU_DESC', 'BILLINGQUANTITY',
                                 'BILLINGQUANTITYINBASEUNIT', 'BILLING_DATE', 'BILLINGDOCUMENT',
                                 'PRODUCT_HIERARCHY').filter((F.col("BILLING_DATE").between(
        date(int(start_year), int(start_month), 1), date(int(end_year), int(end_month), 1))))

    excluded_sales_area = ['1010-40-12', '1010-40-18', '1010-40-13', '1010-40-10', '1010-40-14', '1010-40-99']
    pri_sales = pri_sales.filter(~F.col("SALES_AREA").isin(excluded_sales_area))

    pri_sales_PD = pri_sales.toPandas()
    cust_hir = cust_hir.select('CUSTOMER', 'CUSTOMERNAME', 'ASM_CODE').filter((F.col("ASM_CODE") == area_id))
    cust_hir_PD = cust_hir.toPandas()

    # print("===========================  PRINTING PRIMARY SALES DF [PRD_SALES_DM_DB\SALES_DM_BR\PRIMARY_SALES_FACT_TCPL_IND] ===")
    # print(pri_sales_PD.head())

    # print("==========================   PRINTING CUSTOMER HIRERCHY DF [PRD_SALES_DM_DB\SALES_DM_BR\CUSTOMER_HIERARCHY_TCPL_IND] ===")
    # print(cust_hir_PD.head())

    # pri_sales_PD = pri_sales_PD.merge(prod_master_PD, how='inner', left_on='PARENT_SKU', right_on='MATNR')

    remove_for_cust_hir = cust_hir_PD['CUSTOMER'].isin(cust_master_PD['CUSTOMER'])
    cust_hir_PD.drop(cust_hir_PD[remove_for_cust_hir].index, inplace=True)
    remove_for_sales = pri_sales_PD['SOLD_TO_PARTY'].isin(cust_master_PD['CUSTOMER'])
    pri_sales_PD.drop(remove_for_sales[remove_for_sales].index, inplace=True)

    cm_df_clean = cust_hir_PD.dropna()
    cm_df_clean = cust_hir_PD.drop_duplicates()

    new_df = pri_sales_PD.merge(cm_df_clean, left_on='SOLD_TO_PARTY', right_on='CUSTOMER', how='inner')

    # print("==============================  PRINTING MERGED DF (PRI SALES ON CUSTOMER)  =================")
    # print(new_df.head())

    area_df = new_df.copy()

    area_df['YearMonth'] = area_df['BILLING_DATE'].map(lambda x: 100 * x.year + x.month)
    area_df = area_df.dropna()

    SKU_Sales = area_df.groupby(
        ['SOLD_TO_PARTY', 'ASM_CODE', "YearMonth", 'PARENT_SKU', 'PARENT_SKU_DESC', 'PRODUCT_HIERARCHY',
         'CUSTOMERNAME']).agg({'BILLINGQUANTITYINBASEUNIT': 'sum'}).reset_index()

    SumGroup_df = SKU_Sales.groupby(['ASM_CODE', "YearMonth", "PARENT_SKU"]).agg(
        {'BILLINGQUANTITYINBASEUNIT': 'sum'}).add_suffix('_Sum').reset_index()

    Percents_df = pd.merge(SKU_Sales, SumGroup_df)
    Percents_df["%Sales"] = Percents_df["BILLINGQUANTITYINBASEUNIT"] / Percents_df[
        "BILLINGQUANTITYINBASEUNIT_Sum"] * 100

    # Percents_df['3Months Avg'] = Percents_df.groupby(['SOLD_TO_PARTY','PARENT_SKU'])['%Sales'].transform('mean')

    # print("==============================   PRINTING PERCENTAGE DF AFTER CALCULATION ===================")
    # print(Percents_df.head())
    # Percents_df.to_csv("percent.csv")

    snow_session.use_database('PRD_BLUEYONDER_DB')
    snow_session.use_schema('BLUEYONDER_CORE')

    # now = datetime.now()
    # now = date_today + relativedelta(months=+1)
    now = date_today

    # print(FinalTable.info())
    Percents_df = Percents_df.drop_duplicates()
    # FinalTable.to_csv("FinalTable_1.csv")

    Percents_df.rename(columns={'SOLD_TO_PARTY': 'sold_to_party',
                                'ASM_CODE': 'asm_code',
                                'YearMonth': 'yearmonth',
                                'PARENT_SKU': 'parent_sku',
                                'PRODUCT_HIERARCHY': 'product_hierarchy',
                                'CUSTOMERNAME': 'customername',
                                'BILLINGQUANTITYINBASEUNIT': 'billingquantityinbaseunit',
                                'BILLINGQUANTITYINBASEUNIT_Sum': 'billingquantityinbaseunit_sum',
                                '%Sales': 'percentage_sales'}, inplace=True)

    # Percents_df.to_csv("monthly_sales.csv")
    json_out = Percents_df.to_json(orient='records')
    json_object = json.loads(json_out)

    snow_session.close()

    return json_object


def fetchdataallocationbygroup(area_id, delta_months, customer_group, allocationdf):
    # print("================================== ALLOCATION DF BY HEAD =================================",area_id,delta_months,customer_group)
    # print(allocationdf.head())
    # print("============================================ END =========================================")
    d = datetime.today()
    currentMonth = f"{d.month:02d}"
    currentYear = f"{d.year:02d}"
    # d_last_month = d - relativedelta(months=1)
    # currentMonth = f"{d_last_month.month:02d}"

    date_to_get_forecast = str(currentYear) + str('-') + str(currentMonth) + str('-01')

    date_today = datetime.now()
    date_3_months = date_today + relativedelta(months=-int(delta_months))
    start_year = f"{date_3_months.year:02d}"
    start_month = f"{date_3_months.month:02d}"

    end_year = currentYear
    end_month = currentMonth
    end_date = num_days = monthrange(int(end_year), int(end_month))[1]

    # start_month = "06"
    # end_month = "08"
    snow_session = snowpark_session_create()

    snow_session.use_database('PRD_SAPS4_DB')
    snow_session.use_schema('SAPS4_CORE')
    cust_master = snow_session.table('CUSTOMERMASTER')

    cust_master = cust_master.select('CUSTOMER', 'DELETIONINDICATOR').filter(F.col("DELETIONINDICATOR") == 'TRUE')
    cust_master_PD = cust_master.toPandas()

    # print("===========================  CUSTOMER MASTER DF [PRD_SAPS4_DB\SAPS4_CORE\CUSTOMERMASTER] ===")
    # print(cust_master_PD.head())

    prod_master = snow_session.table('PRODUCT')
    prod_master = prod_master.select('MATNR', 'PRODUCT', 'BASEUNIT', 'WEIGHTUNIT')
    prod_master_PD = prod_master.toPandas()

    # print("===========================  PRODUCT MASTER DF [PRD_SAPS4_DB\SAPS4_CORE\PRODUCT] ===")
    # print(prod_master_PD.head())

    ################################################################## DISABLED FOR NOW
    # prod_calc = snow_session.table('PRODUCTUNITSOFMEASURE')
    # prod_calc = prod_calc.select('PRODUCT','ALTERNATIVEUNIT','QUANTITYNUMERATOR','QUANTITYDENOMINATOR')
    # prod_calc_PD = prod_calc.toPandas()

    # print("===========================  PRODUCT UNIT OF MEASURE [PRD_SAPS4_DB\SAPS4_CORE\PRODUCTUNITSOFMEASURE] ===")
    # print(prod_calc_PD.head())
    ########################################################################## DISABLED SECTION ENDS

    # prod_calc_PD.to_csv("prod_calc_PD.csv")

    # dups = prod_calc_PD.groupby(prod_calc_PD.columns.tolist()).size().reset_index().rename(columns={0:'count'})
    # print(dups['count'].sum() - dups.shape[0])

    snow_session.use_database('PRD_SALES_DM_DB')
    snow_session.use_schema('SALES_DM_BR')
    pri_sales = snow_session.table('PRIMARY_SALES_FACT_TCPL_IND')
    cust_hir = snow_session.table('CUSTOMER_HIERARCHY_TCPL_IND')
    prd_hir = snow_session.table('PRODUCT_HIERARCHY')

    prd_hir = prd_hir.select('P_HIER_LVL7_BRND_VAR', 'P_HIER_LVL6_REG_BRND', 'P_HIER_LVL8_SKU', 'PRD_HIER_LVL8')
    prd_hir_PD = prd_hir.toPandas()
    prd_hir_PD = prd_hir_PD.dropna()

    # print("===========================  PRODUCT HIERERCHY [PRD_SALES_DM_DB\SALES_DM_BR\PRODUCT_HIERARCHY] ===")
    # print(prd_hir_PD.head())

    pri_sales = pri_sales.select('SOLD_TO_PARTY', 'PARENT_SKU', 'PARENT_SKU_DESC', 'BILLINGQUANTITY',
                                 'BILLINGQUANTITYINBASEUNIT', 'BILLING_DATE', 'BILLINGDOCUMENT',
                                 'PRODUCT_HIERARCHY').filter((F.col("BILLING_DATE").between(
        date(int(start_year), int(start_month), 1), date(int(end_year), int(end_month), 1))))
    excluded_sales_area = ['1010-40-12', '1010-40-18', '1010-40-13', '1010-40-10', '1010-40-14', '1010-40-99']
    pri_sales = pri_sales.filter(~F.col("SALES_AREA").isin(excluded_sales_area))

    pri_sales_PD = pri_sales.toPandas()
    cust_hir = cust_hir.select('CUSTOMER', 'CUSTOMERNAME', 'ASM_CODE', 'CUSTOMERGROUP').filter(
        (F.col("ASM_CODE") == area_id) & (F.col("CUSTOMERGROUP") == customer_group))
    cust_hir_PD = cust_hir.toPandas()

    # print("===========================  PRINTING PRIMARY SALES DF [PRD_SALES_DM_DB\SALES_DM_BR\PRIMARY_SALES_FACT_TCPL_IND] ===")
    # print(pri_sales_PD.head())

    # print("==========================   PRINTING CUSTOMER HIRERCHY DF [PRD_SALES_DM_DB\SALES_DM_BR\CUSTOMER_HIERARCHY_TCPL_IND] ===")
    # print(cust_hir_PD.head())

    # pri_sales_PD = pri_sales_PD.merge(prod_master_PD, how='inner', left_on='PARENT_SKU', right_on='MATNR')

    remove_for_cust_hir = cust_hir_PD['CUSTOMER'].isin(cust_master_PD['CUSTOMER'])
    cust_hir_PD.drop(cust_hir_PD[remove_for_cust_hir].index, inplace=True)
    remove_for_sales = pri_sales_PD['SOLD_TO_PARTY'].isin(cust_master_PD['CUSTOMER'])
    pri_sales_PD.drop(remove_for_sales[remove_for_sales].index, inplace=True)

    cm_df_clean = cust_hir_PD.dropna()
    cm_df_clean = cust_hir_PD.drop_duplicates()

    new_df = pri_sales_PD.merge(cm_df_clean, left_on='SOLD_TO_PARTY', right_on='CUSTOMER', how='inner')

    # print("==============================  PRINTING MERGED DF (PRI SALES ON CUSTOMER)  =================")
    # print(new_df.head())

    area_df = new_df.copy()

    # area_df['YearMonth'] = area_df['BILLING_DATE'].map(lambda x: 100*x.year + x.month)
    area_df = area_df.dropna()

    SKU_Sales = area_df.groupby(
        ['SOLD_TO_PARTY', 'ASM_CODE', 'PARENT_SKU', 'PARENT_SKU_DESC', 'PRODUCT_HIERARCHY', 'CUSTOMERNAME',
         'CUSTOMERGROUP']).agg({'BILLINGQUANTITYINBASEUNIT': 'sum'}).reset_index()

    SumGroup_df = SKU_Sales.groupby(['ASM_CODE', "PARENT_SKU"]).agg({'BILLINGQUANTITYINBASEUNIT': 'sum'}).add_suffix(
        '_Sum').reset_index()

    Percents_df = pd.merge(SKU_Sales, SumGroup_df)
    Percents_df["%Sales"] = Percents_df["BILLINGQUANTITYINBASEUNIT"] / Percents_df[
        "BILLINGQUANTITYINBASEUNIT_Sum"] * 100

    # Percents_df['3Months Avg'] = Percents_df.groupby(['SOLD_TO_PARTY','PARENT_SKU'])['%Sales'].transform('mean')

    # print("==============================   PRINTING PERCENTAGE DF AFTER CALCULATION ===================")
    # print(Percents_df.head())
    # Percents_df.to_csv("percent.csv")

    FinalTable = Percents_df.merge(prd_hir_PD, left_on='PRODUCT_HIERARCHY', right_on='PRD_HIER_LVL8', how='left')

    # print(FinalTable.info())
    FinalTable = FinalTable.drop_duplicates()
    # FinalTable.to_csv("FinalTable_1.csv")

    FINAL_PD = FinalTable.merge(prod_master_PD, how='inner', left_on='PARENT_SKU', right_on='MATNR')
    # FinalTable['create_date'] = pd.Timestamp.today().strftime('%Y-%m-%d %H:%M:%S')
    FinalTable.pop('PRD_HIER_LVL8')
    FINAL_PD.pop('PRD_HIER_LVL8')

    # FinalTable.to_csv("FinalTable_1.csv")

    # print("======================================== PRINTING FINAL DF =================================")
    # print(FINAL_PD.head())

    ############################################# DISABLED SECTION
    # FINAL_CALC_PD = FINAL_PD.merge(prod_calc_PD, how='inner', left_on='PARENT_SKU', right_on='PRODUCT')
    ############################################# DISABLED SECTION END

    ####################    ADDITIONAL
    FINAL_CALC_PD = FINAL_PD.copy()
    ####################    ADDITIONAL

    FINAL_CALC_PD.pop('MATNR')
    FINAL_CALC_PD.pop('PRODUCT')
    # FINAL_CALC_PD.to_csv("SUB_CAT.csv")

    FINAL_CALC_PD.rename(columns={'SOLD_TO_PARTY': 'sold_to_party',
                                  'ASM_CODE': 'asm_code_c',
                                  'PARENT_SKU': 'parent_sku_c',
                                  'PRODUCT_HIERARCHY': 'product_hierarchy_c',
                                  'CUSTOMERNAME': 'customername_c',
                                  'CUSTOMERGROUP': 'customer_group_c',
                                  'BILLINGQUANTITYINBASEUNIT': 'billingquantityinbaseunit_c',
                                  'BILLINGQUANTITYINBASEUNIT_Sum': 'billingquantityinbaseunit_sum_c',
                                  '%Sales': 'percentage_sales_c',
                                  'P_HIER_LVL7_BRND_VAR': 'brand_variant_c',
                                  'P_HIER_LVL6_REG_BRND': 'regional_brand_c',
                                  'P_HIER_LVL8_SKU': 'grammage_c',
                                  'BASEUNIT': 'baseunit_c',
                                  'WEIGHTUNIT': 'weightunit_c'}, inplace=True)

    removed_duplicates_df = FINAL_CALC_PD.drop_duplicates()

    # print(removed_duplicates_df.head())

    monthly_summed_df = removed_duplicates_df.groupby(['parent_sku_c', 'customer_group_c'])[
        'billingquantityinbaseunit_sum_c'].sum()
    monthly_summed_df = monthly_summed_df.reset_index()
    total_sum = monthly_summed_df['billingquantityinbaseunit_sum_c'].sum()
    total_sales = monthly_summed_df['billingquantityinbaseunit_sum_c'].sum()
    monthly_summed_df['contribution'] = (monthly_summed_df['billingquantityinbaseunit_sum_c'] / total_sales) * 100
    monthly_summed_df = monthly_summed_df.sort_values(by='billingquantityinbaseunit_sum_c', ascending=False)
    monthly_summed_df['cumulative_sum'] = monthly_summed_df['contribution'].cumsum()
    monthly_summed_df['classification'] = monthly_summed_df['cumulative_sum'].apply(categorize)
    monthly_summed_df = monthly_summed_df.drop('billingquantityinbaseunit_sum_c', axis=1)
    monthly_summed_df.to_csv("monthly_summed.csv")

    # print("============================================================== AFTER 31 ==================================================")
    # print(FINAL_CALC_PD.head())
    # print("=================================================================== END ==================================================")

    snow_session.close()

    return monthly_summed_df


async def fetchdataphasing(area_id, delta_months, customer_groups):
    d = datetime.today()
    current_date = datetime.now()

    month_names = {
        1: 'January',
        2: 'February',
        3: 'March',
        4: 'April',
        5: 'May',
        6: 'June',
        7: 'July',
        8: 'August',
        9: 'September',
        10: 'October',
        11: 'November',
        12: 'December'
    }

    group = customer_groups
    area = area_id

    monthly_sales_sum = []
    week_1_sales = []
    week_2_sales = []
    week_3_sales = []
    week_4_sales = []
    sales_percentages = []
    snow_session = snowpark_session_create()
    snow_session.use_database('PRD_SALES_DM_DB')
    snow_session.use_schema('SALES_DM_BR')

    last_three_months = []
    year_a = []

    dr = pd.date_range(end='today', periods=3, freq='M', normalize=True)[::-1]
    for date_ob in dr :
        last_three_months.append(date_ob.strftime("%B"))
        year_a.append(date_ob.strftime("%Y"))
    
    year_ctr = 0
    for m in last_three_months:
        year = year_a[year_ctr]
        dt = datetime.strptime(m, '%B')
        _, last_day = calendar.monthrange(int(year), dt.month)
        week1_start = "1-" + m + "-" + year
        week1_end = "7-" + m + "-" + year
        week2_start = "8-" + m + "-" + year
        week2_end = "14-" + m + "-" + year
        week3_start = "15-" + m + "-" + year
        week3_end = "21-" + m + "-" + year
        week4_start = "22-" + m + "-" + year
        week4_end = str(last_day) + "-" + m + "-" + year
        w1_sales = 0
        w2_sales = 0
        w3_sales = 0
        w4_sales = 0
        total_sales = 0
        week_1 = "select sum(price_after_disc_before_tax) as sales  from PRIMARY_SALES_FACT_TCPL_IND psf left join PRD_SALES_DM_DB.SALES_DM_BR.CUSTOMER_HIERARCHY_TCPL_IND ch on psf.sold_to_party = ch.customer where BILLING_DATE between '" + week1_start + "' and '" + week1_end + "' and ch.asm_code = '" + area + "' and SALES_AREA not like '%1010-40%' and CUSTOMERGROUP in ('" + group + "')"
        week_1_results = snow_session.sql(week_1)
        week_1_PD = week_1_results.toPandas()
        w1_first_element = week_1_PD.iloc[0, 0]
        week_1_sales.append(w1_first_element)
        week_2 = "select sum(price_after_disc_before_tax) from PRIMARY_SALES_FACT_TCPL_IND psf left join " \
                 "PRD_SALES_DM_DB.SALES_DM_BR.CUSTOMER_HIERARCHY_TCPL_IND ch on psf.sold_to_party = " \
                 "ch.customer where BILLING_DATE between '" + week2_start + "' and '" + week2_end + "' " \
                                                                                                    "and ch.asm_code = '" + area + "' and SALES_AREA not like '%1010-40%' and CUSTOMERGROUP in ('" + group + "')"
        week_2_results = snow_session.sql(week_2)
        week_2_PD = week_2_results.toPandas()
        w2_first_element = week_2_PD.iloc[0, 0]
        week_2_sales.append(w2_first_element)

        week_3 = "select sum(price_after_disc_before_tax) from PRIMARY_SALES_FACT_TCPL_IND psf left join " \
                 "PRD_SALES_DM_DB.SALES_DM_BR.CUSTOMER_HIERARCHY_TCPL_IND ch on psf.sold_to_party = " \
                 "ch.customer where BILLING_DATE between '" + week3_start + "' and '" + week3_end + "' " \
                                                                                                    "and ch.asm_code = '" + area + "' and SALES_AREA not like '%1010-40%' and CUSTOMERGROUP in ('" + group + "')"
        week_3_results = snow_session.sql(week_3)
        week_3_PD = week_3_results.toPandas()
        w3_first_element = week_3_PD.iloc[0, 0]
        week_3_sales.append(w3_first_element)

        week_4 = "select sum(price_after_disc_before_tax) from PRIMARY_SALES_FACT_TCPL_IND psf left join " \
                 "PRD_SALES_DM_DB.SALES_DM_BR.CUSTOMER_HIERARCHY_TCPL_IND ch on psf.sold_to_party = " \
                 "ch.customer where BILLING_DATE between '" + week4_start + "' and '" + week4_end + "' " \
                                                                                                    "and ch.asm_code = '" + area + "' and SALES_AREA not like '%1010-40%' and CUSTOMERGROUP in ('" + group + "')"
        week_4_results = snow_session.sql(week_4)
        week_4_PD = week_4_results.toPandas()
        w4_first_element = week_4_PD.iloc[0, 0]
        week_4_sales.append(w4_first_element)

        total_month_Sales = "select sum(price_after_disc_before_tax) from PRIMARY_SALES_FACT_TCPL_IND psf left join " \
                            "PRD_SALES_DM_DB.SALES_DM_BR.CUSTOMER_HIERARCHY_TCPL_IND ch on psf.sold_to_party = " \
                            "ch.customer where BILLING_DATE between '" + week1_start + "' and '" + week4_end + "' " \
                                                                                                               "and ch.asm_code = '" + area + "' and SALES_AREA not like '%1010-40%' and CUSTOMERGROUP in ('" + group + "')"
        monthly_result = snow_session.sql(total_month_Sales)
        monthly_PD = monthly_result.toPandas()
        m_first_element = monthly_PD.iloc[0, 0]
        monthly_sales_sum.append(m_first_element)
        # total_week_1_sales=w1_first_element + w2_first_element + w3_first_element
        # print(">>>>>>>>>>>>>>>>>>>>>>>",year_ctr)
        year_ctr = year_ctr + 1

    if monthly_sales_sum[0] is None:
        monthly_sales_sum[0] = 0
    if monthly_sales_sum[1] is None:
        monthly_sales_sum[1] = 0
    if monthly_sales_sum[2] is None:
        monthly_sales_sum[2] = 0

    if week_1_sales[0] is None:
        week_1_sales[0] = 0
    if week_1_sales[1] is None:
        week_1_sales[1] = 0
    if week_1_sales[2] is None:
        week_1_sales[2] = 0

    if week_2_sales[0] is None:
        week_2_sales[0] = 0
    if week_2_sales[1] is None:
        week_2_sales[1] = 0
    if week_2_sales[2] is None:
        week_2_sales[2] = 0

    if week_3_sales[0] is None:
        week_3_sales[0] = 0
    if week_3_sales[1] is None:
        week_3_sales[1] = 0
    if week_3_sales[2] is None:
        week_3_sales[2] = 0

    if week_4_sales[0] is None:
        week_4_sales[0] = 0
    if week_4_sales[1] is None:
        week_4_sales[1] = 0
    if week_4_sales[2] is None:
        week_4_sales[2] = 0

    monthly_sum = monthly_sales_sum[0] + monthly_sales_sum[1] + monthly_sales_sum[2]
    week_1_sum = week_1_sales[0] + week_1_sales[1] + week_1_sales[2]
    try:
        week_1_perc = round(week_1_sum / monthly_sum * 100, 2)
    except:
        week_1_perc = 0

    week_2_sum = week_2_sales[0] + week_2_sales[1] + week_2_sales[2]

    try:
        week_2_perc = round(week_2_sum / monthly_sum * 100, 2)
    except:
        week_2_perc = 0

    week_3_sum = week_3_sales[0] + week_3_sales[1] + week_3_sales[2]
    try:
        week_3_perc = round(week_3_sum / monthly_sum * 100, 2)
    except:
        week_3_perc = 0

    week_4_sum = week_4_sales[0] + week_4_sales[1] + week_4_sales[2]
    try:
        week_4_perc = round(week_4_sum / monthly_sum * 100, 2)
    except:
        week_4_perc = 0

    fortnightly_week12 = week_1_perc + week_2_perc
    fortnightly_week34 = week_3_perc + week_4_perc

    phasing_df = pd.DataFrame()
    WEEK_NUM=[]
    PERCENTAGE_OF_SALES=[]
    CUSTOMERGROUP=[]

    WEEK_NUM.append(1)
    WEEK_NUM.append(2)
    WEEK_NUM.append(3)
    WEEK_NUM.append(4)

    PERCENTAGE_OF_SALES.append(week_1_perc)
    PERCENTAGE_OF_SALES.append(week_2_perc)
    PERCENTAGE_OF_SALES.append(week_3_perc)
    PERCENTAGE_OF_SALES.append(week_4_perc)

    CUSTOMERGROUP.append(customer_groups)
    CUSTOMERGROUP.append(customer_groups)
    CUSTOMERGROUP.append(customer_groups)
    CUSTOMERGROUP.append(customer_groups)

    phasing_df["WEEK_NUM"] = WEEK_NUM
    phasing_df["PERCENTAGE_OF_SALES"] = PERCENTAGE_OF_SALES
    phasing_df["CUSTOMERGROUP"] = CUSTOMERGROUP

    json_out = phasing_df.to_json(orient='records')
    json_object = json.loads(json_out)

    snow_session.close()
    return json_object


@app.get("/allocation")
async def read_allocation(request: Request, credentials: HTTPBasicCredentials = Depends(security)):
    area_id = request.query_params['area_id']
    delta_months = request.query_params['months']
    if delta_months == "":
        delta_months = 3

    config = configparser.ConfigParser()
    config.read('.env')
    uid = os.environ.get('DATALAKE_UID')
    pas = os.environ.get('DATALAKE_PASSWORD')
    # uid = config.get('SPARK', 'uid')
    # pas = config.get('SPARK', 'pas')
    if credentials.username == uid and credentials.password == pas:
        response = await fetchdataallocation(area_id, delta_months)
    else:
        response = "Not authenticated"
    return response


@app.get("/sales")
async def read_sales(request: Request, credentials: HTTPBasicCredentials = Depends(security)):
    area_id = request.query_params['area_id']
    delta_months = request.query_params['months']
    if delta_months == "":
        delta_months = 3

    config = configparser.ConfigParser()
    config.read('.env')
    uid = os.environ.get('DATALAKE_UID')
    pas = os.environ.get('DATALAKE_PASSWORD')
    if credentials.username == uid and credentials.password == pas:
        response = await fetchdatasales(area_id, delta_months)
    else:
        response = "Not authenticated"
    return response


@app.get("/phasing")
async def read_phasing(request: Request, credentials: HTTPBasicCredentials = Depends(security)):
    area_id = request.query_params['area_id']
    customer_groups = request.query_params['customer_group']
    delta_months = request.query_params['months']
    if delta_months == "":
        delta_months = 3

    config = configparser.ConfigParser()
    config.read('.env')
    uid = config.get('SPARK','uid')
    pas = config.get('SPARK','pas')
    if credentials.username == uid and credentials.password == pas:
        response = await fetchdataphasing(area_id, delta_months, customer_groups)
    else:
        response = "Not authenticated"
    return response


