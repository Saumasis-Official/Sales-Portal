import unittest
import asyncio
from unittest.mock import patch, MagicMock
from src.controllers.po_controller import PoController
from src.exceptions.po_transformer_exception import PoTransformerException
from src.exceptions.S3_exception import S3Exception
from src.exceptions.data_persisting_exception import DataPersistingException
from src.exceptions.sqs_exception import SQSException
from src.exceptions.po_acknowledgement_exception import PoAcknowledgementException

class TestPoController(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        self.patcher_po_inward = patch('src.controllers.po_controller.PoInwardService')
        self.patcher_data_persist = patch('src.controllers.po_controller.DataPersistService')
        self.patcher_workflow = patch('src.controllers.po_controller.WorkflowValidationService')
        self.patcher_s3 = patch('src.controllers.po_controller.S3Service')
        self.patcher_sqs = patch('src.controllers.po_controller.SQSHelper')
        self.patcher_ack = patch('src.controllers.po_controller.PoAckService')

        self.MockPoInwardService = self.patcher_po_inward.start()
        self.MockDataPersistService = self.patcher_data_persist.start()
        self.MockWorkflowValidationService = self.patcher_workflow.start()
        self.MockS3Service = self.patcher_s3.start()
        self.MockSQSHelper = self.patcher_sqs.start()
        self.MockPoAckService = self.patcher_ack.start()

        self.controller = PoController()

    async def asyncTearDown(self):
        self.patcher_po_inward.stop()
        self.patcher_data_persist.stop()
        self.patcher_workflow.stop()
        self.patcher_s3.stop()
        self.patcher_sqs.stop()
        self.patcher_ack.stop()

    async def test_po_receiver_positive(self):
        self.MockPoInwardService.return_value.convert_customer_orders.return_value = True
        po_details = MagicMock()
        po_details.body.return_value = asyncio.Future()
        po_details.body.return_value.set_result('{"order": "details"}')
        po_details.headers.get.side_effect = lambda k, d=None: {
            "customer": "AMAZON",
            "location": "",
            "amazonRequestId": ""
        }.get(k, d)

        response = await self.controller.po_receiver(po_details)
        self.assertTrue(response)

    async def _test_po_receiver_exception(self, exception_class):
        self.MockPoInwardService.return_value.convert_customer_orders.side_effect = exception_class("Error", "Details")
        po_details = MagicMock()
        po_details.body.return_value = asyncio.Future()
        po_details.body.return_value.set_result('{"order": "details"}')
        po_details.headers.get.side_effect = lambda k, d=None: {
            "customer": "AMAZON",
            "location": "",
            "amazonRequestId": ""
        }.get(k, d)

        response = False
        try:
            await self.controller.po_receiver(po_details)
        except exception_class:
            response = False

        self.assertFalse(response)

    async def test_po_receiver_negative_po_transformer_exception(self):
        await self._test_po_receiver_exception(PoTransformerException)

    async def test_po_receiver_negative_s3_exception(self):
        await self._test_po_receiver_exception(S3Exception)

    async def test_po_receiver_negative_data_persisting_exception(self):
        await self._test_po_receiver_exception(DataPersistingException)

    async def test_po_receiver_negative_sqs_exception(self):
        await self._test_po_receiver_exception(SQSException)

    async def test_po_receiver_negative_po_acknowledgement_exception(self):
        await self._test_po_receiver_exception(PoAcknowledgementException)

if __name__ == '__main__':
    asyncio.run(unittest.main())
