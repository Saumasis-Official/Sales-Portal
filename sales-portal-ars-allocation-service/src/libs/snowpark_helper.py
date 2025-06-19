from src.config.configurations import SNOW_PARK
from snowflake.snowpark import Session
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

class SnowparkHelper:
    _session = None

    def _create_snowpark_create(self):
        if self._session is None:
            private_pem_key = self.generatePrivateKey()
            conn = {
                "account": SNOW_PARK.get('ACCOUNT'),
                "user": SNOW_PARK.get('USER'),
                "role": SNOW_PARK.get('ROLE'),
                "warehouse": SNOW_PARK.get('WAREHOUSE'),
                "client_session_keep_alive" : True,
                "authenticator":  SNOW_PARK.get('AUTHENTICATOR'),
                "private_key": private_pem_key,
            }
            self._session = Session.builder.configs(conn).create()

    def get_session(self):
        if self._session is None:
            self._create_snowpark_create()

        return self._session

    def close_session(self, session):
        if session is not None:
            session.close()
        if self._session is not None:
            self._session.close()
        self._session = None

    def generatePrivateKey(self):
        private_key = SNOW_PARK.get("PRIVATE_KEY", "").replace("\\n", "\n")
        private_key_passphrase = SNOW_PARK.get("PASS_PHRASE")
        if not private_key or not private_key_passphrase:
            return None
        
        private_key_object = serialization.load_pem_private_key(
            private_key.encode(),
            password=private_key_passphrase.encode(),
            backend=default_backend()
        )
        private_key_pem = private_key_object.private_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        return private_key_pem
