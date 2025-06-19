from src.transformers.blinkit_transformers import BlinkitTransformers
from src.models.dto.po_dto import PoDTO
from src.config.configurations import BLINKIT_APIS
from src.exceptions.po_acknowledgement_exception import PoAcknowledgementException
from src.enums.customers_enum import Customers
from src.transformers.amazon_transformers import AmazonTransformers
from src.libs.loggers import log_decorator,Logger

logger = Logger("PO_ACKNOWLEDGEMENT_SERVICE")

class PoAckService:
    BLINKIT_TRANSFORMER = None
    logger = None
    
    def __init__(self):
        self.BLINKIT_TRANSFORMER = BlinkitTransformers()
        self.AMAZON_TRANSFORMER = AmazonTransformers()
        self.customer_ack_methods = {
                Customers.BLINKIT: self.blinkit_po_ack,
                Customers.AMAZON: self.amazon_po_ack,
            # Add other customers and their methods here
        }

    @log_decorator
    def po_acknowledgement(self, order: PoDTO,customer: str) :
        """
        Description: This is a generic method to send PO Acknowledgement
            - it calls customer specific acknowledgement methods based on the customer
        """
        # check for the customer and then call the respective service 
        if customer in self.customer_ack_methods:
            logger.info(f"Sending PO Acknowledgement to {customer}")
            return self.customer_ack_methods[customer](order)
        else:
            raise ValueError(f"No acknowledgement method defined for customer: {customer}")

    @log_decorator
    def blinkit_po_ack(self, order: PoDTO) :
        """
        Description: Send po acknowledgement to Blinkit
            - accept order data
            - transform order data to respective payload
            - send acknowledgement
        Parameters:
            - order: PoDTO: order data
        Return: bool
        """
        try:
            blinkit_ack_response = self.BLINKIT_TRANSFORMER.po_acknowledgement_transformer(
                order.po_number,
                order.vendor_code,
                "Success",
                "PO_CREATION",
                "PO_CREATION"
            )
            logger.info(f"PO Acknowledgement sent to Blinkit for PO: {order.po_number}")
            return blinkit_ack_response
        except Exception as e:
            logger.error("EXCEPTION in PoAckService -> blinkit_po_ack", e)
            raise PoAcknowledgementException(order.po_number, e)

    @log_decorator
    def amazon_po_ack(self, order: PoDTO) :
        """
        Description: Send po acknowledgement to Amazon
            - accept order data
            - transform order data to respective payload
            - send acknowledgement
        Parameters:
            - order: PoDTO: order data
        Return: bool
        """
        try:
            amazon_ack_response = self.AMAZON_TRANSFORMER.po_acknowledgement_transformer(
                order     
            )
            logger.info(f"PO Acknowledgement sent to Amazon for PO: {order.po_number}")
            return amazon_ack_response
        except Exception as e:
            logger.error("EXCEPTION in PoAckService -> amazon_po_ack", e)
            raise PoAcknowledgementException(order.po_number, e)