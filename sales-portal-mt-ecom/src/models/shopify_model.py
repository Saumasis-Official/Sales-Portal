from src.utils.database_helper import DatabaseHelper
from src.libs.loggers import Logger, log_decorator
import pandas as pd
import json
from datetime import datetime

logger = Logger("ShopifyModel")


class ShopifyModel:
    DATABASE_HELPER = None

    def __init__(self):
        self.DATABASE_HELPER = DatabaseHelper()

    @log_decorator
    def sap_request_payload_persistance(self, data: dict):
        if data and len(data):
            logger.info("inside ShopifyModel -> sap_request_payload_persistance")
            for i in data:
                sql_statement = """INSERT INTO shopify.shopify_header_table (sales_org, disribution_channel, 
                                division, currency_code, order_type, po_number, customer, po_date, rdd, status, 
                                ship_cond, ship_type, compl_div, order_partners, header_conditions, created_on,json_file_key)
                                VALUES (%(sales_org)s, %(disribution_channel)s, %(division)s, %(currency_code)s, %(order_type)s,
                                %(po_number)s, %(customer)s, %(po_date)s, %(rdd)s, %(status)s, %(ship_cond)s, %(ship_type)s, 
                                %(compl_div)s, ARRAY[%(order_partners)s]::jsonb[], ARRAY[%(header_conditions)s]::jsonb[], %(created_on)s , %(json_file_key)s)
                                ON CONFLICT (po_number) DO NOTHING RETURNING id
                                """
                try:
                    logger.info("inside ShopifyModel ->try block -> sap_request_payload_persistance")
                    with self.DATABASE_HELPER.get_write_connection() as conn_write:
                        cur = conn_write.cursor()
                        cur.execute(
                            sql_statement,
                            {
                                "sales_org": i.sales_org,
                                "disribution_channel": i.disribution_channel,
                                "division": i.division,
                                "currency_code": i.currency_code,
                                "order_type": i.order_type,
                                "po_number": i.po_number,
                                "customer": i.customer,
                                "po_date": datetime.strptime(
                                    i.po_date, "%Y%m%d"
                                ).strftime("%Y-%m-%d"),
                                "rdd": datetime.strptime(i.rdd, "%Y%m%d").strftime(
                                    "%Y-%m-%d"
                                ),
                                "status": i.status,
                                "ship_cond": i.ship_cond,
                                "ship_type": i.ship_type,
                                "compl_div": i.compl_div,
                                "order_partners": [
                                    json.dumps(d) for d in i.order_partners
                                ],
                                "header_conditions": [
                                    json.dumps(d) for d in i.header_conditions
                                ],
                                "created_on": i.created_on,
                                "json_file_key": i.json_file_key,
                            },
                        )
                        conn_write.commit()
                        column_names = [desc[0] for desc in cur.description]
                        rows = pd.DataFrame(
                            cur.fetchall(), columns=column_names
                        ).to_dict("records")
                        po_id = rows[0].get("id") if rows else False
                        if po_id:
                            sql_statement = """INSERT INTO shopify.shopify_item_table (item_number, customer_material_code, order_quantity, sales_unit, item_conditions, created_on, po_id,item_category)
                                            VALUES (%(item_number)s, %(customer_material_code)s, %(order_quantity)s, %(sales_unit)s, ARRAY[%(item_conditions)s]::jsonb[], %(created_on)s, %(po_id)s, %(item_category)s)
                                            ON CONFLICT (po_id, item_number) DO NOTHING
                                            """
                            cur.executemany(
                                sql_statement,
                                [
                                    {
                                        "item_number": item.item_number,
                                        "customer_material_code": item.customer_material_code,
                                        "order_quantity": item.order_quantity,
                                        "sales_unit": item.sales_unit,
                                        "item_conditions": [
                                            json.dumps(d) for d in item.item_conditions
                                        ],
                                        "created_on": item.created_on,
                                        "po_id": po_id,
                                        "item_category": item.item_category,
                                    }
                                    for item in i.items
                                ],
                            )
                            conn_write.commit()
                except Exception as e:
                    logger.error(
                        "Error in inside ShopifyModel -> sap_request_payload_persistance",
                        e,
                    )
                    return {"success": "failure", "error": str(e)}
            return {
                "status": "success",
                "message": "Request payload processed successfully",
            }

    @log_decorator
    def sap_response_persistance(self, data: list):
        logger.info("inside ShopifyModel -> sap_response_persistance")
        try:
            with self.DATABASE_HELPER.get_write_connection() as conn_write:
                for i in data:
                    sql_statement = """Update shopify.shopify_header_table set sales_order = %s, status = %s , so_date = %s, updated_on = now(), ror = %s where po_number = %s returning id"""
                    cur = conn_write.cursor()
                    cur.execute(
                        sql_statement,
                        (
                            i.get("sales_order"),
                            i.get("status"),
                            i.get("so_date"),
                            i.get("message"),
                            i.get("po_number"),
                        ),
                    )
                    conn_write.commit()
                    column_names = [desc[0] for desc in cur.description]
                    rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                        "records"
                    )
                    po_id = rows[0].get("id")
                    if po_id:
                        sql_statement = """Update shopify.shopify_item_table set ror_trail = ror, updated_on = now() where po_id = %s"""
                        cur.execute(sql_statement, (po_id,))
                        conn_write.commit()
                        sql_statement = """Update shopify.shopify_item_table set ror = '', updated_on = now() where po_id = %s"""
                        cur.execute(sql_statement, (po_id,))
                        conn_write.commit()
                        sql_statement = """Update shopify.shopify_item_table set sales_order = %s, material_code = %s, updated_on = now(),
                                        message = %s, ror = %s, material_description = %s where po_id = %s and item_number = %s"""
                        cur.executemany(
                            sql_statement,
                            [
                                (
                                    item.get("sales_order"),
                                    item.get("material_code").lstrip("0"),
                                    item.get("message"),
                                    item.get("ror"),
                                    item.get("material_description"),
                                    po_id,
                                    item.get("item_number").lstrip("0"),
                                )
                                for item in i.get("items")
                            ],
                        )
                        conn_write.commit()
        except Exception as e:
            logger.error("Error in ShopifyModel -> sap_response_persistance", e)
            return {"status": "failure", "error": e}

    @log_decorator
    def po_list(self, data: dict):
        try:
            logger.info("inside ShopifyModel -> po_list")
            sql_statement = (
                        """ with partner_list as ( select distinct ltrim(elem->>'PartnNumb','0') as partner_number, id from shopify.shopify_header_table, unnest(order_partners) as elem)
                         select sht.* from partner_list pl inner join shopify.shopify_header_table sht on sht.id = pl.id"""
                    )
            customer_codes = data.get('customerCodes', []) 
            formatted_customer_codes = ', '.join(f"'{code}'" for code in customer_codes)
          
                #Note -
                # Shopify UK: View only those POs whose sales org is mapped to the user in shd table.
                # Super admin/Support/Portal operations :View All POs
                        
            conditions = []
            updated_values = {} 

            if data.get("search")  :
                conditions.append(f"po_number ilike %(po_number)s ")
                updated_values.update({"po_number": f'%{data.get("search")}%'})
   
            if data.get("date") and data.get("date").get("from") and data.get("date").get("to") :
                conditions.append(f"po_date::DATE >= %(from)s and po_date::DATE <= %(to)s")
                updated_values.update({"from": data.get("date").get("from"), 
                                       "to": data.get("date").get("to")})

            if data.get("customerCodes")  :
                conditions.append(f"pl.partner_number in ({formatted_customer_codes})")

            if data.get("status") :
                conditions.append(f"status = %(status)s")
                updated_values.update({"status": data.get("status")})

            if data.get('id') and data.get('role') == "SHOPIFY_UK"  :
                conditions.append(f"sht.sales_org = ANY (SELECT UNNEST(string_to_array(code, ',')) FROM sales_hierarchy_details WHERE user_id = %(id)s)")
                updated_values.update({"id": data.get("id")})

            sql_statement += " where " + " and ".join(conditions) if conditions else ""

            sql_statement += f" order by po_date desc limit %(limit)s offset %(offset)s "
            updated_values.update({"limit": data.get("limit"), "offset": data.get("offset")})
        
            with self.DATABASE_HELPER.get_read_connection() as conn_read:
                cur = conn_read.cursor()
                cur.execute(sql_statement, updated_values)
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
        
                sql_statement = """
                WITH partner_list AS (SELECT DISTINCT ltrim(elem->>'PartnNumb', '0') AS partner_number, id 
                    FROM shopify.shopify_header_table, unnest(order_partners) AS elem)
                SELECT COUNT(*) FROM (SELECT pl.partner_number, sht.po_date 
                    FROM partner_list pl INNER JOIN shopify.shopify_header_table sht ON sht.id = pl.id
                """
                conditions = []
                updated_count = {} 
                if data.get("search")  :
                    conditions.append(f"po_number ilike %(po_number)s ")
                    updated_count.update({"po_number": f'%{data.get("search")}%'})
                if data.get("date") and data.get("date").get("from") and data.get("date").get("to") :
                    conditions.append(f"po_date::DATE >= %(from)s and po_date::DATE <= %(to)s")
                    updated_count.update({"from": data.get("date").get("from"), 
                                       "to": data.get("date").get("to")})
                if data.get("customerCodes") :
                    conditions.append(f"pl.partner_number in ({formatted_customer_codes})")

                if data.get("status"):
                    conditions.append(f"status = %(status)s")
                    updated_count.update({"status": data.get("status")})

                if data.get('id') and data.get('role') == "SHOPIFY_UK" :
                    conditions.append(f"sales_org = ANY (SELECT UNNEST(string_to_array(code, ',')) FROM sales_hierarchy_details WHERE user_id = %(id)s)")
                    updated_count.update({"id": data.get("id")})
                if conditions:
                    sql_statement += " WHERE " + " AND ".join(conditions) if conditions else ""

                sql_statement += ") AS subquery"

                cur.execute(sql_statement, updated_count)
                count = cur.fetchall()
              
                #Fetch customer codes according to the filters
                sql_customer_code_statement = """
                SELECT DISTINCT ltrim(elem->>'PartnNumb', '0') AS PartnNumb 
                FROM shopify.shopify_header_table, LATERAL unnest(order_partners) AS elem
                """

                conditions = []
                updated_codes ={}
                if data.get("search")  :
                    conditions.append(f"po_number ilike %(po_number)s ")
                    updated_codes.update({"po_number": f'%{data.get("search")}%'})

                if data.get("date") and data.get("date").get("from") and data.get("date").get("to")  :
                    conditions.append(f"po_date::DATE >= %(from)s and po_date::DATE <= %(to)s")
                    updated_codes.update({"from": data.get("date").get("from"), 
                                       "to": data.get("date").get("to")})
                if data.get("customerCodes")  :
                    conditions.append(f"ltrim(elem->>'PartnNumb', '0') in ({formatted_customer_codes})")

                if data.get("status") :
                    conditions.append(f"status = %(status)s")
                    updated_codes.update({"status": data.get("status")})
                
                if conditions:
                    sql_customer_code_statement += " WHERE " + " AND ".join(conditions)

                if data.get('id') and data.get('role') == "SHOPIFY_UK"  :
                    sql_customer_code_statement += f""" AND sales_org = ANY ( SELECT unnest(string_to_array(code, ',')) 
                        LATERAL FROM sales_hierarchy_details WHERE user_id = %(id)s )
                    """
                    updated_codes.update({"id": data.get('id')})

                cur.execute(sql_customer_code_statement, updated_codes)
                customer_code_column_names = [desc[0] for desc in cur.description]
                customer_code_rows = pd.DataFrame(cur.fetchall(), columns=customer_code_column_names).to_dict("records")
                return {"data": rows, "count": count[0][0],"customer_codes":customer_code_rows}
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> po_list", e)
            return {"status": "failure", "error": e}

    @log_decorator
    def po_items(self, params: dict):
        try:
            logger.info("inside ShopifyModel -> po_items")
            if params.get("deletedItems") == 'false':
                sql_statement = """SELECT * FROM shopify.shopify_item_table WHERE po_id = %s ORDER BY ( ror IS NULL or ror = ''), CAST(item_number AS INTEGER) LIMIT %s OFFSET %s """
            else:
                sql_statement = """SELECT * FROM shopify.shopify_item_table WHERE po_id = %s ORDER BY updated_by, ( ror IS NULL or ror = ''), CAST(item_number AS INTEGER) LIMIT %s OFFSET %s """
            with self.DATABASE_HELPER.get_read_connection() as conn_read:
                cur = conn_read.cursor()
                cur.execute(
                    sql_statement,
                    (params.get("po_id"), params.get("limit"), params.get("offset")),
                )
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                sql_statement = """SELECT count(*) FROM shopify.shopify_item_table where po_id = %s """
                cur.execute(sql_statement, (params.get("po_id"),))
                count = cur.fetchall()
                return {"data": rows, "count": count[0][0]}
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> po_items", e)
            return {"status": "failure", "error": e}

    @log_decorator
    def get_customer_name(self, customer_code: str):
        customer_code = customer_code.lstrip("0")
        sql_statement = (
            f"SELECT name FROM public.user_profile where id = '{customer_code}' "
        )
        try:
            logger.info("inside ShopifyModel -> get_customer_name")
            with self.DATABASE_HELPER.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return rows[0].get("name") if rows[0].get("name") else False
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> get_customer_name", e)
            return False

    @log_decorator
    def po_data(self, po_number: str):
        sql_statement = f"SELECT id FROM shopify.shopify_header_table where po_number = '{po_number}' "
        try:
            logger.info("inside ShopifyModel -> po_data")
            with self.DATABASE_HELPER.get_write_connection() as conn_write:
                cur = conn_write.cursor()
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                header_data = pd.DataFrame(
                    cur.fetchall(), columns=column_names
                ).to_dict("records")
                if header_data:
                    return header_data
                else:
                    return False
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> po_data", e)
            return False

    @log_decorator
    def shopify_reports(self, data: dict):
        try:
            logger.info("inside ShopifyModel -> shopify_reports")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = f"""select
                                 COALESCE(header.customer, '') as customer,
                                 COALESCE(header.sales_org, '') as sales_org,
                                 COALESCE(header.disribution_channel, '') as disribution_channel,
                                 COALESCE(header.po_number, '') as po_number,
                                 COALESCE(header.sales_order,'') as sales_order,
                                 COALESCE(header.division, '') as division,
                                 COALESCE(header.currency_code, '') as currency_code,
                                 COALESCE(header.order_type, '') as order_type,
                                 DATE(header.rdd) as rdd,
                                 DATE(header.po_date) as po_date,
                                 DATE(header.so_date) as so_date,
                                 COALESCE(header.ship_cond, '') as ship_cond,
                                 COALESCE(header.ship_type, '') as ship_type,
                                 header.status,
                                 COALESCE(header.compl_div, '') as compl_div,
                                 COALESCE(item.item_number, '') as item_number,
                                 COALESCE(item.customer_material_code, '') as customer_material_code,
                                 COALESCE(item.material_code, '') as material_code,
                                COALESCE(item.order_quantity, '') as order_quantity,
                                COALESCE(item.sales_unit, '') as sales_unit,
                                COALESCE(item.message, '') as message,
                                COALESCE(item.ror, '') as ror,
                                COALESCE(item.item_category, '') as item_category,
                                COALESCE(item.material_description, '') as material_description
                                  from shopify.shopify_header_table as header
                                  join shopify.shopify_item_table as item on
                                  header.id = item.po_id
                                  where header.po_date >= %s::timestamp and header.po_date <= %s::timestamp + interval '1 day' """
                if data.get('id') and data.get('role') == "SHOPIFY_UK":
                    sql_statement += f" and sales_org =  ANY(select unnest (string_to_array(code,',')) from sales_hierarchy_details as shd where shd.user_id = '{data.get('id')}' )"
                cur.execute(sql_statement, (data.get("from_date"), data.get("to_date")))
                column_names = [desc[0] for desc in cur.description]
                items = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return items
        except Exception as e:
            print("Exception in download_reports", e)
            raise e

    @log_decorator
    def retrigger_po_list(self):
        try:
            logger.info("inside ShopifyModel -> retrigger_po_list")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """select id from shopify.shopify_header_table where status = 'Open' and (sales_order is null or sales_order = '')"""
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return rows
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> retrigger_po_list", e)
            return {"status": "failure", "error": e}

    @log_decorator    
    def z_table_reports(self,data : dict):
        try:
            logger.info("inside ShopifyModel -> z_table_reports")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """SELECT 
                            COALESCE(shopify_feed.value->>'PoNumber', '') AS po_number,
                                shopify_feed.value->>'FeedDate' AS feeddate,
                                shopify_feed.value->>'PartnerCode' AS partnercode,
                                shopify_feed.value->>'Region' AS region,
                                orders_data.value->>'ShopifyDepositNumber' AS shopify_deposit_number,
                                orders_data.value->>'ShopifyShippingTax' AS shopify_shipping_tax,
                                orders_data.value->>'ShopifyShippingNoTax' AS shopify_shipping_no_tax,
                                line_items.value->>'AppId' AS app_id,
                                line_items.value->>'Currency' AS currency,
                                line_items.value->>'ShopifyOrderDate' AS shopify_order_date,
                                line_items.value->>'ShopifyOrderNumber' AS shopify_order_number,
                                line_items.value->>'ShopifyTotalPrice' AS shopify_total_price,
                                line_items.value->>'ShopifyTotalDiscounts' AS shopify_total_discounts, 
                                line_items.value->>'ShopifyTotalTax' AS shopify_total_tax,
                                line_items.value->>'ItemCode' AS item_code,
                                line_items.value->>'Quantity' AS quantity,
                                line_items.value->>'QuantityUom' AS quantity_uom,
                                line_items.value->>'SalesPrice' AS sales_price,
                                line_items.value->>'TotalDiscountAmount' AS total_discount_amount,
                                line_items.value->>'DiscountRate' AS discount_rate,
                                line_items.value->>'MixedItem' AS mixed_item,
                                line_items.value->>'MixedItemId' AS mixed_item_id
                                FROM 
                            shopify.shopify_audit_trail,
                            LATERAL jsonb_array_elements(reference->'ShopifyOrderFeed') AS shopify_feed,
                            LATERAL jsonb_array_elements(shopify_feed.value->'OrdersData') AS orders_data,
                            LATERAL jsonb_array_elements(orders_data.value->'LineItems') AS line_items
                            where lastreplication >= %s::timestamp AND lastreplication <= %s::timestamp + interval '1 day' """
                    # More columns to be added
                cur.execute(sql_statement, (data.get("from_date"), data.get("to_date")))
                column_names = [desc[0] for desc in cur.description]
                items = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return items
        except Exception as e:
            print("Exception in z_table_export", e)
            raise e

    @log_decorator
    def z_table_persistance(self, data: dict):
        if data and len(data):
            logger.info("inside ShopifyModel -> sap_request_payload_persistance")
           
            sql_statement = """INSERT INTO shopify.shopify_audit_trail (type, reference, lastreplication) 
                                VALUES ('ztable',
                                  %(reference)s, 
                                  now() )
                                """
            try:
                    with self.DATABASE_HELPER.get_write_connection() as conn_write:
                        cur = conn_write.cursor()
                        cur.execute(
                            sql_statement,
                            {
                                "reference": 
                                    json.dumps(data) 
                                
                            },
                        )
                        conn_write.commit()
                      
            except Exception as e:
                    logger.error(
                        "Error in inside ShopifyModel -> z_table_persistance",
                        e,
                    )
                    return {"success": "failure", "error": str(e)}
            return {
                "status": "success",
                "message": "Request payload saved successfully",
            }

    @log_decorator
    def fetch_all_shopify_customers(self,data: dict):
        try:
            logger.info("inside ShopifyModel -> fetch_all_shopify_customers")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """select distinct sales_org from shopify.shopify_header_table where sales_org <> ''"""
                cur.execute(sql_statement)
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                 #Fetch customer codes
                updated_codes ={}
                sql_customer_code_statement = """
                SELECT DISTINCT ltrim(elem->>'PartnNumb', '0') AS PartnNumb 
                FROM shopify.shopify_header_table, LATERAL unnest(order_partners) AS elem
                """
                if data.get("status") :
                    sql_customer_code_statement += f" WHERE status = %(status)s"
                    updated_codes.update({"status": data.get("status")})
                
                if data.get('id') and data.get('role') == "SHOPIFY_UK"  :
                    sql_customer_code_statement += f""" AND sales_org = ANY ( SELECT unnest(string_to_array(code, ',')) 
                        LATERAL FROM sales_hierarchy_details WHERE user_id = %(id)s )
                    """
                    updated_codes.update({"id": data.get('id')})

                cur.execute(sql_customer_code_statement,updated_codes)
                customer_code_column_names = [desc[0] for desc in cur.description]
                customer_code_rows = pd.DataFrame(cur.fetchall(), columns=customer_code_column_names).to_dict("records")
                return {"data": rows,"customer_codes":customer_code_rows}
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> fetch_all_shopify_customers", e)
            return {"status": "failure", "error": e}

    @log_decorator   
    def fetch_all_ror_data(self,sales_org:str):
        try:
            logger.info("inside ShopifyModel -> fetch_all_ror_data")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """SELECT
                                sht.po_number AS "PO Number",
                                sht.sales_org AS "Sales Org",
                                sht.disribution_channel AS "Distribution Channel",
                                sht.division AS "Division",
                                sht.order_type AS "Order Type",
                                sht.customer AS "Customer Name",
                                TO_CHAR(sht.po_date, 'DD-Mon-YYYY') AS "PO Date",
                                sit.item_number AS "Item Number",
                                customer_material_code AS "Customer Material Code",
                                sit.ror AS "Reason of Rejection",
                                sit.order_quantity AS "Quantity",
                                sit.sales_unit AS "Sales Unit",
                                ltrim(elem->>'PartnNumb', '0') AS "Customer Code",
                                (SELECT cond->>'Amount'
                                 FROM unnest(sit.item_conditions) AS cond
                                 WHERE cond->>'ConditionCode' = 'ZUKM') AS "Sales Price"
                            FROM
                                shopify.shopify_header_table sht
                            JOIN LATERAL unnest(sht.order_partners) AS elem ON true
                            LEFT JOIN shopify.shopify_item_table sit ON sht.id = sit.po_id
                            WHERE
                                (sit.ror IS NOT NULL AND sit.ror <> '') AND sht.status = 'Open' AND sales_org = %s AND sht.created_on >= current_date - interval '30 days';"""
                cur.execute(sql_statement,(sales_org,))
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return rows
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> fetch_all_ror_data", e)
            return {"status": "failure", "error": e}

    @log_decorator  
    def get_reports_recipients(self,sales_org:str):
        logger.info("inside ShopifyModel -> get_reports_recipients")
        with self.DATABASE_HELPER.get_read_connection() as conn:
            cur = conn.cursor()
            try:
                sql_statement: str = ''' Select email from mt_ecom_mail_recipients where type = 'Shopify Reports' and sales_org = %s '''
                cur.execute(sql_statement,(sales_org,))
                email = pd.DataFrame(cur.fetchall(),columns=['email']).to_dict('records')
                if len(email):
                    return email[0].get('email','')
                else :
                    return ''
            except Exception as e:
                print("Exception in get_reports_recipients",e)
                raise e
            
    @log_decorator
    async def delete_items(self,data:dict):
        try:
            logger.info("inside ShopifyModel -> delete_items")
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                sql_statement_update = """Update shopify.shopify_item_table set is_deleted = %s, updated_by = %s, updated_on = now() WHERE po_id = %s and item_number = %s"""
                sql_statement_fetch_name = """SELECT first_name, last_name 
                                              FROM sales_hierarchy_details 
                                              WHERE user_id = %s"""
                for item in data:
                    cur.execute(sql_statement_fetch_name, (item.get('user_id'),))
                    result = cur.fetchone()
                    if result:
                        first_name, last_name = result
                        updated_by = f"{first_name} {last_name}"
                    else:
                        updated_by = ""
                    
                    cur.execute(sql_statement_update, (item.get('is_deleted'), updated_by, item.get('po_id'), item.get('item_number')))
                    conn.commit()
                return {"status":"success","message":"Item(s) modified successfully"}
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> delete_items", e)
            return {"status": "failure", "error": e}
        
    @log_decorator
    def fetch_year(self,user_id:str):
        try:
            logger.info("inside ShopifyModel -> fetch_year")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """select distinct(year) from shopify.shopify_unprocessed_files where is_deleted = false and sales_org in ( SELECT unnest(string_to_array(code, ',')) 
                        LATERAL FROM sales_hierarchy_details WHERE user_id = %s ) """
                cur.execute(sql_statement,(user_id,))
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return rows
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> fetch_year", e)
            return {"status": "failure", "error": e}
    
    @log_decorator
    def fetch_file_name(self,year:str,sales_org:str):
        try:
            logger.info("inside ShopifyModel -> fetch_file_name")
            sales_org_list = sales_org.split(',')
            sales_org_list = [org.strip() for org in sales_org_list]
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """select file_name from shopify.shopify_unprocessed_files where year = %s and is_deleted = false and sales_org in %s """
                cur.execute(sql_statement,(year,tuple(sales_org_list)))
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return rows
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> fetch_file_name", e)
            return {"status": "failure", "error": e}
    @log_decorator   
    def get_user_sales_org(self,user_id):
        try:
            logger.info("inside ShopifyModel -> get_user_sales_org")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """SELECT code AS sales_org
                    FROM sales_hierarchy_details 
                    WHERE user_id = %s """
                cur.execute(sql_statement,(user_id,))
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return rows
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> get_user_sales_org", e)
            return {"status": "failure", "error": e}
        

    @log_decorator
    def get_S3_key(self,po_id:str):
        try:
            logger.info("inside ShopifyModel -> get_S3_key")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """select json_file_key from shopify.shopify_header_table where id = %s"""
                cur.execute(sql_statement,(po_id,))
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return rows[0].get('json_file_key') if len(rows) else False
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> get_S3_key", e)
            return {"status": "failure", "error": e}
        

    @log_decorator
    def get_po_item(self,id):
        try:
            logger.info("inside ShopifyModel -> get_po_item")
            with self.DATABASE_HELPER.get_read_connection() as conn:
                cur = conn.cursor()
                sql_statement = """select * from shopify.shopify_item_table where po_id = %s and is_deleted = false """
                cur.execute(sql_statement,(id,))
                column_names = [desc[0] for desc in cur.description]
                rows = pd.DataFrame(cur.fetchall(), columns=column_names).to_dict(
                    "records"
                )
                return rows
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> get_po_item", e)
            return {"status": "failure", "error": e}
        
    @log_decorator
    def audit_log(self,data:dict,po_number:str):
        try:
            logger.info("inside ShopifyModel -> audit_log")
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                sql_statement = """INSERT INTO mt_ecom_audit_trail (type, reference_column, column_values) 
                                VALUES ('Shopify Modify payload',%s,%s)"""
                cur.execute(sql_statement,(po_number,json.dumps(data)))
                conn.commit()
                return {"status":"success","message":"Audit Log saved successfully"}
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> audit_log", e)
            return {"status": "failure", "error": e}
        
    @log_decorator
    def save_s3_key(self,json_file_key:str,po_id:str):
        try:
            logger.info("inside ShopifyModel -> update_po_item")
            with self.DATABASE_HELPER.get_write_connection() as conn:
                cur = conn.cursor()
                sql_statement = """Update shopify.shopify_header_table set json_file_key = %s WHERE id = %s"""
                cur.execute(sql_statement,(json_file_key,po_id))
                return cur.rowcount
        except Exception as e:
            logger.error("Error in inside ShopifyModel -> update_po_item", e)
            return {"status": "failure", "error": e}