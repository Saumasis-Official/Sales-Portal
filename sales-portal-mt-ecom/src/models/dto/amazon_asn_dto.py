from pydantic import BaseModel
from typing import List, Optional

class MaximumRetailPrice(BaseModel):
    amount: str
    currencyCode: str  = 'INR'

class ItemDetails(BaseModel):
    purchaseOrderNumber: str
    maximumRetailPrice: MaximumRetailPrice
    handlingCode: str = "Food"

class ShippedQuantity(BaseModel):
    amount: int
    unitOfMeasure: str = "Eaches"

class ShippedItem(BaseModel):
    itemSequenceNumber: str
    shippedQuantity: ShippedQuantity
    amazonProductIdentifier: str
    vendorProductIdentifier: str
    itemDetails: ItemDetails

class AsnAddress(BaseModel):
    addressLine1: str
    countryCode: str = "IN"
    name: Optional[str] = ""
    addressLine2: Optional[str] = ""
    addressLine3: Optional[str] = ""
    city: str
    county: Optional[str] = ""
    district: str
    stateOrRegion: str
    postalCode: str
    phone: Optional[str] = ""

class AsnTaxRegistrationDetail(BaseModel):
    taxRegistrationNumber: str
    taxRegistrationType: str = "GST"

class AsnParty(BaseModel):
    partyId: str
    address: AsnAddress
    taxRegistrationDetails: List[AsnTaxRegistrationDetail]

class ShipmentConfirmation(BaseModel):
    sellingParty: AsnParty
    shipFromParty: AsnParty
    shipToParty: AsnParty
    shipmentConfirmationDate: str
    shipmentConfirmationType: str = "Original"
    shipmentIdentifier: str
    shippedItems: List[ShippedItem]

class ShipmentConfirmationDTO(BaseModel):
    shipmentConfirmations: List[ShipmentConfirmation]