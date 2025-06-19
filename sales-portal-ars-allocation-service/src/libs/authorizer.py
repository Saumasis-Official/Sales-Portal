import sys
from src.config.configurations import ARS_ALLOCATION


class Authorizer:

    def authenticate(self, credentials):
        """
        Desc: Authenticate our API call
        """
        username = credentials.username
        password = credentials.password

        try:
            assert username and password
            assert username == ARS_ALLOCATION.get('UID') and password == ARS_ALLOCATION.get('PASSWORD')
            return True
        except AssertionError:
            print("[Authorizer]:: Username or password not found {} {}".format(
                sys.exc_info()[0], sys.exc_info()[1]))
            return False
