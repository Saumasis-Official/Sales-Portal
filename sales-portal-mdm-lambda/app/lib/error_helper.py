class ErrorHelper:
    """One Error Helper class to maintain all validation errors"""

    def __init__(self) -> None:
        self.error_list = {}

    def add_error(self, error, message) -> None:
        """
        Description: Add error to list.
        """
        self.error_list.update({error: message})

    def get_errors(self) -> dict:
        """
        Description: get all the error list.
        """
        return self.convert_to_string()

    def has_errors(self) -> bool:
        """
        Description: Function to check if list has
            any errors.
        """
        return bool(len(self.error_list) > 0)

    def convert_to_string(self) -> dict:
        """
        Description: Convert list to string.
        """
        error_list = {}
        error_string = ""
        for key, value in self.error_list.items():
            error_string += f"{key} - {value} \n"
        error_list["message"] = error_string
        return error_list