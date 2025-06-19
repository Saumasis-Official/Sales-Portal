import AWS from 'aws-sdk';


const SqsHelper = {
    async deleteSqsMessage(sqs, queueUrl, receiptHandle) {
        const params = {
            QueueUrl: queueUrl,
            ReceiptHandle: receiptHandle
        };
        return sqs.deleteMessage(params).promise();
    },

    async receiveSqsMessages(sqs, queueUrl) {
        const params = {
            QueueUrl: queueUrl,
            // MaxNumberOfMessages: 10, // Adjust as needed
            // WaitTimeSeconds: 20 // Long polling
        };
        return sqs.receiveMessage(params).promise();
    }
}

export default SqsHelper;