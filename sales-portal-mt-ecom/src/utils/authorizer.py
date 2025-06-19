
import os
import sys
import boto3
from datetime import datetime
class Authorizer:

    def authenticate(self, event):
        """
        Desc: Authenticate our API call 
        """
        headers = event.get('headers', {})

        try:
            token = headers.get('authorization', '')
            assert token 

            internal_token = self.get_ssm_parameters('token', True) or os.environ.get('token', None)
            assert internal_token

            return token == 'Bearer ' + internal_token

        except AssertionError:
            print("[Authorizer]:: Token not found {} {}".format(
                sys.exc_info()[0], sys.exc_info()[1]))
            return False

        except:
            print("[Authorizer]:: API authorization ERROR {} {}".format(
                sys.exc_info()[0], sys.exc_info()[1]))
            return False
    
    def get_ssm_parameters(self, var, decrypt=False):
            """
            Description: Function to get AWS Parameter Store (SSM) Variables
            Params:
                - (string) "var" : variable name
                - (bool) "decrypt" : Optional only if secured string
            Returns:
                - (string) variable value
            """
            try:
                ssm_client = boto3.client("ssm", "ap-south-1")
                env = os.environ.get("env", "uat")
                # Supplier is default for verteil login worker, dedicated to api connections
                param_name = f"/mdm/{env.upper()}/{var}"

                if decrypt:
                    response = ssm_client.get_parameter(
                        Name=param_name, WithDecryption=True)
                else:
                    response = ssm_client.get_parameter(Name=param_name)
                return response.get("Parameter").get("Value")
            except:
                print("[LOGIN_WORKER]:: SSM PARAM CALL ERROR {} {}".format(
                    sys.exc_info()[0], sys.exc_info()[1]))
    def get_ssm(self):
        ssm_client = boto3.client('ssm')
        paginator = ssm_client.get_paginator('get_parameters_by_path')
        path = os.environ.get("SSM_PATH_PREFIX")
        response_iterator = paginator.paginate(
            Path=path, WithDecryption=True
        )
        parameters = []
        for page in response_iterator:
            for entry in page['Parameters']:
                parameters.append(entry)
        key_values = {}
        for item in parameters:
            key_values[item['Name']] = item['Value']
            