import logger from '../lib/logger';
import UtilityFunctions from '../helper/utilityFunctions';
import Template from "../helper/responseTemplate";
import Email from '../helper/email';
import { ErrorMessage } from '../constant/error.message';
import { SuccessMessage } from '../constant/sucess.message';
const SapConfig = global['configuration'].email;

class WarehouseController {

    private static sendMail(distributorId, startTime, error) {
        let emailId = SapConfig.warehouseDetailsFetchFailedMailId;
        logger.info(`send warehouse details failure mail: ${distributorId}`);
        // Email.warehouse_details_fetch_failed({ email: emailId }, distributorId, startTime, error);
    }

    private static extractShippingAndUnloadingPoints(rows: any) {
        try {
            logger.info(`Extracting shipping and unloading points`);
            let response = {
                shipping_point: [],
                unloading_point: []
            };
            if (rows && rows.length > 0) {
                rows.map((row: any) => {
                    const obj = {
                        partner_code: `${row.Distributor}`,
                        partner_name: `${row.Name}`,
                        sales_org: '1010', // As Agreed sales_org are hardcoded as 1010
                        dist_channel: '10', // As Agreed dist_chl and division are hardcoded as 10 
                        divison: '10', // As Agreed dist_chl and division are hardcoded as 10 
                        distribution_details: row.InputToSalesAreaNav.results
                    }
                    if (row.Function === 'SH : Ship To Point') {
                        response.shipping_point.push(obj);
                    } else if (row.Function === 'Y1 : Unloading Point') {
                        response.unloading_point.push(obj);
                    }
                });
            }
            return response;
        } catch (error) {
            logger.error('error extracting shipping and unloading points: ', error);
            return null;
        }
    }

    public static async fetchWarehouseDetails(req: any, res: any) {
        try {
            logger.info(`Fetching warehouse details`);
            const distributorId = req.user.login_id;
            const fetchWarehouseDetailsResponse = await UtilityFunctions.fetchWarehouseDetails(distributorId);


            if (!fetchWarehouseDetailsResponse) {
                logger.info(`fetch warehouse details response does not exist`);
                WarehouseController.sendMail(distributorId, req._startTime, { code: 500, message: 'Error occurred while requesting to SAP API' });
                return res.status(500).json(
                    Template.error(
                        "Technical Error",
                        ErrorMessage.WAREHOUSE_DETAILS_ERROR,
                        []
                    )
                );
            }

            if (fetchWarehouseDetailsResponse.status === 200) {
                if (!fetchWarehouseDetailsResponse.data || !fetchWarehouseDetailsResponse.data.d || !fetchWarehouseDetailsResponse.data.d.results) {
                    logger.info(`SAP API failed fetching shipping and unloading points:`);

                    WarehouseController.sendMail(distributorId, req._startTime, { code: 500, message: 'SAP API response is not in appropriate format' });

                    return res.status(500).json(
                        Template.error(
                            "Technical Error",
                            ErrorMessage.WAREHOUSE_DETAILS_ERROR,
                            fetchWarehouseDetailsResponse.data
                        )
                    );
                }
                logger.info(`Successfully fetched warehouse details`);

                if (fetchWarehouseDetailsResponse.data.d.results.length === 0) {
                    logger.info(`shipping and unloading points response from SAP is of length 0`);
                    WarehouseController.sendMail(distributorId, req._startTime, { code: 500, message: 'SAP API response is empty' });
                }

                const shippingAndUnloadingPoints = fetchWarehouseDetailsResponse.data.d.results;

                return res.status(200).json(
                    Template.success(
                        WarehouseController.extractShippingAndUnloadingPoints(shippingAndUnloadingPoints),
                        SuccessMessage.WAREHOUSE_DETAILS_SUCCESS
                    )
                )
            } else {
                logger.info(`SAP API failed fetching warehouse details:`, fetchWarehouseDetailsResponse.status);
                WarehouseController.sendMail(distributorId, req._startTime, { code: fetchWarehouseDetailsResponse.status || 500, message: 'SAP API failed fetching shipping and unloading points' });
                return res.status(fetchWarehouseDetailsResponse.status || 500).json(
                    Template.error(
                        "Technical Error",
                        ErrorMessage.SAP_API_FAILED,
                        fetchWarehouseDetailsResponse.data
                    )
                );
            }

        } catch (error) {
            logger.error(`Failed fetching warehouse details:`, error);
            return res.status(500).json(Template.error(
                'Technical Error',
                ErrorMessage.WAREHOUSE_DETAILS_ERROR,
                []
            ));
        }
    }

    public static async fetchWarehouseDetailsOnDistChannel(req: any, res: any) {
        try {
            logger.info(`Fetching warehouse details based on distribution channel and division`);
            const distributorId = req.user?.login_id ? req.user?.login_id : req.params?.distributor_id;
            const distributionChannel = req.params.dist_channel
            const divisionArr = req.params.division_str.split(",")
            const fetchWarehouseDetailsResponse = await UtilityFunctions.fetchWarehouseDetailsOnDistChannel(distributorId, distributionChannel, divisionArr);

            if (!fetchWarehouseDetailsResponse) {
                logger.info(`fetch warehouse details response does not exist`);
                WarehouseController.sendMail(distributorId, req._startTime, { code: 500, message: 'Error occurred while requesting to SAP API' });
                return res.status(500).json(
                    Template.error(
                        "Technical Error",
                        ErrorMessage.WAREHOUSE_DETAILS_ERROR,
                        []
                    )
                );
            }

            if (fetchWarehouseDetailsResponse.status === 200) {
                if (!fetchWarehouseDetailsResponse.data || !fetchWarehouseDetailsResponse.data.d || !fetchWarehouseDetailsResponse.data.d.results) {
                    logger.info(`SAP API failed fetching shipping and unloading points:`);

                    WarehouseController.sendMail(distributorId, req._startTime, { code: 500, message: 'SAP API response is not in appropriate format' });

                    return res.status(500).json(
                        Template.error(
                            "Technical Error",
                            ErrorMessage.WAREHOUSE_DETAILS_ERROR,
                            fetchWarehouseDetailsResponse.data
                        )
                    );
                }
                logger.info(`Successfully fetched warehouse details`);

                if (fetchWarehouseDetailsResponse.data.d.results.length === 0) {
                    logger.info(`shipping and unloading points response from SAP is of length 0`);
                    WarehouseController.sendMail(distributorId, req._startTime, { code: 500, message: 'SAP API response is empty' });
                }

                const shippingAndUnloadingPoints = fetchWarehouseDetailsResponse.data.d.results;

                return res.status(200).json(
                    Template.success(
                        WarehouseController.extractShippingAndUnloadingPoints(shippingAndUnloadingPoints),
                        SuccessMessage.WAREHOUSE_DETAILS_SUCCESS
                    )
                )
            } else {
                logger.info(`SAP API failed fetching warehouse details:`, fetchWarehouseDetailsResponse.status);
                WarehouseController.sendMail(distributorId, req._startTime, { code: fetchWarehouseDetailsResponse.status || 500, message: 'SAP API failed fetching shipping and unloading points' });
                return res.status(fetchWarehouseDetailsResponse.status || 500).json(
                    Template.error(
                        "Technical Error",
                        ErrorMessage.SAP_API_FAILED,
                        fetchWarehouseDetailsResponse.data
                    )
                );
            }

        } catch (error) {
            logger.error(`Failed fetching warehouse details:`, error);
            return res.status(500).json(Template.error(
                'Technical Error',
                ErrorMessage.WAREHOUSE_DETAILS_ERROR,
                []
            ));
        }
    }
}

export default WarehouseController;