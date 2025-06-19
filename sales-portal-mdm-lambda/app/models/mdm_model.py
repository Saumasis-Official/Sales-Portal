import pandas as pd
import json
from typing import List

from lib.database_helper import DatabaseHelper
from lib.Filters import Filters

db_helper = DatabaseHelper()

def mdm_data(data: Filters):
    print("data", data)
    sql_statement: str = '''
        select
            psku::text,
            psku_desc,
            sku::text,
            sku_desc,
            division,
            article_id,
            article_desc,
            plant_code::text,
            site_code,
            customer_code::text,
            customer_name,
            vendor_code::text,
            region,
            status,
            vendor_name,
            mrp::text,
            caselot::text
        from
            mdm_material_data
        '''
    limit_statement: str = f' limit {data.limit}' if data.limit else ''
    offset_statement: str = f' offset {data.offset}' if data.offset else ''
    where_condition: List[str] = []
    where_condition_values = [] 

    if data.customer_name:
        where_condition.append("customer_name ilike %s")
        where_condition_values.append(f"%{data.customer_name}%")
    # if data.customer_codes:
    #     where_condition.append("customer_code in %s")
    #     where_condition_values.append(data.customer_codes)
    # if data.plant_codes:
    #     where_condition.append("plant_code in %s")
    #     where_condition_values.append(data.plant_codes)
    # if data.vendor_codes:
    #     where_condition.append("vendor_code in %s")
    #     where_condition_values.append(data.vendor_codes)
    # if data.psku:
    #     where_condition.append("psku in %s")
    #     where_condition_values.append(data.psku)
    # if data.sku:
    #     where_condition.append("sku in %s")
    #     where_condition_values.append(data.sku)
    # if data.site_codes:
    #     where_condition.append("site_code in %s")
    #     where_condition_values.append(data.site_codes)
    # if data.regions:
    #     where_condition.append("region in %s")
    #     where_condition_values.append(data.regions)
    # if data.article_ids:
    #     where_condition.append("article_id in %s")
    #     where_condition_values.append(data.article_ids)

    if where_condition:
        query_string = sql_statement + " where " + \
            " and ".join(where_condition) + limit_statement + offset_statement
    else:
        query_string = sql_statement + limit_statement + offset_statement

    try:
        print(query_string)
        print(where_condition_values)
        df = pd.read_sql(query_string, db_helper.get_connection(), params=where_condition_values)
        response_json_str = df.to_json(orient='records')
        response_json_obj = json.loads(response_json_str)
        return response_json_obj
    except (Exception) as e:
        print("EXCEPTION: in mdm_model -> mdm_data: ", e)
        return None
    finally:
        print("conn to be closed")

def article_data(data: Filters):
    print("Article-Data",data)
    sql_statement:str = '''
        select
            customer_name as "Key Account",
            article_id as "Key Account Article Code",
            article_desc as "Key Account Article Description",
            primary_buying_uom as "Primary Buying UOM",
            mrp_uom_buying as "MRP UOM Buying",
            l1_pack as "L1 Pack",
            l1_pack_uom as "L1 Pack UOM",
            l2_pack as "L2 Pack",
            l2_pack_uom as "L2 Pack UOM",
            l3_pack as "L3 Pack",
            l3_pack_uom as "L3 Pack UOM",
            l4_pack as "L4 Pack",
            l4_pack_uom as "L4 Pack UOM",
            loose_piece as "Loose Piece",
            status as "Active"
        from
            mdm_material_data
        '''
    limit_statement: str = f' limit {data.limit}' if data.limit else ''
    offset_statement: str = f' offset {data.offset}' if data.offset else ''
    where_condition: List[str] = []
    where_condition_values = [] 

    if data.customer_name:
        where_condition.append(f"customer_name = '{data.customer_name}'")
        # where_condition_values.append(f"%{data.customer_name}%")
    
    if where_condition:
        query_string = sql_statement + " where " + \
            " and ".join(where_condition) + limit_statement + offset_statement
    else:
        query_string = sql_statement + limit_statement + offset_statement

    try:
        print(query_string)
        print(where_condition_values)
        df = pd.read_sql(query_string, db_helper.get_connection())
        response_json_str = df.to_json(orient='records')
        response_json_obj = json.loads(response_json_str)
        return response_json_obj
    except (Exception) as e:
        print("EXCEPTION: in mdm_model -> article_data: ", e)
        return None
    finally:
        print("conn to be closed")

