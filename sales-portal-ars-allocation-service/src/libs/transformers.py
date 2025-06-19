from typing import List, Optional

import pandas as pd

from src.config.configurations import AUTO_CLOSURE
from src.dto.auto_closure_sap_payload import AutoClosureSapPayload, SalesDetails
from src.dto.submit_dto import SubmitOrderDTO, SubmitItemsDTO
from src.dto.validate_dto import ItemsDTO, OrderDataDTO


def map_order_details(recommended_materials: pd.DataFrame) -> List[ItemsDTO]:
    if recommended_materials.empty:
        return []

    mapped_data = [
        ItemsDTO(
            material_code=row["psku"],
            item_number=str((index + 1) * 10).zfill(6),
            required_qty=row["qty"],
            target_qty=row["qty"],
            original_quantity=row["qty"],
            description=row["description"],
            sales_unit=row["sales_unit"],
            pack_type=row["pak_type"],
            division=row["division"],
            stock_norm_days="",
            soq_norm_qty=None,
        )
        for index, row in recommended_materials.iterrows()
    ]

    return mapped_data


def generate_submit_payload(order_payload: OrderDataDTO, tonn: float) -> SubmitOrderDTO:
    order_items = []
    for item in getattr(order_payload, "items"):
        i = SubmitItemsDTO(
            item_number=getattr(item, "item_number"),
            material_code=getattr(item, "material_code"),
            required_qty=getattr(item, "required_qty"),
            sales_unit=getattr(item, "sales_unit"),
            sales_org=getattr(item, "sales_org"),
            distribution_channel=getattr(item, "distribution_channel"),
            division=getattr(item, "division"),
        )
        order_items.append(i)
    sold_to = None
    ship_to = None
    unloading = None
    for p in getattr(order_payload, "partners"):
        if getattr(p, "partner_role") == "AG":
            sold_to = getattr(p, "partner_number")
        elif getattr(p, "partner_role") == "WE":
            ship_to = getattr(p, "partner_number")
        elif getattr(p, "partner_role") == "Y1":
            unloading = getattr(p, "partner_number")
    payload = SubmitOrderDTO(
        soldto=sold_to,
        shipto=ship_to,
        unloading=unloading,
        po_number=getattr(order_payload, "po_number"),
        po_date=getattr(order_payload, "po_date"),
        req_date=getattr(order_payload, "req_date"),
        items=order_items,
        ton=tonn,
        pdp=getattr(order_payload, "pdp"),
    )
    return payload


def generate_auto_closure_sap_payload(
    data: pd.DataFrame,
) -> Optional[List[AutoClosureSapPayload]]:
    sales_details_list: List[SalesDetails] = []
    batch_size = AUTO_CLOSURE.get("AUTO_CLOSURE_SAP_BATCH_SIZE")
    if data is None or data.empty:
        return None

    for index, d in data.iterrows():
        sales = SalesDetails(
            SaleOrder=d.get("SALESORDER"),
            CustomerGroup=d.get("CUSTOMERGROUP"),
            SaleOrg=d.get("SALESORGANIZATION"),
            DBnumber=d.get("SOLDTOPARTY"),
        )
        sales_details_list.append(sales)

    # apply batches on sales_details_list and create payload_list
    payload_list = []
    for i in range(0, len(sales_details_list), batch_size):
        payload = AutoClosureSapPayload(
            NAVSALEORDERS=sales_details_list[i : i + batch_size]
        )
        payload_list.append(payload)
    return payload_list
