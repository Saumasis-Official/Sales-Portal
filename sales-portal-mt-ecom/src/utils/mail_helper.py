import src.utils.constants as constants
from src.models.po_processing_so_creation_model import PoProcessingSoCreationModel
import boto3
import pandas as pd
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
import os
from src.services.log_service import LogService
from src.models.shopify_model import ShopifyModel
from src.libs.loggers import Logger
import datetime

LOG_SERVICE = LogService()
po_processing_so_creation_model = PoProcessingSoCreationModel()
shopify_model = ShopifyModel()
url = os.environ.get('FE_URL_CORS')
SES_REGION = constants.SES_REGION
logger = Logger("MailHelper")

class MailHelper:
    def send_mail(self, body, subject):
        # Create a new SES client
        if subject == 'Sales order created successfully':
            self.so_success_mail(body, subject)
        elif body.get('details'):
            self.error_exception_mail(body, subject)
        else:
            self.exception_mail(body, subject)

    def send(self, data):
        ses_client = boto3.client('ses', region_name=SES_REGION)
        response = ses_client.send_email(
            Source=data.get('sender'),
            Destination={
                'ToAddresses': data.get('email')
            },
            Message={
                'Subject': {
                    'Charset': data.get('charset'),
                    'Data': data.get('subject'),
                },
                'Body': {
                    'Html': data.get('body'),
                },
            }
        )
        print("Email sent successfully for subject: ", data.get('subject'))
        print("Message ID:", response['MessageId'])

    def so_success_mail(self, body_msg, subject):
        SENDER = constants.SENDER
        po_number = body_msg.get('po_number')
        so_number = body_msg.get('so_number')
        data = body_msg.get('so_details')
        table_data = ""
        table_header = "<thead><tr>"
        for key in data[0].keys():
            table_header += "<th>{}</th>".format(key)
        table_header += "</tr></thead>"
        table_rows = ""
        for row in data:
            table_row = "<tr>"
            for value in row.values():
                table_row += "<td>{}</td>".format(value)
            table_row += "</tr>"
            table_rows += table_row
        table_data = table_header + table_rows
        SUBJECT = subject
        email = po_processing_so_creation_model.get_so_mail_recipients(body_msg.get('id'))
        if not email:
            logger.info("Recipient not found")
            return False
        email = email.split(',')
        html_content = ''
        html_file_path = "src/utils/email_templates/so_success_template.html"
        with open(html_file_path, "r", encoding="utf-8") as html_file:
            html_content = html_file.read()
        BODY_HTML = html_content
        CHARSET = "UTF-8"
        body_format = {}
        body_format['Charset'] = CHARSET
        link = '<a href="{}">Link to Portal for Review</a>'.format(url)
        body_format['Data'] = BODY_HTML.format(table_data=table_data, po_number=po_number,
                                               so_number=so_number, link=link)
        try:
            if email:
                response = self.send(
                    {'sender': SENDER, 'subject': SUBJECT, 'body': body_format, 'email': email,
                     'charset': CHARSET})
                LOG_SERVICE.insert_email_log('MT_ECOM_SO_SUCCESS', 'SUCCESS', SUBJECT,
                                             {"to": email}, None, body_msg, None)
        except Exception as e:
            print(e, 'Error while sending SO mail')
            print(e)
            LOG_SERVICE.insert_email_log('MT_ECOM_ERROR', 'FAIL', SUBJECT, email, None, body_msg, e)

    def error_exception_mail(self, body_msg, subject):
        SENDER = constants.SENDER
        po_number = body_msg.get('po_number')
        data = body_msg.get('details')
        table_data = ""
        table_header = "<thead><tr>"
        for key in data[0].keys():
            table_header += "<th>{}</th>".format(key)
        table_header += "</tr></thead>"
        table_rows = ""
        for row in data:
            table_row = "<tr>"
            for value in row.values():
                table_row += "<td>{}</td>".format(value)
            table_row += "</tr>"
            table_rows += table_row
        table_data = table_header + table_rows
        SUBJECT = subject
        message = 'Message'
        html_content = ''
        email = po_processing_so_creation_model.get_error_or_exception_mail_recipients()
        if not email:
            logger.info("Recipient not found")
            return False
        email = email.split(',') if not None else None
        html_file_path = "src/utils/email_templates/error_mail_template.html"
        with open(html_file_path, "r", encoding="utf-8") as html_file:
            html_content = html_file.read()
        BODY_HTML = html_content
        link = '<a href="{}">Link to Portal for Review</a>'.format(url)
        CHARSET = "UTF-8"
        body_format = {}
        body_format['Charset'] = CHARSET
        body_format['Data'] = BODY_HTML.format(type=body_msg.get('type'),
                                               po_number=body_msg.get('po_number'),
                                               table_data=table_data, link=link)
        try:
            if email:
                self.send(
                    {'sender': SENDER, 'subject': SUBJECT, 'body': body_format, 'email': email,
                     'charset': CHARSET})
                LOG_SERVICE.insert_email_log('MT_ECOM_ERROR', 'SUCCESS', SUBJECT, {"to": email},
                                             None, body_msg, None)

        except Exception as e:
            print(e, 'Error while sending SO mail')
            print(e)
            LOG_SERVICE.insert_email_log('MT_ECOM_ERROR', 'FAIL', SUBJECT, email, None, body_msg, e)

    def exception_mail(self, body_msg, subject):
        SENDER = constants.SENDER
        SUBJECT = subject
        message = 'Message'
        html_content = ''
        email = po_processing_so_creation_model.get_error_or_exception_mail_recipients()
        if not email:
            logger.info("Recipient not found")
            return False
        email = email.split(',') if not None else None
        html_file_path = "src/utils/email_templates/exception_mail_template.html"
        with open(html_file_path, "r", encoding="utf-8") as html_file:
            html_content = html_file.read()
        BODY_HTML = html_content
        CHARSET = "UTF-8"
        body_format = {}
        body_format['Charset'] = CHARSET
        link = '<a href="{}">Link to Portal for Review</a>'.format(url)
        body_format['Data'] = BODY_HTML.format(message=message, bodymessage=body_msg.get('Message'),
                                               type=body_msg.get('type'),
                                               po_number=body_msg.get('po_number'), link=link)
        try:
            if email:
                response = self.send(
                    {'sender': SENDER, 'subject': SUBJECT, 'body': body_format, 'email': email,
                     'charset': CHARSET})
                LOG_SERVICE.insert_email_log('MT_ECOM_SUCCESS', 'SUCCESS', SUBJECT, {"to": email},
                                             None, body_msg, None)

        except Exception as e:
            print(e, 'Error while sending SO mail')
            print(e)
            LOG_SERVICE.insert_email_log('MT_ECOM_ERROR', 'FAIL', SUBJECT, email, None, body_msg, e)

    def send_reports(self, asn_reports, error_reports, date):
        AWS_REGION = SES_REGION
        recipient = po_processing_so_creation_model.get_reports_recipients()
        if not recipient:
            logger.info("Recipient not found")
            return False
        client = boto3.client('ses', region_name=AWS_REGION)
        asn_reports.to_csv('/tmp/Summary.csv', index=False)
        error_reports.to_csv('/tmp/DailyError.csv', index=False)
        msg = MIMEMultipart()
        msg['From'] = constants.SENDER
        recipient = recipient.split(',')
        msg['Subject'] = "MT-ECOM Weekly Reports" if date else "MT-ECOM Daily Reports"
        body = "*** Please find the attached Weekly Reports ***" if date else ("*** Please find "
                                                                               "the attached "
                                                                               "Daily Reports ***")
        msg.attach(MIMEText(body, 'plain'))
        filename1 = os.path.join('/tmp', 'Summary.csv')
        filename2 = os.path.join('/tmp', 'DailyError.csv')
        if asn_reports.empty | (asn_reports.empty and error_reports.empty) | error_reports.empty:
            print("Mail not sent as data is empty")
            recipient = recipient
            sender = constants.SENDER
            subject = 'MT-ECOM Weekly Reports' if date else "MT-ECOM Daily Reports"
            body_text = '*********No PO Received*********'
            try:
                response = client.send_email(
                    Destination={
                        'ToAddresses': recipient,
                    },
                    Message={
                        'Body': {
                            'Text': {
                                'Data': body_text,
                            },
                        },
                        'Subject': {
                            'Data': subject,
                        },
                    },
                    Source=sender,
                )
                print('Email sent successfully.')
                LOG_SERVICE.insert_email_log('MT_ECOM_REPORTS', 'SUCCESS', subject,
                                             {"to": recipient}, None, body_text, None)
            except Exception as e:
                print('Error sending email:', e)
                LOG_SERVICE.insert_email_log('MT_ECOM_REPORTS', 'FAIL', subject, recipient, None,
                                             body_text, e)

        else:
            with open(filename1, "rb") as f1:
                attach1 = MIMEApplication(f1.read(), _subtype="csv")
                attach1.add_header('Content-Disposition', 'attachment', filename=os.path.basename(filename1))
                msg.attach(attach1)
            with open(filename2, "rb") as f2:
                attach2 = MIMEApplication(f2.read(), _subtype="csv")
                attach2.add_header('Content-Disposition', 'attachment', filename=os.path.basename(filename2))
                msg.attach(attach2)
            try:
                msg['To'] = ','.join(recipient)
                response = client.send_raw_email(
                    Source=msg['From'],
                    RawMessage={
                        'Data': msg.as_string(),
                    },
                )
                LOG_SERVICE.insert_email_log('MT_ECOM_REPORTS', 'SUCCESS', msg['Subject'],
                                             {"to": recipient}, None, None, None)
            except Exception as e:
                print("Error: ", e)
                LOG_SERVICE.insert_email_log('MT_ECOM_REPORTS', 'FAIL', msg['Subject'], recipient,
                                             None, None, e)

        # delete output file
        os.remove(filename1)
        os.remove(filename2)
        print("Email sent successfully", response)

    def send_shopify_reports(self, reports,sales_org):
        AWS_REGION = SES_REGION
        recipient = shopify_model.get_reports_recipients(sales_org)
        if not recipient:
            return "Recipient not found"
        client = boto3.client('ses', region_name=AWS_REGION)
        reports.to_excel('/tmp/ROR Reports.xlsx', index=False)
        msg = MIMEMultipart()
        msg['From'] = constants.SENDER
        recipient = recipient.split(',')
        msg['Subject'] =  "Shopify ROR Reports"
        body = "*** Please find the attached ROR Reports ***"
        msg.attach(MIMEText(body, 'plain'))
        filename1 = os.path.join('/tmp', 'ROR Reports.xlsx')

        with open(filename1, "rb") as f1:
            attach1 = MIMEApplication(f1.read(), _subtype="xlsx")
            attach1.add_header('Content-Disposition', 'attachment', filename=os.path.basename(filename1))
            msg.attach(attach1)
        try:
            response = client.send_raw_email(
                Source=msg['From'],
                Destinations=recipient,
                RawMessage={
                    'Data': msg.as_string(),
                },
            )
            LOG_SERVICE.insert_email_log('SHOPIFY_REPORTS', 'SUCCESS', msg['Subject'],
                                            {"to": recipient}, None, None, None)
            print("Shopify Reports sent successfully", response)
        except Exception as e:
            print("Error: ", e)
            LOG_SERVICE.insert_email_log('MT_ECOM_REPORTS', 'FAIL', msg['Subject'], {"to": recipient},
                                            None, None, e)
        finally:
            # delete output file
            os.remove(filename1)
    def send_ecom_reports(self, data,date_data):
        AWS_REGION = SES_REGION
        recipient = po_processing_so_creation_model.get_ecom_reports_recipients()
        if not recipient:
            logger.info("Recipient not found")
            return "Recipient not found"
        from_date = date_data.get("data", {}).get("from_date", '')
        to_date = date_data.get("data", {}).get("to_date", '')
        client = boto3.client('ses', region_name=AWS_REGION)
        msg = MIMEMultipart()
        msg['From'] = constants.SENDER
        recipient = recipient.split(',')
        msg['Subject'] = "MT-ECOM Daily Reports"
        body = ("*** Please find the attached Daily Reports ***")
        msg.attach(MIMEText(body, 'plain'))
        filename = os.path.join('/tmp', f'Ecom Summary Report for ' + from_date.strftime('%Y-%m-%d') + ' to ' + to_date.strftime('%Y-%m-%d') + '.csv')
        data.to_csv(filename, index=False)
        if data.empty:
            recipient = recipient
            sender = constants.SENDER
            subject =  "EDI Daily Reports"
            body_text = '*********No PO Received*********'
            try:
                response = client.send_email(
                    Destination={
                        'ToAddresses': recipient,
                    },
                    Message={
                        'Body': {
                            'Text': {
                                'Data': body_text,
                            },
                        },
                        'Subject': {
                            'Data': subject,
                        },
                    },
                    Source=sender,
                )
                logger.info('Email sent successfully.')
                LOG_SERVICE.insert_email_log('MT_ECOM_REPORTS', 'SUCCESS', subject,
                                             {"to": recipient}, None, body_text, None)
            except Exception as e:
                logger.info('Error sending email in send_ecom_reports:', e)
                LOG_SERVICE.insert_email_log('MT_ECOM_REPORTS', 'FAIL', subject, recipient, None,
                                             body_text, e)

        else:
            with open(filename, "rb") as f1:
                attach1 = MIMEApplication(f1.read(), _subtype="csv")
                attach1.add_header('Content-Disposition', 'attachment', filename=os.path.basename(filename))
                msg.attach(attach1)
            try:
                msg['To'] = ','.join(recipient)
                response = client.send_raw_email(
                    Source=msg['From'],
                    RawMessage={
                        'Data': msg.as_string(),
                    },
                )
                LOG_SERVICE.insert_email_log('MT_ECOM_REPORTS', 'SUCCESS', msg['Subject'],
                                             {"to": recipient}, None, None, None)
            except Exception as e:
                logger.error("Error in send_ecom_reports: ", e)
                LOG_SERVICE.insert_email_log('MT_ECOM_REPORTS', 'FAIL', msg['Subject'],  {"to": recipient},
                                             None, None, e)

        # delete output file
        os.remove(filename)
        logger.info("Email sent successfully", response)
        