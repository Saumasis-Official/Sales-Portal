import json
import re
from datetime import datetime
from typing import Dict, Optional, Literal

from dateutil.relativedelta import relativedelta
from fastapi.encoders import jsonable_encoder


def to_serializable_json(data) -> Dict:
    dictionary = json.loads(json.dumps(jsonable_encoder(data), indent=4))
    return dictionary


def extract_number(input_string: str) -> Optional[float]:
    # Use regular expression to extract the numeric part
    match = re.search(r"[-+]?\d*\.\d+|\d+", input_string)

    if match:
        # Convert the extracted part to a float
        number = float(match.group())
        return number
    else:
        return None


def previous_forecast_month(input_date_str: str, output: Literal["date", "str"]):
    """
    Description: Returns the previous month from the given date
        - '01-Oct-24' -> '01-Sep-24'
        - '01-Jan-24' -> '01-Dec-24'
    """
    input_date = datetime.strptime(input_date_str, "%d-%b-%y")
    output_date = input_date - relativedelta(months=1)
    if output == "date":
        return output_date
    else:
        output_date_str = output_date.strftime("%d-%b-%y")
        return output_date_str


def l3m_months(date):
    """
    Description: Returns the last 3 months from the given date
        - '01-Oct-24' -> ['202407','202408', '202409', '202410']
    """
    months = []
    for i in range(3, -1, -1):  # Start from 3 and go down to 0
        month = date - relativedelta(months=i)
        months.append(month.strftime("%Y%m"))
    return months


def build_dict(seq, key):
    """
    Builds a dictionary from a sequence of dictionaries, using a specified key from each dictionary as the new key.

    Args:
        seq (list): A list of dictionaries.
        key (str): The key to use from each dictionary in the sequence as the new key in the resulting dictionary.

    Returns:
        dict: A dictionary where each key is the value of the specified key from the input dictionaries, and each value is the corresponding dictionary from the input sequence, augmented with an 'index' key indicating its position in the sequence.

    Example:
        >>> seq = [
        ...     {'id': 1, 'name': 'Alice'},
        ...     {'id': 2, 'name': 'Bob'},
        ...     {'id': 3, 'name': 'Charlie'}
        ... ]
        >>> build_dict(seq, 'id')
        {
            1: {'id': 1, 'name': 'Alice', 'index': 0},
            2: {'id': 2, 'name': 'Bob', 'index': 1},
            3: {'id': 3, 'name': 'Charlie', 'index': 2}
        }

    Notes:
        - If the specified key does not exist in one of the dictionaries in the sequence, a KeyError will be raised.
        - The 'index' key added to each dictionary indicates the position of the dictionary in the input sequence.
    """
    return dict((d[key], dict(d, index=index)) for (index, d) in enumerate(seq))
