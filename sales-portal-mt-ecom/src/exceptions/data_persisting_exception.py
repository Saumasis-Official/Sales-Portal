class DataPersistingException(Exception):
    def __init__(self, ref_number, error_message, status=None):
        self.reference = ref_number
        self.message = f"Data Persisting Exception: {error_message} for {ref_number}"
        self.status = status
        super().__init__(self.message)
