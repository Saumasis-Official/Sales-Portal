from src.models.dto.po_dto import PoDTO
from src.services.data_persist_service import DataPersistService
from src.enums.mt_ecom_status_type import MtEcomStatusType
from src.enums.error_message import ErrorMessage
from src.transformers.sap_transformers import SapTransformers
from src.config.configurations import SAP_URLS
from src.utils.mail_helper import MailHelper
from src.models.dto.validation_dto import ValidationDTO
from src.exceptions.article_lookup_exception import ArticleLookupException
from src.exceptions.mrp_exception import MrpException
from src.exceptions.caselot_exception import CaselotException
from src.enums.success_message import SuccessMessage
from src.services.mulesoft_service import MulesoftService
from src.utils import constants
from src.libs.loggers import Logger,log_decorator
from src.enums.customers_enum import Customers
from src.utils.sap_service import SapService
mulesoft_service = MulesoftService()
import math
from src.exceptions.base_price_exception import BasePriceException
from src.constants.globals import GlobalsVars

sap_service = SapService()
logger = Logger("WorkflowValidationService")
global_var = GlobalsVars()
class WorkflowValidationService:
    DATA_PERSIST_SERVICE = None
    SAP_TRANSFORMERS = None
    SAP_SERVICES = None
    MAIL_HELPER = None

    def __init__(self):
        self.DATA_PERSIST_SERVICE = DataPersistService()
        self.SAP_TRANSFORMERS = SapTransformers()
        self.MAIL_HELPER = MailHelper()

    @log_decorator
    def article_lookup_validation(self, order: PoDTO, id: int):
        """
        Description: This method will validate the article lookup for the order.
        """
        try:
            article_mapping = self.DATA_PERSIST_SERVICE.fetch_article_details(
                order.items, order.site_code, order.vendor_code
            )
            mail_data = []
            persist_data = []
            article_failed_items = []
            log_flag = False
            status : str = ''
            for index, item in enumerate(order.items):
                article_data = article_mapping.get(str(item.customer_product_id))
                vendor_code_flag = self.DATA_PERSIST_SERVICE.check_vendor_code(order.vendor_code)
                if article_data:
                    item.psku_code = article_data.get('psku')
                    item.psku_description = article_data.get('psku_desc')
                    item.plant_code = article_data.get('plant_code')
                    item.system_sku_code = article_data.get('sku')
                    item.system_sku_description = article_data.get('sku_desc')
                    data = {
                        "item_number": item.item_number,
                        "psku_code": item.psku_code,
                        "psku_description": item.psku_description,
                        "plant_code": item.plant_code,
                        "system_sku_code": item.system_sku_code,
                        "system_sku_description": item.system_sku_description,
                        "status": MtEcomStatusType.ARTICLE_SUCCESS,
                        "id": id,
                        "site_code": order.site_code,   

                    }
                    persist_data.append(data)
                elif not order.customer_code:
                    log_flag = True
                    message = ErrorMessage.SITE_CODE_MISSING.format(
                        site_code = order.site_code,
                        customer_product_id=item.customer_product_id
                    )
                    self.DATA_PERSIST_SERVICE.update_status(
                        id, message, MtEcomStatusType.ARTICLE_FAILED, item.item_number
                    )
                    mail_item = {
                        "Item Number": item.item_number,
                        "EAN": item.ean,
                        "Customer Product ID": item.customer_product_id,
                    }
                    mail_data.append(mail_item)
                    article_failed_items.append(item)
                elif not item.customer_product_id or not item.customer_product_id.lstrip('0'):
                    log_flag = True
                    message = ErrorMessage.CUSTOMER_PRODUCT_ID_MISSING.format(
                        site_code= order.site_code
                    )
                    self.DATA_PERSIST_SERVICE.update_status(
                        id, message, MtEcomStatusType.VALIDATION_FAILED, item.item_number
                    )
                    mail_item = {
                        "Item Number": item.item_number,
                        "EAN": item.ean,
                        "Customer Product ID": item.customer_product_id,
                    }
                    mail_data.append(mail_item)
                    article_failed_items.append(item)
                elif not vendor_code_flag:
                    log_flag = True
                    message = ErrorMessage.VENDOR_ID_MISSING.format(
                        vendor_code = order.vendor_code,
                        customer_product_id=item.customer_product_id
                    )
                    self.DATA_PERSIST_SERVICE.update_status(
                        id, message, MtEcomStatusType.ARTICLE_FAILED, item.item_number
                    )
                    mail_item = {
                        "Item Number": item.item_number,
                        "EAN": item.ean,
                        "Customer Product ID": item.customer_product_id,
                    }
                    mail_data.append(mail_item)
                    article_failed_items.append(item)
                else:
                    # Update the item in database
                    log_flag = True
                    message = ErrorMessage.ARTICLE_ERROR.format(
                        customer_product_id=item.customer_product_id,
                        site_code= order.site_code,
                    )
                    self.DATA_PERSIST_SERVICE.update_status(
                        id, message, MtEcomStatusType.ARTICLE_FAILED, item.item_number
                    )
                    mail_item = {
                        "Item Number": item.item_number,
                        "EAN": item.ean,
                        "Customer Product ID": item.customer_product_id,
                    }
                    mail_data.append(mail_item)
                    # remove the item from the order
                    # order.items.pop(index)
                    article_failed_items.append(item)
            order.items = [item for item in order.items if item not in article_failed_items]
            #save data to item table
            if len(persist_data):
                self.DATA_PERSIST_SERVICE.update_materials(persist_data)
            if len(mail_data) > 0:
                body = {
                    "po_number": order.po_number,
                    "id": id,
                    "type": constants.ARTICLE_FAILED,
                    "details": mail_data,
                }
                self.MAIL_HELPER.send_mail(body, constants.ARTICLE_FAILED)
            if log_flag:
                log = {
                    "po_number": order.po_number,
                    "log": ErrorMessage.ARTICLE_ERROR,
                    "status": MtEcomStatusType.ARTICLE_FAILED,
                }
                status = MtEcomStatusType.ARTICLE_FAILED
            else:
                log = {
                    "po_number": order.po_number,
                    "log": SuccessMessage.ARTICLE_SUCCESS,
                    "status": MtEcomStatusType.ARTICLE_SUCCESS,
                }
                status = MtEcomStatusType.ARTICLE_SUCCESS
                
            self.DATA_PERSIST_SERVICE.update_header_status(id, status)    
            self.DATA_PERSIST_SERVICE.create_logs(log)
            return order
        except Exception as e:
            logger.error("Exception in article_lookup_validation", e)
            raise ArticleLookupException(order.po_number, e)

    @log_decorator
    def mrp_check_1_validation(self, order: PoDTO, id: int):
        """
        Description: This method will validate the MRP check-1 for the order.
        """
        try:
            mail_data = []
            log_flag = False
            status : str =''
            mrp_payload: ValidationDTO = self.SAP_TRANSFORMERS.validation_payload(order)

            # mrp_check_response = mulesoft_service.so_validation_check(mrp_payload)
            mrp_check_response = sap_service.mrp_and_caselot_check(mrp_payload.model_dump())
            mrp_req = {"req": mrp_payload.model_dump(), "res": mrp_check_response.json()}
            self.DATA_PERSIST_SERVICE.save_req_res(
                mrp_req, {"type": "MRP Request and Response", "po_number": order.po_number}
            )
            mrp_check_response = mrp_check_response.json()
            mrp_check_response = mrp_check_response.get('data',{}).get('data',{})
            if (
                    mrp_check_response
                    and mrp_check_response.get("d")
                    and bool(mrp_check_response.get("d").get("NAVRESULT")) is True
                    and mrp_check_response.get("d").get("NAVRESULT").get("results")
                    and len(mrp_check_response.get("d").get("NAVRESULT").get("results")) > 0
            ):
                sap_item_list = mrp_check_response.get("d").get("NAVRESULT").get("results")
                sap_item_list.sort(key=lambda d: d.get("ItemNumber"))
                order.items.sort(key=lambda d: d.item_number)
                for index, (item_data, sap_item_data) in enumerate(
                        zip(order.items, sap_item_list)
                ):
                    if sap_item_data.get("IsValid") == "false":
                        log_flag = True
                        if order.items[index].ror == "":
                            self.DATA_PERSIST_SERVICE.update_status(
                                id,
                                ErrorMessage.MRP_ROR_ERROR,
                                MtEcomStatusType.MRP_FAILED,
                                item_data.item_number,
                                sap_item_data.get("CorrectMRP"),
                                "0.00",
                            )
                            order.items[index].ror = ErrorMessage.MRP_ROR_CODE
                            mail_item = {
                                "Item Number": item_data.item_number,
                                "Updated Mrp": sap_item_data.get("CorrectMRP", ""),
                                "ParentSKUCode": item_data.psku_code,
                                "Parent SKU Description": item_data.psku_description,
                                "SKU Code": item_data.system_sku_code,
                                "SKU Description": item_data.system_sku_description,
                                "MRP": item_data.mrp,
                                "EAN": item_data.ean,
                                "Customer Product ID": item_data.customer_product_id,
                            }
                            mail_data.append(mail_item)
                        else :
                           self.DATA_PERSIST_SERVICE.update_status(
                            id,
                            "",
                            MtEcomStatusType.MRP_FAILED,
                            item_data.item_number,
                            sap_item_data.get("CorrectMRP"),
                            "0.00",
                        )
                    else:
                        self.DATA_PERSIST_SERVICE.update_status(
                            id, "", MtEcomStatusType.MRP_SUCCESS, item_data.item_number,sap_item_data.get("CorrectMRP"),
                        )
            else:
                logger.error("Error in MRP check SAP response failed:",mrp_check_response.json())
                return ''
            subject = "Error in MRP check"
            body = {
                "po_number": order.po_number,
                "id": id,
                "type": constants.MRP_FAILED,
                "details": mail_data,
            }
            if len(mail_data):
                self.MAIL_HELPER.send_mail(body, subject)
            if log_flag:
                log = {
                    "po_number": order.po_number,
                    "log": ErrorMessage.MRP_ROR_ERROR,
                    "status": MtEcomStatusType.MRP_FAILED,
                }
                status = MtEcomStatusType.MRP_FAILED
            else:
                log = {
                    "po_number": order.po_number,
                    "log": ErrorMessage.MRP_ROR_ERROR,
                    "status": MtEcomStatusType.MRP_SUCCESS,
                }
                status = MtEcomStatusType.MRP_SUCCESS

            self.DATA_PERSIST_SERVICE.update_header_status(id, status)
            self.DATA_PERSIST_SERVICE.create_logs(log)
            return order
        except Exception as e:
            logger.error("Exception in mrp_check_1_validation", e)
            raise MrpException(order.po_number, e)
    
    def base_price_validation(self, order: PoDTO, id: int):
        """
        Description: This method will validate the base price for the order.
        """
        try:
            mail_data = []
            log_flag = False
            status: str = ''
            base_price_payload: ValidationDTO = self.SAP_TRANSFORMERS.validation_payload(order)
            # base_price_response = mulesoft_service.so_validation_check(base_price_payload)
            base_price_response = sap_service.mrp_and_caselot_check(base_price_payload.model_dump())
            base_price_req = {"req": base_price_payload.model_dump(), "res": base_price_response.json()}
            self.DATA_PERSIST_SERVICE.save_req_res(
                base_price_req,
                {"type": "Base Price Request and Response", "po_number": order.po_number},
            )
            base_price_response = base_price_response.json()
            base_price_response = base_price_response.get('data',{}).get('data',{})
            if (
                    base_price_response
                    and base_price_response.get("d")
                    and bool(base_price_response.get("d").get("NAVRESULT")) is True
                    and base_price_response.get("d").get("NAVRESULT").get("results")
                    and len(base_price_response.get("d").get("NAVRESULT").get("results")) > 0
            ):
                sap_item_list = (
                    base_price_response.get("d").get("NAVRESULT").get("results")
                )
                sap_item_list.sort(key=lambda d: d.get("ItemNumber"))
                order.items.sort(key=lambda d: d.item_number)
                for index, (item_data, sap_item_data) in enumerate(
                        zip(order.items, sap_item_list)
                ):
                    if sap_item_data.get("BasePriceValid") == "false":
                        # Update the item in database
                        log_flag = True
                      
                        if order.items[index].ror == "":
                            order.items[index].ror = ErrorMessage.MRP_ROR_CODE
                            update_base_price = {
                                "id": id,
                                "message": ErrorMessage.BASE_PRICE_ROR_ERROR,
                                "status": MtEcomStatusType.BASE_PRICE_FAILED,
                                "item_number": item_data.item_number,
                                "correct_base_price": sap_item_data.get("CorrectBasePrice"),
                            }
                            self.DATA_PERSIST_SERVICE.update_base_price(update_base_price)
                            mail_item = {
                                "Item Number": item_data.item_number,
                                "Updated Base Price": sap_item_data.get("CorrectBasePrice",""),
                                "ParentSKUCode": item_data.psku_code,
                                "Parent SKU Description": item_data.psku_description,
                                "SKU Code": item_data.system_sku_code,
                                "SKU Description": item_data.system_sku_description,
                                "Base Price": item_data.base_price,
                                "EAN": item_data.ean,
                                "Customer Product ID": item_data.customer_product_id,
                            }
                            mail_data.append(mail_item)
                        else :
                           update_base_price = {
                                "id": id,
                                "message": "",
                                "status": MtEcomStatusType.BASE_PRICE_FAILED,
                                "item_number": item_data.item_number,
                                "correct_base_price": sap_item_data.get("CorrectBasePrice"),
                            }
                           self.DATA_PERSIST_SERVICE.update_base_price(update_base_price)
                    elif sap_item_data.get("BasePriceValid") == "true":
                        update_base_price = {
                                "id": id,
                                "message": "",
                                "status": MtEcomStatusType.BASE_PRICE_SUCCESS,
                                "item_number": item_data.item_number,
                                "correct_base_price": sap_item_data.get("CorrectBasePrice"),
                            }
                        self.DATA_PERSIST_SERVICE.update_base_price(update_base_price)
                    else:
                        update_base_price = {
                                "id": id,
                                "message": "",
                                "status": "",
                                "item_number": item_data.item_number,
                                "correct_base_price": sap_item_data.get("CorrectBasePrice"),
                            }
                        self.DATA_PERSIST_SERVICE.update_base_price(update_base_price)
            else: 
                logger.error("Error in Base Price check SAP response failed:",base_price_response.json())
                return ''
            subject = subject = "Error in Base Price check"
            body = {
                "po_number": order.po_number,
                "id": id,
                "type":  constants.BASE_PRICE_FAILED,
                "details": mail_data,
            }
            if len(mail_data):
                self.MAIL_HELPER.send_mail(body, subject)
            if log_flag:
                log = {
                    "po_number": order.po_number,
                    "log": ErrorMessage.BASE_PRICE_ROR_ERROR,
                    "status": MtEcomStatusType.BASE_PRICE_FAILED,
                }
                status = MtEcomStatusType.BASE_PRICE_FAILED
            else:
                log = {
                    "po_number": order.po_number,
                    "log": MtEcomStatusType.BASE_PRICE_SUCCESS,
                    "status": MtEcomStatusType.BASE_PRICE_SUCCESS,
                }
                status = MtEcomStatusType.BASE_PRICE_SUCCESS
            self.DATA_PERSIST_SERVICE.update_header_status(id, status)
            self.DATA_PERSIST_SERVICE.create_logs(log)
            return order
        except Exception as e:
            raise BasePriceException(order.po_number, e)

    @log_decorator
    def caselot_validation(self, order: PoDTO, header_table_id: int, customer : str):
        """
        Description: This method will validate the caselot for the order.
        """
        try:
            mail_data = []
            log_flag = False
            status: str = ''
            if(customer == Customers.AMAZON):
                return order
            caselot_payload: ValidationDTO = self.SAP_TRANSFORMERS.validation_payload(order)
            # caselot_check_response = mulesoft_service.so_validation_check(caselot_payload)
            caselot_check_response = sap_service.mrp_and_caselot_check(caselot_payload.model_dump())
         
            caselot_req = {"req": caselot_payload.model_dump(), "res": caselot_check_response.json()}
            self.DATA_PERSIST_SERVICE.save_req_res(
                caselot_req,
                {"type": "Caselot Request and Response", "po_number": order.po_number},
            )
            caselot_check_response = caselot_check_response.json()
            caselot_check_response = caselot_check_response.get('data',{}).get('data',{})
            if (
                    caselot_check_response
                    and caselot_check_response.get("d")
                    and bool(caselot_check_response.get("d").get("NAVRESULT")) is True
                    and caselot_check_response.get("d").get("NAVRESULT").get("results")
                    and len(caselot_check_response.get("d").get("NAVRESULT").get("results")) > 0
            ):
                sap_item_list = (
                    caselot_check_response.get("d").get("NAVRESULT").get("results")
                )
                sap_item_list.sort(key=lambda d: d.get("ItemNumber"))
                order.items.sort(key=lambda d: d.item_number)
                for index, (item_data, sap_item_data) in enumerate(
                        zip(order.items, sap_item_list)
                ):
                    if sap_item_data.get("IsCaseLotValid") == "false":
                        # Update the item in database
                        log_flag = True
                      
                        if order.items[index].ror == "":
                            order.items[index].ror = ErrorMessage.CASELOT_ROR_CODE
                            self.DATA_PERSIST_SERVICE.update_status(
                            header_table_id,
                            ErrorMessage.CASELOT_ROR_ERROR,
                            MtEcomStatusType.CASELOT_FAILED,
                            item_data.item_number,
                            sap_item_data.get("CorrectMRP"),
                            sap_item_data.get("CorrectCaseLot")
                        )
                            mail_item = {
                                "Item Number": item_data.item_number,
                                "Updated Caselot": sap_item_data.get("CorrectCaseLot",""),
                                "ParentSKUCode": item_data.psku_code,
                                "Parent SKU Description": item_data.psku_description,
                                "SKU Code": item_data.system_sku_code,
                                "SKU Description": item_data.system_sku_description,
                                "Caselot": item_data.caselot,
                                "EAN": item_data.ean,
                                "Customer Product ID": item_data.customer_product_id,
                            }
                            mail_data.append(mail_item)
                        else :
                           self.DATA_PERSIST_SERVICE.update_status(
                            header_table_id,
                            "",
                            MtEcomStatusType.CASELOT_FAILED,
                            item_data.item_number,
                            sap_item_data.get("CorrectMRP"),
                            sap_item_data.get("CorrectCaseLot")
                        )
                    elif sap_item_data.get("IsCaseLotValid") == "true":
                        self.DATA_PERSIST_SERVICE.update_status(
                            header_table_id,
                            "",
                            MtEcomStatusType.CASELOT_SUCCESS,
                            item_data.item_number,
                            sap_item_data.get("CorrectMRP"),
                            sap_item_data.get("CorrectCaseLot"),
                        )
                    else:
                        self.DATA_PERSIST_SERVICE.update_status(
                            header_table_id,
                            "",
                            "",
                            item_data.item_number,
                            sap_item_data.get("CorrectMRP"),
                            sap_item_data.get("CorrectCaseLot")
                        )
            else: 
                logger.error("Error in SAP response failed: ",caselot_check_response.json())
                return ''
            subject = subject = "Error in Caselot check"
            body = {
                "po_number": order.po_number,
                "id": header_table_id,
                "type":  constants.CASELOT_FAILED,
                "details": mail_data,
            }
            if len(mail_data):
                self.MAIL_HELPER.send_mail(body, subject)
            if log_flag:
                log = {
                    "po_number": order.po_number,
                    "log": ErrorMessage.CASELOT_ROR_ERROR,
                    "status": MtEcomStatusType.CASELOT_FAILED,
                }
                status = MtEcomStatusType.CASELOT_FAILED
            else:
                log = {
                    "po_number": order.po_number,
                    "log": MtEcomStatusType.CASELOT_SUCCESS,
                    "status": MtEcomStatusType.CASELOT_SUCCESS,
                }
                status = MtEcomStatusType.CASELOT_SUCCESS
            self.DATA_PERSIST_SERVICE.update_header_status(header_table_id, status)
            self.DATA_PERSIST_SERVICE.create_logs(log)

            return order
        except Exception as e:
            logger.error("Exception in caselot_validation", e)
            raise CaselotException(order.po_number, e)
        

    @log_decorator
    def tot_validation(self, order: PoDTO, id: int):
        """
        Description: This method will validate the ToT for the order.
        """
        try:
            mail_data = []
            log_flag = False
            status : str =''
            tot_payload: ValidationDTO = self.SAP_TRANSFORMERS.validation_payload(order)
            tot_check_response = sap_service.mrp_and_caselot_check(tot_payload.model_dump())
            tot_req = {"req": tot_payload.model_dump(), "res": tot_check_response.json()}
            self.DATA_PERSIST_SERVICE.save_req_res(
                tot_req, {"type": "ToT Request and Response", "po_number": order.po_number}
            )
            tot_check_response = tot_check_response.json()
            tot_check_response = tot_check_response.get('data',{}).get('data',{})
            if (
                    tot_check_response
                    and tot_check_response.get("d")
                    and bool(tot_check_response.get("d").get("NAVRESULT")) is True
                    and tot_check_response.get("d").get("NAVRESULT").get("results")
                    and len(tot_check_response.get("d").get("NAVRESULT").get("results")) > 0
            ):
                sap_item_list = tot_check_response.get("d").get("NAVRESULT").get("results")
                sap_item_list.sort(key=lambda d: d.get("ItemNumber"))
                order.items.sort(key=lambda d: d.item_number)
                customer = global_var.get_current_customer()
                tot_tolerance = self.DATA_PERSIST_SERVICE.get_tot_tolerance(customer)
                for index, (item_data, sap_item_data) in enumerate(
                        zip(order.items, sap_item_list)
                ):
                    tot_margin = (
                        round(((float(item_data.mrp) - float(item_data.landing_price)) / float(item_data.mrp)) * 100, 2) 
                        if item_data.landing_price and item_data.mrp 
                        else 
                        round(((float(item_data.mrp) - (float(item_data.item_total_amount)/item_data.target_qty)) / float(item_data.mrp)) * 100,2) if item_data.item_total_amount and item_data.mrp
                        else 
                        0.0)
                    if not item_data.landing_price:
                        landing_price_data ={
                            "id": id,
                            "landing_price": float(item_data.item_total_amount)/item_data.target_qty,
                            "item_number": item_data.item_number,
                        }
                        self.DATA_PERSIST_SERVICE.update_landing_price(landing_price_data)
                    sap_tot = float(sap_item_data.get("TOTMargin").rstrip('-')) if sap_item_data.get("TOTMargin") else 0.0
                    if sap_tot: 
                        if tot_tolerance != 0:
                            tot_margin_tolerance_positive = round((tot_margin + (
                                tot_margin * tot_tolerance
                            )/100),2)
                            tot_margin_tolerance_negative = round((tot_margin - (
                                tot_margin * tot_tolerance
                            )/100),2)
                            if (sap_tot > tot_margin_tolerance_positive or 
                                sap_tot < tot_margin_tolerance_negative):
                                log_flag = True
                                tot_data = {
                                    "id": id,
                                    "message": ErrorMessage.TOT_ROR_ERROR,
                                    "status": MtEcomStatusType.TOT_FAILED,
                                    "item_number": item_data.item_number,
                                    "sap_tot": sap_tot,
                                    "tot_margin": tot_margin,
                                }
                                self.DATA_PERSIST_SERVICE.update_tot(tot_data)
                                order.items[index].ror = ErrorMessage.TOT_ROR_CODE
                                mail_item = {
                                        "Item Number": item_data.item_number,
                                        "ParentSKUCode": item_data.psku_code,
                                        "Parent SKU Description": item_data.psku_description,
                                        "SKU Code": item_data.system_sku_code,
                                        "SKU Description": item_data.system_sku_description,
                                        "ToT": tot_margin,
                                        "SAP ToT": sap_tot,
                                        "EAN": item_data.ean,
                                        "Customer Product ID": item_data.customer_product_id,
                                    }
                                mail_data.append(mail_item)
                            else:
                                tot_data = {
                                    "id": id,
                                    "message": '',
                                    "status": MtEcomStatusType.TOT_SUCCESS,
                                    "item_number": item_data.item_number,
                                    "sap_tot": sap_tot,
                                    "tot_margin": tot_margin,
                                }
                                self.DATA_PERSIST_SERVICE.update_tot(tot_data)
                    
                        else:
                            if sap_tot != tot_margin:
                                log_flag = True
                                tot_data = {
                                    "id": id,
                                    "message": ErrorMessage.TOT_ROR_ERROR,
                                    "status": MtEcomStatusType.TOT_FAILED,
                                    "item_number": item_data.item_number,
                                    "sap_tot": sap_tot,
                                    "tot_margin": tot_margin,
                                }
                                self.DATA_PERSIST_SERVICE.update_tot(tot_data)
                                order.items[index].ror = ErrorMessage.TOT_ROR_CODE
                                mail_item = {
                                    "Item Number": item_data.item_number,
                                    "ParentSKUCode": item_data.psku_code,
                                    "Parent SKU Description": item_data.psku_description,
                                    "SKU Code": item_data.system_sku_code,
                                    "SKU Description": item_data.system_sku_description,
                                    "ToT": tot_margin,
                                    "SAP ToT": sap_tot,
                                    "EAN": item_data.ean,
                                    "Customer Product ID": item_data.customer_product_id,
                                }
                                mail_data.append(mail_item)
                            else:
                                tot_data = {
                                    "id": id,
                                    "message": '',
                                    "status": MtEcomStatusType.TOT_SUCCESS,
                                    "item_number": item_data.item_number,
                                    "sap_tot": sap_tot,
                                    "tot_margin": tot_margin,
                                }
                                self.DATA_PERSIST_SERVICE.update_tot(tot_data)
                    else:
                        tot_data = {
                            "id": id,
                            "message": '',
                            "status": MtEcomStatusType.TOT_SUCCESS,
                            "item_number": item_data.item_number,
                            "sap_tot": sap_tot,
                            "tot_margin": tot_margin,
                        }
                        self.DATA_PERSIST_SERVICE.update_tot(tot_data)
            else:
                logger.error("Error ToT Validation SAP response failed:  ",tot_check_response.json())
                return ''

            if len(mail_data):
                subject = "Error in ToT check"
                body = {
                    "po_number": order.po_number,
                    "id": id,
                    "type": MtEcomStatusType.TOT_FAILED,
                    "details": mail_data,
                }
                self.MAIL_HELPER.send_mail(body, subject)
            if log_flag:
                log = {
                    "po_number": order.po_number,
                    "log": ErrorMessage.TOT_ROR_ERROR,
                    "status": MtEcomStatusType.TOT_FAILED,
                }
                status = MtEcomStatusType.TOT_FAILED
            else:
                log = {
                    "po_number": order.po_number,
                    "log": '',
                    "status": MtEcomStatusType.TOT_SUCCESS,
                }
                status = MtEcomStatusType.TOT_SUCCESS

            self.DATA_PERSIST_SERVICE.update_header_status(id, status)
            self.DATA_PERSIST_SERVICE.create_logs(log)
            return order
        except Exception as e:
            logger.error("Exception in tot_validation", e)
            raise MrpException(order.po_number, e)
            
    
