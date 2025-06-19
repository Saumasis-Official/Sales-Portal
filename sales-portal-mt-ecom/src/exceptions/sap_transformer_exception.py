class SapTransformerException(Exception):
    def __init__(self, ref_number, error_message, status=None):
        self.reference = ref_number
        self.message = f"SAP Transformer Exception: {error_message}"
        self.status = status
        super().__init__(self.message)
