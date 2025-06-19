class SQSException(Exception):
    def __init__(self, ref_number, log, status=None):
        self.reference = ref_number
        self.message = f"SQS Exception: {log}"
        self.status = status
        super().__init__(self.message)
