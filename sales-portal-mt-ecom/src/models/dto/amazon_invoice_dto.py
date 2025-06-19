from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TaxRegistrationDetail(BaseModel):
    taxRegistrationType: str = "GST"
    taxRegistrationNumber: str


class Address(BaseModel):
    stateOrRegion: str
    postalOrZipCode: str
    phone: Optional[str] = ""
    city: str
    countryCode: str = "IN"
    district: str
    name: Optional[str] = ""
    addressLine1: str
    addressLine2: Optional[str] = ""
    addressLine3: Optional[str] = ""


class Party(BaseModel):
    taxRegistrationDetails: List[TaxRegistrationDetail]
    address: Address
    partyId: str


class Amount(BaseModel):
    amount: float
    currencyCode: str = "INR"


class TaxDetail(BaseModel):
    taxRate: str
    taxableAmount: Amount
    taxAmount: Amount
    taxType: str


class InvoicedQuantity(BaseModel):
    amount: float
    unitOfMeasure: str = "Eaches"


class InvoiceItem(BaseModel):
    netCost: Amount
    hsnCode: str
    taxDetails: List[TaxDetail]
    itemSequenceNumber: int
    amazonProductIdentifier: str
    purchaseOrderNumber: str
    vendorProductIdentifier: str
    invoicedQuantity: InvoicedQuantity


class PaymentTerms(BaseModel):
    netDueDays: int
    type: str


class InvoiceDTO(BaseModel):
    date: str
    billToParty: Party
    taxDetails: List[TaxDetail]
    remitToParty: Party
    invoiceType: str = "Invoice"
    shipFromParty: Party
    id: str
    items: List[InvoiceItem]
    shipToParty: Party
    paymentTerms: PaymentTerms
    invoiceTotal: Amount
