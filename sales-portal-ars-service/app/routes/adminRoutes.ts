import { Router } from 'express';
import { ArsController } from '../controller/arsController';
import validAdminTokenMiddleware from '../middleware/adminMiddleware';
import expressJoiValidator from 'express-joi-validator';
import expressJoi from '../lib/requestValidator';
import multer from 'multer';
import authorizer from '../middleware/authorizer';

const upload = multer({ dest: 'excelUploads/' });

class AdminRoutes {
    router: Router;
    constructor() {
        this.router = Router();
    }

    init() {
        this.router.post('/brand-variant-list', validAdminTokenMiddleware.validateToken, ArsController.getRegionalBrandVariants);
        this.router.post('/regional-brand-list', validAdminTokenMiddleware.validateToken, ArsController.getRegionalBrands);
        this.router.post('/forecast', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.forecast), ArsController.getForecastData);
        this.router.put('/update-forecast', validAdminTokenMiddleware.validateToken, ArsController.updateForecastData);
        this.router.post(
            '/forecast-configuration',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.getForecastConfiguration),
            ArsController.fetchForecastConfigurations,
        );
        this.router.put(
            '/forecast-configuration',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.updateForecastConfiguration),
            ArsController.updateForecastConfiguration,
        );
        this.router.post('/forecast-summary', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.getForecastSummary), ArsController.getForecastSummaryData);
        this.router.post('/last-forecast-date', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.lastForecastDate), ArsController.fetchLastForecastDate);
        this.router.post('/submit-forecast', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.submitForecast), ArsController.submitForecastData);
        this.router.put(
            '/update-forecast-distribution',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.updateForecastDistribution),
            ArsController.updateForecastDistribution,
        );
        this.router.post('/fetch-forecast-for-dist', validAdminTokenMiddleware.validateToken, ArsController.fetchSuggestedMaterials);
        this.router.post('/stock-data', expressJoiValidator(expressJoi.stockData), ArsController.stockData);
        this.router.get('/stock-sync-time', validAdminTokenMiddleware.validateToken, ArsController.fetchStockLevelSyncStatus);
        this.router.post('/sku-stock-data', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.skuStockData), ArsController.fetchSkuStockData);
        this.router.get('/forecast-dump-validation', ArsController.forecastDumpValidation);
        this.router.get('/auto-order-report-email', ArsController.autoOrderReportEmail);
        this.router.get('/auto-submit-forecast', ArsController.autoSubmitForecastData);

        this.router.get(
            '/download-forecast-summary',
            (req, res, next) => {
                // Set request setTimeout BEFORE any other middlewares
                req.setTimeout(0);
                next();
            },
            validAdminTokenMiddleware.validateToken,
            ArsController.downloadForecastSummary,
        );
        this.router.post('/stock-norm-audit/:cg', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.getStockNormAudit), ArsController.getStockNormAudit);
        this.router.put('/stock-norm-audit', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.updateStockNormAudit), ArsController.updateStockNormConfig);
        this.router.post(
            '/moq-mapping-data',
            validAdminTokenMiddleware.validateToken,
            authorizer.getMoqMappingData,
            expressJoiValidator(expressJoi.getMoqDbMapping),
            ArsController.getMoqMappingData,
        );
        this.router.post('/update-moq', validAdminTokenMiddleware.validateToken, authorizer.updateMoq, expressJoiValidator(expressJoi.updateMoq), ArsController.updateMoq);
        this.router.get('/stock-norm-default/:cg', validAdminTokenMiddleware.validateToken, ArsController.getStockNormDefault);
        this.router.put(
            '/stock-norm-default',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.updateStockNormDefault),
            ArsController.updateStockNormDefault,
        );
        this.router.get('/all-ars-tolerance/:cg', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.getAllArsTolerance), ArsController.getAllArsTolerance);
        this.router.get('/ars-tolerance/:cg/:areaCode', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.getArsTolerance), ArsController.getArsTolerance);
        this.router.put('/all-ars-tolerance', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.updateArsTolerance), ArsController.updateArsTolerance);
        this.router.get('/send-forecast-window-emails', ArsController.sendForecastWindowNotification);
        this.router.post('/excluded-materials', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.getExcludedMaterials), ArsController.getExcludedMaterials);
        this.router.post('/update-quantity-norm', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.updateQuantityNorm), ArsController.updateQuantityNorm);
        this.router.post('/upload-forecast', validAdminTokenMiddleware.validateToken, upload.single('file'), ArsController.uploadForecastExcel),
            this.router.get('/download-dlp-report', validAdminTokenMiddleware.validateToken, ArsController.downloadDlpReport);
        this.router.get('/stock-norm-db-filter', validAdminTokenMiddleware.validateToken, ArsController.stockNormDbFilter);
        this.router.get('/sync-forecast-total', ArsController.syncForecastTotal);
        this.router.post('/upsert-soq-norms', validAdminTokenMiddleware.validateToken, ArsController.upsertSoqNorms);
        this.router.get('/fetch-soq-norms', validAdminTokenMiddleware.validateToken, ArsController.fetchAllSoqNorms);
        this.router.get('/fetch-soq-division-list', validAdminTokenMiddleware.validateToken, ArsController.fetchSoqNormsDivisionList);
        this.router.delete('/delete-soq-norms/:division', validAdminTokenMiddleware.validateToken, ArsController.deleteSoqNorm);
        this.router.post('/sku-soq-norm-sync', validAdminTokenMiddleware.validateToken, upload.single('file'), ArsController.skuSoqNormSync);
        this.router.get('/sku-soq-norm-sync', validAdminTokenMiddleware.validateToken, ArsController.skuSoqNormDownload);
        this.router.post('/db-pop-class', validAdminTokenMiddleware.validateToken, upload.single('file'), ArsController.uploadDBCensusCustomerGroup);
        this.router.get('/db-pop-class', validAdminTokenMiddleware.validateToken, ArsController.distributorCensusCustomerGroupDownload);
        this.router.put('/update-forecast-s3', ArsController.saveForecastData);
        this.router.post('/upload-stock-norm', validAdminTokenMiddleware.validateToken, upload.single('file'), ArsController.uploadStockNorm);
        this.router.get('/psku-tolerance-exclusions', validAdminTokenMiddleware.validateToken, ArsController.fetchToleranceExcludedPskus);
        this.router.post(
            '/psku-tolerance-exclusions',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.updateToleranceExcludedPskus),
            ArsController.updateToleranceExcludedPskus,
        );
        this.router.post('/ars-configurations', ArsController.fetchArsConfigurations);
        this.router.post(
            '/update-ars-configurations',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.updateArsConfigurations),
            ArsController.updateArsConfigurations,
        );
        this.router.post('/upload-region-forecast', validAdminTokenMiddleware.validateToken, upload.single('file'), ArsController.uploadRegionForecast);
        this.router.post(
            '/forecast-distribution',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.forecastDistribution),
            ArsController.fetchForecastDistribution,
        );
        this.router.post('/product-hierarchy-filter', expressJoiValidator(expressJoi.fetchProductHierarchyFilter), ArsController.fetchProductHierarchyFilter);
        this.router.post(
            '/upsert-distributor-psku-tolerance',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.upsertDistributorPskuTolerance),
            ArsController.upsertDistributorPskuTolerance,
        );
        this.router.post(
            '/fetch-distributor-psku-tolerance',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.fetchDistributorPskuTolerance),
            ArsController.fetchDistributorPskuTolerance,
        );
        this.router.post('/missing-distributor-psku-combination', ArsController.getMissingDBPskuCombination);
        this.router.post(
            '/fetch-original-distributor-psku-tolerance',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.fetchOriginalDbPskuTolerance),
            ArsController.fetchDbPSKUTolerance,
        );
        this.router.post(
            '/delete-distributor-psku-tolerance',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.deleteDbPskuTolerance),
            ArsController.deleteDbPSKUTolerance,
        );
        this.router.post('/aos-audit-report', expressJoiValidator(expressJoi.aosAuditReport), ArsController.aosSimulationReport);
        this.router.post('/insert-sync-log', validAdminTokenMiddleware.validateToken, expressJoiValidator(expressJoi.insertSyncLog), ArsController.insertSyncLog);
        this.router.post('/download-stock-norm', validAdminTokenMiddleware.validateToken, ArsController.downloadStockNormAudit);
        this.router.post('/aos-audit-report', expressJoiValidator(expressJoi.aosAuditReport), ArsController.aosSimulationReport);
        this.router.get('/ars-enabled-area-codes', validAdminTokenMiddleware.validateToken, ArsController.fetchArsAreaCodes);
        this.router.get('/stock-norm-for-distributor/:distributorCode', validAdminTokenMiddleware.validateToken, ArsController.fetchStockNormForDistributor);
        this.router.get('/forecast-dump-details/:areaCode', validAdminTokenMiddleware.validateToken, ArsController.fetchAreaForecastDumpDetails);
    }
}

const adminRouter = new AdminRoutes();
adminRouter.init();

export default adminRouter.router;
