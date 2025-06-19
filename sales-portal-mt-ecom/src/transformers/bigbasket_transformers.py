from src.models.dto.po_dto import PoDTO, PoItemsDTO
from src.libs.loggers import log_decorator, Logger
from src.services.data_persist_service import DataPersistService
from datetime import datetime


logger = Logger("BigBasketTransformers")


class BigBasketTransformers:
    DATA_PERSIST_SERVICE = None
    logger = None

    def __init__(self):
        self.DATA_PERSIST_SERVICE = DataPersistService()
        pass

    @log_decorator
    def po_transformer(self, payload, location) -> PoDTO:
        logger.info("Inside po_transformer")
        try:
            items = []
            for i in (
                payload.get("PurchaseOrder", {}).get("ItemDetails", {}).get("Item", [])
            ):
                item = PoItemsDTO(
                    item_number=str(i.get("LineNumber")).zfill(5),
                    target_qty=int(i.get("Quantity")),
                    customer_product_id=str(i.get("SkuCode")),
                    mrp=float(i.get("MRP")),
                    po_item_description=i.get("Description"),
                    ean=i.get("EAN"),
                    base_price=float(i.get("BasicCost")),
                    landing_price=float(i.get("LandingCost")),
                    uom="EA",
                    item_total_amount= float(i.get("TotalValue"))
                )
                items.append(item)
            customer_code = self.DATA_PERSIST_SERVICE.get_customer_code(
                str(payload.get("PurchaseOrder", {}).get("Header", {}).get("Number", ""))
            )
            po_dto = PoDTO(
                vendor_code=str(
                    payload.get("PurchaseOrder", {})
                    .get("Header", {})
                    .get("PurposeCode", "").lstrip("0")
                ),
                po_number=str(
                    payload.get("PurchaseOrder", {})
                    .get("Header", {})
                    .get("PurchaseOrderNumber", "")
                ),
                po_created_date=datetime.strptime(
                    payload.get("PurchaseOrder", {}).get("Header", {}).get("PODate", ""),
                    "%d/%m/%Y",
                ).date(),
                delivery_date=datetime.strptime(
                    payload.get("PurchaseOrder", {})
                    .get("Header", {})
                    .get("ExpiryDate", ""),
                    "%d/%m/%Y",
                ).date(),
                items=items,
                customer_code=(
                    str(int(customer_code.get("customer_code", "")))
                    if customer_code
                    else ""
                ),
                site_code=str(
                    payload.get("PurchaseOrder", {}).get("Header", {}).get("Number", "")
                ),
            )

            return po_dto
        except Exception as e:
            logger.error("Exception in BigBasketTransformers -> po_transformer", e)
            raise e
