from enum import Enum

"""
Description: This maintains the customer name as it is maintained in masters
"""


class Customers(str, Enum):
    RELIANCE = "Reliance"
    BLINKIT = "Grofers"
    AMAZON = "ARIPL"   
    BIGBASKET = "BigBasket"        
    SWIGGY = "Swiggy"   
    ZEPTO = "Zepto"      
