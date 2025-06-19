import AWS, { AWSError } from 'aws-sdk';
import logger from '../lib/logger';
import { SyncType } from '../enums/syncType';
import commonHelper from '../helper/index';
const s3Env = global['configuration'].s3;
const SapConfig = global['configuration'].sap;
const env = process.env.NODE_ENV || 'dev';

const s3Config = {
    region: s3Env.region,
};
const s3 = new AWS.S3(s3Config);

const s3Helper = {
    getBucketDetails(syncType: SyncType): { bucket: string; folderPath: string } | null {
        logger.info('inside s3Helper -> getBucketDetails');
        if (syncType === SyncType.PSKU_DIST_INVENTORY || syncType === SyncType.DIST_INVENTORY || syncType === SyncType.NOURISHCO_PLANNING_SYNC) {
            return {
                bucket: SapConfig.distributorInventorySyncAwsConfig.bucket,
                folderPath: SapConfig.distributorInventorySyncAwsConfig.folderPath,
            };
        }
        return null;
    },

    async findLatestFileInS3Bucket(syncType: SyncType, fileToProcess: string): Promise<AWS.S3.Object | null> {
        logger.info(`inside s3Helper -> findLatestFileInS3Bucket`);
        let file: AWS.S3.Object | null = null;
        const bucketDetails = s3Helper.getBucketDetails(syncType);
        if (!bucketDetails) {
            logger.error(`No bucket details found for sync type: ${syncType}`);
            return null;
        }
        const params = {
            Bucket: bucketDetails.bucket,
            Prefix: bucketDetails.folderPath,
        };
        return new Promise((resolve, reject) => {
            s3.listObjectsV2(params, function (err, data) {
                if (err) {
                    logger.error('inside s3Helper -> findLatestFileInS3Bucket -> listObjectsV2: error in listing s3 bucket files: ', err);
                    reject(err);
                } else if (data) {
                    if (!data.Contents) {
                        logger.error('inside s3Helper -> findLatestFileInS3Bucket -> listObjectsV2: No contents found in the S3 bucket.');
                        reject(null);
                    }
                    for (const datum of data.Contents ?? []) {
                        if (!datum.Key || !datum.Key.toString().includes(fileToProcess)) continue;
                        if (env === 'prod' && (datum.Key.toString().includes('dev_') || datum.Key.toString().includes('qa_'))) continue;
                        if (file) {
                            if (datum.LastModified && file.LastModified && new Date(datum.LastModified) > new Date(file.LastModified)) {
                                file = datum;
                            }
                        } else {
                            file = datum;
                        }
                    }
                    if (!file) {
                        logger.error('inside s3Helper -> findLatestFileInS3Bucket -> listObjectsV2: No file found!', { ...params, fileToProcess });
                        resolve(null);
                    }
                    resolve(file);
                }
            });
        });
    },

    async readFromS3(syncType: SyncType, fileToProcess: string | null = null, fileDetails: AWS.S3.Object | null = null): Promise<any> {
        logger.info('inside s3Helper -> readFromS3');
        const bucketDetails = s3Helper.getBucketDetails(syncType);
        if (!bucketDetails) {
            logger.error(`inside s3Helper -> readFromS3: No bucket details found for sync type: ${syncType}`);
            return null;
        }
        const params = {
            Bucket: bucketDetails.bucket,
            Key: fileDetails?.Key ? fileDetails.Key : `${bucketDetails.folderPath}/${fileToProcess}`,
        };
        const response: { S3FileName: string; S3Response: AWSError | null | string | object[] } = {
            S3FileName: params.Key,
            S3Response: null,
        };
        return new Promise((resolve, reject) => {
            logger.info('inside s3Helper -> readFromS3 -> getObject: params', params);
            s3.getObject(params, function (error, data) {
                if (error) {
                    logger.error('inside s3Helper -> readFromS3: error in reading s3 bucket file: ', error);
                    response.S3Response = error;
                    reject(response);
                } else {
                    if (!data.Body) {
                        logger.error('inside s3Helper -> readFromS3: No data found in the S3 bucket.');
                        response.S3Response = 'No data found in the S3 bucket.';
                        reject(response);
                        return;
                    }
                    const str = data.Body.toString('ascii');
                    const res = commonHelper.convertTextFileToJSON(str);
                    response.S3Response = res;
                    resolve(response);
                }
            });
        });
    },

    async writeToS3(syncType: SyncType, fileName: string, data) {
        logger.info('inside s3Helper -> writeToS3');
        const bucketDetails = s3Helper.getBucketDetails(syncType);
        if (!bucketDetails) {
            logger.error(`inside s3Helper -> writeToS3: No bucket details found for sync type: ${syncType}`);
            return null;
        }
        const params = {
            Bucket: bucketDetails.bucket,
            Key: `${bucketDetails.folderPath}/${fileName}`,
            Body: data,
        };
        return new Promise((resolve, reject) => {
            s3.putObject(params, function (error, data) {
                if (error) {
                    logger.error('inside s3Helper -> writeToS3: error in writing s3 bucket file: ', error);
                    reject(error);
                } else {
                    logger.info('inside s3Helper -> writeToS3: file written successfully', { Bucket: params.Bucket, Key: params.Key });
                    resolve(data);
                }
            });
        });
    },

    async createSignedUrl(bucket: string, path: string) {
        logger.info('inside s3Helper -> createSignedUrl', { bucket, path });
        const params = {
            Bucket: bucket,
            Key: path,
            Expires: +s3Env.urlTimeout,
        };

        return new Promise((resolve, reject) => {
            s3.getSignedUrl('getObject', params, (err, url) => {
                if (err) {
                    logger.error(`Failed to get signed url for file - ${path}: `, err);
                    reject(err);
                } else {
                    logger.info(`Signed url for file - ${path} is generated successfully`);
                    resolve(url);
                }
            });
        });
    },
};

export default s3Helper;
