import { arsHelpers } from '../helper/arsHelper';
import { UploadDBCensusCustomerGroup } from '../interfaces/uploadDBCensusCustomerGroup';
import { UploadSkuSoqNorm } from '../interfaces/uploadSkuSoqNorm';
import { UploadStockNorm } from '../interfaces/uploadStockNorm';
import DBPskuTolerance from '../interfaces/dbPskuTolerance';
import { UpdateForecastDataAdjusted } from '../interfaces/updateForecastData';
import { UploadClassLevelStockNorm } from '../interfaces/UploadClassLevelStockNorm';

export const uploadedDataTransformer = {
    jsonToDBMapping: async (data: object[], areaCode: string) => {
        const monthData = await arsHelpers.getMonthYear(areaCode);
        const resultData: object[] = [];
        const decimalPlaceRegex = /\b\d+\.\d{3,}\b/;
        data?.forEach((d: object) => {
            const obj = {};
            obj['sold_to_party'] = d['DB_Code'];
            obj['parent_sku'] = d['PSKU'];
            obj['by_allocation'] = d[`${monthData?.monthNames[3]}_Forecast_BUOM`] ?? 0;
            if (Object.prototype.hasOwnProperty.call(d, `${monthData!.monthNames[0]}_Sales_Figure`)) {
                obj[monthData!.monthYear[0]] = d[`${monthData!.monthNames[0]}_Sales_Figure`] ?? 0;
            }
            obj[monthData!.monthYear[1]] = d[`${monthData!.monthNames[1]}_Sales_Figure`] ?? 0;
            obj[monthData!.monthYear[2]] = d[`${monthData!.monthNames[2]}_Sales_Figure`] ?? 0;
            if (d['Adjusted_Forecast_BUOM'] && !isNaN(d['Adjusted_Forecast_BUOM'])) {
                if (decimalPlaceRegex.test(d['Adjusted_Forecast_BUOM'])) obj['adjusted_forecast'] = +parseFloat(d['Adjusted_Forecast_BUOM']).toFixed(2);
                else obj['adjusted_forecast'] = parseFloat(d['Adjusted_Forecast_BUOM']);
            } else {
                obj['adjusted_forecast'] = d['Adjusted_Forecast_BUOM'] ? d['Adjusted_Forecast_BUOM'] : 0;
            }
            resultData.push(obj);
        });
        return resultData;
    },

    distributionMapping(data: object): UpdateForecastDataAdjusted {
        const resultData: UpdateForecastDataAdjusted = {
            updated_allocation: 0,
            distributorCode: '',
            sales_allocation_key: '',
            pskuClass: '',
        };
        if (Object.keys(data).length > 0) {
            resultData['updated_allocation'] = data['updated_allocation'];
            resultData['distributorCode'] = data['sold_to_party'];
            resultData['sales_allocation_key'] = data['sales_allocation_key'];
            resultData['pskuClass'] = data['pskuClass'];
        }
        return resultData;
    },

    jsonToSkuSoqNorm(data) {
        const resultData: UploadSkuSoqNorm[] = [];
        data?.forEach((d: object) => {
            const obj: UploadSkuSoqNorm = {
                material_code: d['PSKU'],
                distributor_code: d['Distributor Code'],
                soq_norm: Math.round(+d['SOQ Norm'] || 0),
            };
            resultData.push(obj);
        });
        return resultData;
    },

    jsonToDBCensusCustomerGroup(data) {
        const resultData: UploadDBCensusCustomerGroup[] = [];
        data?.forEach((d: object) => {
            const obj: UploadDBCensusCustomerGroup = {
                distributor_code: d['DB Code'],
                customer_group: d['Pop Class']?.split('(')[0]?.trim().toUpperCase(),
                pop_class: d['Pop Class'],
            };
            resultData.push(obj);
        });
        return resultData;
    },

    jsonToStockNorm(data) {
        const resultData: UploadStockNorm[] = [];
        data?.forEach((d: object) => {
            const obj: UploadStockNorm = {
                dist_id: d['Distributor Code'],
                psku: d['PSKU'],
                class_of_last_update: d['Class'],
                stock_norm: Math.round(+d['Stock Norm(Days)'] || 0),
                original_upload: d['Stock Norm(Days)'],
            };
            resultData.push(obj);
        });
        return resultData;
    },

    jsonToClassLevelStockNorm(data) {
        const resultData: UploadClassLevelStockNorm[] = [];
        data?.forEach((d: object) => {
            const obj: UploadClassLevelStockNorm = {
                db: d['Distributor Code'],
                a: Math.round(+d['A']),
                b: Math.round(+d['B']),
                c: Math.round(+d['C']),
            };
            resultData.push(obj);
        });
        return resultData;
    },

    jsonToDBPskuTolerance(data) {
        const resultData: DBPskuTolerance[] = [];
        data?.forEach((d) => {
            const obj: DBPskuTolerance = {
                distributor_code: d['Distributor Code'],
                psku: d['PSKU'],
                max: d['Max%'],
                min: d['Min%'],
            };
            resultData.push(obj);
        });
        return resultData;
    },
};
