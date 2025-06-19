import { Router } from "express";
import SeedController from "../controller/SeedController";
import expressJoiValidator from "express-joi-validator";
import expressJoi from "../lib/seedValidator";

class SeedingRoutes {
    router: Router;
    constructor() {
        this.router = Router();
        this.init();
    }
    init() {
        this.router.post('/seeder', expressJoiValidator(expressJoi.seeder), SeedController.seeder);
        this.router.post('/forecast-configurations', expressJoiValidator(expressJoi.applicableMonths), SeedController.getForecastConfigurations);
        this.router.post('/forecast-distribution', expressJoiValidator(expressJoi.applicableMonths), SeedController.getForecastDistribution);
        this.router.post('/stock-norm-config', expressJoiValidator(expressJoi.applicableMonths), SeedController.getStockNormConfig);
        this.router.post('/monthly-sales', expressJoiValidator(expressJoi.monthsAndAreaCode), SeedController.getMonthlySales);
        this.router.post('/sales-allocation', expressJoiValidator(expressJoi.monthsAndAreaCode), SeedController.getSalesAllocation);
    }
};

const seedingRoutes = new SeedingRoutes();
seedingRoutes.init();

export default seedingRoutes.router;