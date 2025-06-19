import unittest
from unittest.mock import patch
from decimal import Decimal

from src.services.ean_mapping_service import EanMappingService, DecimalEncoder

class TestEanMappingService(unittest.TestCase):
    def setUp(self):
        self.svc = EanMappingService()

    def make_idoc_list_item(self):
        return {
            'POSEX': "10",
            'WERKS': "W1",
            'LPRIO_BEZ': "EAN1",
            'VPREI': "100",
            'BPUMZ': "5",
            'MENGE': "2",
            'E1EDP19': [{'QUALF': '001', 'IDTNR': '1234', 'KTEXT': 'desc'}],
            'E1EDP05': [{'KSCHL': 'PB00', 'KRATE': '200'}],
        }

    def test_prepare_payload_from_xml_event_success(self):
        def patched_get_items_from_idoc_p01_list(*args, **kwargs):
            return {
                'is_valid': True,
                'incorrect_ean_data': [],
                'ean_full_details': [],
                'LineItems': [{}],
                'ItemMRPs': [{}],
                'SoldTo': 'CUST1',
                'ShipTo': 'CUST1',
                'po_date_to': '20240521'
            }
        with patch.object(EanMappingService, 'get_validity_date_from_idoc', return_value='20240521'), \
             patch.object(EanMappingService, 'get_items_from_idoc_p01_list', side_effect=patched_get_items_from_idoc_p01_list):
            idoc = {
                'E1EDK01': [{'RECIPNT_NO': '000123'}],
                'E1EDK02': [{'BELNR': 'PO123'}],
                'E1EDK03': [{'DATUM': '20240521', 'IDDAT': '012'}],
                'E1EDP01': [self.make_idoc_list_item()]
            }
            event = {'ORDERS05_VEN': {'IDOC': idoc}}
            unique_id = "UID123"
            result = self.svc.prepare_payload_from_xml_event(event, unique_id)
        self.assertTrue(result['status'])
        self.assertTrue(result['is_valid'])
        self.assertIn('sap_req', result)
        self.assertIn('mrp_check_req', result)
        self.assertEqual(result['customer_code'], 'CUST1')
        self.assertIn('ean_full_details', result)
        self.assertIn('po_date_to', result)
        self.assertIsInstance(result['po_date_to'], str)
        self.assertEqual(result['po_date_to'], "2024-05-21")  # Should be ISO format

    def test_prepare_payload_from_xml_event_not_valid(self):
        def patched_get_items_from_idoc_p01_list(*args, **kwargs):
            return {
                'is_valid': False,
                'incorrect_ean_data': [],
                'ean_full_details': [],
                'LineItems': [],
                'ItemMRPs': [],
                'SoldTo': '',
                'ShipTo': '',
                'po_date_to': '20240521'
            }
        with patch.object(EanMappingService, 'get_validity_date_from_idoc', return_value='20240521'), \
             patch.object(EanMappingService, 'get_items_from_idoc_p01_list', side_effect=patched_get_items_from_idoc_p01_list):
            idoc = {
                'E1EDK01': [{'RECIPNT_NO': '000123'}],
                'E1EDK02': [{'BELNR': 'PO123'}],
                'E1EDK03': [{'DATUM': '20240521', 'IDDAT': '012'}],
                'E1EDP01': [self.make_idoc_list_item()]
            }
            event = {'ORDERS05_VEN': {'IDOC': idoc}}
            result = self.svc.prepare_payload_from_xml_event(event, "uid")
        self.assertFalse(result['status'])
        self.assertIn('po_date_to', result)
        self.assertEqual(result['po_date_to'], "2024-05-21")  # Should be ISO format

    def test_prepare_payload_from_xml_event_invalid(self):
        event = {'ORDERS05_VEN': {'IDOC': {}}}
        result = self.svc.prepare_payload_from_xml_event(event, "uid")
        self.assertEqual(result, {'status': False})

    def test_prepare_payload_from_xml_event_missing_idoc(self):
        event = {'ORDERS05_VEN': {}}
        result = self.svc.prepare_payload_from_xml_event(event, "uid")
        self.assertEqual(result, {'status': False})

    def test_get_items_from_idoc_p01_list_listcase(self):
        idoc = {'E1EDP01': [self.make_idoc_list_item()]}
        with patch('src.services.ean_mapping_service.po_processing_so_creation_model') as mock_model, \
             patch('src.services.ean_mapping_service.error_helper'):
            mock_model.check_site_code.return_value = True
            mock_model.check_vendor_code.return_value = True
            mock_model.get_master_data.return_value = {
                'sku': 'SKU1', 'psku': 'PSKU1', 'plant_code': 'PLANT1', 'sku_desc': 'SKU Desc',
                'psku_desc': 'PSKU Desc', 'vendor_code': 'VENDOR1', 'customer_code': 'CUST1'
            }
            result = self.svc.get_items_from_idoc_p01_list(idoc, 'E1EDP01', "UNIQ", "VENDOR1", "PO123")
        self.assertTrue(result['is_valid'])
        self.assertTrue(result['LineItems'])
        self.assertTrue(result['ItemMRPs'])
        self.assertTrue(result['ean_full_details'])

    def test_get_items_from_idoc_p01_list_singlecase(self):
        ls = self.make_idoc_list_item()
        idoc = {'E1EDP01': ls}
        with patch('src.services.ean_mapping_service.po_processing_so_creation_model') as mock_model, \
             patch('src.services.ean_mapping_service.error_helper'):
            mock_model.check_site_code.return_value = True
            mock_model.check_vendor_code.return_value = True
            mock_model.get_master_data.return_value = {
                'sku': 'SKU1', 'psku': 'PSKU1', 'plant_code': 'PLANT1', 'sku_desc': 'SKU Desc',
                'psku_desc': 'PSKU Desc', 'vendor_code': 'VENDOR1', 'customer_code': 'CUST1'
            }
            result = self.svc.get_items_from_idoc_p01_list(idoc, 'E1EDP01', "UNIQ", "VENDOR1", "PO123")
        self.assertTrue(result['is_valid'])
        self.assertTrue(result['LineItems'])
        self.assertTrue(result['ItemMRPs'])
        self.assertTrue(result['ean_full_details'])

    def test_get_specific_value_from_idoc_p01_list(self):
        idoc = {'SEG': [{'A': '1', 'B': 'b', 'C': 'c'}, {'A': '2', 'B': 'd', 'C': 'e'}]}
        val = self.svc.get_specific_value_from_idoc_p01_list(idoc, 'SEG', 'A', 'C', 'e')
        self.assertEqual(val, '2')
        val2 = self.svc.get_specific_value_from_idoc_p01_list(idoc, 'SEG', 'A', None, None)
        self.assertEqual(val2, '1')
        idoc2 = {'SEG': {'A': '3', 'B': 'f', 'C': 'g'}}
        val3 = self.svc.get_specific_value_from_idoc_p01_list(idoc2, 'SEG', 'A', 'C', 'g')
        self.assertEqual(val3, '3')

    def test_get_direct_value_from_idoc(self):
        idoc = {'SEG': [{'K': 'x'}, {'K': 'y'}]}
        val = self.svc.get_direct_value_from_idoc(idoc, 'SEG', 'K')
        self.assertEqual(val, 'x')
        idoc2 = {'SEG': {'K': 'z'}}
        val2 = self.svc.get_direct_value_from_idoc(idoc2, 'SEG', 'K')
        self.assertEqual(val2, 'z')
        idoc3 = {'SEG': {}}
        val3 = self.svc.get_direct_value_from_idoc(idoc3, 'SEG', 'K')
        self.assertEqual(val3, "")

    def test_get_validity_date_from_idoc(self):
        idoc = {'S': [{'O': {'VAR': 'val'}}]}
        val = self.svc.get_validity_date_from_idoc(idoc, 'S', 'O', 'VAR')
        self.assertEqual(val, 'val')
        idoc2 = {'S': {'O': {'VAR': 'v'}}}
        val2 = self.svc.get_validity_date_from_idoc(idoc2, 'S', 'O', 'VAR')
        self.assertEqual(val2, 'v')
        idoc3 = {'S': {'O': {}}}
        val3 = self.svc.get_validity_date_from_idoc(idoc3, 'S', 'O', 'VAR')
        self.assertEqual(val3, "")

    def test_get_value_from_idoc_array(self):
        idoc = {'SEG': [{'A': 'x', 'B': '1'}, {'A': 'y', 'B': '2'}]}
        val = self.svc.get_value_from_idoc_array(idoc, 'SEG', 'A', 'B', '2')
        self.assertEqual(val, 'y')
        idoc2 = {'SEG': {'A': 'z', 'B': '3'}}
        val2 = self.svc.get_value_from_idoc_array(idoc2, 'SEG', 'A', 'B', '3')
        self.assertEqual(val2, 'z')

    def test_default_decimal(self):
        class Dummy: pass
        d = Dummy()
        with self.assertRaises(TypeError):
            self.svc.default(d)
        val = self.svc.default(Decimal('10.5'))
        self.assertEqual(val, '10.5')

if __name__ == "__main__":
    unittest.main()