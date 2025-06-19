import unittest
from unittest.mock import patch
from src.services.mt_ecom_service import MTECOMService
import json

class TestMTECOMService(unittest.TestCase):
    @patch('src.services.mt_ecom_service.mt_ecom_model')
    def test_edit_kams_data_delete_success(self, mock_mt_ecom_model):
        mock_mt_ecom_model.delete_kams_data.return_value = {'message': 'KAMS/NKAMS Payer Code Mapping Deleted successfully'}
        service = MTECOMService()
        data = json.dumps([{'is_deleted': True, 'payer_code': '0000171015', 'user_id': 'user123', 'updated_by': 'admin'}])

        # Act
        result = service.edit_kams_data(data)

        # Assert
        self.assertEqual(result, {'message': 'KAMS/NKAMS Payer Code Mapping Deleted successfully'})
        mock_mt_ecom_model.delete_kams_data.assert_called_once_with([{'is_deleted': True, 'payer_code': '0000171015', 'user_id': 'user123', 'updated_by': 'admin'}])
   
    @patch('src.services.mt_ecom_service.mt_ecom_model')
    def test_edit_kams_data_edit_success(self, mock_mt_ecom_model):
        # Arrange
        mock_mt_ecom_model.edit_kams_data.return_value = {'message': 'KAMS/NKAMS Payer Code Mapping Edited successfully'}
        service = MTECOMService()
        data = json.dumps([{'is_deleted': False, 'payer_code': '0000171015', 'user_id': 'user123', 'updated_by': 'admin'}])

        # Act
        result = service.edit_kams_data(data)

        # Assert
        self.assertEqual(result, {'message': 'KAMS/NKAMS Payer Code Mapping Edited successfully'})
        mock_mt_ecom_model.edit_kams_data.assert_called_once_with([{'is_deleted': False, 'payer_code': '0000171015', 'user_id': 'user123', 'updated_by': 'admin'}])

    @patch('src.services.mt_ecom_service.mt_ecom_model')
    def test_edit_kams_data_exception(self, mock_mt_ecom_model):
        # Arrange
        mock_mt_ecom_model.delete_kams_data.side_effect = Exception('Deletion failed')
        mock_mt_ecom_model.edit_kams_data.side_effect = Exception('Edit failed')
        service = MTECOMService()
        data = json.dumps({'is_deleted': True, 'payer_code': '0000171015'})

        # Act
        result = service.edit_kams_data(data)

        # Assert
        self.assertFalse(result)

    @patch('src.services.mt_ecom_service.mt_ecom_model')
    def test_add_update_kams_success(self, mock_mt_ecom_model):
        # Arrange
        mock_mt_ecom_model.add_update_kams.return_value = {'message': 'KAMS/NKAMS Payer Code Mapping Added/Updated successfully'}
        service = MTECOMService()
        data = json.dumps({'payerCode': ['0000171015'], 'creditLimit': '10000'})

        # Act
        result = service.add_update_kams(data)

        # Assert
        self.assertEqual(result, {'message': 'KAMS/NKAMS Payer Code Mapping Added/Updated successfully'})
        mock_mt_ecom_model.add_update_kams.assert_called_once_with(
            json.loads(data),
            [{'payer_code': '0000171015', 'credit_limit': '10000'}]
        )

    @patch('src.services.mt_ecom_service.mt_ecom_model')
    def test_add_update_kams_exception(self, mock_mt_ecom_model):
        # Arrange
        mock_mt_ecom_model.add_update_kams.side_effect = Exception('Addition/Update failed')
        service = MTECOMService()
        data = json.dumps({'payerCode': ['0000171015'], 'creditLimit': '10000'})

        # Act
        result = service.add_update_kams(data)

        # Assert
        self.assertFalse(result)

    @patch('src.services.mt_ecom_service.mt_ecom_model')
    def test_get_kams_data_success(self, mock_mt_ecom_model):
        # Arrange
        mock_mt_ecom_model.getKamsData.return_value = {'data': 'some_data'}
        service = MTECOMService()
        data = json.dumps({'some_key': 'some_value'})

        # Act
        result = service.getKamsData(data)

        # Assert
        self.assertEqual(result, {'data': 'some_data'})
        mock_mt_ecom_model.getKamsData.assert_called_once_with(data)

    @patch('src.services.mt_ecom_service.mt_ecom_model')
    def test_get_kams_data_exception(self, mock_mt_ecom_model):
        # Arrange
        mock_mt_ecom_model.getKamsData.side_effect = Exception('Retrieval failed')
        service = MTECOMService()
        data = json.dumps({'some_key': 'some_value'})

        # Act
        result = service.getKamsData(data)

        # Assert
        self.assertFalse(result)

if __name__ == '__main__':
    unittest.main()