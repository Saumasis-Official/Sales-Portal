import AWS from 'aws-sdk';
import { ErrorMessage } from '../constant/error.message';
import { SuccessMessage } from '../constant/sucess.message';
import Template from '../helper/responseTemplate';
import logger from '../lib/logger';
import UtilityFunctions from '../helper/utilityFunctions';
import { UtilService } from '../service/UtilService';
import { LogService } from '../service/LogService';
import { TransactionService } from '../service/TransactionService';
import axios from 'axios';
import commanHelper from '../helper';
import { Request, Response } from 'express';
import Email from '../helper/email';
const SapConfig = global['configuration'].sap;
import responseTemplate from '../helper/responseTemplate';
import { ArsApi } from '../helper/arsApi';
import { bearerAuth } from '../constant/constants';
import { UtilModel } from '../models/UtilModel';
import commonHelper from '../helper';
import { getIsDistributorSyncRunning, setIsDistributorSyncRunning } from '../constant/constants';

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
  static async productSync(req: any, res: any) {
    try {
      logger.info('Fetching products for syncing');

      const [
        fetchProductsResponse,
        fetchProductHierarchyResponse
      ] = await Promise.all([
        UtilityFunctions.fetchProducts(),
        UtilityFunctions.fetchProductHierarchy()
      ]);

      const isFetchProductsResponseInvalid = !fetchProductsResponse?.data?.d?.results || fetchProductsResponse?.status !== 200;
      const isFetchProductHierarchyResponseInvalid = !fetchProductHierarchyResponse?.data || fetchProductHierarchyResponse?.status !== 200;


      if (isFetchProductsResponseInvalid) {
        logger.error(
          `sap api failed response:`,
          fetchProductsResponse,
        );
        LogService.insertSyncLog('MATERIAL', 'FAIL', null, null, ErrorMessage.SAP_API_FAILED);
        return res
          .status(500)
          .json(Template.errorMessage(ErrorMessage.SAP_API_FAILED));
      }

      if (isFetchProductHierarchyResponseInvalid) {
        logger.error(
          `sap api failed response:`,
          fetchProductHierarchyResponse,
        );
        LogService.insertSyncLog('MATERIAL', 'FAIL', null, null, ErrorMessage.MULE_API_FAILED);
        return res
          .status(500)
          .json(Template.errorMessage(ErrorMessage.MULE_API_FAILED));
      }

      const temp = fetchProductsResponse.data.d.results;
      const tempProductHierarchy = fetchProductHierarchyResponse.data;

      const { insertMaterialsResponse, materialsMap } =
        await UtilService.insertMaterials(temp, tempProductHierarchy);
      logger.info(
        `NO. OF UPDATED MATERIALS : ${Object.keys(materialsMap).length
        }`,
      );
      logger.info(
        `UPDATED MATERIALS : ${Object.keys(materialsMap).toString()}`,
      );

      if (
        insertMaterialsResponse &&
        insertMaterialsResponse.command === 'INSERT'
      ) {
        logger.info(
          `inside insertMaterialsResponse.command = INSERT, inserted count: ${insertMaterialsResponse.rowCount}`,
        );
        const materialSyncUUID = `material_sync_${commonHelper.generateRandomNumber()}`;
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

            logger.info(
              `successfully inserted rows without soft-deleting`,
            );
            LogService.insertSyncLog('MATERIAL', 'SUCCESS', {
              upsertCount: insertMaterialsResponse.rowCount,
              deleteCount: 0,
            });
            return res
              .status(200)
              .json(
                Template.success(
                  {
                    upsertCount: insertMaterialsResponse.rowCount,
                    deleteCount: 0,
                  },
                  SuccessMessage.PRODUCT_SYNC_SUCCESS,
                ),
              );
          }
          else
            logger.error("Error in product sync : materialSyncProc unsuccessful")
        }


      }

      logger.info(`returning success failed`);
      LogService.insertSyncLog('MATERIAL', 'FAIL', null, null, ErrorMessage.PRODUCT_SYNC_FAILED);
      return res
        .status(500)
        .json(
          Template.errorMessage(ErrorMessage.PRODUCT_SYNC_FAILED),
        );
    } catch (error) {
      logger.error(`error in productSync: `, error);
      LogService.insertSyncLog('MATERIAL', 'FAIL', null, null, `${error}`);
      return res
        .status(500)
        .json(Template.errorMessage(ErrorMessage.DATA_SYNC_ERROR));
    }
  }

  static async openSOSync(req: any, res: any) {
    const distributorId = req.params.distributor_id;
    const { status } = req.query;
    try {
      /*logger.info(`Checking Sync Log Count`);
            const syncLogExist = await LogService.checkSyncLog(distributorId);
            logger.info(`Sync Log Exist: ${syncLogExist}`);*/

      logger.info(`Fetching Open SO for syncing`);
      logger.info(`openSOSync Req Headers: ${JSON.stringify(req.headers)}`);

      const fetchOpenSOResponse = await UtilityFunctions.fetchOpenSO(
        distributorId,
        false,
        status,
      );

      if (
        !fetchOpenSOResponse ||
        fetchOpenSOResponse.status !== 200 ||
        !fetchOpenSOResponse.data ||
        !fetchOpenSOResponse.data.d ||
        !fetchOpenSOResponse.data.d.results
      ) {
        logger.error(
          `sap api failed response: ${fetchOpenSOResponse.data || fetchOpenSOResponse
          }`,
        );
        LogService.insertSyncLog('SO', 'FAIL', null, distributorId, ErrorMessage.SAP_API_FAILED);
        return res
          .status(500)
          .json(Template.errorMessage(ErrorMessage.SAP_API_FAILED));
      }

      const soDetails = fetchOpenSOResponse.data.d.results;

      const updateOpenSOResponse = await UtilService.updateOpenSO(
        soDetails,
        distributorId,
      );
      logger.info(`UPDATE OPEN SO RESPONSE`);

      if (
        updateOpenSOResponse &&
        updateOpenSOResponse.command === 'UPDATE'
      ) {
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
        return res
          .status(200)
          .json(
            Template.success(
              { updateCount: updateOpenSOResponse.rowCount },
              SuccessMessage.OPEN_SO_SYNC_SUCCESS,
            ),
          );
      }

      logger.info(`returning success failed`);
      LogService.insertSyncLog('SO', 'FAIL', null, distributorId, ErrorMessage.OPEN_SO_SYNC_FAILED);
      return res
        .status(500)
        .json(
          Template.errorMessage(ErrorMessage.OPEN_SO_SYNC_FAILED),
        );
    } catch (error) {
      logger.error(`error in openSOSync: `, error);
      LogService.insertSyncLog('SO', 'FAIL', null, distributorId, `${error}`);
      return res
        .status(500)
        .json(Template.errorMessage(ErrorMessage.DATA_SYNC_ERROR));
    }
  }

  static async distributorSync(req: any, res: any) {
    const isDistributorSyncRunning = getIsDistributorSyncRunning();
    if (isDistributorSyncRunning) {
      return res.status(200).json(Template.errorMessage("Distributor Sync running in background..."));
    }
    try {
      setIsDistributorSyncRunning(true);
      logger.info(`Fetching distributors for syncing`);
      const bearer_auth = req.headers['bearer-auth'] || false;
      logger.info(`inside distributor sync payload headers: ${JSON.stringify(req.headers)}`)
      if (!bearer_auth || bearer_auth !== bearerAuth)
        return res.status(401).json(Template.errorMessage(ErrorMessage.PERMISSION_ISSUE));

      const logSAPAPITime = process.hrtime();
      const fetchDistributorsResponse = await UtilityFunctions.fetchDistributorsFromSap();
      const logSAPAPIEndTime = (logSAPAPITime[0] + (logSAPAPITime[1] / 1e9) / 60).toFixed(3);
      logger.info(`DIST SYNC SAP API Time: ${logSAPAPIEndTime} seconds`);

      // return res.status(200).json(Template.successMessage(SuccessMessage.DISTRIBUTOR_SYNC_SUCCESS));
      if (!fetchDistributorsResponse ||
        fetchDistributorsResponse.status != 200 ||
        !fetchDistributorsResponse.data ||
        fetchDistributorsResponse.data?.length == 0
      ) {
        logger.error(
          `sap api failed response:`,
          fetchDistributorsResponse,
        );
        UtilityFunctions.dbSyncFailed('SAP API failed')
        return res
          .status(500)
          .json(Template.errorMessage(ErrorMessage.SAP_API_FAILED));
      }

      const temp = fetchDistributorsResponse;

      await TransactionService.beginTransaction('distributor');

      const { upsertDistributorsResponse, distributorsMap, distributorsPlantsMOQ } =
        await UtilService.upsertDistributors(temp.data);
      logger.info(`UPSERT RESPONSE:`, upsertDistributorsResponse);

      if (
        upsertDistributorsResponse &&
        upsertDistributorsResponse.command === 'INSERT'
      ) {
        logger.info(
          `inside upsertDistributorsResponse.command = INSERT`,
        );
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
              const unlockNewDbsInPDPUnlockRequestWindowResponse = await UtilService.unlockNewDbsInPDPUnlockRequestWindow();
              const enableROandBOforNewDbsResponse = await UtilService.enableROandBOforNewDbs();
              const disableNourishcoDbsPDPResponse = await UtilService.disableNourishcoDbsPDP();

              const fetchDistributorsResponse =
                await UtilService.fetchDistributors();
              await UtilService.upsertDistributorMOQ(distributorsPlantsMOQ);
              if (
                fetchDistributorsResponse &&
                fetchDistributorsResponse.rows
              ) {
                logger.info(`inside fetchDistributorsResponse.rows`);
                let deletedCodes: string[] = [];
                for (let row of fetchDistributorsResponse.rows) {
                  if (!distributorsMap[row.id]) {
                    deletedCodes.push("'" + row.id + "'");
                  }
                }

                logger.info(`DELETED CODES LENGTH:`, deletedCodes.length);
                if (deletedCodes.length) {
                  logger.info(
                    `deletedCodes array length is greater than 0`,
                  );
                  const removeDistributorsResponse =
                    await UtilService.removeDistributors(deletedCodes);
                  logger.info(`REMOVE RESPONSE`);

                  if (
                    removeDistributorsResponse &&
                    removeDistributorsResponse.command === 'UPDATE'
                  ) {
                    await TransactionService.commitTransaction(
                      'distributor',
                    );
                    logger.info(
                      `inside removeDistributorsResponse.command = UPDATE, returning success message with successful soft-deletion`,
                    );
                    LogService.insertSyncLog('DISTRIBUTOR', 'SUCCESS', {
                      upsertCount: upsertDistributorsResponse.rowCount,
                      deleteCount: removeDistributorsResponse.rowCount,
                    });
                    //SOPE-973:to run PDP sync in Forecast-distribution table
                    ArsApi.forecastDistributorPDPSync();
                    //SOPE-1081: TO sync ARS related tables
                    UtilService.syncARSRelatedTables();
                    return res
                      .status(200)
                      .json(
                        Template.success(
                          {
                            upsertCount:
                              upsertDistributorsResponse.rowCount,
                            deleteCount:
                              removeDistributorsResponse.rowCount,
                          },
                          SuccessMessage.DISTRIBUTOR_SYNC_SUCCESS,
                        ),
                      );
                  } else {
                    await TransactionService.rollbackTransaction(
                      'distributor',
                    );
                    logger.error(
                      `inside else (remove distributors query failed), returning failure message`,
                    );
                    UtilityFunctions.dbSyncFailed('Query failed')
                    return res
                      .status(500)
                      .json(
                        Template.errorMessage(
                          ErrorMessage.DISTRIBUTOR_SYNC_FAILED,
                        ),
                      );
                  }
                } else {
                  await TransactionService.commitTransaction('distributor');
                  logger.info(
                    `successfully inserted rows without soft-deleting`,
                  );
                  LogService.insertSyncLog('DISTRIBUTOR', 'SUCCESS', {
                    upsertCount: upsertDistributorsResponse.rowCount,
                    deleteCount: 0,
                  });
                  //SOPE-973:to run PDP sync in Forecast-distribution table
                  ArsApi.forecastDistributorPDPSync();
                  //SOPE-1081: TO sync ARS related tables
                  UtilService.syncARSRelatedTables();
                  return res
                    .status(200)
                    .json(
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

            }
            else
              logger.error("Error in distributorSync : dbSyncProc unsuccessful")
          }
        }
      } else {
        logger.error(`upsert distributors response failed`);
      }

      await TransactionService.rollbackTransaction('distributor');
      logger.error(`returning distributor sync failed message`);
      UtilityFunctions.dbSyncFailed('Sync failed')
      return res
        .status(500)
        .json(
          Template.errorMessage(ErrorMessage.DISTRIBUTOR_SYNC_FAILED),
        );
    } catch (error) {
      await TransactionService.rollbackTransaction('distributor');
      logger.error(
        `error in UtilController.distributorSync: `,
        error,
      );
      LogService.insertSyncLog(
        'DISTRIBUTOR',
        'FAIL',
        null,
        null,
        `error in distributor sync: ${error}`,
      );
      UtilityFunctions.dbSyncFailed('Sync failed')
      return res
        .status(500)
        .json(Template.errorMessage(ErrorMessage.DATA_SYNC_ERROR));
    } finally {
      setIsDistributorSyncRunning(false)
      logger.info("inside UtilController -> distributorSync: Distributor Sync Completed");
    }
  }

  static async fetchSapResponse(req: any, res: any) {
    try {
      const { url, method, data } = req.body;
      logger.info(`Getting so number in sendToSapReOrder:`);
      const config = {
        method: `${method}`,
        url: `${url}`,
        data,
        headers: {
          'X-Requested-With': 'X',
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Access-Control-Allow-Headers':
            'Content-Type, api_key, Authorization, Referer',
          'Access-Control-Allow-Methods':
            'GET, POST, DELETE, PUT, PATCH, OPTIONS',
          'Access-Control-Allow-Origin': '*',
        },
        auth: SapConfig.auth,
      };
      logger.info(
        `config send to sap from axios call: ${JSON.stringify(
          config,
        )}`,
      );
      const response = await axios(config);

      if (!response) {
        logger.info(`Response from generic SAP is undefined or null`);
        return res.status(200).json({
          error: 'Empty response',
          data: null,
        });
      }
      const { status } = response;
      logger.info(`response from generic sap api: `, response);
      logger.info('Status received from generic SAP is: ', status);
      return res
        .status(200)
        .json({ data: response ? response.data : response });
    } catch (error) {
      logger.error(`Error from generic sap api:`, error);
      return res.status(500).json({
        message: 'Technical Error',
        error:
          commanHelper.isCircular(error) &&
            !commanHelper.isJsonObject(error)
            ? `${error}`
            : `${JSON.stringify(error)}`,
        data: null,
      });
    }
  }

  static async salesHierarchySync(req: Request, res: Response) {
    try {
      logger.info(`Fetching Sales Hierarchy Details for syncing`);
      const fetchSalesHierarchyResponse =
        await UtilityFunctions.fetchSalesHierarchyDetails();

      if (
        !fetchSalesHierarchyResponse ||
        fetchSalesHierarchyResponse.status !== 200 ||
        !fetchSalesHierarchyResponse.data ||
        !fetchSalesHierarchyResponse.data.d ||
        !fetchSalesHierarchyResponse.data.d.results
      ) {
        logger.error(
          `Error in UtilController -> salesHierarchySync: PeopleHub api failed response: ${fetchSalesHierarchyResponse.data ||
          fetchSalesHierarchyResponse
          }`,
        );
        LogService.insertSyncLog('SALES_HIER', 'FAIL', null, null, fetchSalesHierarchyResponse?.data ?? fetchSalesHierarchyResponse);
        return res
          .status(500)
          .json(Template.errorMessage(ErrorMessage.SAP_API_FAILED));
      }

      const salesHierarchyDetails =
        fetchSalesHierarchyResponse.data.d.results;

      await TransactionService.beginTransaction('sales-hierarchy');

      const {
        upsertSalesHierarchyDetailsResponse,
        salesHierarchyUsersMap,
      } = await UtilService.upsertSalesHierarchyDetails(
        salesHierarchyDetails,
      );
      logger.info(`UPDATE SALES HIERARCHY RESPONSE`);

      if (
        upsertSalesHierarchyDetailsResponse &&
        upsertSalesHierarchyDetailsResponse.command === 'INSERT'
      ) {
        logger.info(
          `inside upsertSalesHierarchyDetailsResponse.command = INSERT`,
        );
        const salesHierarchyStagingCommit = await TransactionService.commitTransaction('sales-hierarchy')
        if (salesHierarchyStagingCommit) {
          const salesHierarchySyncUUID = `sales_hier_sync_${commonHelper.generateRandomNumber()}`;
          const runSalesHierarchySyncProc = await UtilService.runSalesHierarchySyncProc(salesHierarchySyncUUID);
          await TransactionService.beginTransaction('sales-hierarchy')
          if (runSalesHierarchySyncProc) {
            const salesHierarchySyncProc = await UtilService.syncProcedureStatus(salesHierarchySyncUUID, 'sales-hierarchy-sync');
            if (salesHierarchySyncProc && salesHierarchySyncProc[0].result == 'SUCCESS') {
              // Need to confirm why are we making this api call
              const fetchSalesHierarchyDetailsResponse =
                await UtilService.fetchSalesHierarchyDetails();

              if (
                fetchSalesHierarchyDetailsResponse &&
                fetchSalesHierarchyDetailsResponse.rows
              ) {
                logger.info(
                  `inside fetchSalesHierarchyDetailsResponse.rows`,
                );

                let deletedUserIds: string[] = [];
                for (let row of fetchSalesHierarchyDetailsResponse.rows) {
                  if (!salesHierarchyUsersMap[row.user_id]) {
                    deletedUserIds.push("'" + row.user_id + "'");
                  }
                }

                logger.info(
                  `DELETED USER IDS: ${deletedUserIds}`,
                );
                if (deletedUserIds.length) {
                  logger.info(
                    `deletedUserIds array length is greater than 0`,
                  );
                  const removeSalesHierarchyDetailsResponse =
                    await UtilService.removeSalesHierarchyDetails(
                      deletedUserIds,
                    );
                  logger.info(`REMOVE RESPONSE`);

                  if (
                    removeSalesHierarchyDetailsResponse &&
                    removeSalesHierarchyDetailsResponse.command === 'UPDATE'
                  ) {
                    await TransactionService.commitTransaction(
                      'sales-hierarchy',
                    );
                    logger.info(
                      `inside removeSalesHierarchyDetailsResponse.command = UPDATE, returning success message with successful soft-deletion`,
                    );
                    const response = {
                      upsertCount:
                        upsertSalesHierarchyDetailsResponse.rowCount,
                      deleteCount:
                        removeSalesHierarchyDetailsResponse.rowCount,
                    };
                    LogService.insertSyncLog(
                      'SALES_HIER',
                      'SUCCESS',
                      response,
                    );
                    return res
                      .status(200)
                      .json(
                        Template.success(
                          response,
                          SuccessMessage.SALES_HIERARCHY_SYNC_SUCCESS,
                        ),
                      );
                  } else {
                    await TransactionService.rollbackTransaction(
                      'sales-hierarchy',
                    );
                    logger.error(
                      `inside else (remove sales hierarchy details query failed), returning failure message`,
                    );
                    return res
                      .status(500)
                      .json(
                        Template.errorMessage(
                          ErrorMessage.SALES_HIERARCHY_SYNC_FAILED,
                        ),
                      );
                  }
                } else {
                  await TransactionService.commitTransaction(
                    'sales-hierarchy',
                  );
                  logger.info(
                    `successfully inserted rows without soft-deleting`,
                  );
                  const response = {
                    upsertCount:
                      upsertSalesHierarchyDetailsResponse.rowCount,
                    deleteCount: 0,
                  };
                  LogService.insertSyncLog(
                    'SALES_HIER',
                    'SUCCESS',
                    response,
                  );
                  return res
                    .status(200)
                    .json(
                      Template.success(
                        response,
                        SuccessMessage.SALES_HIERARCHY_SYNC_SUCCESS,
                      ),
                    );
                }
              } else {
                logger.error(`fetch sales hierarchy users response failed`);
              }
            }
          }
          logger.error(
            `Error in Sales-hierarchy sync : salesHierarchySyncProc unsuccessful")`,
          );
        }
      }
      else {
        logger.error(
          `upsert sales hierarchy details response failed`,
        );
      }

      logger.info(`returning sales hierarchy sync failed message`);
      await TransactionService.rollbackTransaction('sales-hierarchy');
      LogService.insertSyncLog('SALES_HIER', 'FAIL', null, null, ErrorMessage.SALES_HIERARCHY_SYNC_FAILED + 'rollback transaction');
      return res
        .status(500)
        .json(
          Template.errorMessage(
            ErrorMessage.SALES_HIERARCHY_SYNC_FAILED,
          ),
        );
    } catch (error) {
      await TransactionService.rollbackTransaction('sales-hierarchy');
      logger.error(
        `error in UtilController.salesHierarchySync: `,
        error,
      );
      LogService.insertSyncLog(
        'SALES_HIER',
        'FAIL',
        null,
        null,
        `error in sales hierarchy details sync: ${error}`,
      );
      return res
        .status(500)
        .json(Template.errorMessage(ErrorMessage.DATA_SYNC_ERROR));
    }
  }

  static async mapProductsToDistributors(
    req: Request,
    res: Response,
  ) {
    let app_level_settings;
    let fileToProcess = SapConfig.distributorInventorySyncFilePrefix;
    let PSKU_DIST_INVENTORY = false;
    app_level_settings = await UtilService.getAppLevelConfigurations();
    if (app_level_settings && app_level_settings.rows.length > 0) {
      for (let appconfig of app_level_settings.rows) {
        if (
          appconfig.key === 'ENABLE_PSKU' &&
          appconfig.value === 'YES'
        ) {
          fileToProcess =
            SapConfig.distributorInventorySyncPSKUFilePrefix;
          PSKU_DIST_INVENTORY = true;
        }
      }
    }
    try {
      logger.info(`inside UtilController.mapProductsToDistributors`);
      UtilController.readFileFromS3Bucket(fileToProcess)
        .then(
          async (response: {
            S3FileName: string;
            S3Response: any;
          }) => {
            if (response.S3FileName && response.S3Response) {
              const tempfilename = response?.S3FileName.split('/');
              let filename = tempfilename[1];
              const mapProductToAreasResponse =
                await UtilService.mapProductsToDistributors(
                  response.S3Response,
                );
              if (
                mapProductToAreasResponse &&
                !isNaN(mapProductToAreasResponse)
              ) {
                const response = {
                  upsertCount: mapProductToAreasResponse,
                  deleteCount: null,
                };
                if (PSKU_DIST_INVENTORY) {
                  LogService.insertSyncLog(
                    'PSKU_DIST_INVENTORY',
                    'SUCCESS',
                    response,
                    null,
                    null,
                    filename
                  );
                } else {
                  LogService.insertSyncLog(
                    "DIST_INVENTORY",
                    "SUCCESS",
                    response,
                    null,
                    null,
                    filename
                  );
                }

                return res
                  .status(200)
                  .json(
                    Template.success(
                      { updateCount: mapProductToAreasResponse },
                      SuccessMessage.PRODUCT_DISTRIBUTOR_MAPPING_SUCCESS,
                    ),
                  );
              }
              if (PSKU_DIST_INVENTORY) {
                LogService.insertSyncLog(
                  'PSKU_DIST_INVENTORY',
                  'FAIL',
                );
              } else {
                LogService.insertSyncLog('DIST_INVENTORY', 'FAIL');
              }
              return res.
                status(400)
                .json(
                  Template.errorMessage(
                    ErrorMessage.PRODUCT_DISTRIBUTOR_MAPPING_FAILED
                  )
                );
            }
          },
        )
        .catch((error) => {
          if (PSKU_DIST_INVENTORY) {
            LogService.insertSyncLog(
              'PSKU_DIST_INVENTORY',
              'FAIL',
              null,
              null,
              `Technical error in distributor inventory sync: ${error}`,
            );
          } else {
            LogService.insertSyncLog(
              "DIST_INVENTORY",
              "FAIL",
              null,
              null,
              `Technical error in distributor inventory sync: ${error}`,
              null
            );
          }
          return res.
            status(500)
            .json(
              Template.errorMessage(
                ErrorMessage.PRODUCT_DISTRIBUTOR_MAPPING_FILE_ERROR
              )
            );
        });
    } catch (error) {
      logger.error(
        `error in UtilController.mapProductsToDistributors: `,
        error,
      );
      if (PSKU_DIST_INVENTORY) {
        LogService.insertSyncLog(
          'PSKU_DIST_INVENTORY',
          'FAIL',
          null,
          null,
          `Technical error in distributor inventory sync: ${error}`,
        );
      } else {
        LogService.insertSyncLog(
          'DIST_INVENTORY',
          'FAIL',
          null,
          null,
          `Technical error in distributor inventory sync: ${error}`,
        );
      }
      return res.
        status(500)
        .json(
          Template.errorMessage(
            ErrorMessage.PRODUCT_DISTRIBUTOR_MAPPING_FILE_ERROR
          )
        );
    }
  }
  static async readFileFromS3Bucket(fileToProcess) {
    return new Promise((resolve, reject) => {
      logger.info(`inside readFileFromS3Bucket`);
      try {
        const params = {
          Bucket: SapConfig.distributorInventorySyncAwsConfig.bucket,
          Prefix:
            SapConfig.distributorInventorySyncAwsConfig.folderPath,
        };
        s3.listObjectsV2(params, function (err, data) {
          if (err) {
            logger.error('error in listing s3 bucket files: ', err);
            reject(err);
          } else if (data) {
            let file = null;
            for (let datum of data.Contents) {
              if (!datum.Key.toString().includes(fileToProcess))
                continue;
              if (file) {
                if (
                  new Date(datum.LastModified) >
                  new Date(file.LastModified)
                ) {
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
              Bucket:
                SapConfig.distributorInventorySyncAwsConfig.bucket,
              Key: `${file.Key}`,
            };
            let response = {
              S3FileName: file.Key,
              S3Response: null,
            };
            s3.getObject(bucketParams, function (error, data) {
              if (error) {
                logger.error(
                  'error in reading s3 bucket file: ',
                  error,
                );
                response.S3Response = error;
                reject(response);
              } else {
                const str = data.Body.toString('ascii');
                const res = commanHelper.convertTextFileToJSON(str);
                response.S3Response = res;
                resolve(response);
              }
            });
          }
        });
      } catch (err) {
        logger.error(
          'technical error catched in readFileFromS3Bucket: ',
          err,
        );
        reject(err);
      }
    });
  }

  static async addUsers(req: Request, res: Response) {
    try {
      const addUsersResponse = await UtilService.addUsers(req.body);
      if (
        addUsersResponse &&
        addUsersResponse.command === 'INSERT' &&
        addUsersResponse.rowCount
      ) {
        return res
          .status(200)
          .json(
            Template.successMessage(
              SuccessMessage.USER_CREATE_SUCCESS,
            ),
          );
      }
      return res
        .status(200)
        .json(
          Template.error(
            'Technical Error',
            ErrorMessage.USER_CREATE_ERROR,
          ),
        );
    } catch (error) {
      logger.error(
        'Error in adding users (UtilController.addUsers):',
        error,
      );
      res
        .status(500)
        .json(
          Template.error(
            'Technical Error',
            ErrorMessage.USER_CREATE_ERROR,
          ),
        );
    }
  }

  static async addMappingRequests(req: Request, res: Response) {
    try {
      const addMappingRequestsResponse =
        await UtilService.addMappingRequests(
          req.body,
          req['user'].user_id,
        );
      if (
        addMappingRequestsResponse &&
        addMappingRequestsResponse.command === 'INSERT' &&
        addMappingRequestsResponse.rowCount
      ) {
        let email = req.body.created_by;
        // ('${req['user'].manager_id}')



        const salesHierarchyDetails = await UtilModel.getAddMappingRequests(req.body, req['user'].manager_id)
        if (salesHierarchyDetails && salesHierarchyDetails.rowCount) {
          salesHierarchyDetails.rows[0];
        }

        let type: string = '';
        if (req.body.type == "ADD") {
          type = "Distributor is not showing"
        }
        else if (req.body.type == "REMOVE") {
          type = "Distributor does not belong to TSE"
        }
        let content = {
          asmname: salesHierarchyDetails.rows[0].first_name,
          asmcode: salesHierarchyDetails.rows[0].code,
          asmemail: salesHierarchyDetails.rows[0].email,
          tsename: req['user'].first_name,
          // tsecode: req['user'].code,
          tsecode: req.body.TSE_code,
          toemail: salesHierarchyDetails.rows[0].email,
          distributorname: salesHierarchyDetails.rows[0].name,
          distributorcode: req.body.distributor_code,
          type: type,
          status: req.body.type,
          shnumber: salesHierarchyDetails.rows[0].sh_number,
          comments: req.body.submission_comments,
        }

        logger.info('TSE notification email:', email);

        Email.sales_hierarchy_tse_email(email, content);
        return res
          .status(200)
          .json(
            Template.successMessage(
              SuccessMessage.MAPPING_REQUEST_CREATE_SUCCESS,
            ),
          );
      }
      return res
        .status(200)
        .json(
          Template.errorMessage(
            ErrorMessage.DISTRIBUTOR_NOT_FOUND,
          ),
        );
    } catch (error) {
      logger.error(
        'Error in adding mapping request (UtilController.addMappingRequests):',
        error,
      );
      res
        .status(500)
        .json(
          Template.error(
            'Technical Error',
            ErrorMessage.MAPPING_REQUEST_CREATE_ERROR,
          ),
        );
    }
  }

  static async getMappingRequestList(req: Request, res: Response) {
    try {
      logger.info('function MappingRequestList ');
      const { limit, offset, status, search } = req.body;
      const { roles, code } = req['user'];
      logger.info(`User detail ${req['user']}`);
      logger.info(`Request getMappingRequestList${req.body}`);
      let mappingRequestList =
        await UtilService.getMappingRequestListByAdminRole(
          roles,
          code,
          limit,
          offset,
          status,
          search,
        );
      let mappingRequestCount =
        await UtilService.getMappingRequestListByAdminRoleCount(
          roles,
          code,
          status,
          search
        );
      if (mappingRequestList) {
        logger.info(
          'If success getMappingRequestList',
          mappingRequestList && mappingRequestList.rowCount,
        );
        return res.json(
          Template.success(
            {
              rowCount: mappingRequestList.rowCount,
              rows: mappingRequestList.rows,
              totalCount: mappingRequestCount.rows[0].count,
            },
            SuccessMessage.MAPPING_REQUEST_LIST_SUCCESS,
          ),
        );
      }
      return res.json(
        Template.errorMessage(
          ErrorMessage.GET_MAPPING_REQUEST_LIST_ERROR,
        ),
      );
    } catch (error) {
      logger.error(`error getMappingRequestList ${error}`);
      return res.json(Template.error());
    }
  }

  static async updateMappingRequest(req: Request, res: Response) {
    try {
      logger.info(`Inside update mapping Request`);

      const { mapping_request_id } = req.params;
      if (req.body.status === 'APPROVED') {
        const { TSE_code, distributor_code } = req.body;
        await TransactionService.beginTransaction('mapping-request');
        const updateBody = {
          DISTRIBUTOR: distributor_code,
          AUSP1: TSE_code
        }
        const sapResponse = await UtilityFunctions.updateSalesHierarchy(updateBody);
        if (sapResponse?.status === 200 || sapResponse?.status === 201 && sapResponse?.data.d.DISTRIBUTOR && sapResponse?.data.d.AUSP1) {
          const updateDistributorResponse =
            await UtilService.updateDistributor(req.body);
          logger.info(
            `Updated distributor response${updateDistributorResponse}`,
          );
          if (
            updateDistributorResponse &&
            updateDistributorResponse.command === 'UPDATE' &&
            updateDistributorResponse.rowCount
          ) {
            logger.info(
              `inside updateDistributorResponse.command = UPDATE`,
            );
            const updateMappingRequestResponse =
              await UtilService.updateMappingRequest(
                parseInt(mapping_request_id),
                req.body,
                req['user'].user_id,
              );

            if (
              updateMappingRequestResponse &&
              updateMappingRequestResponse.command === 'UPDATE'
            ) {
              let email = req.body.updated_by;



              const salesHierarchyDetails = await UtilModel.updateMappingRequestQuery(req.body.TSE_code, req.body.Temp_TSE_Code, 'tse_code')
              // ADD Request......                                    


              if (salesHierarchyDetails && salesHierarchyDetails.rowCount) {
                salesHierarchyDetails.rows[0];
              }
              else {
                logger.error(`No Data available`);
                return res
                  .status(500)
                  .json(
                    Template.error(
                      ErrorMessage.DISTRIBUTOR_NOT_FOUND,
                    ),
                  );
              }

              let content = {
                asmname: req['user'].first_name,
                asmcode: req['user'].code,
                asmemail: req['user'].email,
                payloadtemptsecode: req.body.Temp_TSE_Code,
                payloadtsecode: req.body.TSE_code,
                tsename: salesHierarchyDetails.rows[0].first_name,
                tsecode: salesHierarchyDetails.rows[0].code,
                toemail: salesHierarchyDetails.rows[0].email,
                distributorname: req.body.distributor_name,
                distributorcode: req.body.distributor_code,
                type: req.body.status,
                status: req.body.type,
                shnumber: req.body.sh_number,
                comments: req.body.comments,
              }

              let oldContent = {
                oldtsename: req.body.existing_tse_name,
                oldtsecode: req.body.existing_tse_code,
                oldtseemail: req.body.existing_tse_email,
              }
              content = {
                ...content,
                ...oldContent
              }
              logger.info('Dist_admin/ Asm notification email:', content);
              Email.sales_hierarchy_dist_admin_email(email, content);
              logger.info(
                `inside updateMappingRequestResponse.command = UPDATE`,
              );
              await TransactionService.commitTransaction(
                'mapping-request',
              );
              return res
                .status(200)
                .json(
                  Template.successMessage(
                    SuccessMessage.DISTRIBUTOR_MAPPING_REQUEST_UPDATE_SUCCESS,
                  ),
                );
            } else {
              await TransactionService.rollbackTransaction(
                'mapping-request',
              );
              logger.error(
                `inside else condition update mapping request returning failure message`,
              );
              return res
                .status(500)
                .json(
                  Template.errorMessage(
                    ErrorMessage.UPDATE_MAPPING_REQUEST_FAILED,
                  ),
                );
            }
          } else {
            logger.error(`upsert distributor response failed`);
          }
        }
      }
      // Reject request
      else if (req.body.status === 'REJECTED') {
        const updateMappingRequestResponse =
          await UtilService.updateMappingRequest(
            parseInt(mapping_request_id),
            req.body,
            req['user'].user_id,
          );
        if (
          updateMappingRequestResponse &&
          updateMappingRequestResponse.command === 'UPDATE' &&
          updateMappingRequestResponse.rowCount === 1
        ) {


          let email = req.body.updated_by;
          const salesHierarchyDetails = await UtilModel.updateMappingRequestQuery(req.body.TSE_code, req.body.Temp_TSE_Code, 'temp_tse_code')

          if (salesHierarchyDetails && salesHierarchyDetails.rowCount) {
            salesHierarchyDetails.rows[0];
          }
          let content = {
            asmname: req['user'].first_name,
            asmcode: req['user'].code,
            asmemail: req['user'].email,
            payloadtemptsecode: req.body.Temp_TSE_Code,
            payloadtsecode: req.body.TSE_Code,
            tsename: salesHierarchyDetails.rows[0].first_name,
            tsecode: salesHierarchyDetails.rows[0].code,
            toemail: salesHierarchyDetails.rows[0].email,
            distributorname: req.body.distributor_name,
            distributorcode: req.body.distributor_code,
            type: req.body.status,
            status: req.body.type,
            shnumber: req.body.sh_number,
            comments: req.body.comments,
          }

          logger.info('Dist_admin/ Asm notification email:', email);
          Email.sales_hierarchy_dist_admin_email(email, content);
          logger.info(
            `inside updateMappingRequestResponse.command = UPDATE`,
          );
          return res
            .status(200)
            .json(
              Template.successMessage(
                SuccessMessage.DISTRIBUTOR_MAPPING_REQUEST_UPDATE_SUCCESS,
              ),
            );
        } else {
          logger.error(
            `inside else condition update mapping request returning failure message`,
          );
          return res
            .status(500)
            .json(
              Template.errorMessage(
                ErrorMessage.UPDATE_MAPPING_REQUEST_FAILED,
              ),
            );
        }
      }
      logger.info(`returning update mapping request failed message`);
      await TransactionService.rollbackTransaction('mapping-request');
      return res
        .status(500)
        .json(
          Template.errorMessage(
            ErrorMessage.UPDATE_MAPPING_REQUEST_FAILED,
          ),
        );
    } catch (error) {
      await TransactionService.rollbackTransaction('mapping-request');
      logger.error(
        `error in UtilController.updateMappingRequest: `,
        error,
      );
      return res
        .status(500)
        .json(
          Template.errorMessage(
            ErrorMessage.UPDATE_MAPPING_REQUEST_FAILED,
          ),
        );
    }
  }
  static async getTseList(req: Request, res: Response) {
    try {
      const tseList = await UtilService.getTseList(
        req['user'].user_id,
      );
      if (tseList) {
        logger.info(
          'If success getTseList',
          tseList && tseList.rowCount,
        );
        return res
          .status(200)
          .json(
            Template.success(
              { rowCount: tseList.rowCount, rows: tseList.rows },
              SuccessMessage.GET_TSE_LIST_SUCCESS,
            ),
          );
      }
      return res
        .status(200)
        .json(
          Template.errorMessage(ErrorMessage.GET_TSE_LIST_ERROR),
        );
    } catch (error) {
      logger.error(`error getTseList ${error}`);
      return res.status(400).json(Template.error());
    }
  }

  static async getDistributor(req: Request, res: Response) {
    try {
      logger.info('function GetDistributorList Under TSE ');
      const { roles, code, email } = req['user'];
      logger.info(`User detail ${req['user']}`);
      let distributorList = await UtilService.getDistributorList(
        roles,
        code,
        email
      );
      if (distributorList) {
        // logger.info(
        //   'If success getDistributorList',
        //   distributorList && distributorList.rows,
        // );
        return res.json(
          Template.success(
            {
              rowCount: distributorList.rowCount,
              rows: distributorList.rows,
              userCode: code
            },
            SuccessMessage.DISTRIBUTOR_MAPPED_SUCCESS,
          ),
        );
      }
      return res.json(
        Template.errorMessage(ErrorMessage.DISTRIBUTOR_NOT_FOUND),
      );
    } catch (error) {
      logger.error(`error getMappingRequestList ${error}`);
      return res.json(Template.error());
    }
  }
  static async getPlantUpdateRequest(req: Request, res: Response) {
    logger.info("Inside Util controller.getPlantUpdateRequest")
    try {
      logger.info('function getPlantUpdateRequest ');
      const { limit, offset, status, search } = req.body;
      const { roles, code, first_name, user_id, email } = req['user'];
      logger.info(`User detail ${req['user']}`);
      logger.info(`Request getPlantUpdateRequest${req.body}`);
      let plantUpdateRequest = await UtilService.getPlantUpdateRequestByAdminRole(
        roles,
        code,
        limit,
        offset,
        status,
        search,
        first_name,
        user_id,
        email
      );
      let plantUpdateRequestCount = await UtilService.getPlantUpdateRequestCountByAdminRole(
        roles,
        code,
        limit,
        offset,
        status,
        search, first_name,
        user_id,
        email
      );
      if (plantUpdateRequest) {
        logger.info('If success get plant request list', plantUpdateRequest && plantUpdateRequest.rowCount)
        return res.json(
          Template.success(
            {
              rowCount: plantUpdateRequest.rowCount,
              rows: plantUpdateRequest.rows,
              totalCount: plantUpdateRequestCount?.rowCount,
            },
            SuccessMessage.PLANT_REQUEST_LIST_SUCCESS,
          ),
        );
      }
      return res.json(
        Template.errorMessage(
          ErrorMessage.PLANT_REQUEST_CREATE_ERROR
        ),
      );
    } catch (error) {
      logger.error(`Error getPlantUpdateRequest ${error}`);
      return res.json(Template.error());
    }
  }

  static async getCustomerGroupDetails(req: Request, res: Response) {
    try {
      logger.info('Inside UtilController -> getCustomerGroupDetails');
      const response = await UtilService.getCustomerGroupDetails();
      if (response) {
        logger.info('Inside UtilController -> getCustomerGroupDetails , ' + SuccessMessage.CUSTOMER_GROUP_DETAILS_SUCCESS)
        res.status(200).json(Template.success(response, SuccessMessage.CUSTOMER_GROUP_DETAILS_SUCCESS))
      }
      else {
        logger.info('Inside UtilController -> getCustomerGroupDetails , ' + ErrorMessage.CUSTOMER_GROUP_DETAILS_FAILURE)
        res.status(200).json(Template.errorMessage(ErrorMessage.CUSTOMER_GROUP_DETAILS_FAILURE))
      }
    } catch (error) {
      logger.error('Inside UtilController -> getCustomerGroupDetails, Error = ', error);
      res.status(500).json(Template.internalServerError());
    }
  }
  static async mapProductsToMDMData(req: Request, res: Response) {
    let app_level_settings;
    let fileToProcess = '';
    app_level_settings = await UtilService.getAppLevelConfigurations();
    if (app_level_settings && app_level_settings.rows.length > 0) {
      for (let appconfig of app_level_settings.rows) {
        if (
          appconfig.key === 'MDM_SYNC' &&
          appconfig.value === 'YES'
        ) {
          fileToProcess =
            SapConfig.distributorInventorySyncFilePrefix;
        }
      }
    }
    if (!fileToProcess) {
      LogService.insertSyncLog(
        'MDM_SYNC',
        'FAIL',
        null,
        null,
        ErrorMessage.MDM_SYNC_NOT_ENABLED,
      );
      return res.
        status(400)
        .json(
          Template.errorMessage(
            ErrorMessage.MDM_SYNC_NOT_ENABLED
          )
        );
    }
    try {
      logger.info(`inside UtilController.mapProductsToMDMData`);
      UtilController.readFileFromS3Bucket(fileToProcess)
        .then(
          async (response: {
            S3FileName: string;
            S3Response: any;
          }) => {
            if (response.S3FileName && response.S3Response) {
              const tempfilename = response?.S3FileName.split('/');
              let filename = tempfilename[1];
              const mapProductsToMDMData =
                await UtilService.mapProductsToMDMData(
                  response.S3Response,
                );
              if (
                mapProductsToMDMData &&
                !isNaN(mapProductsToMDMData)
              ) {
                const response = {
                  upsertCount: mapProductsToMDMData,
                  deleteCount: null,
                };
                LogService.insertSyncLog(
                  'MDM_SYNC',
                  'SUCCESS',
                  response,
                  null,
                  null,
                  filename
                );

                return res
                  .status(200)
                  .json(
                    Template.success(
                      { updateCount: mapProductsToMDMData },
                      SuccessMessage.MDM_DATA_SYNC_SUCCESSFULLY,
                    ),
                  );
              }
              LogService.insertSyncLog(
                'MDM_SYNC',
                'FAIL',
              );
              return res.
                status(400)
                .json(
                  Template.errorMessage(
                    ErrorMessage.MDM_DATA_SYNC_FAILED
                  )
                );
            }
          },
        )
        .catch((error) => {
          LogService.insertSyncLog(
            'MDM_SYNC',
            'FAIL',
            null,
            null,
            `Technical error in MDM sync: ${error}`,
          );
          return res.
            status(500)
            .json(
              Template.errorMessage(
                ErrorMessage.MDM_DATA_MAPPING_FILE_ERROR
              )
            );
        });
    } catch (error) {
      logger.error(
        `error in UtilController.mapProductsToMDMData: `,
        error,
      );
      LogService.insertSyncLog(
        'MDM_SYNC',
        'FAIL',
        null,
        null,
        `Technical error in MDM sync: ${error}`,
      );
      return res.
        status(500)
        .json(
          Template.errorMessage(
            ErrorMessage.MDM_DATA_MAPPING_FILE_ERROR
          )
        );
    }
  }
  static async rorSync(req: Request, res: Response) {
    try {
      logger.info('Inside UtilController -> rorSync');
      const { days } = req.query;
      const response = await UtilService.rorSync(days);
      if (response) {
        logger.info('Inside UtilController -> rorSync , ' + SuccessMessage.ROR_DATA_SYNC_SUCCESSFULLY)
        LogService.insertSyncLog("ROR_SYNC", "SUCCESS", null, null, null, null, true)
        res.status(200).json(Template.successMessage(SuccessMessage.ROR_DATA_SYNC_SUCCESSFULLY))
      }
      else {
        logger.info('Inside UtilController -> rorSync , ' + ErrorMessage.ROR_DATA_SYNC_FAILED)
        LogService.insertSyncLog("ROR_SYNC", "FAIL", null, null, `${ErrorMessage.ROR_DATA_SYNC_FAILED}`, null, true)
        res.status(400).json(Template.errorMessage(ErrorMessage.ROR_DATA_SYNC_FAILED))
      }
    } catch (error) {
      logger.error('Inside UtilController -> rorSync, Error = ', error);
      LogService.insertSyncLog("ROR_SYNC", "FAIL", null, null, `${error}`, null, true)
      res.status(500).json(Template.internalServerError());
    }
  }

  static async syncAutoClosure(req: Request, res: Response) {
    try {
      const { audit_id, customer_type } = req.query;
      const customerType = customer_type as string;
      const auditId = audit_id as string;
      UtilService.syncAutoClosure(auditId, customerType);
      return res.status(200).json(Template.successMessage(SuccessMessage.AUTO_CLOSURE_SYNC_SUCCESSFULLY));
    } catch (error) {
      logger.error("CAUGHT: Error in UtilController -> syncAutoClosure: ", error);
      return res.status(500).json(Template.errorMessage(ErrorMessage.DATA_SYNC_ERROR));
    }
  }
}

export default UtilController;
