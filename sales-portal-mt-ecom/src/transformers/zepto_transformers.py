from src.models.dto.po_dto import PoDTO, PoItemsDTO
from src.services.data_persist_service import DataPersistService
from src.libs.loggers import log_decorator, Logger
from datetime import datetime

logger = Logger("ZeptoTransformers")


class ZeptoTransformers:
    DATA_PERSIST_SERVICE = None
    logger = None

    def __init__(self):
        self.DATA_PERSIST_SERVICE = DataPersistService()

    @log_decorator
    def po_transformer(self, payload, location) -> PoDTO:
        items = []
        print("inside Zepto transformers -> po_transformer")
        for item in payload:
            item_data = PoItemsDTO(
                item_number=str(item.get('LineNumber','')).zfill(5),
                target_qty=item.get("Quantity",''),
                customer_product_id=str(item.get("MaterialCode",'')),
                mrp=item.get("MRP"),
                po_item_description=item.get("SkuDesc",''),
                base_price=float(item.get("UnitBaseCost",0.0)),
                ean=  str(item.get("EAN",'')),
                landing_price=float(item.get("LandingCost",0.0)),
                uom="EA",
                item_total_amount= float(item.get("TotalAmount",0.0))
            )
            items.append(item_data)
        customer_code = self.DATA_PERSIST_SERVICE.get_customer_code(
            str(payload[0].get("DeliveryLocation", ""))
        )
        po_dto = PoDTO(
            vendor_code=str(payload[0].get("VendorCode", "")),
            po_number=str(payload[0].get("PoNumber", "")),
            po_created_date=datetime.strptime(
                payload[0].get("PoDate", ""),
                "%Y-%m-%d %H:%M:%S",
            ).date(),
            delivery_date=datetime.strptime(
                payload[0].get("PoExpiryDate", ""),
                "%Y-%m-%d %H:%M:%S",
            ).date(),
            items=items,
            customer_code=(
                str(int(customer_code.get("customer_code", "")))
                if customer_code
                else ""
            ),
            site_code=str(payload[0].get("DeliveryLocation", "")),
        )

        return po_dto