import AWS from 'aws-sdk';
import logger from '../lib/logger';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
const S3Env = global['configuration'].s3;

const s3Config = {
    region: S3Env.region,
    signatureVersion: 'v4',
};

const awsS3Client = new AWS.S3(s3Config);

const ConnectToS3Bucket = {
    getCreditLimitS3Path(type: string) {
        try {
            let path = '';
            switch (type) {
                case 'upload':
                    path = S3Env.creditLimitS3Path;
                    break;
                case 'accountMaster':
                    path = S3Env.creditLimitBaseLimitS3Path;
                    break;
                case 'gtexcelupload':
                    path = S3Env.creditLimitGTExcelS3Path;
                    break;
                default:
                    throw new Error('Invalid file type');
            }
            return path;
        } catch (error) {
            logger.error(`Error in getting forecast s3 path: ` + JSON.stringify(error));
            throw error;
        }
    },
    //Requestor upload for .msg format
    async uploadCreditLimitEmailFile(file: any, name: string, type: string) {
        try {
            let path = ConnectToS3Bucket.getCreditLimitS3Path(type) || '';

            const params = {
                Bucket: S3Env.creditLimitBucket,
                Key: path ? `${path}/${name}` : name,
                Body: file,
            };
            return new Promise((resolve, reject) => {
                try {
                    awsS3Client.upload(params, async (err, data) => {
                        if (err) {
                            logger.error(`Failed to upload file - ${name} to the aws s3 bucket`, err);
                            reject(err);
                        } else {
                            logger.info(`File - ${name}, uploaded successfully to the s3 bucket`, data);
                            resolve(data);
                        }
                    });
                } catch (e) {
                    logger.error(`Failed to upload file - ${name} to the aws s3 bucket`, e);
                    reject(e);
                }
            });
        } catch (error) {
            logger.error(`Error in uploading file to S3: ` + JSON.stringify(error));
            throw error;
        }
    },

    async checkIfEmailExists(name: string, type: string) {
        try {
            let path = ConnectToS3Bucket.getCreditLimitS3Path(type) || '';
            const parts = name.split('/');
            const lastTwoFolders = parts.slice(-3, -1).join('/');
            const encodedFileName = parts.slice(-1)[0];
            const decodedFileName = decodeURIComponent(encodedFileName);
            const finalPath = `${lastTwoFolders}/${decodedFileName}`;
            const params = {
                Bucket: S3Env.creditLimitBucket,
                Key: path ? `${path}/${finalPath}` : name,
            };

            return new Promise((resolve, reject) => {
                awsS3Client.headObject(params, async (err, data) => {
                    if (err && err.name === 'NotFound') {
                        logger.info(`File - ${name}, does not exists in the s3 bucket`);
                        resolve({ ContentLength: 0 });
                    } else if (err) {
                        logger.error(`Failed to check if file - ${name} exists in the aws s3 bucket`, err);
                        reject(err);
                    } else {
                        logger.info(`File - ${name}, exists in the s3 bucket`);
                        params['Expires'] = +S3Env.urlTimeout;
                        awsS3Client.getSignedUrl('getObject', params, (err, url) => {
                            if (err) {
                                logger.error(`Failed to get signed url for file - ${name}: `, err);
                                reject(err);
                            } else {
                                logger.info(`Signed url for file - ${name} is generated successfully`);
                                data['downloadUrl'] = url;
                                resolve(data);
                            }
                        });
                    }
                });
            });
        } catch (error) {
            logger.error(`Error in checking if forecast file exists in S3: ` + JSON.stringify(error));
            throw error;
        }
    },
};

export default ConnectToS3Bucket;
