import os
import json

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
            "body": json.dumps(res_data)
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
            "error": 500,
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