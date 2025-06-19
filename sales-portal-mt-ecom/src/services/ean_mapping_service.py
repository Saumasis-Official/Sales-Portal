import json
import os
import datetime
from decimal import Decimal
from src.models.po_processing_so_creation_model import PoProcessingSoCreationModel
from src.utils.error_helper import ErrorHelper
import pandas as pd

env = os.environ.get('ENV')
po_processing_so_creation_model = PoProcessingSoCreationModel()
error_helper = ErrorHelper()
class EanMappingService:
    def prepare_payload_from_xml_event(self, event, unique_id):
        if isinstance(event, str):
            event = json.loads(event)
        if (event.get('ORDERS05_VEN') and event.get('ORDERS05_VEN').get('IDOC')):
            idoc = event.get('ORDERS05_VEN').get('IDOC')
        else:
            return {'status': False}
        vendor_code = (self.get_direct_value_from_idoc(idoc, 'E1EDK01', 'RECIPNT_NO')).lstrip('0')
        po_number = self.get_direct_value_from_idoc(idoc, 'E1EDK02', 'BELNR')
        PoDate = self.get_value_from_idoc_array(idoc, 'E1EDK03', 'DATUM', 'IDDAT', '012')
        po_date_to = self.get_validity_date_from_idoc(idoc, 'E1EDP01','E1EDP20', 'EDATU',)
        if PoDate:
            PoDate = str(datetime.datetime.strptime(PoDate, "%Y%m%d").strftime('%d.%m.%Y'))
        if po_date_to:
            po_date_to = str(datetime.datetime.strptime(po_date_to, "%Y%m%d").strftime('%d.%m.%Y'))
            print(po_date_to, "PoDateTo")
        ReqDate = self.get_value_from_idoc_array(idoc, 'E1EDK03', 'DATUM', 'IDDAT', '012')
        if ReqDate:
            ReqDate = str(datetime.datetime.strptime(ReqDate, "%Y%m%d").strftime('%d.%m.%Y'))
        PayTerms = self.get_direct_value_from_idoc(idoc, 'E1EDK01', 'ZTERM')
        P01ListResp = self.get_items_from_idoc_p01_list(idoc, 'E1EDP01', unique_id,vendor_code,po_number)
        if P01ListResp == '':
            return ''
        is_valid = P01ListResp.get('is_valid')
        incorrect_ean_data = P01ListResp.get('incorrect_ean_data')
        ean_full_details = P01ListResp.get('ean_full_details')
        NAVITEM = P01ListResp.get('LineItems')
        NAVPRICE = P01ListResp.get('ItemMRPs')
        SoldTo = P01ListResp.get('SoldTo')
        ShipTo = P01ListResp.get('ShipTo')
        if (is_valid == True):
            mrp_check_req = {
                "UniqueID": unique_id,
                "SalesOrg": "1010",
                "SoldTo": SoldTo,
                "PoDate": PoDate,
                "DocType": "ZOR",
                "DistChannel": "10",
                "Division": "10",
                "PoNumber": po_number,
                "NAVPRICE": NAVPRICE,
                "NAVRESULT": []
            }
            sap_req = {
                "DocType": "ZOR",
                "SalesOrg": "1010",
                "SoldTo": SoldTo,
                "ShipTo": ShipTo,
                "DistChannel": "10",
                "Division": "10",
                "PoNumber": po_number,
                "PoDate": PoDate,
                'PoDateTo': po_date_to,
                "ReqDate": "",
                "NAVITEM": NAVITEM,
                "NAVRES": []
                }
            return {
                'status': True,
                'is_valid': is_valid,
                "sap_req": sap_req,
                "mrp_check_req": mrp_check_req,
                'incorrect_ean_data': incorrect_ean_data,
                'ean_full_details': ean_full_details,
                'po_date_to': str(datetime.datetime.strptime(po_date_to, "%d.%m.%Y").strftime('%Y-%m-%d')),
                'customer_code': SoldTo
            }
        else:
            return {
                'status': False,
                'is_valid': is_valid,
                'incorrect_ean_data': incorrect_ean_data,
                'ean_full_details': ean_full_details,
                'po_date_to':str(datetime.datetime.strptime(po_date_to, "%d.%m.%Y").strftime('%Y-%m-%d'))

            }
    def get_items_from_idoc_p01_list(self, idoc, segment, unique_id, vendor_code, po_number):
        arr = []
        ItemMRPs = []
        is_valid = True
        incorrect_ean_data = []
        ean_full_details = []
        SoldTo = ""
        ShipTo = ""
        CustomerProductID = ""
        sales_info_db_resp = {}
        ls = idoc.get(segment)
        if ls and isinstance(ls, list):
            for item in ls:
                p19 = item.get('E1EDP19')
                if p19:
                    if isinstance(p19, list):
                        for p19_item in p19:
                            if (p19_item.get('QUALF') == '001'):
                                CustomerProductID = p19_item.get('IDTNR')
                                po_desc = p19_item.get('KTEXT')
                                break;
                    else:
                        if (p19.get('QUALF') == '001'):
                            CustomerProductID = p19_item.get('IDTNR')
                            po_desc = p19_item.get('KTEXT')
                if CustomerProductID:
                    CustomerProductID = str(int(CustomerProductID))
                else:
                    error_helper.add_error("CustomerProductID","CustomerProductID is not exists in PO Request for item number "+item.get('POSEX'))
                obj = {
                    "ItemNumber": "",
                    "TargetQty": "",
                    "SalesUnit": "CV",
                    # 'ParentSKUCode' : "",
                    "SystemSKUCode": "",
                    "MRP": "",
                    "ROR": "",
                    "BasePrice": item.get('VPREI'),
                    "case_lot": item.get('BPUMZ')
                }

                ean_data_obj = {
                    "ItemNumber": "",
                    "TargetQty": "",
                    "SalesUnit": "CV",
                    "SiteCode": item.get('WERKS'),
                    "Plant": "",
                    "CustomerProductID": CustomerProductID,
                    "ArticleDescription": "",
                    "EAN": item.get('LPRIO_BEZ'),
                    "MRP": "",
                    "CaseSize": "",
                    "CaseLot": item.get('BPUMZ'),
                    "PO_Item_description": po_desc,
                    "BasePrice" : item.get('VPREI'),
                }
                if (item.get('POSEX')):
                    obj.update({'ItemNumber': item.get('POSEX')})
                    ean_data_obj.update({'ItemNumber': item.get('POSEX')})
                if (item.get('MENGE')):
                    obj.update({'TargetQty': item.get('MENGE')})
                    ean_data_obj.update({'TargetQty': item.get('MENGE')})

                sap_request_params = {
                    'SiteCode': item.get('WERKS'),
                    'EAN': item.get('LPRIO_BEZ'),
                    'CustomerProductID': CustomerProductID,
                    'VendorCode':vendor_code,
                    'PO':po_number
                }
                print(vendor_code,"Vendor Code")
                site_code_flag = po_processing_so_creation_model.check_site_code(item.get('WERKS',''))
                vendor_code_flag = po_processing_so_creation_model.check_vendor_code(sap_request_params)
                sales_info_db_resp = po_processing_so_creation_model.get_master_data(sap_request_params)
                if not site_code_flag:
                    incorrect_ean_data.append({
                        'CustomerProductID': CustomerProductID,
                        'EAN': item.get('LPRIO_BEZ'),
                        'SiteCode': item.get('WERKS'),
                        'ItemNumber': obj.get('ItemNumber'),
                        'Error_message': 'SITE_CODE_NOT_FOUND',
                        'data': sales_info_db_resp,
                    })
                    ean_data_obj.update({'Message': sales_info_db_resp})
                elif not vendor_code_flag:
                    incorrect_ean_data.append({
                        'CustomerProductID': CustomerProductID,
                        'EAN': item.get('LPRIO_BEZ'),
                        'SiteCode': item.get('WERKS'),
                        'ItemNumber': obj.get('ItemNumber'),
                        'Error_message': 'VENDOR_ID_NOT_FOUND',
                        'data': sales_info_db_resp,
                        'VendorCode': vendor_code
                    })
                    ean_data_obj.update({'Message': sales_info_db_resp})
                elif not len(sales_info_db_resp) > 0 :
                    incorrect_ean_data.append({
                        'CustomerProductID': CustomerProductID,
                        'EAN': item.get('LPRIO_BEZ'),
                        'SiteCode': item.get('WERKS'),
                        'ItemNumber': obj.get('ItemNumber'),
                        'Error_message': 'EAN_DETAILS_NOT_FOUND',
                        'data': sales_info_db_resp,
                    })
                    ean_data_obj.update({'Message': sales_info_db_resp})
                else:
                    obj.update({
                        'SystemSKUCode': sales_info_db_resp.get('sku')
                    })
                    ean_data_obj.update({
                        'ParentSKUCode': sales_info_db_resp.get('psku'),
                        'SystemSKUCode': sales_info_db_resp.get('sku'),
                        'Plant': sales_info_db_resp.get('plant_code'),
                        'SystemSKUDescription': sales_info_db_resp.get('sku_desc'),
                        'ParentSKUDescription': sales_info_db_resp.get('psku_desc'),
                        'VendorCode': sales_info_db_resp.get('vendor_code')
                    })
                    if SoldTo == "":
                        SoldTo = sales_info_db_resp.get('customer_code')
                    if ShipTo == "":
                        ShipTo = sales_info_db_resp.get('customer_code')
                mrp = '0'
                p05 = item.get('E1EDP05')
                if p05 and isinstance(p05, list):
                    for p05_item in p05:
                        if (p05_item.get('KSCHL') == 'PB00'):
                            mrp = p05_item.get('KRATE')
                            obj.update({'MRP': mrp})
                            ean_data_obj.update({'MRP': mrp})
                if obj.get('SystemSKUCode') != "":
                    arr.append(obj)
                ean_full_details.append(ean_data_obj)
                if(obj.get('SystemSKUCode') != ""):
                    ItemMRPs.append({
                        "ItemNumber": obj.get('ItemNumber'),
                        "ParentSKUCode": sales_info_db_resp.get('psku'),
                        "SystemSKUCode": obj.get('SystemSKUCode'),
                        "CustomerProductID": CustomerProductID,
                        "MRP": mrp,
                        "Quantity": '1',
                        "EAN": item.get('LPRIO_BEZ'),
                        "CaseLot": item.get('BPUMZ'),
                        "BasePrice" : item.get('VPREI')
                    })
        else:
            p19 = ls.get('E1EDP19')
            if p19:
                if isinstance(p19, list):
                    for p19_item in p19:
                        if (p19_item.get('QUALF') == '001'):
                            CustomerProductID = p19_item.get('IDTNR')
                            po_desc = p19_item.get('KTEXT')
                else:
                    if (p19.get('QUALF') == '001'):
                        CustomerProductID = p19_item.get('IDTNR')
                        po_desc = p19_item.get('KTEXT')

            if CustomerProductID:
                CustomerProductID = str(int(CustomerProductID))
            else:
                error_helper.add_error("CustomerProductID","CustomerProductID is not exists in PO Request for item number "+item.get('POSEX'))
            obj = {
                "ItemNumber": "",
                "TargetQty": "",
                "SalesUnit": "CV",
                "SystemSKUCode": "",
                "MRP": "",
                "ROR" : "",
                "BasePrice": ls.get('VPREI'),
                "case_lot": ls.get('BPUMZ'),
            }
            ean_data_obj = {
                "ItemNumber": "",
                "TargetQty": "",
                "SalesUnit": "CV",
                "SiteCode": ls.get('WERKS'),
                "Plant": "",
                "CustomerProductID": CustomerProductID,
                "ArticleDescription": "",
                "EAN": ls.get('LPRIO_BEZ'),
                "MRP": "",
                "CaseSize": "",
                "CaseLot": ls.get('BPUMZ'),
                "PO_Item_description": po_desc,
                "Message": "",
                "BasePrice" : ls.get('VPREI'),
            }
            if (ls.get('POSEX')):
                obj.update({'ItemNumber': ls.get('POSEX')})
                ean_data_obj.update({'ItemNumber': ls.get('POSEX')})
            if (ls.get('MENGE')):
                obj.update({'TargetQty': ls.get('MENGE')})
                ean_data_obj.update({'TargetQty': ls.get('MENGE')})
            sap_request_params = {
                'SiteCode': ls.get('WERKS'),
                'EAN': ls.get('LPRIO_BEZ'),
                'CustomerProductID': CustomerProductID,
                'VendorCode':vendor_code,
                'PO':po_number
            }
            site_code_flag = po_processing_so_creation_model.check_site_code(ls.get('WERKS',''))
            vendor_code_flag = po_processing_so_creation_model.check_vendor_code(sap_request_params)
            sales_info_db_resp = po_processing_so_creation_model.get_master_data(sap_request_params)
            if len(sales_info_db_resp) >0 :
                obj.update({
                    'SystemSKUCode': sales_info_db_resp.get('sku')
                })
                ean_data_obj.update({
                    'ParentSKUCode': sales_info_db_resp.get('psku'),
                    'SystemSKUCode': sales_info_db_resp.get('sku'),
                    'Plant': sales_info_db_resp.get('plant_code'),
                    'SystemSKUDescription': sales_info_db_resp.get('sku_desc'),
                    'ParentSKUDescription': sales_info_db_resp.get('psku_desc'),
                    'VendorCode': sales_info_db_resp.get('vendor_code')
                })
                if SoldTo == "":
                    SoldTo = sales_info_db_resp.get('customer_code')
                if ShipTo == "":
                    ShipTo = sales_info_db_resp.get('customer_code')
            elif not site_code_flag:
                    incorrect_ean_data.append({
                        'CustomerProductID': CustomerProductID,
                        'EAN': ls.get('LPRIO_BEZ'),
                        'SiteCode': ls.get('WERKS'),
                        'ItemNumber': obj.get('ItemNumber'),
                        'Error_message': 'SITE_CODE_NOT_FOUND',
                        'data': sales_info_db_resp,
                    })
                    ean_data_obj.update({'Message': sales_info_db_resp})
            elif not vendor_code_flag:
                    incorrect_ean_data.append({
                        'CustomerProductID': CustomerProductID,
                        'EAN': ls.get('LPRIO_BEZ'),
                        'SiteCode': ls.get('WERKS'),
                        'ItemNumber': obj.get('ItemNumber'),
                        'Error_message': 'VENDOR_ID_NOT_FOUND',
                        'data': sales_info_db_resp,
                        'VendorCode': vendor_code
                    })
                    ean_data_obj.update({'Message': sales_info_db_resp})
            else:
                if(sales_info_db_resp.get('vendor_code')):
                    incorrect_ean_data.append({
                        'CustomerProductID': CustomerProductID,
                        'EAN': ls.get('LPRIO_BEZ'),
                        'SiteCode': sales_info_db_resp.get('site_code'),
                        'ItemNumber': obj.get('ItemNumber'),
                        'Error_message': 'PRODUCT_DETAILS_NOT_FOUND',
                        'data': sales_info_db_resp,
                    })
                    ean_data_obj.update({'Message': sales_info_db_resp})
                else:
                    incorrect_ean_data.append({
                        'CustomerProductID': CustomerProductID,
                        'EAN': ls.get('LPRIO_BEZ'),
                        'SiteCode': sales_info_db_resp.get('site_code'),
                        'ItemNumber': obj.get('ItemNumber'),
                        'Error_message': 'VENDOR_DETAILS_NOT_FOUND',
                        'data': sales_info_db_resp,
                    })
                    ean_data_obj.update({'Message': sales_info_db_resp})
            mrp = '0'
            p05 = ls.get('E1EDP05')
            if p05 and isinstance(p05, list):
                for p05_item in p05:
                    if (p05_item.get('KSCHL') == 'PB00'):
                        mrp = p05_item.get('KRATE')
                        obj.update({'MRP': mrp})
                        ean_data_obj.update({'MRP': mrp})
            if obj.get('SystemSKUCode') != "":
                arr.append(obj)
            ean_full_details.append(ean_data_obj)
            if(obj.get('SystemSKUCode') != ""):
                ItemMRPs.append({
                    "ItemNumber": obj.get('ItemNumber'),
                    "ParentSKUCode": sales_info_db_resp.get('psku'),
                    "SystemSKUCode": obj.get('SystemSKUCode'),
                    "CustomerProductID": CustomerProductID,
                    "MRP": mrp,
                    "Quantity": '1',
                    "EAN": ls.get('LPRIO_BEZ'),
                    "CaseLot": ls.get('BPUMZ'),
                    "BasePrice" : ls.get('VPREI')
                })
        return {
            'is_valid': is_valid,
            "LineItems": arr,
            "ItemMRPs": ItemMRPs,
            'incorrect_ean_data': incorrect_ean_data,
            'ean_full_details': ean_full_details,
            'SoldTo': SoldTo,
            'ShipTo': SoldTo
        }
    def get_specific_value_from_idoc_p01_list(self,idoc, segment, original_key, compare_key, compare_key_value):
        value = ''
        ls = idoc.get(segment)
        if ls and isinstance(ls, list):
            for item in ls:
                if compare_key == None:
                    if (item.get(original_key)):
                        value = item.get(original_key)
                        break
                else:
                    if (item.get(compare_key) == compare_key_value):
                        value = item.get(original_key)
                        break
        else:
            if compare_key == None:
                if (ls.get(original_key)):
                    value = ls.get(original_key)
            else:
                if (ls.get(compare_key) == compare_key_value):
                    value = ls.get(original_key)
        return value
    def get_direct_value_from_idoc(self,idoc, segment, original_key):
        value = []
        ls = idoc.get(segment)
        if ls and isinstance(ls, list):
            for item in ls:
                value.append(item.get(original_key))
        else:
            if idoc.get(segment) and idoc.get(segment).get(original_key):
                value.append(idoc.get(segment).get(original_key))
        if len(value) > 0:
            return value[0]
        else:
            return ""
    def get_validity_date_from_idoc(self,idoc, segment, original_key,variable):
        value = {}
        ls = idoc.get(segment)
        if ls and isinstance(ls, list):
            for item in ls:
                if original_key in item.keys():
                    val = item.get(original_key)
                    if val and variable in val.keys():
                        return val.get(variable)
        else:
            value = ls.get(original_key,{})
            if value and variable in value.keys():
                return value.get(variable,'')
            else:
                return ""
                
    def get_value_from_idoc_array(self, idoc, segment, original_key, compare_key, compare_key_value):
        value = ""
        ls = idoc.get(segment)
        if ls and isinstance(ls, list):
            for item in ls:
                if (item.get(compare_key) == compare_key_value):
                    value = item.get(original_key)
                    break
        else:
            if (ls.get(compare_key) == compare_key_value):
                value = ls.get(original_key)
        return value
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return json.JSONEncoder.default(self, obj)
    def prepare_mrp_check_2_payload(self,non_invoiced_records,po_number):
        data = {}
        if non_invoiced_records and len(non_invoiced_records) > 0:
            for item in non_invoiced_records:
                item = json.dumps(item, cls= DecimalEncoder)
                item = json.loads(item)
                if item.get("sales_order"):
                    if data.get(item.get("sales_order")):
                        data.get(item.get("sales_order")).get("NAV_ITEM").append(
                            {
                                "InvType": "PRICE_CHECK",
                                "SalesOrder": str(item.get("sales_order")),
                                "ItemNumber": self.pad_number(int(item.get("response_item_number"))) if item.get("response_item_number") else str(item.get("item_number")),
                                "ParentSKUCode": str(item.get("psku_code")) if item.get("psku_code") else "",
                                "SystemSKUCode": str(item.get("system_sku_code")) if item.get("system_sku_code") else "",
                                "MRP": str(item.get("updated_mrp")) if item.get("updated_mrp") else (str(item.get("mrp")) if item.get("mrp") else ""),
                                "EAN": str(item.get("ean")) if item.get("ean") else "",
                                "CustomerProductID": str(item.get("customer_product_id")) if item.get("customer_product_id") else "",
                            }
                        )
                    else:
                        data[item.get("sales_order")] = {
                            "InvType": "PRICE_CHECK",
                            "SalesOrder": item.get("sales_order"),
                            "UniqueID": item.get("unique_id"),
                            "PONumber": po_number,
                            "NAV_ITEM": [
                                {
                                    "InvType": "PRICE_CHECK",
                                    "SalesOrder": str(item.get("sales_order")),
                                    "ItemNumber": self.pad_number(int(item.get("response_item_number"))) if item.get("response_item_number") else str(item.get("item_number")) + "0",
                                    "ParentSKUCode": str(item.get("psku_code")) if item.get("psku_code") else "",
                                    "SystemSKUCode": str(item.get("system_sku_code")) if item.get("system_sku_code") else "",
                                    "MRP": str(item.get("updated_mrp")) if item.get("updated_mrp") else (str(item.get("mrp")) if item.get("mrp") else ""),
                                    #   "MRP":"10",
                                    "EAN": str(item.get("ean")) if item.get("ean") else "",
                                    "CustomerProductID": str(item.get("customer_product_id")) if item.get("customer_product_id") else "",
                                }
                            ],
                            "NAV_INVOICES": [{"NAVINVLINES": [],"NAVTAX" : []}],
                        }
        req_data = list(data.values())
        if len(req_data) > 0:
            return {"status": True, "data": {"InvType": "PRICE_CHECK", "NAVHDR": req_data}}
        else:
            return {"status": False, "data": "No data found"}
    def pad_number(self,number):
        return f'{number:06d}'
    def prepare_rdd_payload(self,data):
        so_object = {}
        so_numbers = []
        flag = True
        try:
            for items in data.get('data'):
                    if items.get('sales_order') in so_object.keys() and so_object[items.get('sales_order')]:
                        for index,nav_item in enumerate((so_object[items.get('sales_order')].get('NAVITEM'))): 
                            if nav_item.get('ItemNumber') == items.get('sap_item_number').lstrip('0'):
                                so_object[items.get('sales_order')].get('NAVITEM')[index].get('NAVSCHLINES').append(
                                    {
                                    "ItemNumber": items.get('sap_item_number').lstrip('0'),
                                    "ScheduleLineNumber" : '' if int(float(items.get('schedule_line_number'))) == (int(float(items.get('default_schedule_line'))) if items.get('default_schedule_line') else 0) else items.get('schedule_line_number').lstrip('0'),
                                    "DeliveryDate" : str(datetime.datetime.strptime(data.get('rdd'), '%Y-%m-%dT%H:%M:%S.%fZ').strftime('%Y%m%d')),
                                    "OrderQuantity" : str(items.get('confirmed_qty')),
                                    "Delete_Flag" : "X" if items.get('confirmed_qty') == 0 else ""
                                    }
                                )
                                flag = False
                            else:
                                flag = True
                        if flag :
                            so_object[items.get('sales_order')].get('NAVITEM').append(
                                {
                            "ItemNumber": items.get('sap_item_number').lstrip('0'),
                                "SystemSKUCode": str(items.get('system_sku')),
                                "TargetQty": str(items.get('po_qty')),
                                "SalesUnit": "CV",
                                "MRP": items.get('mrp'),
                                "BasePrice": items.get('base_price'),
                                "case_lot": items.get('case_lot'),
                                "NAVSCHLINES" : [
                                   {
                                            "ItemNumber": items.get('sap_item_number').lstrip('0'),
                                            "ScheduleLineNumber" : items.get('default_schedule_line','') ,
                                            "DeliveryDate" : items.get('default_rdd'),
                                            "OrderQuantity" : str(items.get('balance_qty')),
                                            "Delete_Flag" : "X" if items.get('balance_qty') == 0 else ""
                                      }, 
                                      {
                                    "ItemNumber": items.get('sap_item_number').lstrip('0'),
                                    "ScheduleLineNumber" : '' if int(float(items.get('schedule_line_number'))) == (int(float(items.get('default_schedule_line'))) if items.get('default_schedule_line') else 0) else items.get('schedule_line_number').lstrip('0'),
                                    "DeliveryDate" : str(datetime.datetime.strptime(data.get('rdd'), '%Y-%m-%dT%H:%M:%S.%fZ').strftime('%Y%m%d')),
                                    "OrderQuantity" : str(items.get('confirmed_qty')),
                                    "Delete_Flag" : "X" if items.get('confirmed_qty') == 0 else ""
                                    }
                                    ]
                                }
                            )

                    else :
                        so_numbers.append(items.get('sales_order'))
                        so_object[items.get('sales_order')] = {
                            "Sales_Order_Number": items.get('sales_order'),
                            "SalesOrg": "1010",
                            "SoldTo": str(data.get('customer_code')),
                            "ShipTo": str(data.get('customer_code')),
                            "DistChannel": "10",
                            "Division": "10",
                            "PoDate": items.get('po_creation_date'),
                            "OrderReason": "001",
                            "PoNumber": "",
                            "ReqDate": "",
                            "PoDateTo":  str(datetime.datetime.strptime(items.get('po_expiry_date',''), '%d-%m-%Y').strftime('%d.%m.%Y')),
                            "NAVRES" : [ ],
                            "NAVITEM": [ 
                                {
                                "ItemNumber": items.get('sap_item_number').lstrip('0'),
                                    "SystemSKUCode": str(items.get('system_sku')),
                                    "TargetQty": str(items.get('po_qty')),
                                    "SalesUnit": "CV",
                                    "MRP": items.get('mrp'),
                                    "BasePrice": items.get('base_price'),
                                    "case_lot": items.get('case_lot'),
                                    "NAVSCHLINES" : [
                                        {
                                            "ItemNumber": items.get('sap_item_number').lstrip('0'),
                                            "ScheduleLineNumber" : items.get('default_schedule_line','') ,
                                            "DeliveryDate" : items.get('default_rdd'),
                                            "OrderQuantity" : str(items.get('balance_qty')),
                                            "Delete_Flag" : "X" if items.get('balance_qty') == 0 else ""
                                        },
                                        {
                                            "ItemNumber": items.get('sap_item_number').lstrip('0'),
                                            "ScheduleLineNumber" : '' if int(float(items.get('schedule_line_number'))) == (int(float(items.get('default_schedule_line'))) if items.get('default_schedule_line') else 0) else items.get('schedule_line_number').lstrip('0'),
                                            "DeliveryDate" : str(datetime.datetime.strptime(data.get('rdd'), '%Y-%m-%dT%H:%M:%S.%fZ').strftime('%Y%m%d')),
                                            "OrderQuantity" : str(items.get('confirmed_qty')),
                                            "Delete_Flag" : "X" if items.get('confirmed_qty') == 0 else ""
                                        }
                                        ]
                            }     
                                ]
                        }
            return {'so_object' : so_object, 'so_numbers' : so_numbers}           
        except Exception as e:
            print(e)
            return {'status': False, 'message': 'Error while preparing payload'}
        
    def prepare_validity_date_payload(self, result,payload,po_number):
        amendment_data = {
                    "Sales_Order_Number": result[0].get('so_number'),
                    "SalesOrg":"1010",
                    "SoldTo": payload.get('mrp_check_req',{}).get('SoldTo',''),
                    "ShipTo": payload.get('mrp_check_req',{}).get('ShipTo',''),
                    "DistChannel":"10",
                    "Division":"10",
                    "OrderReason":"001",
                    "PoNumber": po_number,
                    "PoDate": payload.get('mrp_check_req',{}).get('PoDate',''),
                    "PoDateTo": str(datetime.datetime.strptime(payload.get('po_date_to'),'%Y-%m-%d' ).strftime("%d.%m.%Y")),
                    "ReqDate":"",
                    "NAVRES":[],
                    "NAVITEM":[]

                }
        return amendment_data
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if pd.isnull(obj):
            return None
        elif isinstance(obj, Decimal):
            return str(obj)
        return json.JSONEncoder.default(self, obj)