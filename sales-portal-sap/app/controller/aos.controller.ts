import { Request, Response } from "express";
import AWS from 'aws-sdk';
import SqsHelper from '../helper/sqsHelper';
import logger from "../lib/logger";
import sapController from "./SapController";

const SqsConfig = global['configuration'].sqs;

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

AWS.config.update({
    region: SqsConfig.region,
    // accessKeyId: SqsConfig.accessKeyId,
    // secretAccessKey: SqsConfig.secretAccessKey
});

class AutoOrderController {
    public async aosOrderSubmit(req: Request, res: Response) {
        // TODO: Implement report_issue on submit error
        const queueUrl = SqsConfig.aosSubmitQueueUrl;
        let receiptHandle = ""
        const body = req.body;
        logger.info("AutoOrderController -> aosOrderSubmit -> body", req);
        try {
            const payload = JSON.parse(body?.body);
            const custom_request = {
                body: payload,
                user: {
                    login_id: payload?.soldto,
                    user_id: "PORTAL_MANAGED",
                    roles: "SUPER_ADMIN"
                },
                query: {
                    auto_order: true,
                    aos_order: true
                }
            }
            sapController.createOrder(custom_request);


            // const data = await SqsHelper.receiveSqsMessages(sqs, queueUrl);
            // console.log("data", data)
            // if (data.Messages) {
            //     receiptHandle = data.Messages[0].ReceiptHandle;
            //     return res.json(data.Messages);
            // } else {
                return res.json({ message: 'No messages to receive' });
            // }
        } catch (error) {
            logger.error('Error receiving messages:', error);
            res.status(500).json({ error: 'Error receiving messages' });
        } finally {
            // if (receiptHandle)
            // await SqsHelper.deleteSqsMessage(sqs, queueUrl, receiptHandle);
        }
    }
}

export default AutoOrderController;