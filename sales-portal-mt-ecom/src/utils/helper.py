import os
import json
import decimal as Decimal
from pandas import Timestamp
from decimal import Decimal
from datetime import time,datetime,date
import pandas as pd
import pytz
import pycountry
from src.utils import constants

class HelperClass:
    """
    Helper class created to keep functions handy.
    """

    def get_response_object(self, res_data):
        """
        Description: Method to get a response object constructed bound with Lambda Response keys
        Params:
            - (self) default param to identify object instance
            - (json) "res_data" : JSON response to be sent in the body
        Returns:
            - (Json) Json Object with mandatory keys for lambda function response
        """
        return { 
            "statusCode": self.get_status_codes(),
            "statusDescription": "200 OK",
            "isBase64Encoded": False,
            "headers": {
                # "Access-Control-Allow-Headers": "Content-Type",
                # "Access-Control-Allow-Origin": "https://devapi-pegasus.tataconsumer.com",
                # "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                "content-type": "application/json",
            },
            "body": res_data
        }
            

    def get_status_codes(self, code_type = 'success'):
        """
        Description: Method to get generic HTTP status codes
        Params:
            - (string) "codeType" : string to identify the status from the dict
        Returns:
            - (int) Numeric HTTP status code
        """
        switcher = {
            "error": 400,
            "success": 200,
            "unauthorized": 401,
            "validation": 422,
            "not_found" : 404
        }
        return switcher[code_type]

    def send_error_response(self, error_text, status_code='error'):
        """
        Description: Send error response.\n
        Params:
            - (string) error_text : error_text to be sent.
            - (string) status_code : status string.\n
        Returns:
            - (dict) send lambda formatted dict.
        """
        return {
            "statusCode": self.get_status_codes(status_code),
            "statusDescription": "200 OK",
            "isBase64Encoded": False,
            "body": json.dumps({'Message': 'Error Occurred', 'Error' : error_text}),
            "headers": {
                "content-type": "application/json"
            }
        }
    
    def url_query_params_extraction(self, query_params_string):
        #create a dictionary of key value pairs, value will be array of strings from the url
        _dict = {}
        #split the string at &
        split_url = query_params_string.decode().split('&')
        #iterate through the split string
        for i in split_url:
            #split the string at =
            split_url2 = i.split('=')
            #add the key value pair to the dictionary with the key as the first value and the second value as the value.
            _dict[split_url2[0]] = split_url2[1]
        return _dict
    def remove_custom_types(self,obj):
        if isinstance(obj, dict):
            return {key: self.remove_custom_types(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self.remove_custom_types(element) for element in obj]
        elif type(obj) in (int, float, Decimal):
            value = float(obj)
            return int(value) if value.is_integer() else value
        elif isinstance(obj, Timestamp):
            return str(obj)
        elif obj is None or obj is pd.NaT:
            return ""
        else:
            return obj
    
    def convert_iso_to_local(self, iso_string, local_timezone="Asia/Kolkata"):
    # Parse the ISO format datetime string to a datetime object
        utc_dt = datetime.fromisoformat(iso_string.replace("Z", "+00:00")) 
     # Set the timezone of the datetime object to UTC
        utc_dt = utc_dt.replace(tzinfo=pytz.utc)
     # Convert the datetime object to the desired local timezone
        local_tz = pytz.timezone(local_timezone)
        local_dt = utc_dt.astimezone(local_tz)
        return local_dt
    
    def convert_local_to_iso(self, local_datetime, local_timezone="Asia/Kolkata"):
         # Check if local_datetime is a string and parse it if necessary
        if isinstance(local_datetime, str):
            # Parse the string into a datetime object with timezone info
            local_datetime = datetime.strptime(local_datetime, "%Y%m%d%H%M%S")
        else:
            # If local_datetime is not a string, assume it's a datetime object and localize it
            local_tz = pytz.timezone(local_timezone)
            local_datetime = local_tz.localize(local_datetime)

        # Convert the datetime object to UTC
        utc_dt = local_datetime.astimezone(pytz.utc)
        return utc_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    
    def convert_state_or_district_to_iso(self,state_or_district: str) -> str:
        subdivisions = pycountry.subdivisions
        for subdivision in subdivisions:
            if subdivision.name.lower() == state_or_district.lower():
                return subdivision.code.split('-')[1]
        return state_or_district
    
    def sanitize_sap_price_value(self, value):
        if value and '-' in value:
            value = value.replace('-', '')
            value = 0 - float(value)
        return value
    
    def get_ror_description(self,message):
        if 'Material' in message:
            return {'description' : 'Material needs to be extended to storage location', 'spoc': constants.MDM_SPOC }
        elif 'Plant' in message:
            return {'description' : 'Plant determination issue - Master data issue', 'spoc': constants.MDM_SPOC }
        elif 'Pricing' in message:
            return {'description' : 'Material pricing MRP/Pricing is missing - Pricing master data issue', 'spoc': constants.MDM_SPOC }
        elif 'ZTTP' in message:
            return {'description' : 'Material pricing master ZTTP is missing', 'spoc': constants.MDM_SPOC }
        elif 'JOCG' in message:
            return {'description' : 'Material pricing and Tax master data is missing', 'spoc': constants.MDM_SPOC }
        elif 'Pack size issue' in message:
            return {'description' : 'Material Case Size is mismatching', 'spoc': constants.MDM_SPOC }
        elif 'EDI - Base Price match condition fail' in message:
            return {'description' : 'Material pricing is mismatching', 'spoc': constants.MDM_SPOC }
        elif 'Gross weight' in message:
            return {'description' : 'Material master data issue - Gross weight and Net weight not maintained', 'spoc': constants.MDM_SPOC }
        elif 'Order Quantity' in message:
            return {'description' : 'Order Quantity (in CV) is zero', 'spoc': '' }
        else :
            return {'description' : '', 'spoc': '' }
            
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
            if isinstance(obj, Decimal):
                return float(obj)
            if isinstance(obj, (date, datetime)):
                return obj.isoformat()
            if isinstance(obj, time):
                return obj.isoformat()
            return json.JSONEncoder.default(self, obj)