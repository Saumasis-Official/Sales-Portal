class SOCreationException(Exception):
    def __init__(self, ref_number, error_message, status=None):
        self.reference = ref_number
        self.message = f"SAP SO Creation: {error_message}"
        self.status = status
        super().__init__(self.message)
