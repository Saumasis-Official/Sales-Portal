import AWS from 'aws-sdk'
import * as fs from 'fs';
import logger from '../lib/logger';
const FileUploadToS3Bucket = {
    uploadFileToS3: async (params: any, path: any) => {
        const fileUploadToTheAWSS3 = new AWS.S3({
            accessKeyId: process.env.ACCESS_KEY_ID_S3,
            secretAccessKey: process.env.SECRET_ACCESS_KEY_S3,
            region: 'ap-south-1'
        });

        return new Promise(async (resolve, reject) => {

            await fileUploadToTheAWSS3.putObject(params, async (err, data) => {
                if (err) {
                    logger.info(`fail to upload file to the aws s3 bucket`, err);
                    fs.unlink(path, (err) => {
                        if (err) {

                            logger.info(`fail to delete file form local`, err);
                        } else {
                            logger.info(`file deleted form local successfully`, err);

                        }
                    })
                    reject(err)
                } else {
                    logger.info(`file uploaded successfully to the s3 bucket`, data);
                    fs.unlink(path, (err) => {
                        if (err) {

                            logger.info(`fail to delete file form local`, err);
                        } else {
                            logger.info(`file deleted form local successfully`, err);

                        }
                    })
                    resolve(data)
                }
            });

        })

    },

    createPreAssignUrl: async (path) => {
        const credentials = new AWS.Credentials({
            accessKeyId: String(process.env.ACCESS_KEY_ID_S3),
            secretAccessKey: String(process.env.SECRET_ACCESS_KEY_S3)
        });

        const s3 = new AWS.S3({
            credentials: credentials,
            region: 'ap-south-1'
        });

        const bucketName = process.env.BUCKET_NAME_S3;
        const objectKey = process.env.FOLDER_NAME_S3 + path;

        const url = s3.getSignedUrl('getObject', {
            Bucket: bucketName,
            Key: objectKey,
            Expires: Number(process.env.HELP_URL_TIMEOUT)
        });
        return url;
    }
}

export default FileUploadToS3Bucket;