class ValidationException(Exception):
    def __init__(self, ref, error_message, status=None):
        self.reference = ref
        self.message = f"Validation Exception: {error_message}"
        self.status = status
        super().__init__(self.message)
