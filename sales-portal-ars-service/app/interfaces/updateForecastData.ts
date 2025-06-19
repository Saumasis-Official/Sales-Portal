export interface UpdateForecastData {
    pskuCode: string;
    areaCode: string;
    adjusted: UpdateForecastDataAdjusted[];
}

export interface UpdateForecastDataAdjusted {
    updated_allocation: number;
    distributorCode: string;
    sales_allocation_key: string;
    pskuClass: string;
}