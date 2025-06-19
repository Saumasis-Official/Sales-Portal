import unittest
from src.utils.helper import HelperClass, DecimalEncoder
from datetime import datetime, date, time
import json
import pytz
from decimal import Decimal
import pandas as pd

class TestHelperClass(unittest.TestCase):

    def setUp(self):
        self.helper = HelperClass()

    def test_get_response_object(self):
        res_data = json.dumps({"message": "success"})
        response = self.helper.get_response_object(res_data)
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(response["statusDescription"], "200 OK")
        self.assertEqual(response["isBase64Encoded"], False)
        self.assertEqual(response["headers"]["content-type"], "application/json")
        self.assertEqual(response["body"], res_data)

    def test_get_status_codes(self):
        self.assertEqual(self.helper.get_status_codes("success"), 200)
        self.assertEqual(self.helper.get_status_codes("error"), 400)
        self.assertEqual(self.helper.get_status_codes("unauthorized"), 401)
        self.assertEqual(self.helper.get_status_codes("validation"), 422)
        self.assertEqual(self.helper.get_status_codes("not_found"), 404)

    def test_send_error_response(self):
        error_text = "An error occurred"
        response = self.helper.send_error_response(error_text)
        self.assertEqual(response["statusCode"], 400)
        self.assertEqual(response["statusDescription"], "200 OK")
        self.assertEqual(response["isBase64Encoded"], False)
        self.assertEqual(response["headers"]["content-type"], "application/json")
        self.assertEqual(json.loads(response["body"])["Message"], "Error Occurred")
        self.assertEqual(json.loads(response["body"])["Error"], error_text)

    def test_url_query_params_extraction(self):
        query_params_string = b"param1=value1&param2=value2"
        expected_result = {"param1": "value1", "param2": "value2"}
        result = self.helper.url_query_params_extraction(query_params_string)
        self.assertEqual(result, expected_result)

    def test_remove_custom_types(self):
        obj = {
            "int": 1,
            "float": 1.1,
            "decimal": Decimal("1.1"),
            "timestamp": pd.Timestamp("2023-01-01"),
            "none": None,
            "nat": pd.NaT,
            "list": [1, 2, Decimal("3.3")],
            "dict": {"key": Decimal("4.4")}
        }
        expected_result = {
            "int": 1,
            "float": 1.1,
            "decimal": 1.1,
            "timestamp": "2023-01-01 00:00:00",
            "none": "",
            "nat": "",
            "list": [1, 2, 3.3],
            "dict": {"key": 4.4}
        }
        result = self.helper.remove_custom_types(obj)
        self.assertEqual(result, expected_result)

    def test_convert_iso_to_local(self):
        iso_string = "2023-01-01T00:00:00Z"
        local_timezone = "Asia/Kolkata"
        expected_result = datetime(2023, 1, 1, 5, 30, tzinfo=pytz.timezone(local_timezone))
        result = self.helper.convert_iso_to_local(iso_string, local_timezone)
        self.assertEqual(result.replace(tzinfo=None), expected_result.replace(tzinfo=None))

    def test_convert_local_to_iso(self):
        local_datetime = datetime(2023, 1, 1, 5, 30)
        local_timezone = "Asia/Kolkata"
        expected_result = "2023-01-01T00:00:00.000Z"
        result = self.helper.convert_local_to_iso(local_datetime, local_timezone)
        self.assertEqual(result, expected_result)

    def test_convert_state_or_district_to_iso(self):
        state_or_district = "California"
        expected_result = "CA"
        result = self.helper.convert_state_or_district_to_iso(state_or_district)
        self.assertEqual(result, expected_result)

class TestDecimalEncoder(unittest.TestCase):

    def test_decimal_encoder(self):
        obj = {
            "decimal": Decimal("1.1"),
            "date": date(2023, 1, 1),
            "datetime": datetime(2023, 1, 1, 0, 0),
            "time": time(0, 0)
        }
        expected_result = json.dumps({
            "decimal": 1.1,
            "date": "2023-01-01",
            "datetime": "2023-01-01T00:00:00",
            "time": "00:00:00"
        })
        result = json.dumps(obj, cls=DecimalEncoder)
        self.assertEqual(result, expected_result)

if __name__ == "__main__":
    unittest.main()