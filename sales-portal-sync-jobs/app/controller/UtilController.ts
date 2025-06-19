import AWS from 'aws-sdk';
import { ErrorMessage } from '../constant/error.message';
import { SuccessMessage } from '../constant/sucess.message';
import Template from '../helper/responseTemplate';
import logger from '../lib/logger';
import { UtilService } from '../service/UtilService';
import { LogService } from '../service/LogService';
import { Request, Response } from 'express';
import { bearerAuth, getIsDistributorSyncRunning, setIsDistributorSyncRunning } from '../constant/constants';
import { TransactionService } from '../service/TransactionService';
import UtilityFunctions from '../helper/utilityFunctions';
import commonHelper from '../helper';
import ArchiveModel from '../models/archive.model';
import InvoiceProcessService from '../service/invoiceProcess.service';

const SapConfig = global['configuration'].sap;

AWS.config.update({
    // accessKeyId:
    //   SapConfig.distributorInventorySyncAwsConfig.accessKeyId,
    // secretAccessKey:
    //   SapConfig.distributorInventorySyncAwsConfig.secretAccessKey,
    region: SapConfig.distributorInventorySyncAwsConfig.region,
});

const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
});

class UtilController {
    static async rorSync(req: Request, res: Response) {
        try {
            logger.info('Inside UtilController -> rorSync');
            const { days } = req.query;
            const response = await UtilService.rorSync(days);
            if (response) {
                logger.info('Inside UtilController -> rorSync , ' + SuccessMessage.ROR_DATA_SYNC_SUCCESSFULLY);
                LogService.insertSyncLog('ROR_SYNC', 'SUCCESS', null, null, null, null, true);
                res.status(200).json(Template.successMessage(SuccessMessage.ROR_DATA_SYNC_SUCCESSFULLY));
            } else {
                logger.info('Inside UtilController -> rorSync , ' + ErrorMessage.ROR_DATA_SYNC_FAILED);
                LogService.insertSyncLog('ROR_SYNC', 'FAIL', null, null, `${ErrorMessage.ROR_DATA_SYNC_FAILED}`, null, true);
                res.status(400).json(Template.errorMessage(ErrorMessage.ROR_DATA_SYNC_FAILED));
            }
        } catch (error) {
            logger.error('Inside UtilController -> rorSync, Error = ', error);
            LogService.insertSyncLog('ROR_SYNC', 'FAIL', null, null, `${error}`, null, true);
            res.status(500).json(Template.internalServerError());
        }
    }

