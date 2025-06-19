s3_po_data = {
    "site_code": "SP9K",
    "customer_code": "150559",
    "vendor_code": "20004886",
    "po_number": "5102583520",
    "po_created_date": "2024-06-19T00:00:00",
    "delivery_date": "2024-06-30T00:00:00",
    "items": [
        {
            "item_number": "0",
            "caselot": 120,
            "customer_product_id": 492662934,
            "target_qty": 240,
            "ean": 8901774002349,
            "mrp": 55,
            "po_item_description": "Name of Item 0"
        },
        {
            "item_number": "1",
            "caselot": 240,
            "customer_product_id": 490001340,
            "target_qty": 240,
            "ean": 8901774002332,
            "mrp": 38,
            "po_item_description": "Name of Item 1"
        }
    ]
}
s3_po_data_blinkit = {
    "items": [
      {
        "ean": 8901774002349,
        "mrp": 42.0,
        "ror": "",
        "caselot": 240,
        "psku_code": None,
        "plant_code": None,
        "target_qty": 240,
        "item_number": "0",
        "system_sku_code": None,
        "psku_description": None,
        "customer_product_id": 492662934,
        "po_item_description": "Name of Item 0",
        "system_sku_description": None
      },
      {
        "ean": 8901774002332,
        "mrp": 38.0,
        "ror": "",
        "caselot": 240,
        "psku_code": None,
        "plant_code": None,
        "target_qty": 240,
        "item_number": "1",
        "system_sku_code": None,
        "psku_description": None,
        "customer_product_id": 10145570,
        "po_item_description": "Name of Item 1",
        "system_sku_description": None
      }
    ],
    "po_number": "1679310079700",
    "site_code": None,
    "vendor_code": "20004886",
    "customer_code": "150559",
    "delivery_date": "2024-05-13T00:00:00Z",
    "po_created_date": "2024-05-06T00:00:00Z"
  }

sap_so_response = {
    "status": True,
    "message": "Response fetched successfully",
    "data": {
        "d": {
            "__metadata": {
                "id": "https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP"
                      "/ZJAVIS_SO_CREATION_API_SRV/HeaderSet(DocType='ZOR',SalesOrg='1010',"
                      "SoldTo='150559')",
                "uri": "https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP"
                       "/ZJAVIS_SO_CREATION_API_SRV/HeaderSet(DocType='ZOR',SalesOrg='1010',"
                       "SoldTo='150559')",
                "type": "ZJAVIS_SO_CREATION_API_SRV.Header",
            },
            "DocType": "ZOR",
            "SalesOrg": "1010",
            "SoldTo": "150559",
            "ShipTo": "150559",
            "DistChannel": "10",
            "Division": "10",
            "PoNumber": "5102583520",
            "PoDate": "19.06.2024",
            "PoDateTo": "30.06.2024",
            "ReqDate": "08.07.2024",
            "ExpDate": "",
            "Validate": "",
            "NAVITEM": {
                "results": [
                    {
                        "__metadata": {
                            "id": "https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP"
                                  "/ZJAVIS_SO_CREATION_API_SRV/ItemSet('0')",
                            "uri": "https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP"
                                   "/ZJAVIS_SO_CREATION_API_SRV/ItemSet('0')",
                            "type": "ZJAVIS_SO_CREATION_API_SRV.Item",
                        },
                        "ItemNumber": "0",
                        "SystemSKUCode": "14000000003501",
                        "TargetQty": "240.000",
                        "SalesUnit": "CV",
                        "ROR": "",
                        "MRP": "55.00",
                        "BasePrice": "0",
                        "case_lot": "120",
                        "FreshnessThreshold": "",
                        "EAN_Check_Required": "",
                        "EAN_Code": "",
                        "Status": "",
                    },
                    {
                        "__metadata": {
                            "id": "https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP"
                                  "/ZJAVIS_SO_CREATION_API_SRV/ItemSet('1')",
                            "uri": "https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP"
                                   "/ZJAVIS_SO_CREATION_API_SRV/ItemSet('1')",
                            "type": "ZJAVIS_SO_CREATION_API_SRV.Item",
                        },
                        "ItemNumber": "1",
                        "SystemSKUCode": "14000000000510",
                        "TargetQty": "240.000",
                        "SalesUnit": "CV",
                        "ROR": "",
                        "MRP": "38.00",
                        "BasePrice": "0",
                        "case_lot": "240",
                        "FreshnessThreshold": "",
                        "EAN_Check_Required": "",
                        "EAN_Code": "",
                        "Status": "",
                    },
                ]
            },
            "NAVRES": {
                "results": [
                    {
                        "__metadata": {
                            "id": "https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP"
                                  "/ZJAVIS_SO_CREATION_API_SRV/ResponseSet(Item_Number='1',"
                                  "PoItemNumber='',SKU_Code='14000000000510')",
                            "uri": "https://s4hanaqua.tataconsumer.com:1443/sap/opu/odata/SAP"
                                   "/ZJAVIS_SO_CREATION_API_SRV/ResponseSet(Item_Number='1',"
                                   "PoItemNumber='',SKU_Code='14000000000510')",
                            "type": "ZJAVIS_SO_CREATION_API_SRV.Response",
                        },
                        "Item_Number": "1",
                        "PoItemNumber": "",
                        "SKU_Code": "14000000000510",
                        "Order_Qty": "",
                        "Sales_Unit": "",
                        "Material_Status": "",
                        "Sales_Order_Number": "",
                        "Message": ",Purchase order number in document number: 0111439279 already "
                                   "exists,Purchase order number in document number: 01114392,"
                                   "79 already exists,,",
                    }
                ]
            },
        }
    },
}


blinkit_sample_po = {
    "receiver_code": 11932,
    "item_data": [
        {
            "line_number": 0,
            "units_ordered": 240,
            "landing_rate": "32.56",
            "case_size": 240,
            "cgst_value": "2.50",
            "item_id": 10016623,
            "name": "Name of Item 0",
            "sgst_value": "2.50",
            "mrp": "42.00",
            "upc": "8901774002349",
            "cess_value": "0.00",
            "igst_value": None,
            "uom": "100 g",
            "cost_price": "31.01"
        },
        {
            "line_number": 1,
            "units_ordered": 240,
            "landing_rate": "29.46",
            "case_size": 240,
            "cgst_value": "2.50",
            "item_id": 10008111,
            "name": "Name of Item 1",
            "sgst_value": "2.50",
            "mrp": "38.00",
            "upc": "8901774002332",
            "cess_value": "0.00",
            "igst_value": None,
            "uom": "100 g",
            "cost_price": "28.06"
        }
    ],
    "event_name": "PO_CREATION",
    "financial_details": {
        "gst_tin": "27AADCH7038R1ZX",
        "purchasing_entity": "HANDS ON TRADES PRIVATE LIMITED"
    },
    "event_message": "PO_CREATION",
    "purchase_order_details": {
        "po_expiry_date": "2024-05-13",
        "purchase_order_number": "1679310079700",
        "issue_date": "2024-05-06"
    },
    "grofers_delivery_details": {
        "grofers_outlet_id": 4162
    }
}