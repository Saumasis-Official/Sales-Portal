from src.models.invoice_price_check_model import InvoicePriceCheckModel
from src.services.ean_mapping_service import EanMappingService
from src.utils.response_handlers import ResponseHandlers
from src.utils.sap_service import SapService
from src.utils.helper import HelperClass
from src.utils.invoice_price_check_acknowledgement_helper import AcknowledgementHelper
import json
import src.utils.constants as constants
import datetime
import src.utils.mail_helper as MailHelper
from src.utils.sqs_helper import SQSHelper



invoice_price_check_model = InvoicePriceCheckModel()
ean_mapping_service = EanMappingService()
response_handlers = ResponseHandlers()
helper = HelperClass()
sap_service = SapService()
acknowledgement_helper = AcknowledgementHelper()
mail_helper = MailHelper.MailHelper()
sqs_helper = SQSHelper()
class InvoicePriceCheckService:
    def response_check(self,inv_arr):
        count, invoice_number, return_str = {}, "", ""
        for inv in inv_arr:
            invoice_number = inv.get("Invoice", "")
            count[invoice_number] = count.get(invoice_number, 0) + 1
        if count[invoice_number] > 1:
            return_str = "Invoice_Splitted"
        else:
            return_str = "Not_Splitted"

        print(return_str)
        return return_str
    def check_invoice_price(self,flag = False,po_number = False):
        if po_number:
            non_invoiced_records = invoice_price_check_model.get_header_data(po_number)
        else:
            invoice_price_check_model.change_po_status_to_pending()
            non_invoiced_records = invoice_price_check_model.get_non_invoiced_items()
        for header in non_invoiced_records:
            status = invoice_price_check_model.get_item_status(header.get('id'))
            if status and len(status) > 0:
                item_data = invoice_price_check_model.get_non_invoiced_items(header.get('id'))
                item_data = [helper.remove_custom_types(obj) for obj in item_data]
                if item_data and len(item_data) > 0:
                    mrp_check_req = ean_mapping_service.prepare_mrp_check_2_payload(item_data, header.get('po_number'))
                    if mrp_check_req and mrp_check_req.get('status') == True:
                        if flag:
                            return mrp_check_req
                        else:
                            sqs_helper.send_data_to_invoice_sqs(mrp_check_req)
                else :
                    print('No Data Found')
            else:
                invoice_price_check_model.change_po_status_to_completed(header.get('po_number'))
        return response_handlers.send(200,'Success')
    def sap_check_invoice_price(self,event):
        mrp_check_req = {}
        mrp_check_resp = {}
        event = json.loads(event)
        receipt_handle = ''
        if event.get('body') and len(event['body']) > 0:
            mrp_check_req = json.loads(event.get('body'))
            mrp_check_req = mrp_check_req.get('data')
            receipt_handle = event.get('receiptHandle')
        else:
            mrp_check_req = event
        mrp_check_resp = sap_service.mrp_check_2(mrp_check_req)
        if (
            mrp_check_resp
            and mrp_check_resp.json().get("data").get('data').get('d')
            and mrp_check_resp.json().get("data").get('data').get("d").get("NAVHDR")
            and mrp_check_resp.json().get("data").get('data').get("d").get("NAVHDR").get("results")
            and len(mrp_check_resp.json().get("data").get('data').get("d").get("NAVHDR").get("results")) > 0
        ):
            resp_headers = mrp_check_resp.json().get("data").get('data').get("d").get("NAVHDR").get("results")
            for res_hdr in resp_headers:
                if (res_hdr.get("NAV_INVOICES") and res_hdr.get("NAV_INVOICES").get("results") and len(res_hdr.get("NAV_INVOICES").get("results")) > 0):
                    invoices_arr = res_hdr.get("NAV_INVOICES").get("results")
                    sales_order = res_hdr.get("SalesOrder")
                    po_number = res_hdr.get("PONumber")
                    asn_status = False
                    check = self.response_check(invoices_arr)
                    print(type(check))
                    if check == "Invoice_Splitted":
                        err_msg = "Invoice got split hence ASN not sent"
                    elif check == "Not_Splitted":
                        print(check)
                        for invoice_data in invoices_arr:
                            isValid = True
                            err_msg = ""
                            item_asn_data = ""
                            invoice_number = invoice_data.get("Invoice")
                            invoice_date = invoice_data.get("InvoiceDate")
                            invoice_date = datetime.datetime.strptime(invoice_date, "%Y%m%d")
                            invoice_date = invoice_date.strftime("%d.%m.%Y")
                            if (invoice_data.get("NAVINVLINES") and invoice_data.get("NAVINVLINES").get("results") and len(invoice_data.get("NAVINVLINES").get("results"))> 0):
                                line_item_arr = invoice_data.get("NAVINVLINES").get("results")
                                total_invoice_line_items = 0
                                failed_line_item_count = 0
                                grouped_items = {}
                                for i, item in enumerate(line_item_arr):
                                    item_number = item.get('ItemNumber')
                                    if item_number in grouped_items:
                                        grouped_items[item_number].append(item)
                                    else:
                                        grouped_items[item_number] = [item]
                                line_item_arr = grouped_items
                                for line_item_data in line_item_arr:
                                    quantity = 0
                                    for item_d in line_item_arr[line_item_data]:
                                        if len(line_item_arr[line_item_data]) > 1:
                                            data = {
                                            'item_number': f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                            'so_number': sales_order,
                                            }
                                            quantity = quantity + float(item_d.get("Quantity"))
                                            flag = invoice_price_check_model.get_invoice_status(data)
                                            if flag == False:
                                                if item_d.get("IsValid") == "false":
                                                    failed_line_item_count = failed_line_item_count + 1
                                                    isValid = False
                                                    err_data = {
                                                    "CorrectMRP": helper.sanitize_sap_price_value(item_d.get("CorrectMRP")),
                                                    "ItemNumber":  f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                                    }
                                                    data ={
                                                        'so_number': sales_order,
                                                        'item_number': f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                                        'type': 'MRP2',
                                                    }
                                                    amendment_sent_status = invoice_price_check_model.check_amendment_status(data)
                                                    if amendment_sent_status == False:
                                                        data = {
                                                            "so_number": sales_order,
                                                            "item_number": f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                                            "type": "ASN",
                                                        }
                                                        asn_status = invoice_price_check_model.check_amendment_status(data)
                                                        if asn_status == False:
                                                            err_msg += acknowledgement_helper.prepare_error_info_xml(res_hdr.get("UniqueID"),res_hdr.get("PONumber"),"MRP",err_data,)
                                                        else:
                                                            isValid = True
                                                    data ={
                                                        'so_number': sales_order,
                                                        'item_number': f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                                        'status': constants.MRP2_FAILED,
                                                        'invoice_number': invoice_number,
                                                        'invoice_mrp' : helper.sanitize_sap_price_value(item_d.get("CorrectMRP")),
                                                        'invoice_quantity' : str(quantity),
                                                        'invoice_date' : invoice_date,
                                                        'type': 'error',
                                                        'invoice_base_price' : round(float(helper.sanitize_sap_price_value(item_d.get("BasePrice")))/int(float(item_d.get("Quantity"))),2),
                                                        'invoice_uom' : 'CV',
                                                    }
                                                else :
                                                    data ={
                                                        'so_number': sales_order,
                                                        'item_number': f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                                        'status': constants.INVOICE_SUCCESS,
                                                        'invoice_number': invoice_number,
                                                        'invoice_mrp' : helper.sanitize_sap_price_value(item_d.get("CorrectMRP")),
                                                        'invoice_quantity' : str(quantity),
                                                        'invoice_date' : invoice_date,
                                                        'type': 'success',
                                                        'invoice_base_price' : round(float(helper.sanitize_sap_price_value(item_d.get("BasePrice")))/int(float(item_d.get("Quantity"))),2),
                                                        'invoice_uom' : 'CV',
                                                    }
                                                item_asn_data += acknowledgement_helper.prepare_line_item_asn_data(item_d, invoice_data, res_hdr)
                                        else:
                                            total_invoice_line_items = (total_invoice_line_items + 1)
                                            data = {
                                                'item_number': f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                                'so_number': sales_order,
                                            }
                                            flag = invoice_price_check_model.get_invoice_status(data)
                                            if flag == False:
                                                if item_d.get("IsValid") == "false":
                                                    failed_line_item_count = failed_line_item_count + 1
                                                    isValid = False
                                                    err_data = {
                                                    "CorrectMRP": helper.sanitize_sap_price_value(item_d.get("CorrectMRP")),
                                                    "ItemNumber":  f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                                    }
                                                    data ={
                                                        'so_number': sales_order,
                                                        'item_number': f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                                        'type': 'MRP2',
                                                    }
                                                    amendment_sent_status = invoice_price_check_model.check_amendment_status(data)
                                                    if amendment_sent_status == False:
                                                        data = {
                                                            "so_number": sales_order,
                                                            "item_number": f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                                            "type": "ASN",
                                                        }
                                                        asn_status = invoice_price_check_model.check_amendment_status(data)
                                                        if asn_status == False:
                                                            err_msg += acknowledgement_helper.prepare_error_info_xml(res_hdr.get("UniqueID"),res_hdr.get("PONumber"),"MRP",err_data,)
                                                        else:
                                                            isValid = True
                                                    data ={
                                                        'so_number': sales_order,
                                                        'item_number': f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                                        'status': constants.MRP2_FAILED,
                                                        'invoice_number': invoice_number,
                                                        'invoice_mrp' : helper.sanitize_sap_price_value(item_d.get("CorrectMRP")),
                                                        'invoice_quantity' : item_d.get("Quantity"),
                                                        'invoice_date' : invoice_date,
                                                        'type': 'error',
                                                        'invoice_base_price' : round(float(helper.sanitize_sap_price_value(item_d.get("BasePrice")))/int(float(item_d.get("Quantity"))),2),
                                                        'invoice_uom' : 'CV',
                                                    }
                                                else :
                                                    data ={
                                                        'so_number': sales_order,
                                                        'item_number': f'{int(item_d.get("PoItemNumber")):05d}' if item_d.get("PoItemNumber") else item_d.get("ItemNumber"),
                                                        'status': constants.INVOICE_SUCCESS,
                                                        'invoice_number': invoice_number,
                                                        'invoice_mrp' : helper.sanitize_sap_price_value(item_d.get("CorrectMRP")),
                                                        'invoice_quantity' : item_d.get("Quantity"),
                                                        'invoice_date' : invoice_date,
                                                        'type': 'success',
                                                        'invoice_base_price' : round(float(helper.sanitize_sap_price_value(item_d.get("BasePrice")))/int(float(item_d.get("Quantity"))),2),
                                                        'invoice_uom' : 'CV',
                                                    }
                                                item_asn_data += acknowledgement_helper.prepare_line_item_asn_data(item_d, invoice_data, res_hdr)
                                    invoice_price_check_model.update_status_of_item(data)
                                if err_msg != "":
                                    try:
                                        log ={
                                            "po_number": res_hdr.get("PONumber"),
                                            "log": "Error in Mrp 2 Check",
                                            "status": constants.MRP2_FAILED,
                                        }
                                        invoice_price_check_model.create_logs(log)
                                        acknowledgement_helper.send_error_ack_to_reliance(res_hdr.get("UniqueID"), err_msg,res_hdr.get("PONumber"))
                                    except Exception as e:
                                        print(e)
                                        # mail part
                                        asn_message = "Error in sending Acknowlegement To reliance"
                                        asn_msg = {
                                            "PoNumber": res_hdr.get("PONumber"),
                                            "Message": "Error While sending MRP Check 2, Error Acknowledgement to reliance",
                                            "Stage": "Error in MRP Check 2",
                                        }
                                        # mail_helper.send_mail(asn_msg, asn_message)
                                else:
                                    log ={
                                            "po_number": res_hdr.get("PONumber"),
                                            "log": "Mrp 2 Check Success",
                                            "status": constants.MRP2_SUCCESS,
                                        }
                                    invoice_price_check_model.create_logs(log)
                                if failed_line_item_count > 0:
                                    subject = "Error in 2nd MRP Check"
                                    body = {
                                        "PoNumber": res_hdr.get("PONumber"),
                                        "Message": "2nd MRP Failed",
                                        "Stage": "Error in 2nd MRP Check",
                                        'data': line_item_arr,
                                    }
                                    # mail_helper.send_mail(body, subject)
                            data = {
                                "po_number": po_number,
                                "status": constants.PARTIAL_INVOICE,
                                'invoice_number': [invoice_number],

                            }
                            if asn_status == False and item_asn_data != "":
                                    try:
                                        log ={
                                            "po_number": res_hdr.get("PONumber"),
                                            "log": "ASN sent SuccessFully",
                                            "status": constants.ASN_SENT,
                                        
                                        }
                                        invoice_price_check_model.create_logs(log)
                                        acknowledgement_helper.send_asn_to_reliance(item_asn_data, invoice_data, res_hdr)
                                        if isValid == True and res_hdr.get("SoStatus")!= constants.SAP_SO_STATUS_PARTIAL:
                                            print('in change_po_status_to_completed')
                                            # invoice_price_check_model.change_po_status_to_completed(po_number)
                                    except Exception as e:
                                        # mail part
                                        subject = "Error in Sending ASN to Reliance"
                                        body = {
                                            "PoNumber": res_hdr.get("PONumber"),
                                            "exception": str(e),
                                            "Stage": "Exception in ASN Check",
                                        }
                                        # mail_helper.send_mail(body, subject)
                            log ={
                                "po_number": res_hdr.get("PONumber"),
                                "log": "Invoices Generated Successfully",
                                "status": constants.PARTIAL_INVOICE,
                            }
                            invoice_price_check_model.create_logs(log)
                            invoice_price_check_model.update_invoice_in_header(data)
            if receipt_handle:
                sqs_helper.delete_message(receipt_handle,'invoice')
            return response_handlers.send(200,'Success')

        