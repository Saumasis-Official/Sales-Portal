from src.models.dto.po_dto import PoDTO, PoItemsDTO
from src.models.dto.amazon_po_ack import AmazonAcknowledgementsDTO, AcknowledgedQuantityDTO, ItemAcknowledgementDTO, OrderedQuantityDTO, NetCostDTO, ListPriceDTO, ItemDTO, AddressDTO, TaxInfoDTO, SellingPartyDTO, AcknowledgementDTO
from src.exceptions.po_acknowledgement_exception import PoAcknowledgementException
from src.services.data_persist_service import DataPersistService
from src.libs.loggers import log_decorator, Logger
from src.exceptions.po_transformer_exception import PoTransformerException
from src.utils.helper import HelperClass
from datetime import datetime
from src.models.dto.amazon_invoice_dto import InvoiceDTO,InvoiceItem,TaxDetail,Amount,InvoicedQuantity,Party,Address,TaxRegistrationDetail,PaymentTerms
from src.utils import constants
from src.models.dto.amazon_asn_dto import ShippedQuantity,ShippedItem,AsnAddress,AsnTaxRegistrationDetail,AsnParty,ShipmentConfirmation,ShipmentConfirmationDTO,ItemDetails,MaximumRetailPrice

logger = Logger('AmazonTransformers')
class AmazonTransformers:
    DATA_PERSIST_SERVICE = None
    HELPER_CLASS = None
    logger = None

    def __init__(self):
        self.DATA_PERSIST_SERVICE = DataPersistService()
        self.HELPER_CLASS = HelperClass()
    @log_decorator
    def po_transformer(self, payload, location) -> PoDTO:
        try:
            logger.info('inside Amazon transformers -> po_transformer')
            po_dto_list = []
            for order in payload.get("payload",{}).get("orders", []):
                items = []
                
                for i in order.get("orderDetails", {}).get("items", []):
                    try:
                        item_number = str(i.get("itemSequenceNumber")).zfill(5)
                        target_qty = int(i.get("orderedQuantity", {}).get("amount")) 
                        base_price = str(i.get("netCost", {}).get("amount", 0))
                        sales_unit = i.get("orderedQuantity", {}).get("unitOfMeasure")
                    except ValueError as e:
                        raise PoTransformerException(f"Invalid input for order item: {i}. Error: {e}")
                    
                    item = PoItemsDTO(
                            item_number=item_number,                                     
                            customer_product_id=i.get("amazonProductIdentifier"),
                            target_qty= target_qty,
                            base_price = base_price,
                            sales_unit = sales_unit,
                            uom = 'EA',
                            item_total_amount= float(target_qty) * float(base_price)                                                           
                        )
                    items.append(item)
                
                customer_code = self.DATA_PERSIST_SERVICE.get_customer_code(
                    str(order.get("orderDetails",{}).get("shipToParty",{}).get("partyId",None))
                ) 
                #Save date is localtimestamp, send acknowledgement in iso format
                purchase_order_date_str = order.get("orderDetails", {}).get("purchaseOrderDate")
                purchase_order_date = HelperClass().convert_iso_to_local(purchase_order_date_str)               
                expiry_date = order.get("orderDetails", {}).get("deliveryWindow")                                           
                extracted_date = expiry_date.split("--")[1]
                exp_date = HelperClass().convert_iso_to_local(extracted_date)                              
        
                po_dto = PoDTO(
                        vendor_code=order.get("orderDetails", {}).get("sellingParty", {}).get("partyId"),
                        po_number=str(order.get("purchaseOrderNumber", "")),
                        po_created_date= purchase_order_date.date(),     
                        delivery_date= str(exp_date),   
                        items=items,
                        customer_code= str(int(customer_code.get('customer_code',''))) if customer_code else '',
                        site_code = str(order.get("orderDetails",{}).get("shipToParty",{}).get("partyId")),
                        others= order.get("orderDetails", {}).get("billToParty",{}),
                        location= location or "",
                        po_created_timestamp= str(purchase_order_date)
                )
                po_dto_list.append(po_dto)
            return po_dto_list
        except Exception as e:
            logger.error("Exception in Amazon Transformer -> po_transformer", e)
            raise PoTransformerException("purchaseOrderNumber", e)

    @log_decorator
    def po_acknowledgement_transformer(self, payload: PoDTO) -> AmazonAcknowledgementsDTO:
        items = []
        try:
            logger.info('inside Amazon transformers -> po_acknowledgement_transformer')
            for item in payload.items:
                item_acknowledgements = []

                acknowledged_quantity = AcknowledgedQuantityDTO(
                    amount= int(item.target_qty),                                       
                    unitOfMeasure= item.sales_unit
                    # unitSize= ""                                           
                )
                item_ack = ItemAcknowledgementDTO(
                    acknowledgedQuantity= acknowledged_quantity,
                    acknowledgementCode= "Accepted" ,
                    # scheduledShipDate= "1970-01-01T00:00:00Z" ,                                                             
                    # scheduledDeliveryDate= "1970-01-01T00:00:00Z" ,                                                       
                    rejectionReason= ""                                                        
                )
                item_acknowledgements.append(item_ack)

                ordered_quantity = OrderedQuantityDTO(
                   amount= int(item.target_qty),                                          
                    unitOfMeasure= item.sales_unit
                    # unitSize= ""                                              
                )
                net_cost = NetCostDTO(
                    currencyCode="INR",                                                   
                    amount=str(item.base_price)                                            
                )
                list_price = ListPriceDTO(
                    currencyCode= "INR",                                                              
                    amount= str(item.mrp)
                )
                item_dto = ItemDTO(
                    itemAcknowledgements= item_acknowledgements,   
                    orderedQuantity= ordered_quantity,
                    itemSequenceNumber= item.item_number,
                    amazonProductIdentifier= item.customer_product_id,
                    vendorProductIdentifier=item.ean,
                    netCost= net_cost,
                    listPrice= list_price    
                    # discountMultiplier=""                                                     
                )
                items.append(item_dto)

            address = AddressDTO(                                                           
                addressLine1=   payload.others.get("address",{}).get("addressLine1", ""),
                countryCode= payload.others.get("address",{}).get("countryCode", ""),                
                name= payload.others.get("address",{}).get("name", ""),
                addressLine2= "",
                addressLine3= "",                          
                city= payload.others.get("address",{}).get("city", ""),
                county= "India",               
                district= "",                         
                stateOrRegion= payload.others.get("address",{}).get("stateOrRegion", ""),
                postalCode= payload.others.get("address",{}).get("postalCode", ""),
                phone= ""                              
            )
            tax_info = TaxInfoDTO(
                taxRegistrationNumber= payload.others.get("taxInfo", {}).get("taxRegistrationNumber", ""),
                taxRegistrationType= payload.others.get("taxInfo", {}).get("taxRegistrationType", "")            
            )
            selling_party = SellingPartyDTO(
                partyId= payload.vendor_code,
                address= address,
                taxInfo= tax_info
            )
            
            acknowledgement_iso_date = HelperClass().convert_local_to_iso(datetime.now())   
            acknowledgement = AcknowledgementDTO(
                purchaseOrderNumber= payload.po_number,
                acknowledgementDate= acknowledgement_iso_date,                               
                items= items,
                sellingParty= selling_party
            )
            return acknowledgement
        
        except Exception as e:
            logger.error("Exception in Amazon Ack Transformer -> po_acknowledgement_transformer", e)
            raise PoAcknowledgementException("purchaseOrderNumber", e)
        
    @log_decorator
    def invoice_items_transformer(self,item,po_data) -> InvoiceItem:
        try:
            logger.info('inside Amazon transformers -> invoice_items_transformer')
            net_cost = float(item.get("costPrice", ""))/int(float(item.get("outerCaseSize","")))
            net_cost = net_cost/int(float(item.get("Quantity","")))
            invoice_quantity = int(int(float(item.get("Quantity",""))) * int(float(item.get("outerCaseSize",""))))
            netCost = Amount(
                amount = round(net_cost,2)
                )
            hsnCode = item.get("hsnCode", "")
            if item.get("CGST","").strip() and item.get("SGST","").strip():
                taxDetails = [
                    TaxDetail(
                        taxRate = item.get("CGST","").strip(),
                        taxableAmount = Amount(
                            amount = round((float(net_cost) * float(invoice_quantity)),2)
                        ),
                        taxAmount = Amount(
                            amount = round(float(item.get("CGST_Value","")) ,2)
                        ),
                        taxType = "CGST"
                    ),
                    TaxDetail(
                        taxRate = item.get("SGST","").strip(),
                        taxableAmount = Amount(
                            amount = round((float(net_cost) * float(invoice_quantity)),2)
                        ),
                        taxAmount = Amount(
                            amount = round(float(item.get("SGST_Value","")),2)
                        ),
                        taxType = "SGST"
                    )
                ]
            else:
                taxDetails = [
                    TaxDetail(
                        taxRate = item.get("IGST","").strip(),
                        taxableAmount = Amount(
                            amount = round((float(net_cost) * float(invoice_quantity)),2)
                        ),
                        taxAmount = Amount(
                            amount = round(float(item.get("IGST_Value","")),2)
                        ),
                        taxType = "IGST"
                    )
                ]
            itemSequenceNumber = int(item.get("PoItemNumber", ""))
            amazonProductIdentifier = po_data.get("customer_product_id","")
            purchaseOrderNumber = po_data.get("po_number","")
            vendorProductIdentifier = po_data.get("ean","")
            invoicedQuantity = InvoicedQuantity(
                amount = invoice_quantity
            )
            return InvoiceItem(
                netCost = netCost,
                hsnCode = hsnCode,
                taxDetails = taxDetails,
                itemSequenceNumber = itemSequenceNumber,
                amazonProductIdentifier = amazonProductIdentifier,
                purchaseOrderNumber = purchaseOrderNumber,
                vendorProductIdentifier = vendorProductIdentifier,
                invoicedQuantity = invoicedQuantity
            )
        except Exception as e:
            logger.error("Exception in Amazon Transformer -> invoice_items_transformer", e)
            raise PoTransformerException("purchaseOrderNumber", e)

    @log_decorator    
    def invoice_header_transformer(self,po_data:dict,header_data:dict,invoice_items:InvoiceItem,tax_data:dict) -> InvoiceDTO:
        try:
            logger.info('inside Amazon transformers -> invoice_header_transformer')
            date = self.HELPER_CLASS.convert_local_to_iso(po_data.get("InvoiceDate","") + po_data.get("InvoiceTime","")) #need to check
            billToParty = Party(
                taxRegistrationDetails = [
                    TaxRegistrationDetail(
                        taxRegistrationNumber = po_data.get("CustomerGST", ""),
                    )
                ],
                address = Address(
                    stateOrRegion =  constants.ISO_STATE_CODE.get(po_data.get("CustomerStateISO","")),
                    postalOrZipCode = po_data.get("CustomerPostalCode",""),
                    city = po_data.get("CustomerCity",""),
                    district = po_data.get("CustomerDistrict",""),
                    name = constants.ARIRL_INVOICE_NAME,
                    addressLine1 = po_data.get("CustomerAddress",""),
                ),
                partyId = header_data.get("site_code","")
            )
            taxDetails = []
            for tax_detail in tax_data.get('results',[]):
                taxDetails.append(
                        TaxDetail(
                        taxRate = tax_detail.get("percent","").strip(),
                        taxableAmount = Amount(
                            amount = round(float(tax_detail.get('taxableAmount','0')),2)
                        ),
                        taxAmount = Amount(
                            amount = round(float(tax_detail.get('taxValue','0')) ,2)
                        ),
                        taxType = tax_detail.get('taxtype','')
                    ))
            remitToParty = Party(
                taxRegistrationDetails = [
                    TaxRegistrationDetail(
                        taxRegistrationNumber = po_data.get("RemitToGST", ""),
                    )
                ],
                address = Address(
                    stateOrRegion = constants.ISO_STATE_CODE.get(po_data.get("RemitToStateISO","")), 
                    postalOrZipCode = po_data.get("RemitToPostalCode",""),
                    city = po_data.get("RemitToCity",""),
                    district = po_data.get("RemitToDistrict",""),
                    name = constants.TCPL_INVOICE_NAME, 
                    addressLine1 = po_data.get("RemitToAddress",""),
                ),
                partyId = header_data.get("vendor_code","")
            )
            shipFromParty = Party(
                taxRegistrationDetails = [
                    TaxRegistrationDetail(
                        taxRegistrationNumber = po_data.get("ShipFromGST", ""),
                    )
                ],
                address = Address(
                    stateOrRegion = constants.ISO_STATE_CODE.get(po_data.get("ShipFromState","")),
                    postalOrZipCode = po_data.get("ShipFromPostalCode",""),
                    city = po_data.get("ShipFromCity",""),
                    district = po_data.get("ShipFromDistrict",""),
                    name = constants.TCPL_INVOICE_NAME,
                    addressLine1 = po_data.get("ShipFromAddress",""),
                ),
                partyId = header_data.get("vendor_code","")
            )
            id = po_data.get("Invoice","")
            shipToParty = Party(
                taxRegistrationDetails = [
                    TaxRegistrationDetail(
                        taxRegistrationNumber = po_data.get("ShipToGST", ""),
                    )
                ],
                address = Address(
                    stateOrRegion = constants.ISO_STATE_CODE.get(po_data.get("ShipToState","")),
                    postalOrZipCode = po_data.get("ShipToPostalCode",""),
                    city = po_data.get("ShipToCity",""),
                    district = po_data.get("ShipToDistrict",""),
                    name = constants.ARIRL_INVOICE_NAME,
                    addressLine1 = po_data.get("ShipToAddress",""),
                ),
                partyId = header_data.get("site_code","")
            )
            invoiceTotal = Amount(
                amount = po_data.get("totNetAmt","")
            )
            paymentTerms = PaymentTerms(
                netDueDays = 21,
                type = "Basic"
            )
            return InvoiceDTO(
                date = date,
                billToParty = billToParty,
                taxDetails = taxDetails,
                remitToParty = remitToParty,
                shipFromParty = shipFromParty,
                id = id,
                items = invoice_items,
                shipToParty = shipToParty,
                invoiceTotal = invoiceTotal,
                paymentTerms = paymentTerms
            )
        except Exception as e:
            logger.error("Exception in Amazon Transformer -> invoice_header_transformer", e)
            raise PoTransformerException("purchaseOrderNumber", e)
        
    @log_decorator
    def asn_items_transformer(self,item:dict,po_data:dict) -> ShippedItem:
        logger.info('inside Amazon transformers -> asn_items_transformer')
        try:
            shipped_quantity = ShippedQuantity(
                amount = int(int(float(item.get("Quantity",""))) * int(float(item.get("outerCaseSize",""))))
            )
            item_details = ItemDetails(
                purchaseOrderNumber = po_data.get("po_number",""),
                maximumRetailPrice = MaximumRetailPrice(
                    amount = item.get("CorrectMRP","")
                )
            )
            itemSequenceNumber = item.get("PoItemNumber", "")
            amazonProductIdentifier = po_data.get("customer_product_id","")
            vendorProductIdentifier = po_data.get("ean","")
            return ShippedItem(
                itemSequenceNumber = itemSequenceNumber,
                shippedQuantity = shipped_quantity,
                amazonProductIdentifier = amazonProductIdentifier,
                vendorProductIdentifier = vendorProductIdentifier,
                itemDetails= item_details
            )
        except Exception as e:
            logger.error("Exception in Amazon Transformer -> asn_items_transformer", e)
            raise e
    
    @log_decorator
    def asn_header_transformer(self,asn_data:dict,header_data:dict,asn_items:list,po:str) -> ShipmentConfirmationDTO:
        logger.info('inside Amazon transformers -> asn_header_transformer')
        try:
            date = self.HELPER_CLASS.convert_local_to_iso(asn_data.get("DeliveryDate","") + asn_data.get("DeliveryTime",""))
            asn_number = asn_data.get("Invoice","")
            shipFromParty = AsnParty(
                taxRegistrationDetails = [
                    AsnTaxRegistrationDetail(
                        taxRegistrationNumber = asn_data.get("ShipFromGST", ""),
                    )
                ],
                address = AsnAddress(
                    stateOrRegion = constants.ISO_STATE_CODE.get(asn_data.get("ShipFromState","")),
                    postalCode = asn_data.get("ShipFromPostalCode",""),
                    city = asn_data.get("ShipFromCity",""),
                    district = asn_data.get("ShipFromDistrict",""),
                    name = constants.TCPL_INVOICE_NAME,
                    addressLine1 = asn_data.get("ShipFromAddress",""),
                ),
                partyId = header_data.get("vendor_code","")
            )
            shipToParty = AsnParty(
                taxRegistrationDetails = [
                    AsnTaxRegistrationDetail(
                        taxRegistrationNumber = asn_data.get("ShipToGST", ""),
                    )
                ],
                address = AsnAddress(
                    stateOrRegion = constants.ISO_STATE_CODE.get(asn_data.get("ShipToState","")),
                    postalCode = asn_data.get("ShipToPostalCode",""),
                    city = asn_data.get("ShipToCity",""),
                    district = asn_data.get("ShipToDistrict",""),
                    name = constants.ARIRL_INVOICE_NAME,
                    addressLine1 = asn_data.get("ShipToAddress",""),
                ),
                partyId = header_data.get("site_code","")
            )
            sellingParty = AsnParty(
                taxRegistrationDetails = [
                    AsnTaxRegistrationDetail(
                        taxRegistrationNumber = asn_data.get("ShipFromGST", ""),
                    )
                ],
                address = AsnAddress(
                    stateOrRegion = constants.ISO_STATE_CODE.get(asn_data.get("ShipFromState","")),
                    postalCode = asn_data.get("ShipFromPostalCode",""),
                    city = asn_data.get("ShipFromCity",""),
                    district = asn_data.get("ShipFromDistrict",""),
                    name = constants.TCPL_INVOICE_NAME,
                    addressLine1 = asn_data.get("ShipFromAddress",""),
                ),
                partyId = header_data.get("vendor_code","")
            )
            return ShipmentConfirmationDTO(
                shipmentConfirmations = [
                    ShipmentConfirmation(
                        sellingParty = sellingParty,
                        shipFromParty = shipFromParty,
                        shipToParty = shipToParty,
                        shipmentConfirmationDate = date,
                        shipmentIdentifier = asn_number,
                        shippedItems = asn_items
                    )
                ]
            )
        except Exception as e:
            logger.error("Exception in Amazon Transformer -> asn_header_transformer", e)
            raise e