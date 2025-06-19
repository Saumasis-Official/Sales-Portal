import { Router } from 'express';
import expressJoiValidator from 'express-joi-validator';
import expressJoi from '../lib/requestValidator';
import AdminController from '../controller/AdminController';
import adminMiddleware from '../middleware/adminMiddleware';
import authorizer from '../middleware/authorizer';
import AuthController from '../controller/AuthController';
import RedisController from '../controller/RedisController';
import multer from 'multer';
import { AutoClosureController } from '../controller/autoClosure.controller';
const upload = multer({ dest: 'uploadedFileStore/' });

export class AdminRouter {
    router: Router;

    /**
     * Initialize the Router
     */
    constructor() {
        this.router = Router();
        this.init();
    }
    /**
     * Take each handler, and attach to one of the Express.Router's
     * endpoints.
     */
    init() {
        this.router.post('/add-maintenance-status', adminMiddleware.validateToken, authorizer.addNewMaintenanceStatus, AuthController.addNewMaintenanceStatus);
        this.router.patch('/update-maintenance-status', adminMiddleware.validateToken, authorizer.updateMaintenanceStatus, AuthController.updateMaintenanceStatus);
        this.router.post('/distributor-list', adminMiddleware.validateToken, expressJoiValidator(expressJoi.distributorList), AdminController.getDistributorList);
        this.router.post(
            '/alert-remarks/:distributor_id',
            adminMiddleware.validateToken,
            authorizer.adminTeamAsmAndAbove,
            expressJoiValidator(expressJoi.updateAlertHistory),
            AdminController.updateAlertHistory,
        );
        this.router.put(
            '/distributor-settings/:distributor_id',
            adminMiddleware.validateToken,
            authorizer.adminTeamAsmAndAbove,
            expressJoiValidator(expressJoi.updateDistributorSettings),
            AdminController.updateDistributorSettings,
        );
        this.router.get(
            '/alert-comment-list/:distributor_id',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.alertCommentList),
            AdminController.getAlertCommentList,
        );
        this.router.put(
            '/login-setting/:distributor_id',
            adminMiddleware.validateToken,
            authorizer.updateLoginSetting,
            expressJoiValidator(expressJoi.updateLoginSetting),
            AdminController.updateLoginSetting,
        );
        this.router.put(
            '/alert-settings/:distributor_id',
            adminMiddleware.validateToken,
            authorizer.adminTeamAsmAndAbove,
            expressJoiValidator(expressJoi.updateAlertSettings),
            AdminController.updateAlertSettings,
        );
        this.router.post('/tse-user-list', adminMiddleware.validateToken, authorizer.getTseUserList, expressJoiValidator(expressJoi.tseUserList), AdminController.getTseUserList);
        this.router.put(
            '/tse-user-setting',
            adminMiddleware.validateToken,
            authorizer.updateTseUserSetting,
            expressJoiValidator(expressJoi.updateTseUserSetting),
            AdminController.updateTseUserSetting,
        );
        this.router.get('/app-level-configuration', adminMiddleware.validateToken, AdminController.fetchAppLevelSettings);
        this.router.put(
            '/app-level-configuration',
            adminMiddleware.validateToken,
            authorizer.adminTeamWriteAccess,
            expressJoiValidator(expressJoi.updateAppLevelSettings),
            AdminController.updateAppLevelSettings,
        );
        this.router.post('/sessions', adminMiddleware.validateToken, authorizer.getSessionLogs, expressJoiValidator(expressJoi.sessions), AuthController.getSessionLogs);
        this.router.post('/upload-file', adminMiddleware.validateToken, authorizer.adminTeam, upload.array('file', 12), AdminController.addUploadedFileToTheAWSS3);
        this.router.post('/file-upload-history', adminMiddleware.validateToken, authorizer.adminTeam, AdminController.getFilesHistory);
        this.router.patch('/update-file-status', adminMiddleware.validateToken, authorizer.adminTeam, AdminController.updateFileStatus);
        this.router.post('/update-cfa-process-calender', adminMiddleware.validateToken, AdminController.updateCfaProcessCalender);
        this.router.get('/fetch-cfa-process-calender', adminMiddleware.validateToken, AdminController.getCfaProcessCalender);
        this.router.get('/cfa-data', adminMiddleware.validateToken, AdminController.getCFAData);
        this.router.get('/fetch-azureAD-users/:search_text', adminMiddleware.validateToken, authorizer.adminTeam, AdminController.getAzureADUsers);
        this.router.post('/sso_user', adminMiddleware.validateToken, authorizer.adminTeam, expressJoiValidator(expressJoi.addSSOUser), AdminController.addSSOUser);
        this.router.post('/fetch-help-section-data', AdminController.fetchHelpSectionData);
        this.router.post('/createPreAssignUrl', AdminController.createPreAssignUrl);
        this.router.put('/distributor-settings', adminMiddleware.validateToken, authorizer.adminTeamAsmAndAbove, AdminController.bulkUpdateDistributorSettings);
        this.router.get('/dashboard-filter-categories', adminMiddleware.validateToken, AdminController.filterCategories);
        this.router.get('/area-code-list', adminMiddleware.validateToken, AdminController.fetchAreaCodes);

