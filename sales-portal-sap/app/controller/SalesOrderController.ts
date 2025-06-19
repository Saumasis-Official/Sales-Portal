import logger from '../lib/logger';
import UtilityFunctions from '../helper/utilityFunctions';
const SapConfig = global['configuration'].sap;
import Template from '../helper/responseTemplate';
import { SapService } from '../service/sap.service';
import { SuccessMessage } from '../constant/sucess.message';
import { ErrorMessage } from '../constant/error.message';
import { Request, Response } from 'express';
import { UtilModel } from '../models/UtilModel';

class SalesOrderController {
  static async getSalesOrderDelivery(req: any, res: any) {
    try {
      logger.info('Fetching getSalesOrderDelivery:', req.body);
      const { deliveryNumber } = req.body;

      let urlsArr = [];
      if (deliveryNumber.length > 0) {
        const { login_id } = req['user'];
        let checkDeliveryNumber =
          await SapService.getOrderByDeliveryNumber(
            deliveryNumber,
            login_id,
          );
        logger.info(
          'Fetching checkDeliveryNumber:',
          checkDeliveryNumber,
        );

        if (
          !checkDeliveryNumber ||
          !checkDeliveryNumber['rows'] ||
          !checkDeliveryNumber['rows'][0]
        ) {
          return res
            .status(403)
            .json(
              Template.error(
                'Unauthorized',
                ErrorMessage.PERMISSION_ISSUE,
              ),
            );
        }
      }
      deliveryNumber.map((val) => {
        urlsArr.push(
          `${SapConfig.salesOrderDelivery}?$filter=Delivery_Number%20eq%20'${val} '&sap-client=400&sap-language=EN`,
        );
      });
      let requests = urlsArr.map((url) =>
        UtilityFunctions.commonSapApiCallPromise(url),
      );
      let finalData = [];
      Promise.all(requests)
        .then((responses) =>
          res.json(
            Template.success(
              [].concat.apply([], responses),
              SuccessMessage.GET_SALES_ORDER_DELIVERY,
            ),
          ),
        )
        .catch(function (err) {
          logger.error(
            'Error in Promise getSalesOrderDelivery: ',
            err,
          );
          res
            .status(500)
            .json(
              Template.errorMessage(
                ErrorMessage.GET_SALES_ORDER_INVOICE_ERROR,
              ),
            );
        });
    } catch (error) {
      logger.error('Error in getSalesOrderDelivery: ', error);
      res.status(500).json(Template.error());
    }
  }

  static async getSalesOrderInvoice(req: any, res: any) {
    try {
      logger.info(`Fetching getSalesOrderInvoice:`, req.body);
      const { invoiceNumber } = req.body;
      let urlsArr = [];
      if (invoiceNumber.length > 0) {
        const { login_id } = req['user'];
        let checkInvoiceNumber =
          await SapService.getOrderByInvoiceNumber(
            invoiceNumber,
            login_id,
          );

        if (
          !checkInvoiceNumber ||
          !checkInvoiceNumber['rows'] ||
          !checkInvoiceNumber['rows'][0]
        ) {
          return res
            .status(403)
            .json(
              Template.error(
                'Unauthorized',
                ErrorMessage.PERMISSION_ISSUE,
              ),
            );
        }
      }
      invoiceNumber.map((val) => {
        urlsArr.push(
          `${SapConfig.salesOrderInvoice}?$filter=Invoice_Number%20eq%20'${val}'&sap-client=400&sap-language=EN`,
        );
      });
      let requests = urlsArr.map((url) =>
        UtilityFunctions.commonSapApiCallPromise(url),
      );
      let finalData = [];
      Promise.all(requests)
        .then((responses) =>
          res.json(
            Template.success(
              [].concat.apply([], responses),
              SuccessMessage.GET_SALES_ORDER_INVOICE,
            ),
          ),
        )
        .catch(function (err) {
          logger.error(
            'Error in Promise getSalesOrderInvoice: ',
            err,
          );
          res
            .status(500)
            .json(
              Template.errorMessage(
                ErrorMessage.GET_SALES_ORDER_INVOICE_ERROR,
              ),
            );
        });
    } catch (error) {
      logger.error('Error in getSalesOrderInvoice: ', error);
      res.status(500).json(Template.error());
    }
  }

