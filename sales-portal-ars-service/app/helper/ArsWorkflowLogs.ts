import { ArsSuggestedMaterials } from "../interfaces/arsSuggestedMaterials";
import { ForecastedPskuDistWise } from "../interfaces/forecastedPskuDistWise";

export class ArsWorkflowTestLogs {
    normCycleSafetyValues: any;
    distPdpDistributionArray?: Array<any> | null;
    weekColumnsPskuWise: Array<any>;
    forecastedPSKUDistWise: Array<ForecastedPskuDistWise> | null;
    stockNormData: any;
    transitStockData: any;
    inhandStockData: any;
    openOrderStockData: any;
    base_to_case: any;
    pac_to_case: any;
    excludedPSKU: Array<string>;
    soqNorms: any;
    skuSoqNorm: any;
    lastOrderDetails: any;
    finalArray: Array<ArsSuggestedMaterials>;
    errors: any;

    static instance: ArsWorkflowTestLogs;

    public constructor() {
        this.normCycleSafetyValues = {};
        this.distPdpDistributionArray = [];
        this.weekColumnsPskuWise = [];
        this.forecastedPSKUDistWise = [];
        this.stockNormData = {};
        this.transitStockData = {};
        this.inhandStockData = {};
        this.openOrderStockData = {};
        this.base_to_case = {};
        this.pac_to_case = {};
        this.excludedPSKU = [];
        this.soqNorms = {};
        this.skuSoqNorm = {};
        this.lastOrderDetails = {};
        this.finalArray = [];
        this.errors = '';
    }
    // public static getInstance() {
    //     if (!ArsWorkflowTestLogs.instance) {
    //         ArsWorkflowTestLogs.instance = new ArsWorkflowTestLogs();
    //     }
    //     return ArsWorkflowTestLogs.instance;
    // }

}