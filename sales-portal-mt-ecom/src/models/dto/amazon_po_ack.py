from pydantic import BaseModel
from typing import Literal,List, Optional
import pytz
from datetime import datetime

class AcknowledgedQuantityDTO(BaseModel):
    amount: int
    unitOfMeasure: str
    unitSize: int = 0    
                              #check type is int or str  unitSize and Amount  (4)
# def default_datetime() -> str:
#     # Define the local time zone (replace 'Asia/Kolkata' with your local time zone)
#     local_tz = pytz.timezone('Asia/Kolkata')
#     # Get the current UTC time and convert it to the local time zone
#     local_datetime = datetime.now(pytz.utc).astimezone(local_tz)
#     # Format the datetime object to the desired ISO 8601 format without microseconds and with 'Z' suffix
#     return local_datetime.strftime("%Y-%m-%dT%H:%M:%SZ")

class ItemAcknowledgementDTO(BaseModel):
    acknowledgedQuantity: AcknowledgedQuantityDTO
    acknowledgementCode: str
    # scheduledShipDate: Optional[str] = default_datetime()               
    # scheduledDeliveryDate: Optional[str] = default_datetime()             
    # rejectionReason: Optional[str] = None  

class OrderedQuantityDTO(BaseModel):
    amount: int                             #check type is int or str  unitSize and Amount  (4)
    unitOfMeasure: str
    unitSize: int  = 0                 

class NetCostDTO(BaseModel):
    currencyCode: str
    amount: str

class ListPriceDTO(BaseModel):
    currencyCode: str
    amount: str

class ItemDTO(BaseModel):
    itemAcknowledgements: List[ItemAcknowledgementDTO]
    orderedQuantity: OrderedQuantityDTO
    itemSequenceNumber: str
    amazonProductIdentifier: str
    vendorProductIdentifier: str
    netCost: NetCostDTO
    listPrice: ListPriceDTO
    discountMultiplier: Optional[str] = ""
    # isBackOrderAllowed: Optional[bool] = False   


class AddressDTO(BaseModel):
    addressLine1: str
    countryCode: str
    name: str
    addressLine2: Optional[str] = None
    addressLine3: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    district: Optional[str] = None
    stateOrRegion: Optional[str] = None
    postalCode: Optional[str] = None
    phone: Optional[str] = None

class TaxInfoDTO(BaseModel):
    taxRegistrationNumber: str = None
    taxRegistrationType: str = None

class SellingPartyDTO(BaseModel):
    partyId: str
    address: AddressDTO
    taxInfo: TaxInfoDTO

class AcknowledgementDTO(BaseModel):
    acknowledgementDate: str
    items: List[ItemDTO]
    purchaseOrderNumber: str
    sellingParty: SellingPartyDTO

class AmazonAcknowledgementsDTO(BaseModel):
    acknowledgements: List[AcknowledgementDTO]