        // ARS Routes
        this.router.get('/get-adjustment-timeline', adminMiddleware.validateToken, AdminController.getAdjustmentTimeline);
        this.router.post('/stock-norm-config-regions', adminMiddleware.validateToken, expressJoiValidator(expressJoi.stockNormRegions), AdminController.getStockNormConfigRegions);
        this.router.post('/stock-norm-config-areas', adminMiddleware.validateToken, expressJoiValidator(expressJoi.stockNormAreas), AdminController.getStockNormConfigAreas);
        this.router.post('/stock-norm-config-divisions', adminMiddleware.validateToken, AdminController.getStockNormConfigDivisions);
        this.router.post('/cycle-safety-stock-config', adminMiddleware.validateToken, expressJoiValidator(expressJoi.cycleSafetyStockConfig), AdminController.getCycleSafetyStock);
        this.router.put(
            '/update-cycle-safety-stock',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.updateCycleSafetyStockConfig),
            AdminController.updateCycleSafetyStock,
        );

        this.router.get('/cfa-depot-mapping', adminMiddleware.validateToken, expressJoiValidator(expressJoi.cfaData), AdminController.getCfaDepotMapping);
        this.router.post('/cfa-depot-mapping', adminMiddleware.validateToken, expressJoiValidator(expressJoi.insertCfaDepotMapping), AdminController.insertCfaDepotMapping);
        this.router.put('/cfa-depot-mapping', adminMiddleware.validateToken, expressJoiValidator(expressJoi.updateCfaDepotMapping), AdminController.updateCfaDepotMapping);
        this.router.put(
            '/multiple-update-cfa-depot-mapping',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.multipleUpdateCfaDepotMapping),
            AdminController.multipleUpdateCfaDepotMapping,
        );
        this.router.post('/fire-query', adminMiddleware.validateToken, expressJoiValidator(expressJoi.fireQuery), AdminController.fireQuery);
        this.router.get(
            '/db-moq-details/:distributor_id',
            adminMiddleware.validateToken,
            authorizer.getDbMoqDetails,
            expressJoiValidator(expressJoi.alertCommentList),
            AdminController.getDbMoqDetails,
        );
        this.router.post('/active-session-report', adminMiddleware.validateToken, expressJoiValidator(expressJoi.activeSessionReport), AuthController.getActiveSessionReport);
        this.router.post('/invalidate-session', adminMiddleware.validateToken, AuthController.invalidateSession);
        this.router.post('/insert-session', adminMiddleware.validateToken, AuthController.insertAdminSession);
        this.router.get('/pdp-window/:regionId', adminMiddleware.validateToken, expressJoiValidator(expressJoi.getPDPWindows), AdminController.getPDPWindows);
        this.router.post('/pdp-window', adminMiddleware.validateToken, expressJoiValidator(expressJoi.upsertPDPWindow), AdminController.upsertPDPWindow);
        this.router.delete('/pdp-window', adminMiddleware.validateToken, expressJoiValidator(expressJoi.deletePDPException), AdminController.deletePDPException);

        this.router.post(
            '/pdp-unlock/insert-request',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.insertPdpUnlockRequest),
            AdminController.insertPdpUnlockRequest,
        );
        this.router.post(
            '/pdp-unlock/fetch-requests',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.fetchPdpUnlockRequests),
            AdminController.fetchPdpUnlockRequests,
        );
        this.router.post('/fetch-db-regions', adminMiddleware.validateToken, expressJoiValidator(expressJoi.fetchDistributorRegions), AdminController.fetchDistributorRegions);
        this.router.put(
            '/pdp-unlock/update-request',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.updatePdpUnlockRequest),
            AdminController.updatePdpUnlockRequest,
        );
        this.router.post('/fetch-sso-users', adminMiddleware.validateToken, expressJoiValidator(expressJoi.fetchSSOUsers), AdminController.fetchSSOUsers);
        this.router.get('/pdp-unlock/window-settings', adminMiddleware.validateToken, AdminController.fetchPDPWindowSettings);
        this.router.put(
            '/pdp-unlock/window-settings',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.updatePdpUnlockWindowSettings),
            AdminController.updatePDPWindowSettings,
        );
        this.router.post('/pdp-unlock/window-settings-sync', AdminController.lockUnlockPDPByWindow);
        this.router.put(
            '/pdp-unlock/update-multiple-requests',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.updateMultiplePdpUnlockRequests),
            AdminController.updateMultiplePdpUnlockRequests,
        );
        this.router.post(
            '/pdp-unlock/insert-approved-request',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.insertApprovedPdpUnlockRequest),
            AdminController.insertApprovedPDPUnlockRequest,
        );

        /*SYNC APIs*/
        this.router.post('/pdp-unlock/sync-requests', AdminController.syncPdpUnlockRequests);
        this.router.put('/pdp-unlock/set-expired', AdminController.setExpiredPdpUnlockRequests);
        this.router.post('/pdp-unlock/unlock/:id', expressJoiValidator(expressJoi.unlockPDP), AdminController.unlockPdpByRequestId);

        // REDIS ROUTES
        this.router.get('/redis/flush-data', RedisController.flushRedisData);

        // AUTO CLOSURE ROUTES
        this.router.post('/fetch-auto-closure-gt', adminMiddleware.validateToken, expressJoiValidator(expressJoi.fetchAutoClosureGT), AutoClosureController.fetchAutoClosureGT);
        this.router.post('/update-auto-closure-gt', adminMiddleware.validateToken, expressJoiValidator(expressJoi.updateAutoClosureGT), AutoClosureController.updateAutoClosureGT);
        this.router.post(
            '/fetch-auto-closure-mt-ecom-single-grn',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.fetchAutoClosureMTEcomSingleGrn),
            AutoClosureController.fetchAutoClosureMTEcomSingleGrn,
        );
        this.router.post(
            '/fetch-auto-closure-mt-ecom-single-grn-customer-details',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.fetchAutoClosureMTEcomSingleGrnCustomerDetails),
            AutoClosureController.fetchAutoClosureMTEcomSingleGrnCustomerDetails,
        );
        this.router.post(
            '/fetch-multi-grn-consolidated-data',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.fetchMultiGrnConsolidatedData),
            AutoClosureController.fetchMultiGrnConsolidatedData,
        );
        this.router.post('/update-single-grn-auto-closure', adminMiddleware.validateToken, expressJoiValidator(expressJoi.updateSingleGrn), AutoClosureController.updateSingleGrn);
        this.router.post('/update-multi-grn-auto-closure', adminMiddleware.validateToken, expressJoiValidator(expressJoi.updateMultiGrn), AutoClosureController.updateMultiGrn);
        this.router.post(
            '/fetch-multi-grn-customer-details',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.fetchMultiGrnCustomerDetails),
            AutoClosureController.fetchMultiGrnCustomerDetails,
        );
        this.router.post(
            '/multi-update-auto-closure-gt',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.multiUpdateAutoClosureGT),
            AutoClosureController.multiUpdateAutoClosureGT,
        );
        this.router.post('/multi-update-mt-ecom', adminMiddleware.validateToken, expressJoiValidator(expressJoi.multiUpdateMTEcom), AutoClosureController.multiUpdateMTEcom);

        this.router.post('/auto-closure-gt-report', adminMiddleware.validateToken, expressJoiValidator(expressJoi.autoClosureGTReport), AutoClosureController.autoClosureReportGT);

        this.router.post(
            '/invalidate-other-sessions',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.invalidateOtherSessions),
            AuthController.invalidateOtherSessions,
        );

        this.router.post('/fetch-auto-closure-mt-ecom-config', adminMiddleware.validateToken, AutoClosureController.fetchAutoClosureMtEcomConfig);
        this.router.post(
            '/update-auto-closure-mt-ecom-config',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.updateAutoClosureMtEcomConfig),
            AutoClosureController.updateAutoClosureMtEcomConfig,
        );
        this.router.post(
            '/fetch-auto-closure-mt-report',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.fetchAutoClosureMTReport),
            AutoClosureController.autoClosureReportMT,
        );
    }
}

const authRoutes = new AdminRouter();
authRoutes.init();

export default authRoutes.router;
