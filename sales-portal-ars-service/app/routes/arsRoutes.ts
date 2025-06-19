import { Router } from "express";
import { ArsController } from "../controller/arsController";
import validAuthTokenMiddleware from '../middleware/authMiddleware'
import expressJoiValidator from "express-joi-validator";
import expressJoi from '../lib/requestValidator'

class ArsRoutes{
    router: Router
    constructor() {
        this.router = Router();
    }

    init() {
        this.router.post('/fetch-forecast-for-dist', validAuthTokenMiddleware.validateToken, ArsController.fetchSuggestedMaterials);
        this.router.get("/ars-tolerance/:cg/:areaCode", validAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.getArsTolerance), ArsController.getArsTolerance);
        this.router.post('/excluded-materials', validAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.getExcludedMaterials), ArsController.getExcludedMaterials);
        this.router.get("/psku-tolerance-exclusions", validAuthTokenMiddleware.validateToken, ArsController.fetchToleranceExcludedPskus);
        this.router.post("/fetch-distributor-psku-tolerance", validAuthTokenMiddleware.validateToken, expressJoiValidator(expressJoi.fetchDistributorPskuTolerance), ArsController.fetchDistributorPskuTolerance);
    }
}

const arsRoutes = new ArsRoutes();
arsRoutes.init();

export default arsRoutes.router;