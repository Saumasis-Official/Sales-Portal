import boto3
from botocore.exceptions import ClientError
from src.config.constants import EMAIL_LIST


class EmailHelper:
    def get_email_list(self):
        return EMAIL_LIST

    def send_email(self, data):
        ses_client = boto3.client("ses", region_name="eu-west-1")
        try:
            response = ses_client.send_email(
                Source=data.get("sender"),
                Destination={"ToAddresses": data.get("email")},
                Message={
                    "Subject": {
                        "Charset": "UTF-8",
                        "Data": data.get("subject"),
                    },
                    "Body": {
                        "Html": {
                            "Charset": "UTF-8",
                            "Data": data.get("html_body"),
                        },
                        "Text": {
                            "Charset": "UTF-8",
                            "Data": data.get("text_body"),
                        },
                    },
                },
            )
            return response
        except ClientError as e:
            print(f"Error sending email: {e.response['Error']['Message']}")
            return None
