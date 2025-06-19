import { Router } from 'express';
import validAdminTokenMiddleware from '../middleware/adminMiddleware';
import expressJoiValidator from 'express-joi-validator';
import expressJoi from '../lib/requestValidator';
import UserController from '../controller/userController';
import utilController from '../controller/utilController';
import multer from 'multer';
const upload = multer({ dest: 'emailUploads/' });
const storage = multer.memoryStorage();

const uploadGt = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.ms-excel' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed'));
        }
    },
}).single('file');

export class AdminRouter {
    router: Router;

    /**
     * Initialize the Router
     */
    constructor() {
        this.router = Router();
    }

    init() {
        //get records of user from database
        this.router.get('/get-user-mapping-list', validAdminTokenMiddleware.validateToken, utilController.userMappingList);
        this.router.post(
            '/get-credit-extention-request',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.fetchCreditExtentionRequest),
            UserController.fetchCreditExtentionRequests,
        );
        this.router.get(
            '/get-order-request/:transaction_id',
            validAdminTokenMiddleware.validateToken,
            expressJoiValidator(expressJoi.fetchRequestedData),
            UserController.fetchRequestedDetailsById,
        );
        this.router.post('/send-credit-extension-request', validAdminTokenMiddleware.validateToken, upload.single('file'), UserController.insertCreditExtensionRequest);
        this.router.post('/update-request', validAdminTokenMiddleware.validateToken, UserController.updateRequestApprover);
        this.router.get('/get-cl-approver-finance', validAdminTokenMiddleware.validateToken, UserController.getClApproverFinance);
        //this.router.get("/base-limit-download-excel", UserController.downloadCreditLimits);
        this.router.get('/customer-groups', validAdminTokenMiddleware.validateToken, utilController.getCustomerGroups);
        this.router.post('/account-list', validAdminTokenMiddleware.validateToken, utilController.getAccountList);
        this.router.get('/credit-limit/:distributor_id', UserController.getCreditLimitDetails);
        this.router.get('/get-cl-approver-sales', validAdminTokenMiddleware.validateToken, UserController.getClApproverSales);
        this.router.post('/insert-approver-details', validAdminTokenMiddleware.validateToken, UserController.insertApproverDetails);
        this.router.get('/get-approver-details', validAdminTokenMiddleware.validateToken, UserController.getApproverDetails);
        this.router.get('/get-risk-category', validAdminTokenMiddleware.validateToken, UserController.getRiskCategory);
        this.router.post('/fetch-approver-details', validAdminTokenMiddleware.validateToken, UserController.fetchApproversDetails);
        this.router.get('/account-base-limit-check', validAdminTokenMiddleware.validateToken, UserController.accountBaseLimitCheck);
        this.router.post('/add-approver-config', validAdminTokenMiddleware.validateToken, UserController.addApproverConfig);
        this.router.get('/get-category-list', UserController.getCategoryList);
        this.router.get('/fetch-unmapped-cg', validAdminTokenMiddleware.validateToken, UserController.getUnmappedCustomerGroups);
        this.router.post('/excel-gt-requests', validAdminTokenMiddleware.validateToken, uploadGt, UserController.insertCreditExtensionGTRequest);
        this.router.post('/get-gt-credit-extention-requests', validAdminTokenMiddleware.validateToken, UserController.fetchGTCreditExtentionRequests);
        this.router.get('/get-gt-request-details/:transaction_id', validAdminTokenMiddleware.validateToken, UserController.fetchGTRequestedDetailsById);
        this.router.get('/get-mt-cl-report', validAdminTokenMiddleware.validateToken, utilController.getMtClReport);
        this.router.post('/add-gt-approvers', validAdminTokenMiddleware.validateToken, utilController.addGTApprovers);
        this.router.get('/get-cluster', validAdminTokenMiddleware.validateToken, utilController.getCluster);
        this.router.get('/get-gt-approver-details', validAdminTokenMiddleware.validateToken, utilController.getGTApproverDetails);
        this.router.get('/get-gt-requestor-details', validAdminTokenMiddleware.validateToken, utilController.getGtRequestorDetails);
        this.router.get('/fetch-gt-add-requestor', validAdminTokenMiddleware.validateToken, utilController.fetchGtAddRequestor);
        this.router.post('/add-gt-requestor', validAdminTokenMiddleware.validateToken, utilController.addGtRequestor);
        this.router.get('/get-requestor-clusters', validAdminTokenMiddleware.validateToken, utilController.getRequestorClusters);
        this.router.get('/get-customer-group-for-settings',validAdminTokenMiddleware.validateToken, utilController.getCustomerGroupForSettings);
        this.router.get('/get-gt-cl-report', validAdminTokenMiddleware.validateToken, utilController.getGtClReport);
    }
}

// Create the Router, and export its configured Express.Router
const adminRouter = new AdminRouter();
adminRouter.init();

export default adminRouter.router;
