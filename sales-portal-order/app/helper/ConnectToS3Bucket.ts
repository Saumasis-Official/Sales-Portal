import AWS from 'aws-sdk';
import logger from '../lib/logger';
import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
const S3Env = global['configuration'].s3;

const s3Config = {
    accessKeyId: S3Env.accessKey,
    secretAccessKey: S3Env.secretAccessKey,
    region: S3Env.region
  };
const s3Client = new S3Client(s3Config);
const awsS3Client = new AWS.S3(s3Config);

const ConnectToS3Bucket = {
    getForecastS3Path(type:string){
        try {
            let path = '';
            switch(type){
                case 'download':
                    path = S3Env.forecastDownloadPath;
                    break;
                case 'upload':
                    path = S3Env.forecastUploadPath;
                    break;
                case 'archive':
                    path = S3Env.forecastArchivePath;
                    break;
                default:
                    throw new Error('Invalid file type');;
            }
            return path;
        } catch (error) {
            logger.error(`Error in getting forecast s3 path: `+ JSON.stringify(error));
            throw error;
        }
    },
    async uploadForecastFile(file:any,name:string,type:string){
        try {
            let path = ConnectToS3Bucket.getForecastS3Path(type) || '';
            
            const params = {
                Bucket: S3Env.forecastBucket,
                Key: (path) ? `${path}/${name}` : name,
                Body: file,
            };

            // const command = new PutObjectCommand(params);
            // const data = await s3Client.send(command);
            // return data;
            return new Promise((resolve, reject) => {
                try{
                    awsS3Client.upload(params,async (err, data) => {
                        if (err) {
                            logger.error(`Failed to upload file - ${name} to the aws s3 bucket`, err);
                            reject(err);
                        }else{
                            logger.info(`File - ${name}, uploaded successfully to the s3 bucket`, data);
                            resolve(data);
                        }
                        
                    });
                }catch(e){
                    logger.error(`Failed to upload file - ${name} to the aws s3 bucket`, e);
                    reject(e);
                }
                
            });
        } catch (error) {
            logger.error(`Error in uploading file to S3: `+ JSON.stringify(error));
            throw error;
        }
    },

    async readForecastFile(name:string,type:string){
        try {
            let path = ConnectToS3Bucket.getForecastS3Path(type) || '';

            const params = {
                Bucket: S3Env.forecastBucket,
                Key: (path) ? `${path}/${name}` : name,
            };
            
            return new Promise((resolve, reject) => {
                awsS3Client.getObject(params,async (err, data) => {
                    if (err) {
                        logger.error(`Failed to fetch file - ${name} from the aws s3 bucket`, err);
                        reject(err);
                    }else{
                        logger.info(`File - ${name}, fetched successfully from the s3 bucket`);
                        resolve(data);
                    }
                });
            });
            
            
        } catch (error) {
            logger.error(`Error in fetching file from S3: `+ JSON.stringify(error));
            throw error;
        }
    },

    async createSignedUrl(bucket: string, path:string){
        
        const params = {
            Bucket: bucket,
            Key: path,
            Expires: +(S3Env.urlTimeout)
        };

        return new Promise((resolve, reject) => {
            awsS3Client.getSignedUrl('getObject', params, (err, url) => {
                if (err) {
                    logger.error(`Failed to get signed url for file - ${path}: `, err);
                    reject(err);
                }else{
                    logger.info(`Signed url for file - ${path} is generated successfully`);
                    resolve(url);
                }
            });
        });
    },

    async checkIfForecastFileExists(name:string,type:string){
        try {
            let path = ConnectToS3Bucket.getForecastS3Path(type) || '';

            const params = {
                Bucket: S3Env.forecastBucket,
                Key: (path) ? `${path}/${name}` : name,
            };
            
            return new Promise((resolve, reject) => {
                awsS3Client.headObject(params,async (err, data) => {
                    if(err && err.name === 'NotFound'){
                        logger.info(`File - ${name}, does not exists in the s3 bucket`);
                        resolve({'ContentLength' : 0});
                    }
                    else if (err) {
                        logger.error(`Failed to check if file - ${name} exists in the aws s3 bucket`, err);
                        reject(err);
                    }else{
                        logger.info(`File - ${name}, exists in the s3 bucket`);
                        params['Expires'] = +(S3Env.urlTimeout);
                        awsS3Client.getSignedUrl('getObject', params, (err, url) => {
                            if (err) {
                                logger.error(`Failed to get signed url for file - ${name}: `, err);
                                reject(err);
                            }else{
                                logger.info(`Signed url for file - ${name} is generated successfully`);
                                data['downloadUrl'] = url;
                                resolve(data);
                            }
                        });
                    }
                });
            });
        } catch (error) {
            logger.error(`Error in checking if forecast file exists in S3: `+ JSON.stringify(error));
            throw error;
        }
    }
}

export default ConnectToS3Bucket;