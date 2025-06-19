from typing import Union

import pandas as pd
from fastapi.responses import JSONResponse


def respond(
    success: bool,
    message: str,
    data: Union[dict, pd.DataFrame, None] = None,
    status_code: int = 200,
):
    """
    Creates a standardized JSON response for API endpoints.

    Args:
        success (bool): Indicates whether the operation was successful.
        message (str): A descriptive message about the operation.
        data (dict | pd.DataFrame, optional): Additional data to include in the response. Can be a dictionary, Pandas DataFrame, or None. Defaults to None.
        status_code (int, optional): HTTP status code for the response. Defaults to 200.

    Returns:
        JSONResponse: A FastAPI JSON response object.
    """
    if isinstance(data, pd.DataFrame):
        # Convert DataFrame to JSON object
        data = data.to_dict(orient="records")

    response = {"success": success, "message": message, "data": data}
    return JSONResponse(content=response, status_code=status_code)
