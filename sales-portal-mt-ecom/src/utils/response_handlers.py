import json
from fastapi.encoders import jsonable_encoder
class ResponseHandlers:
    def __init__(self) -> None:
        self.headers = {
            # "Access-Control-Allow-Headers": "Content-Type",
            # "Access-Control-Allow-Origin": "https://devapi-pegasus.tataconsumer.com",
            # "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            "content-type": "application/json",
        }

    def send(self,status_code, content):
        print('StatusCode', status_code)
        print('Content', content)

        if status_code == 200:
            return {
                'status_code': status_code,
                'body': {'DATA': content}
            }
        else:
            return {
                'status_code': status_code,
                'body': {'ERROR': content}
            }
        
    def success(self,message,data=None):
        """
            Description: Return template for success response.
        """
        body_json = {'success': True, 'message': message}
        if data is not None:
            body_json['data'] = data
            
        response = jsonable_encoder(body_json)
        return response
    
    def error(self,message):
        """
            Description: Return template for error response.
        """
        body_json = {'success': False, 'message': message}

        response = jsonable_encoder(body_json)
        return response 
    
    def internal_server_error(self):
        """
            Description: Return template for Internal Server Error response.
        """
        
        body_json = {'success': False,'message': 'Internal Server Error. Please try again later.'}
        response = jsonable_encoder(body_json)
        return response