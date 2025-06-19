from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
import pytz

ist = pytz.timezone("Asia/Kolkata")


def check_single_grn_condition(row, short_close: int = None, po_validity: int = None):
    current_date = datetime.now()
    billing_info = row["BILLING_INFO"]
    order_date = row["ORDERDATE"]

    if len(billing_info) > 0 and short_close is not None:
        first_invoice_date = min(
            [datetime.fromisoformat(info["billing_timestamp"]) for info in billing_info]
        )
        short_close_date = first_invoice_date + timedelta(hours=short_close)
        return short_close_date < current_date
    elif len(billing_info) == 0 and po_validity is not None:
        # order_date = datetime.fromisoformat(order_date)
        po_validity_date = order_date + timedelta(days=po_validity)
        return po_validity_date < current_date
    else:
        return False


def check_multi_grn_condition(row, po_validity: int):
    if po_validity is not None:
        current_date = datetime.now()
        order_date = row["ORDERDATE"]
        po_validity_date = order_date + timedelta(days=po_validity)
        return po_validity_date < current_date

    return False


def calculate_so_validity(row, short_close: int):
    rdd = row.get("rdd")
    if rdd is not None:
        # convert rdd from YYYYMMDD to datetime
        rdd = ist.localize(datetime.strptime(rdd, "%Y%m%d"))
        validity_date = (rdd + timedelta(days=short_close)).date()
    else:
        validity_date = None

    return validity_date


def find_applicable_rdd(row, rdd_response_dict):
    if pd.notnull(row["REQUESTEDDELIVERYDATE"]):
        return row["REQUESTEDDELIVERYDATE"].strftime("%Y%m%d")
    else:
        return rdd_response_dict.get(row["SALESORDER"], {}).get("rdd", None)


def calculate_so_validity_mt(
    row,
    short_close_single_grn: Optional[int],
    short_close_multi_grn: Optional[int],
):
    customer_type = row["customer_type"]
    so_date = row["ORDERDATE"]
    invoice_date = row["BILLINGDOCUMENTDATE"]
    validity_date = None
    if (
        customer_type == "Single GRN"
        and invoice_date is not None
        and short_close_single_grn is not None
    ):
        validity_date = (invoice_date + timedelta(days=short_close_single_grn)).date()
    elif (
        customer_type == "Multi GRN"
        and so_date is not None
        and short_close_multi_grn is not None
    ):
        validity_date = (so_date + timedelta(days=short_close_multi_grn)).date()
    return validity_date