  static async fetchSODetails(req: Request, res: Response) {
    logger.info(`excecuting UtilController.fetchSODetails`);
    const soNumber = req.body.so_number;
    try {
      logger.info(`Fetching SO Details for so number: ${soNumber}`);
      const login_id = req['user'].login_id;
      let soNumberDetails =
        await SapService.soNumberWithDistributorId(
          soNumber,
          login_id,
        );
      logger.info(`Fetching soNumberDetails`, soNumberDetails);
      if (
        !soNumberDetails ||
        soNumberDetails['rows'].length === 0 ||
        !soNumberDetails['rows'][0]
      ) {
        return res
          .status(403)
          .json(
            Template.error(
              'Unauthorized',
              ErrorMessage.PERMISSION_ISSUE,
            ),
          );
      }
      const fetchSODetailsResponse =
        await UtilityFunctions.fetchSODetails(soNumber);
      if (
        !fetchSODetailsResponse ||
        fetchSODetailsResponse.status !== 200 ||
        !fetchSODetailsResponse.data ||
        !fetchSODetailsResponse.data.d ||
        !fetchSODetailsResponse.data.d.results
      ) {
        logger.error(
          `so details sap api failed response: ${
            fetchSODetailsResponse.data || fetchSODetailsResponse
          }`,
        );
        return res
          .status(500)
          .json(Template.errorMessage(ErrorMessage.SAP_API_FAILED));
      }
    
       const soDetails = fetchSODetailsResponse.data.d.results;
       let rorData = await UtilModel.getOrderData(soNumber)
       if(rorData.rows[0].order_data.rorItemset && rorData.rows[0].order_data.rorItemset.length > 0)  soDetails[0]['rorItems'] = rorData.rows[0].order_data.rorItemset;
      logger.info(`returning success with so details`);
       return res
        .status(200)
        .json(
          Template.success(
            soDetails,
            SuccessMessage.SO_DETAILS_FETCH_SUCCESS,
          ),
        );
    } catch (error) {
      logger.error(
        `error in UtilController.fetchSODetails: `,
        error.stack,
      );
      return res
        .status(500)
        .json(
          Template.errorMessage(ErrorMessage.SO_DETAILS_FETCH_ERROR),
        );
    }
  }
  static async multipleSalesDetails(req: Request, res: Response) {
    logger.info(`excecuting UtilController.multipleSalesDetails`);
    const requestBody = req.body.items;
    try {
      let urlsArr = [];
      // requestBody.map(async (so) => {
      let soNumberExistOrNotDistId = false;
      for (let so of requestBody) {
        const login_id = req['user'].login_id;
        let soNumber = so.so_number;
        let soNumberDetails =
          await SapService.soNumberWithDistributorId(
            soNumber,
            login_id,
          );
        if (
          !soNumberDetails ||
          soNumberDetails['rows'].length === 0 ||
          !soNumberDetails['rows'][0]
        ) {
          if (soNumberExistOrNotDistId) {
            break;
          }
          soNumberExistOrNotDistId = true;
          return res
            .status(403)
            .json(
              Template.error(
                'Unauthorized',
                ErrorMessage.PERMISSION_ISSUE,
              ),
            );
        } else {
          urlsArr.push(
            `${SapConfig.soDetailsApiEndpoint}?$filter=Sales_Order_Number%20eq%20'${soNumber}'&sap-client=400&sap-language=EN`,
          );
          so.deliveries &&
            so.deliveries.length &&
            so.deliveries.map((val) => {
              urlsArr.push(
                `${SapConfig.salesOrderDelivery}?$filter=Delivery_Number%20eq%20'${val} '&sap-client=400&sap-language=EN`,
              );
            });
          so.invoices &&
            so.invoices.length &&
            so.invoices.map((val) => {
              urlsArr.push(
                `${SapConfig.salesOrderInvoice}?$filter=Invoice_Number%20eq%20'${val}'&sap-client=400&sap-language=EN`,
              );
            });
        }
      }
      // })
      if (urlsArr.length > 0) {
        let requests = urlsArr.map((url) =>
          UtilityFunctions.commonSapApiCallPromise(url),
        );
        Promise.all(requests)
          .then((responses) => {
            let formattedData = [];
            formattedData = requestBody;
            formattedData.map((soItem) => {
              soItem.so = { data: [] };
              soItem.delivery = { data: [] };
              soItem.invoice = { data: [] };
            });
            const mergedData = [].concat.apply([], responses);
            mergedData.map((item) => {
              switch (item.__metadata.type) {
                case 'ZSD_SO_LANDING_SRV.Delivery_Info':
                  formattedData.map((soItem) => {
                    if (
                      soItem.deliveries &&
                      soItem.deliveries.includes(
                        item.Delivery_Number,
                      ) &&
                      item.QTY != 0
                    ) {
                      soItem.delivery.data.push(item);
                    }
                  });
                  break;
                case 'ZSD_SO_LANDING_SRV.Sales_order_information':
                  formattedData.map((soItem) => {
                    if (
                      item.Sales_Order_Number === soItem.so_number &&
                      item.Sales_Order_QTY != 0
                    ) {
                      soItem.so.data.push(item);
                    }
                  });
                  break;
                case 'ZSD_SO_LANDING_SRV.Invoice_Info':
                  formattedData.map((soItem) => {
                    if (
                      soItem.invoices &&
                      soItem.invoices.includes(item.Invoice_Number) &&
                      item.Invoice_QTY != 0
                    ) {
                      soItem.invoice.data.push(item);
                    }
                  });
                  break;
                default:
                  break;
              }
            });
            formattedData.map((soItem) => {
              delete soItem.so_number;
              delete soItem.deliveries;
              delete soItem.invoices;
            });
            return res.json(
              Template.success(
                formattedData,
                SuccessMessage.DOWNLOAD_SALES_SUCCESS,
              ),
            );
          })
          .catch(function (err) {
            logger.error('Error in Promise getMultipleSales ', err);
            res
              .status(500)
              .json(
                Template.errorMessage(
                  ErrorMessage.SO_DETAILS_FETCH_ERROR,
                ),
              );
          });
      }
    } catch (error) {
      logger.error(
        `error in UtilController.multipleSalesDetails: `,
        error,
      );
      return res
        .status(500)
        .json(
          Template.errorMessage(ErrorMessage.SO_DETAILS_FETCH_ERROR),
        );
    }
  }
}

export default SalesOrderController;
