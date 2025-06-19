import unittest
from unittest.mock import patch, MagicMock
from src.controllers.mt_ecom_controller import MTECOMController

class TestMTECOMController(unittest.TestCase):

    @patch('src.controllers.mt_ecom_controller.mt_ecom_service')
    @patch('src.controllers.mt_ecom_controller.logger')
    def test_edit_kams_data_success(self, mock_logger, mock_mt_ecom_service):
        # Arrange
        mock_mt_ecom_service.edit_kams_data.return_value = {'message': 'Success'}
        controller = MTECOMController()
        data = {'some_key': 'some_value'}

        # Act
        result = controller.edit_kams_data(data)

        # Assert
        self.assertEqual(result, {'message': 'Success'})
        mock_mt_ecom_service.edit_kams_data.assert_called_once_with(data)
        mock_logger.error.assert_not_called()

    @patch('src.controllers.mt_ecom_controller.mt_ecom_service')
    @patch('src.controllers.mt_ecom_controller.logger')
    def test_edit_kams_data_exception(self, mock_logger, mock_mt_ecom_service):
        # Arrange
        mock_mt_ecom_service.edit_kams_data.side_effect = Exception('Test exception')
        controller = MTECOMController()
        data = {'some_key': 'some_value'}

        # Act
        result = controller.edit_kams_data(data)

        # Assert
        self.assertFalse(result)
        mock_mt_ecom_service.edit_kams_data.assert_called_once_with(data)
        mock_logger.error.assert_called_once_with("Exception in MTECOMController.edit_kams_data", unittest.mock.ANY)

    @patch('src.controllers.mt_ecom_controller.mt_ecom_service')
    @patch('src.controllers.mt_ecom_controller.logger')
    def test_add_update_kams_success(self, mock_logger, mock_mt_ecom_service):
        # Arrange
        mock_mt_ecom_service.add_update_kams.return_value = {'message': 'Success'}
        controller = MTECOMController()
        data = {'some_key': 'some_value'}

        # Act
        result = controller.add_update_kams(data)

        # Assert
        self.assertEqual(result, {'message': 'Success'})
        mock_mt_ecom_service.add_update_kams.assert_called_once_with(data)
        mock_logger.error.assert_not_called()

    @patch('src.controllers.mt_ecom_controller.mt_ecom_service')
    @patch('src.controllers.mt_ecom_controller.logger')
    def test_add_update_kams_exception(self, mock_logger, mock_mt_ecom_service):
        # Arrange
        mock_mt_ecom_service.add_update_kams.side_effect = Exception('Test exception')
        controller = MTECOMController()
        data = {'some_key': 'some_value'}

        # Act
        result = controller.add_update_kams(data)

        # Assert
        self.assertFalse(result)
        mock_mt_ecom_service.add_update_kams.assert_called_once_with(data)
        mock_logger.error.assert_called_once_with("Exception in MTECOMController.add_update_kams", unittest.mock.ANY)

    @patch('src.controllers.mt_ecom_controller.mt_ecom_service')
    @patch('src.controllers.mt_ecom_controller.logger')
    def test_get_kams_data_success(self, mock_logger, mock_mt_ecom_service):
        # Arrange
        mock_mt_ecom_service.getKamsData.return_value = {'data': 'some_data'}
        controller = MTECOMController()
        data = {'some_key': 'some_value'}

        # Act
        result = controller.getKamsData(data)

        # Assert
        self.assertEqual(result, {'data': 'some_data'})
        mock_mt_ecom_service.getKamsData.assert_called_once_with(data)
        mock_logger.error.assert_not_called()

    @patch('src.controllers.mt_ecom_controller.mt_ecom_service')
    @patch('src.controllers.mt_ecom_controller.logger')
    def test_get_kams_data_exception(self, mock_logger, mock_mt_ecom_service):
        # Arrange
        mock_mt_ecom_service.getKamsData.side_effect = Exception('Test exception')
        controller = MTECOMController()
        data = {'some_key': 'some_value'}

        # Act
        result = controller.getKamsData(data)

        # Assert
        self.assertFalse(result)
        mock_mt_ecom_service.getKamsData.assert_called_once_with(data)
        mock_logger.error.assert_called_once_with("Exception in MTECOMController.getKamsData", unittest.mock.ANY)

if __name__ == '__main__':
    unittest.main()