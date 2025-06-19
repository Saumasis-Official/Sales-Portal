// require('dotenv').config();
import 'dotenv/config';
import jwtDecode from 'jwt-decode';
import _ from 'lodash';
const adminConfig = global['configuration'].admin;
import responseTemplate from '../helper/responseTemplate';
import { ErrorMessage } from '../constant/error.message';
import logger from '../lib/logger';
import { UserService } from '../service/user.service';
import { roles } from '../constant/persona';

const validation = {
    async validateToken(req, res, next) {
        try {
            logger.info('Admin Middleware');
            const token = req.headers.authorization;
            if (token) {
                const payload: any = jwtDecode(token);
                logger.info('Admin Middleware payload', payload);
                if (!payload || payload.client_id !== adminConfig.cognitoClientId) {
                    logger.error(`Admin Middleware If client id does not match`);

                    res.status(403).json(responseTemplate.commonAuthUserDataError());
                } else {
                    const username = payload.username;
                    const email = username.replace(adminConfig.cognitoIdpName, '');
                    const correlationId = req.headers['x-correlation-id'];
                    const invalidSessionData = await UserService.getSessionInvalidateStatus(email, correlationId);
                    if (invalidSessionData && invalidSessionData.length) {
                        if (invalidSessionData[0]['count'] > 0) {
                            return res.status(403).json(responseTemplate.invalidSession());
                        }
                    }
                    let adminDetailsResponse = await UserService.adminDetailsStatement(email);
                    logger.info('Admin Middleware adminDetails', adminDetailsResponse && adminDetailsResponse.rows);
                    

                    if (adminDetailsResponse && adminDetailsResponse.rows && adminDetailsResponse.rows.length) {
                        const adminDetails = adminDetailsResponse.rows;
                        const adminRole = adminDetails[0].roles;
                        const adminCode = adminDetails[0].code;
                        const distributorId = req.params.distributor_id;
                        req.user = adminDetails[0];
                        req.user.login_id = distributorId;
                        if (
                            _.intersection(adminRole, [
                                'SUPER_ADMIN',
                                'SUPPORT',
                                'LOGISTIC_OFFICER',
                                'ZONAL_OFFICER',
                                'OPERATIONS',
                                'SHOPPER_MARKETING',
                                'PORTAL_OPERATIONS',
                                'FINANCE',
                                'VP',
                                'CALL_CENTRE_OPERATIONS',
                                'FINANCE_CONTROLLER',
                            ]).length
                        ) {
                            logger.info('Admin Middleware Super admin/Support/Call centre operations');
                            if (distributorId) {
                                let validated = false;
                                const validateAdminResponse = await UserService.validateSuperAdminStatement(distributorId);
                                logger.info('Admin Middleware Super admin/Support/CCO: ', validateAdminResponse && validateAdminResponse.rows);
                                if (validateAdminResponse && validateAdminResponse.rows && validateAdminResponse.rows.length) {
                                    validated = true;
                                }
                                if (validated) next();
                                else res.status(403).json(responseTemplate.error('Unauthorized', ErrorMessage.PERMISSION_ISSUE));
                            } else next();
                        } else if (_.intersection(adminRole, ['DIST_ADMIN', 'ASM', 'TSE', 'CFA', 'RSM', 'CLUSTER_MANAGER']).length) {
                            logger.info('Admin Middleware Dist admin/tse');
                            if (distributorId) {
                                const validateAdminResponse = await UserService.validateDistributorAdminMapping(distributorId, adminRole, adminCode);
                                logger.info('Dist admin/tse validation response: ', validateAdminResponse);
                                if (validateAdminResponse) next();
                                else res.status(403).json(responseTemplate.error('Unauthorized', ErrorMessage.PERMISSION_ISSUE));
                            } else next();
                        } else if (
                            _.intersection(adminRole, [
                                'KAMS',
                                'MDM',
                                'NKAMS',
                                'SHOPIFY_UK',
                                'SHOPIFY_SUPPORT',
                                'SHOPIFY_OBSERVER',
                                roles.CL_PRIMARY_APPROVER,
                                roles.CL_SECONDARY_APPROVER,
                            ]).length
                        ) {
                            next();
                        } else {
                            res.status(403).json(responseTemplate.error('Unauthorized', ErrorMessage.PERMISSION_ISSUE));
                        }
                    } else {
                        res.status(403).json(responseTemplate.error('Unauthorized', ErrorMessage.PERMISSION_ISSUE));
                    }
                }
            } else {
                res.status(403).json(responseTemplate.tokenRequiredAuthError());
            }
        } catch (error) {
            logger.error(`Admin Middleware ${error}`);

            res.status(403).json(responseTemplate.error('Technical Error', 'There may some error occurred in user validation'));
        }
    },
};

export default validation;
