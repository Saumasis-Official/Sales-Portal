import { ForecastedPskuDistWise } from "./forecastedPskuDistWise";

export interface DistributorForecast {
    [distributor_code: string]: ForecastedPskuDistWise[]
}