    static async distributorSync(req: Request, res: Response) {
        const isDistributorSyncRunning = getIsDistributorSyncRunning();
        if (isDistributorSyncRunning) {
            return res.status(200).json(Template.errorMessage('Distributor Sync running in background...'));
        }
        try {
            setIsDistributorSyncRunning(true);
            logger.info(`Fetching distributors for syncing`);
            const bearer_auth = req.headers['bearer-auth'] || false;
            logger.info(`inside distributor sync payload headers: ${JSON.stringify(req.headers)}`);
            if (!bearer_auth || bearer_auth !== bearerAuth) return res.status(401).json(Template.errorMessage(ErrorMessage.PERMISSION_ISSUE));

            const logSAPAPITime = process.hrtime();
            const fetchDistributorsResponse = await UtilityFunctions.fetchDistributorsFromSap();
            const logSAPAPIEndTime = (logSAPAPITime[0] + logSAPAPITime[1] / 1e9 / 60).toFixed(3);
            logger.info(`DIST SYNC SAP API Time: ${logSAPAPIEndTime} seconds`);

            // return res.status(200).json(Template.successMessage(SuccessMessage.DISTRIBUTOR_SYNC_SUCCESS));
            if (!fetchDistributorsResponse || fetchDistributorsResponse.status != 200 || !fetchDistributorsResponse.data || fetchDistributorsResponse.data?.length == 0) {
                logger.error(`sap api failed response:`, fetchDistributorsResponse);
                UtilityFunctions.dbSyncFailed('SAP API failed');
                return res.status(500).json(Template.errorMessage(ErrorMessage.SAP_API_FAILED));
            }

            const temp = fetchDistributorsResponse;

            await TransactionService.beginTransaction('distributor');

            const { upsertDistributorsResponse, distributorsMap, distributorsPlantsMOQ } = await UtilService.upsertDistributors(temp.data);
            logger.info(`UPSERT RESPONSE:`, upsertDistributorsResponse);

            if (upsertDistributorsResponse && upsertDistributorsResponse.command === 'INSERT') {
                logger.info(`inside upsertDistributorsResponse.command = INSERT`);
                //Committing the central transaction before procedure runs
                const stagingTransactionCommit = await TransactionService.commitTransaction('distributor');
                if (stagingTransactionCommit) {
                    const dbSyncUUID = `db_sync_${commonHelper.generateRandomNumber()}`;
                    const runDbSyncProc = await UtilService.runDbSyncProc(dbSyncUUID);
                    //Beginning new transaction after procedure runs
                    await TransactionService.beginTransaction('distributor');
                    if (runDbSyncProc) {
                        const dbSyncProcStatus = await UtilService.syncProcedureStatus(dbSyncUUID, 'distributor_sync');
                        if (dbSyncProcStatus && dbSyncProcStatus[0].result == 'SUCCESS') {
                            logger.info('DB sync procedure run successfully');
                            await UtilService.setEmptyDistributorEmails();
                            await UtilService.unlockNewDbsInPDPUnlockRequestWindow();
                            await UtilService.enableROandBOforNewDbs();
                            await UtilService.disableNourishcoDbsPDP();
                            await InvoiceProcessService.enableSmsEmailFlagBasedOnPlants();
                            await UtilService.syncPDDUnlockWindowRegions();

                            const fetchDistributorsResponse = await UtilService.fetchDistributors();
                            await UtilService.upsertDistributorMOQ(distributorsPlantsMOQ);
                            if (fetchDistributorsResponse && fetchDistributorsResponse.rows) {
                                logger.info(`inside fetchDistributorsResponse.rows`);
                                const deletedCodes: string[] = [];
                                for (const row of fetchDistributorsResponse.rows) {
                                    if (!distributorsMap[row.id]) {
                                        deletedCodes.push("'" + row.id + "'");
                                    }
                                }

                                logger.info(`DELETED CODES LENGTH:`, deletedCodes.length);
                                if (deletedCodes.length) {
                                    logger.info(`deletedCodes array length is greater than 0`);
                                    const removeDistributorsResponse = await UtilService.removeDistributors(deletedCodes);
                                    logger.info(`REMOVE RESPONSE`);

                                    if (removeDistributorsResponse && removeDistributorsResponse.command === 'UPDATE') {
                                        await TransactionService.commitTransaction('distributor');
                                        logger.info(`inside removeDistributorsResponse.command = UPDATE, returning success message with successful soft-deletion`);
                                        LogService.insertSyncLog('DISTRIBUTOR', 'SUCCESS', {
                                            upsertCount: upsertDistributorsResponse.rowCount,
                                            deleteCount: removeDistributorsResponse.rowCount,
                                        });
                                        //SOPE-973:to run PDP sync in Forecast-distribution table
                                        // OrderApi.forecastDistributorPDPSync();
                                        //SOPE-1081: TO sync ARS related tables
                                        UtilService.syncARSRelatedTables();
                                        ArchiveModel.reindexEmailSmsLogTable();
                                        UtilityFunctions.fetchKamsCustomerCodeSync();
                                        await ArchiveModel.autoClosureReportTableCleanup();
                                        await ArchiveModel.autoClosureMtReportTableCleanup();
                                        ArchiveModel.reindexAutoClosureRelatedTables();
                                        return res.status(200).json(
                                            Template.success(
                                                {
                                                    upsertCount: upsertDistributorsResponse.rowCount,
                                                    deleteCount: removeDistributorsResponse.rowCount,
                                                },
                                                SuccessMessage.DISTRIBUTOR_SYNC_SUCCESS,
                                            ),
                                        );
                                    } else {
                                        await TransactionService.rollbackTransaction('distributor');
                                        logger.error(`inside else (remove distributors query failed), returning failure message`);
                                        UtilityFunctions.dbSyncFailed('Query failed');
                                        return res.status(500).json(Template.errorMessage(ErrorMessage.DISTRIBUTOR_SYNC_FAILED));
                                    }
                                } else {
                                    await TransactionService.commitTransaction('distributor');
                                    logger.info(`successfully inserted rows without soft-deleting`);
                                    LogService.insertSyncLog('DISTRIBUTOR', 'SUCCESS', {
                                        upsertCount: upsertDistributorsResponse.rowCount,
                                        deleteCount: 0,
                                    });
                                    //SOPE-973:to run PDP sync in Forecast-distribution table
                                    // OrderApi.forecastDistributorPDPSync();
                                    //SOPE-1081: TO sync ARS related tables
                                    UtilService.syncARSRelatedTables();
                                    UtilityFunctions.fetchKamsCustomerCodeSync();
                                    await ArchiveModel.autoClosureReportTableCleanup();
                                    ArchiveModel.reindexAutoClosureRelatedTables();
                                    ArchiveModel.reindexEmailSmsLogTable();
                                    return res.status(200).json(
                                        Template.success(
                                            {
                                                upsertCount: upsertDistributorsResponse.rowCount,
                                                deleteCount: 0,
                                            },
                                            SuccessMessage.DISTRIBUTOR_SYNC_SUCCESS,
                                        ),
                                    );
                                }
                            } else {
                                logger.error(`fetch distributors response failed`);
                            }
                        } else logger.error('Error in distributorSync : dbSyncProc unsuccessful');
                    }
                }
            } else {
                logger.error(`upsert distributors response failed`);
            }

            await TransactionService.rollbackTransaction('distributor');
            logger.error(`returning distributor sync failed message`);
            UtilityFunctions.dbSyncFailed('Sync failed');
            return res.status(500).json(Template.errorMessage(ErrorMessage.DISTRIBUTOR_SYNC_FAILED));
        } catch (error) {
            await TransactionService.rollbackTransaction('distributor');
            logger.error(`error in UtilController.distributorSync: `, error);
            LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `error in distributor sync: ${error}`);
            UtilityFunctions.dbSyncFailed('Sync failed');
            return res.status(500).json(Template.errorMessage(ErrorMessage.DATA_SYNC_ERROR));
        } finally {
            setIsDistributorSyncRunning(false);
            logger.info('inside UtilController -> distributorSync: Distributor Sync Completed');
        }
    }

    static async salesHierarchySync(req: Request, res: Response) {
        try {
            logger.info(`Fetching Sales Hierarchy Details for syncing`);
            const fetchSalesHierarchyResponse = await UtilityFunctions.fetchSalesHierarchyDetails();

            if (
                !fetchSalesHierarchyResponse ||
                fetchSalesHierarchyResponse.status !== 200 ||
                !fetchSalesHierarchyResponse.data ||
                !fetchSalesHierarchyResponse.data.d ||
                !fetchSalesHierarchyResponse.data.d.results
            ) {
                logger.error(`Error in UtilController -> salesHierarchySync: PeopleHub api failed response: ${fetchSalesHierarchyResponse.data || fetchSalesHierarchyResponse}`);
                LogService.insertSyncLog('SALES_HIER', 'FAIL', null, null, fetchSalesHierarchyResponse?.data ?? fetchSalesHierarchyResponse);
                return res.status(500).json(Template.errorMessage(ErrorMessage.SAP_API_FAILED));
            }

            const salesHierarchyDetails = fetchSalesHierarchyResponse.data.d.results;

            await TransactionService.beginTransaction('sales-hierarchy');

            const { upsertSalesHierarchyDetailsResponse, salesHierarchyUsersMap } = await UtilService.upsertSalesHierarchyDetails(salesHierarchyDetails);
            logger.info(`UPDATE SALES HIERARCHY RESPONSE`);

            if (upsertSalesHierarchyDetailsResponse && upsertSalesHierarchyDetailsResponse.command === 'INSERT') {
                logger.info(`inside upsertSalesHierarchyDetailsResponse.command = INSERT`);

                const salesHierarchyStagingCommit = await TransactionService.commitTransaction('sales-hierarchy');
                if (salesHierarchyStagingCommit) {
                    const salesHierarchySyncUUID = `sales_hier_sync_job_${commonHelper.generateRandomNumber()}`;
                    const runSalesHierarchySyncProc = await UtilService.runSalesHierarchySyncProc(salesHierarchySyncUUID);
                    await TransactionService.beginTransaction('sales-hierarchy');
                    if (runSalesHierarchySyncProc) {
                        const salesHierarchySyncProc = await UtilService.syncProcedureStatus(salesHierarchySyncUUID, 'sales-hierarchy-sync');
                        if (salesHierarchySyncProc && salesHierarchySyncProc[0].result == 'SUCCESS') {
                            // Need to confirm why are we making this api call
                            const fetchSalesHierarchyDetailsResponse = await UtilService.fetchSalesHierarchyDetails();
                            if (fetchSalesHierarchyDetailsResponse && fetchSalesHierarchyDetailsResponse.rows) {
                                logger.info(`inside fetchSalesHierarchyDetailsResponse.rows`);

                                const deletedUserIds: string[] = [];
                                for (const row of fetchSalesHierarchyDetailsResponse.rows) {
                                    if (!salesHierarchyUsersMap[row.user_id]) {
                                        deletedUserIds.push("'" + row.user_id + "'");
                                    }
                                }

                                logger.info(`DELETED USER IDS: ${deletedUserIds}`);
                                if (deletedUserIds.length) {
                                    logger.info(`deletedUserIds array length is greater than 0`);
                                    const removeSalesHierarchyDetailsResponse = await UtilService.removeSalesHierarchyDetails(deletedUserIds);
                                    logger.info(`REMOVE RESPONSE`);

                                    if (removeSalesHierarchyDetailsResponse && removeSalesHierarchyDetailsResponse.command === 'UPDATE') {
                                        await TransactionService.commitTransaction('sales-hierarchy');
                                        logger.info(`inside removeSalesHierarchyDetailsResponse.command = UPDATE, returning success message with successful soft-deletion`);
                                        const response = {
                                            upsertCount: upsertSalesHierarchyDetailsResponse.rowCount,
                                            deleteCount: removeSalesHierarchyDetailsResponse.rowCount,
                                        };
                                        LogService.insertSyncLog('SALES_HIER', 'SUCCESS', response);
                                        return res.status(200).json(Template.success(response, SuccessMessage.SALES_HIERARCHY_SYNC_SUCCESS));
                                    } else {
                                        await TransactionService.rollbackTransaction('sales-hierarchy');
                                        logger.error(`inside else (remove sales hierarchy details query failed), returning failure message`);
                                        return res.status(500).json(Template.errorMessage(ErrorMessage.SALES_HIERARCHY_SYNC_FAILED));
                                    }
                                } else {
                                    await TransactionService.commitTransaction('sales-hierarchy');
                                    logger.info(`successfully inserted rows without soft-deleting`);
                                    const response = {
                                        upsertCount: upsertSalesHierarchyDetailsResponse.rowCount,
                                        deleteCount: 0,
                                    };
                                    LogService.insertSyncLog('SALES_HIER', 'SUCCESS', response);
                                    return res.status(200).json(Template.success(response, SuccessMessage.SALES_HIERARCHY_SYNC_SUCCESS));
                                }
                            } else {
                                logger.error(`fetch sales hierarchy users response failed`);
                            }
                        }
                    }
                    logger.error(`Error in Sales-hierarchy sync : salesHierarchySyncProc unsuccessful")`);
                }
            } else {
                logger.error(`upsert sales hierarchy details response failed`);
            }

            logger.info(`returning sales hierarchy sync failed message`);
            await TransactionService.rollbackTransaction('sales-hierarchy');
            LogService.insertSyncLog('SALES_HIER', 'FAIL', null, null, ErrorMessage.SALES_HIERARCHY_SYNC_FAILED + 'rollback transaction');
            return res.status(500).json(Template.errorMessage(ErrorMessage.SALES_HIERARCHY_SYNC_FAILED));
        } catch (error) {
            await TransactionService.rollbackTransaction('sales-hierarchy');
            logger.error(`error in UtilController.salesHierarchySync: `, error);
            LogService.insertSyncLog('SALES_HIER', 'FAIL', null, null, `error in sales hierarchy details sync: ${error}`);
            return res.status(500).json(Template.errorMessage(ErrorMessage.DATA_SYNC_ERROR));
        }
    }

    static async productSync(req: Request, res: Response) {
        try {
            logger.info('Fetching products for syncing');

            const [fetchProductsResponse, fetchProductHierarchyResponse] = await Promise.all([UtilityFunctions.fetchProducts(), UtilityFunctions.fetchProductHierarchy()]);

            const isFetchProductsResponseInvalid = !fetchProductsResponse?.data?.d?.results || fetchProductsResponse?.status !== 200;
            const isFetchProductHierarchyResponseInvalid = !fetchProductHierarchyResponse?.data || fetchProductHierarchyResponse?.status !== 200;

            if (isFetchProductsResponseInvalid) {
                logger.error(`sap api failed response:`, fetchProductsResponse);
                LogService.insertSyncLog('MATERIAL', 'FAIL', null, null, ErrorMessage.SAP_API_FAILED);
                return res.status(500).json(Template.errorMessage(ErrorMessage.SAP_API_FAILED));
            }

            if (isFetchProductHierarchyResponseInvalid) {
                logger.error(`sap api failed response:`, fetchProductHierarchyResponse);
                LogService.insertSyncLog('MATERIAL', 'FAIL', null, null, ErrorMessage.MULE_API_FAILED);
                return res.status(500).json(Template.errorMessage(ErrorMessage.MULE_API_FAILED));
            }

            const temp = fetchProductsResponse.data.d.results;
            const tempProductHierarchy = fetchProductHierarchyResponse.data;

            const { insertMaterialsResponse, materialsMap } = await UtilService.insertMaterials(temp, tempProductHierarchy);
            logger.info(`NO. OF UPDATED MATERIALS : ${Object.keys(materialsMap).length}`);
            logger.info(`UPDATED MATERIALS : ${Object.keys(materialsMap).toString()}`);

            if (insertMaterialsResponse && insertMaterialsResponse.command === 'INSERT') {
                logger.info(`inside insertMaterialsResponse.command = INSERT, inserted count: ${insertMaterialsResponse.rowCount}`);
                const materialSyncUUID = `material_sync_job_${commonHelper.generateRandomNumber()}`;
                const runMaterialSyncProc = await UtilService.runMaterialSyncProc(materialSyncUUID);
                if (runMaterialSyncProc) {
                    const materialSyncProcStatus = await UtilService.syncProcedureStatus(materialSyncUUID, 'material_sync');
                    if (materialSyncProcStatus && materialSyncProcStatus[0].result == 'SUCCESS') {
                        await UtilService.updateSearchTextField();
                        /*const fetchMaterialsResponse = await UtilService.fetchMaterials();

              if (fetchMaterialsResponse && fetchMaterialsResponse.rows) {
                  logger.info(`inside fetchMaterialsResponse.rows`);

                  let deletedCodes: string[] = [];
                  for (let row of fetchMaterialsResponse.rows) {
                      if (!materialsMap[row.code]) {
                          deletedCodes.push("'" + row.code + "'");
                      }
                  }

                  logger.info(`NO. OF DELETED CODES: ${deletedCodes.length}`);
                  logger.info(`DELETED CODES: ${deletedCodes}`);
                  if (deletedCodes.length) {
                      logger.info(`deletedCodes array length is greater than 0`);
                      const removeMaterialsResponse = await UtilService.removeMaterials(deletedCodes);
                      logger.info(`REMOVE RESPONSE: ${removeMaterialsResponse}`);

                      if (removeMaterialsResponse && removeMaterialsResponse.command === 'UPDATE') {
                          logger.info(`inside removeMaterialsResponse.command = UPDATE, returning success message`);
                          LogService.insertSyncLog('MATERIAL', 'SUCCESS', { upsertCount: insertMaterialsResponse.rowCount, deleteCount: removeMaterialsResponse.rowCount });
                          return res.status(200).json(Template.success({ upsertCount: insertMaterialsResponse.rowCount, deleteCount: removeMaterialsResponse.rowCount }, SuccessMessage.PRODUCT_SYNC_SUCCESS));
                      }
                  } else {
                      logger.info(`successfully inserted rows without soft-deleting`);
                      LogService.insertSyncLog('MATERIAL', 'SUCCESS', { upsertCount: insertMaterialsResponse.rowCount, deleteCount: 0 });
                      return res.status(200).json(Template.success({ upsertCount: insertMaterialsResponse.rowCount, deleteCount: 0 }, SuccessMessage.PRODUCT_SYNC_SUCCESS));
                  }
              }*/

                        logger.info(`successfully inserted rows without soft-deleting`);
                        LogService.insertSyncLog('MATERIAL', 'SUCCESS', {
                            upsertCount: insertMaterialsResponse.rowCount,
                            deleteCount: 0,
                        });
                        UtilService.appendMissingNourishcoForecastData();
                        return res.status(200).json(
                            Template.success(
                                {
                                    upsertCount: insertMaterialsResponse.rowCount,
                                    deleteCount: 0,
                                },
                                SuccessMessage.PRODUCT_SYNC_SUCCESS,
                            ),
                        );
                    }
                }
            }

            logger.info(`returning success failed`);
            LogService.insertSyncLog('MATERIAL', 'FAIL', null, null, ErrorMessage.PRODUCT_SYNC_FAILED);
            return res.status(500).json(Template.errorMessage(ErrorMessage.PRODUCT_SYNC_FAILED));
        } catch (error) {
            logger.error(`error in productSync: `, error);
            LogService.insertSyncLog('MATERIAL', 'FAIL', null, null, `${error}`);
            return res.status(500).json(Template.errorMessage(ErrorMessage.DATA_SYNC_ERROR));
        }
    }

    static async mapProductsToDistributors(req: Request, res: Response) {
        logger.info('inside UtilController -> mapProductsToDistributors');
        try {
            const response = await UtilService.inventorySyncOrchestration();
            if (response && !isNaN(response)) {
                return res.status(200).json(Template.success({ updateCount: response }, SuccessMessage.PRODUCT_DISTRIBUTOR_MAPPING_SUCCESS));
            }
            return res.status(400).json(Template.errorMessage(ErrorMessage.PRODUCT_DISTRIBUTOR_MAPPING_FAILED));
        } catch (error) {
            logger.error(`CAUGHT: error in UtilController -> mapProductsToDistributors: `, error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.PRODUCT_DISTRIBUTOR_MAPPING_FILE_ERROR));
        }
    }

    static async readFileFromS3Bucket(fileToProcess) {
        return new Promise((resolve, reject) => {
            logger.info(`inside readFileFromS3Bucket`);
            try {
                const params = {
                    Bucket: SapConfig.distributorInventorySyncAwsConfig.bucket,
                    Prefix: SapConfig.distributorInventorySyncAwsConfig.folderPath,
                };
                s3.listObjectsV2(params, function (err, data) {
                    if (err) {
                        logger.error('error in listing s3 bucket files: ', err);
                        reject(err);
                    } else if (data) {
                        let file = null;
                        for (const datum of data.Contents) {
                            if (!datum.Key.toString().includes(fileToProcess)) continue;
                            if (file) {
                                if (new Date(datum.LastModified) > new Date(file.LastModified)) {
                                    file = datum;
                                }
                            } else {
                                file = datum;
                            }
                        }
                        if (!file) {
                            logger.error('No file found!');
                            return reject(null);
                        }
                        logger.info(`File Selected : ${file.Key}`);
                        logger.info(`File Uploaded : ${file.LastModified}`);
                        const bucketParams = {
                            Bucket: SapConfig.distributorInventorySyncAwsConfig.bucket,
                            Key: `${file.Key}`,
                        };
                        const response = {
                            S3FileName: file.Key,
                            S3Response: null,
                        };
                        s3.getObject(bucketParams, function (error, data) {
                            if (error) {
                                logger.error('error in reading s3 bucket file: ', error);
                                response.S3Response = error;
                                reject(response);
                            } else {
                                const str = data.Body.toString('ascii');
                                const res = commonHelper.convertTextFileToJSON(str);
                                response.S3Response = res;
                                resolve(response);
                            }
                        });
                    }
                });
            } catch (err) {
                logger.error('technical error catched in readFileFromS3Bucket: ', err);
                reject(err);
            }
        });
    }

    static async openSOSync(req: Request, res: Response) {
        const distributorId = req.params.distributor_id;
        const { status } = req.query as typeof req.query & { status: string };
        try {
            /*logger.info(`Checking Sync Log Count`);
          const syncLogExist = await LogService.checkSyncLog(distributorId);
          logger.info(`Sync Log Exist: ${syncLogExist}`);*/

            logger.info(`Fetching Open SO for syncing`);
            const fetchOpenSOResponse = await UtilityFunctions.fetchOpenSO(distributorId, false, status);

            if (!fetchOpenSOResponse || fetchOpenSOResponse.status !== 200 || !fetchOpenSOResponse.data || !fetchOpenSOResponse.data.d || !fetchOpenSOResponse.data.d.results) {
                logger.error(`sap api failed response: ${fetchOpenSOResponse.data || fetchOpenSOResponse}`);
                LogService.insertSyncLog('SO', 'FAIL', null, distributorId, ErrorMessage.SAP_API_FAILED);
                return res.status(500).json(Template.errorMessage(ErrorMessage.SAP_API_FAILED));
            }

            const soDetails = fetchOpenSOResponse.data.d.results;

            const updateOpenSOResponse = await UtilService.updateOpenSO(soDetails, distributorId);
            logger.info(`UPDATE OPEN SO RESPONSE`);

            if (updateOpenSOResponse && updateOpenSOResponse.command === 'UPDATE') {
                logger.info(`inside updateOpenSOResponse.command = UPDATE`);
                LogService.insertSyncLog(
                    'SO',
                    'SUCCESS',
                    {
                        upsertCount: updateOpenSOResponse.rowCount,
                        deleteCount: null,
                    },
                    distributorId,
                );
                return res.status(200).json(Template.success({ updateCount: updateOpenSOResponse.rowCount }, SuccessMessage.OPEN_SO_SYNC_SUCCESS));
            }

            logger.info(`returning success failed`);
            LogService.insertSyncLog('SO', 'FAIL', null, distributorId, ErrorMessage.OPEN_SO_SYNC_FAILED);
            return res.status(500).json(Template.errorMessage(ErrorMessage.OPEN_SO_SYNC_FAILED));
        } catch (error) {
            logger.error(`error in openSOSync: `, error);
            LogService.insertSyncLog('SO', 'FAIL', null, distributorId, `${error}`);
            return res.status(500).json(Template.errorMessage(ErrorMessage.DATA_SYNC_ERROR));
        }
    }
    static async mtEcomSOSync(req: Request, res: Response) {
        try {
            logger.info(`Fetching MT Ecom SO for syncing`);
            const startTime = process.hrtime();
            const {date,customerCode} = req.query;
            const fetchMTOpenSOResponse = await UtilService.mtEcomSoSync(date,customerCode);
            const endTime = process.hrtime(startTime);
            logger.info(`MT Ecom SO Sync Time: ${(endTime[0] + endTime[1] / 1e9) / 60} Minutes`);
            if (!fetchMTOpenSOResponse) {
                logger.error('Error in Mt Ecom So sync');
                LogService.insertSyncLog('MT ECOM SO Sync', 'FAIL', null, null, ErrorMessage.MT_ECOM_SO_SYNC_FAILED);
                return res.status(500).json(Template.errorMessage(ErrorMessage.MT_ECOM_SO_SYNC_FAILED));
            }
            if(customerCode){
                return res.status(200).json(Template.success(fetchMTOpenSOResponse?.data?.d?.results,SuccessMessage.MT_ECOM_SO_SYNC_SUCCESS));
            }
            // Success case
            LogService.insertSyncLog(
                'MT ECOM SO Sync',
                'SUCCESS',
                {
                    upsertCount: null,
                    deleteCount: null,
                },
                null,
            );

            return res.status(200).json(Template.successMessage(SuccessMessage.MT_ECOM_SO_SYNC_SUCCESS));
        } catch (error) {
            logger.error(`Error in mtEcomSOSync: ${error}`);
            LogService.insertSyncLog('MT ECOM SO Sync', 'FAIL', null, null, `Error in sync: ${error}`);
            return res.status(500).json(Template.errorMessage(ErrorMessage.DATA_SYNC_ERROR));
        }
    }

    static async previousProcessCalender(req: Request, res: Response) {
        logger.info('Inside utilController -> previousProcessCalender');
        try {
            const response = await UtilService.previousProcessCalender();
            if (response) {
                return res.status(200).json(Template.success(response, SuccessMessage.PREVIOUS_PROCESS_CALENDER));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.PREVIOUS_PROCESS_CALENDER));
        } catch (error) {
            logger.error(`error previousProcessCalender ${error}`);
            return res.status(500).json(Template.error());
        }
    }

    static async nourishcoPlanningSync(req: Request, res: Response) {
        logger.info('inside UtilController -> nourishcoPlanningSync');
        try {
            const file = req['file'];
            const result = await UtilService.nourishcoPlanningSync(file);
            if (typeof result === 'string') {
                return res.status(200).json(Template.errorMessage(result));
            } else if (result === false) {
                return res.status(200).json(Template.errorMessage(ErrorMessage.DATA_SYNC_ERROR));
            }
            return res.status(200).json(Template.successMessage(SuccessMessage.NOURISHCO_PLANNING_SYNC_SUCCESS));
        } catch (error) {
            logger.error('CAUGHT: Error in UtilController -> nourishcoPlanningSync', error);
            return res.status(500).json(Template.error());
        }
    }

    static async downloadNourishcoForecastFile(req: Request, res: Response) {
        logger.info('inside UtilController -> downloadNourishcoForecastFile');
        try {
            const result = await UtilService.downloadNourishcoForecastFile();
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.NOURISHCO_FORECAST_FILE_DOWNLOAD_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.NOURISHCO_FORECAST_FILE_DOWNLOAD_FAILED));
        } catch (error) {
            logger.error('CAUGHT: Error in UtilController -> downloadNourishcoForecastFile', error);
            return res.status(500).json(Template.error());
        }
    }
    
}

export default UtilController;
