from src.models.dto.po_dto import PoDTO, PoItemsDTO
from src.models.dto.blinkit_po_ack_dto import BlinkitPoAckDTO
from src.models.dto.invoice_dto import InvoiceHeaderDTO, InvoiceItemsDTO
from src.exceptions.po_acknowledgement_exception import PoAcknowledgementException
from src.services.data_persist_service import DataPersistService
from src.libs.loggers import log_decorator, Logger
from src.exceptions.po_transformer_exception import PoTransformerException
from src.utils.helper import HelperClass

logger = Logger('BlinkitTransformers')
class BlinkitTransformers:
    DATA_PERSIST_SERVICE = None
    HELPER_CLASS = None
    logger = None

    def __init__(self):
        self.DATA_PERSIST_SERVICE = DataPersistService()
        self.HELPER_CLASS = HelperClass()

    @log_decorator
    def po_transformer(self, payload, location) -> PoDTO:
        items = []
        print('inside Blinkit transformers -> po_transformer')
        for i in payload.get("item_data"):
            item = PoItemsDTO(
                item_number=str(i.get("line_number")).zfill(5),
                caselot=i.get("case_size"),
                target_qty = i.get("units_ordered"),
                customer_product_id= str(i.get("item_id")),                   
                mrp=i.get("mrp"),
                po_item_description=i.get("name"),
                ean=i.get("upc"),
                base_price = float(i.get("cost_price")),
                landing_price = float(i.get("landing_rate")),
                sales_unit = i.get("uom"),
                uom = 'EA',
                item_total_amount = float(i.get('units_ordered')) * float(i.get('landing_rate'))
            )
            items.append(item)
        customer_code = self.DATA_PERSIST_SERVICE.get_customer_code(
            str(payload.get('grofers_delivery_details',{}).get('grofers_outlet_id',''))
        )
        po_dto = PoDTO(
            vendor_code=str(payload.get("receiver_code", None)),
            po_number=str(payload.get("purchase_order_details", {}).get("purchase_order_number")),
            po_created_date=payload.get("purchase_order_details", {}).get("issue_date"),
            delivery_date=payload.get("purchase_order_details", {}).get("po_expiry_date"),
            items=items,
            customer_code=str(int(customer_code.get('customer_code',''))) if customer_code else '',
            site_code = str(payload.get('grofers_delivery_details',{}).get('grofers_outlet_id'))
        )

        return po_dto

    @log_decorator
    def po_acknowledgement_transformer(self, po_number, vendor_code, status, event_message,
                                       event_name) -> BlinkitPoAckDTO:
        try:
            logger.info('inside Blinkit transformers -> po_acknowledgement_transformer')
            data = BlinkitPoAckDTO(
                po_number=po_number,
                receiver_code=vendor_code,
                status=status,
                event_name=event_name,
                event_message=event_message
            )
            return data
        except Exception as e:
            logger.info("Exception in BlinkitTransformer -> po_acknowledgement_transformer", e)
            raise PoAcknowledgementException(po_number, e)
        
    @log_decorator
    def invoice_payload_transformer(self, data : list,po:dict):
        try:
            items = []
            print('inside Blinkit transformers -> po_transformer')
            for i in data:
                i = self.HELPER_CLASS.remove_custom_types(i)
                item = InvoiceItemsDTO(
                    SalesOrder = i.get("sales_order",''),
                    ItemNumber=str(i.get('response_item_number','')).zfill(6),
                    CustomerProductID=str(i.get("customer_product_id",'')),
                    ParentSKUCode=str(i.get("psku_code",'')),
                    SystemSKUCode=str(i.get("system_sku_code",'')),
                    MRP=str(i.get("updated_mrp",'')) if i.get("updated_mrp",'') else (str(i.get("mrp",'')) if i.get("mrp",'') else "0"),
                    EAN=str(i.get("ean",''))
                )
                items.append(item)
            invoice_dto = InvoiceHeaderDTO(
                SalesOrder = po.get('so_number',''),
                PONumber = po.get('po_number',''),
                NAV_ITEM = items

            )
            invoice_payload = {
                "InvType": "PRICE_CHECK",
                "NAVHDR": [invoice_dto.model_dump()]
            }

            return invoice_payload
        except Exception as e:
            print("Exception in BlinkitTransformer -> invoice_payload_transformer", e)
            logger.error("Exception in BlinkitTransformer -> invoice_payload_transformer", e)