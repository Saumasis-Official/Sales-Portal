from src.models.dto.po_dto import PoDTO, PoItemsDTO
from src.services.data_persist_service import DataPersistService
from src.libs.loggers import log_decorator, Logger
from datetime import datetime

logger = Logger("SwiggyTransformers")


class SwiggyTransformers:
    DATA_PERSIST_SERVICE = None
    logger = None

    def __init__(self):
        self.DATA_PERSIST_SERVICE = DataPersistService()

    @log_decorator
    def po_transformer(self, payload, location) -> PoDTO:
        items = []
        print("inside Swiggy transformers -> po_transformer")
        for index,item in enumerate(payload):
            item = PoItemsDTO(
                item_number=str(index +1).zfill(5),
                target_qty=item.get("OrderedQty",0.0),
                customer_product_id=str(item.get("SkuCode",'')),
                mrp=item.get("Mrp",0.0),
                po_item_description=item.get("SkuDescription",''),
                base_price=float(item.get("UnitBasedCost",0.0)),
                uom="EA",
                item_total_amount= float(item.get("PoLineValueWithTax",0.0))
            )
            items.append(item)
        customer_code = self.DATA_PERSIST_SERVICE.get_customer_code(
            str(payload[0].get("FacilityName", ""))
        )
        po_dto = PoDTO(
            vendor_code = '1N' + str(payload[0].get("SupplierCode", "")),
            po_number=str(payload[0].get("PoNumber", "")),
            po_created_date=datetime.strptime(
                payload[0].get("PoCreatedAt", ""),
                "%Y-%m-%d %H:%M:%S",
            ).date(),
            delivery_date=datetime.strptime(
                payload[0].get("PoExpiryDate", ""),
                "%Y-%m-%d",
            ).date(),
            items=items,
            customer_code=(
                str(int(customer_code.get("customer_code", "")))
                if customer_code
                else ""
            ),
            site_code=str(payload[0].get("FacilityName", "")),
        )

        return po_dto