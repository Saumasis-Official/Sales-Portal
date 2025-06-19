class S3Exception(Exception):
    def __init__(self, ref_number, log, status=None):
        self.reference = ref_number
        self.message = f"S3 Exception: {log}"
        self.status = status
        super().__init__(self.message)
