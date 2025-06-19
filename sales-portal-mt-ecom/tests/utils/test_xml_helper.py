import sys
import os
import unittest
from xml.etree.ElementTree import Element, fromstring
from unittest.mock import Mock
from src.utils.xml_helper import XMLHelper

class TestXMLHelper(unittest.TestCase):

    def setUp(self):
        self.helper = XMLHelper()

    def test_get_node_data_found(self):
        xml_str = '<root xmlns="http://xmlns.reliance.com/schema"><nodeToFetch>value</nodeToFetch></root>'
        xml_element = fromstring(xml_str)
        result = self.helper.get_node_data(xml_element, 'nodeToFetch')
        self.assertEqual(result, 'value')

    def test_get_node_data_not_found(self):
        xml_str = '<root xmlns="http://xmlns.reliance.com/schema"></root>'
        xml_element = fromstring(xml_str)
        result = self.helper.get_node_data(xml_element, 'nodeToFetch')
        self.assertEqual(result, '')

    def test_get_direct_value_from_idoc_found(self):
        idoc = {
            'segment': [
                {'original_key': 'value1'},
                {'original_key': 'value2'}
            ]
        }
        result = self.helper.get_direct_value_from_idoc(idoc, 'segment', 'original_key')
        self.assertEqual(result, 'value1')

    def test_get_direct_value_from_idoc_not_found(self):
        idoc = {
            'segment': []
        }
        result = self.helper.get_direct_value_from_idoc(idoc, 'segment', 'original_key')
        self.assertEqual(result, '')

    def test_validate_xml_with_xsd(self):
        xml_validator = Mock()
        xml_validator.validate.return_value = True
        xml = '<root></root>'
        result = self.helper.validate_xml_with_xsd(xml_validator, xml)
        self.assertTrue(result)
        xml_validator.validate.assert_called_once_with(xml)

if __name__ == '__main__':
    unittest.main()