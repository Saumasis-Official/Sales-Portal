import json
import os
import datetime
from decimal import Decimal
import pandas as pd
from src.models.dto.po_dto import PoDTO
from src.exceptions.sap_transformer_exception import SapTransformerException
from src.models.dto.so_dto import SoItems, SoDTO
from src.models.dto.validation_dto import ValidationDTO, ValidationItemsDTO
from src.models.dto.shopify_so_updation_dto import ShopifySOUpdateDTO, ShopifySOUpdateItemsDTO
from src.libs.loggers import log_decorator, Logger
import math
from src.services.mulesoft_service import MulesoftService
from src.services.data_persist_service import DataPersistService
import src.utils.constants as constants
from src.utils.sap_service import SapService


logger = Logger("SapTransformers")
mulesoft_service = MulesoftService()
sap_service = SapService()
data_persist_service = DataPersistService()

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if pd.isnull(obj):
            return None
        elif isinstance(obj, Decimal):
            return str(obj)
        return json.JSONEncoder.default(self, obj)


class SapTransformers:
    def pad_number(self, number):
        return f'{number:06d}'

    def invoice_payload(self, non_invoiced_records: list, po_number):
        data = {}

        for item in non_invoiced_records:
            item = json.dumps(item, cls=DecimalEncoder)
            item = json.loads(item)

            so_number = item.get("so_number")
            nav_list = []

            nav_item = {
                "InvType": "PRICE_CHECK",
                "SalesOrder": so_number,
                "ItemNumber": self.pad_number(int(item.get("response_item_number"))) if item.get(
                    "response_item_number") else item.get("item_number"),
                "ParentSKUCode": item.get("psku") if item.get("psku") else "",
                "SystemSKUCode": item.get("system_sku") if item.get("system_sku") else "",
                "MRP": item.get("updated_mrp") if item.get("updated_mrp") else (
                    item.get("mrp") if item.get("mrp") else ""),
                "EAN": item.get("ean") if item.get("ean") else "",
                "CustomerProductID": item.get("customer_product_id") if item.get(
                    "customer_product_id") else "",
            }

            if so_number in data:
                nav_list = data.get(so_number).get("NAV_ITEM")
            else:
                data[so_number] = {
                    "InvType": "PRICE_CHECK",
                    "SalesOrder": so_number,
                    "UniqueID": item.get("unique_id"),
                    "PONumber": po_number,
                    "NAV_ITEM": [],
                    "NAV_INVOICES": [{"NAVINVLINES": []}],
                }

            nav_list.append(nav_item)
            data[so_number]["NAV_ITEM"] = nav_list

        req_data = list(data.values())
        if len(req_data) > 0:
            return {"status": True, "data": {"InvType": "PRICE_CHECK", "NAVHDR": req_data}}
        else:
            return {"status": False, "data": "No data found"}

    @log_decorator
    def so_payload(self, order: PoDTO) -> SoDTO:
        """
        Description: To generate payload for SAP so creation
        Parameters:
            - order: PoDTO: order details
        Returns:
            = payload: dict
        """
        try:
            logger.info("inside sap_transformers -> so_payload")
            items = []
            for i in order.items:
                item = SoItems(
                    ItemNumber=i.item_number,
                    TargetQty=str(i.target_qty),
                    SalesUnit="CV",
                    SystemSKUCode=str(int(i.system_sku_code)),
                    MRP=str(i.mrp),
                    ROR=i.ror,
                    BasePrice="0",
                    case_lot=str(i.caselot)
                )
                items.append(item)
            data = SoDTO(
                SoldTo=order.customer_code,
                ShipTo=order.customer_code,
                Division="10",
                PoNumber=order.po_number,
                PoDate=order.po_created_date,
                PoDateTo=order.delivery_date,
                NAVITEM=items
            )
            return data
        except Exception as e:
            logger.error("EXCEPTION: in SapTransformer -> so_payload", e)
            raise SapTransformerException(order.po_number, e)

    @log_decorator
    def validation_payload(self, order: PoDTO) -> ValidationDTO:
        """
        Description: To generate payload for SAP validation
        Parameters:
            - order: PoDTO: order details
        Returns:
            - payload: dict
        """
        try:
            logger.info("inside sap_transformers -> validation_payload")
            items = []
            for i in order.items:
                item = ValidationItemsDTO(
                    ItemNumber=i.item_number,
                    ParentSKUCode=str(int(i.psku_code)),
                    SystemSKUCode=str(int(i.system_sku_code)),
                    CustomerProductID=str(i.customer_product_id),
                    MRP=str(i.mrp),
                    EAN=str(i.ean),
                    CaseLot=str(i.caselot),
                    BasePrice=str(i.base_price)
                )
                items.append(item)
            validate_dto = ValidationDTO(
                SoldTo=order.customer_code,
                PoDate=order.po_created_date,
                PoNumber=order.po_number,
                NAVPRICE=items
            )
            return validate_dto
        except Exception as e:
            logger.error("EXCEPTION: in SapTransformer -> validation_payload", e)
            raise SapTransformerException(order.po_number, e)
        
    @log_decorator
    def shopify_so_updation_transformer(self, data:dict) -> ShopifySOUpdateDTO:
        try:
            logger.info("inside sap_transformers -> shopify_so_updation_transformer")
            items = []
            so_update_dto = None
            for i in data.get('item_data'):
                if i.get('ror'):
                    item = ShopifySOUpdateItemsDTO(
                        ItmNumber = i.get('item_number'),
                        CustMaterialCode = i.get('customer_material_code'),
                        OrderQuantity = i.get('order_quantity'),
                        SalesUnit = i.get('sales_unit'),
                        ItemsConditions = i.get('item_conditions'),
                        ItemCateg  = i.get('item_category')
                    )
                items.append(item)
            if len(items):
                so_update_dto = ShopifySOUpdateDTO(
                    SalesDocument = data.get('header_data').get('sales_order'),
                    SalesOrg = data.get('header_data').get('sales_org'),
                    DistrChan = data.get('header_data').get('disribution_channel'),
                    Division = data.get('header_data').get('division'),
                    CurrencyCode = data.get('header_data').get('currency_code'),
                    OrderPartners = data.get('header_data').get('order_partners'),
                    HeaderConditions = data.get('header_data').get('header_conditions'),
                    LineItems = items

                )
            return so_update_dto
        except Exception as e:
            logger.error("EXCEPTION: in SapTransformer -> shopify_so_updation_transformer", e)
            raise SapTransformerException(data.get("SalesOrder"), e)
    
    @log_decorator
    def shopify_creation_transformer(self, data:dict) -> ShopifySOUpdateDTO:
        try:
            logger.info("inside sap_transformers -> shopify_creation_transformer")
            items = []
            so_update_dto = None
            for i in data.get('item_data'):
                item = ShopifySOUpdateItemsDTO(
                    ItmNumber = i.get('item_number'),
                    CustMaterialCode = i.get('customer_material_code'),
                    OrderQuantity = i.get('order_quantity'),
                    SalesUnit = i.get('sales_unit'),
                    ItemsConditions = i.get('item_conditions'),
                    ItemCateg  = i.get('item_category')
                )
                items.append(item)
            if len(items):
                so_update_dto = ShopifySOUpdateDTO(
                    SalesDocument = data.get('header_data').get('sales_order'),
                    SalesOrg = data.get('header_data').get('sales_org'),
                    DistrChan = data.get('header_data').get('disribution_channel'),
                    Division = data.get('header_data').get('division'),
                    CurrencyCode = data.get('header_data').get('currency_code'),
                    OrderPartners = data.get('header_data').get('order_partners'),
                    HeaderConditions = data.get('header_data').get('header_conditions'),
                    LineItems = items

                )
            return so_update_dto
        except Exception as e:
            logger.error("EXCEPTION: in SapTransformer -> shopify_creation_transformer", e)
            raise SapTransformerException(data.get("SalesOrder"), e)
        
    @log_decorator
    def convert_pieces_to_cases(self, data: PoDTO):
        """
        Description: To convert pieces to cases
        Parameters:
            - data: dict - .
        Return: response
        """
        try:
            logger.info("inside sap_transformers -> convert_pieces_to_cases")
            payload = self.validation_payload(data)
            # response = mulesoft_service.so_validation_check(payload)
            response = sap_service.mrp_and_caselot_check(payload.model_dump())
            response_data = response.json()
            response_data = response_data.get('data',{}).get('data',{})
            if (
                    response_data
                    and response_data.get("d")
                    and bool(response_data.get("d").get("NAVRESULT")) is True
                    and response_data.get("d").get("NAVRESULT").get("results")
                    and len(response_data.get("d").get("NAVRESULT").get("results")) > 0
            ):
                conversion_data = response_data.get("d").get("NAVRESULT").get("results")
                for item in conversion_data:
                    for i in data.items:
                        if i.item_number == item.get('ItemNumber'):
                            if int(float(item.get('CorrectCaseLot'))) > 0:
                                qty = math.floor(i.target_qty/int(float(item.get('CorrectCaseLot'))))
                                remainder = i.target_qty % int(float(item.get('CorrectCaseLot')))
                                i.target_qty = qty
                                data_persist_service.save_remaining_caselot(remainder,data.po_number,i.item_number,qty,item.get('CorrectCaseLot'))
                                sap_data = {
                                    "po":data.po_number,
                                    "item_number":i.item_number,
                                    "caselot":item.get('CorrectCaseLot',0),
                                    "mrp":item.get('CorrectMRP',0),
                                    "base_price":item.get('CorrectBasePrice',0),
                                    "tot":float(item.get("TOTMargin").rstrip('-')) if item.get("TOTMargin") else 0.0,

                                }
                                data_persist_service.save_sap_data(sap_data)
                            else:
                                remainder = i.target_qty
                                i.target_qty = 0
                                message = constants.CASELOT_ZERO
                                data_persist_service.save_remaining_caselot(remainder,data.po_number,i.item_number,0,item.get('CorrectCaseLot'),message)
                            continue
                return data
            else:
                return False
        except Exception as e:
            logger.error("EXCEPTION in SapTransformers -> convert_pieces_to_cases", e)
            raise e
