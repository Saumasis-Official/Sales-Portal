import React, { useState, useEffect } from 'react';
import ReactExport from 'react-data-export';
import Util from '../../../util/helper';

let ExportForecastSummaryDataToExcel = (props) => {
    //Excel variable
    const ExcelFile = ReactExport.ExcelFile;
    const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
    const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

    const { fData, onCancel, lastForecastDate, areaCode, endMonth, forecastDelta } = props;
    const [forecastExcelData, setForecastExcelData] = useState([]);
    const [applicableMonthYearName, setApplicableMonthYearName] = useState([]);
    const [applicableMonthYear, setApplicableMonthYear] = useState([]);
    const [forecastMonth, setForecastMonth] = useState('');

    useEffect(() => {
        const monthData = endMonth ? Util.fetchMonths(endMonth, forecastDelta) : Util.applicableYearMonths(lastForecastDate?.forecast_month);
        if (!monthData) return;
        setApplicableMonthYear([...monthData?.monthYear]);
        setApplicableMonthYearName([...monthData?.monthNames]);
        setForecastMonth(Util.applicableYearMonths(lastForecastDate?.forecast_month)?.monthNames?.at(-1) ?? 'Current');
    }, [lastForecastDate]);

    useEffect(() => {
        if (fData?.length > 0 && applicableMonthYear?.length) {
            let dataExcel = fData?.map((item) => {
                const res = {
                    dbCode: item.sold_to_party,
                    dbName: item.customer_name,
                    psku: item.parent_sku,
                    pskuDesc: item.parent_desc,
                    forecast: item.forecast,
                    adjusted_forecast: item.adjusted_forecast,
                    tseCode: item.tse_code,
                    areaCode: item.area_code,
                    buom: item.buom,
                    buom_to_cs: item.buom_to_cs,
                    stockNorm: item.stock_norm,
                    status: item.status,
                    customerGroup: item.customer_group,
                    customerGroupDesc: item.customer_group_description,
                    // class: item.class
                };
                applicableMonthYearName.forEach((month, index) => {
                    res[`month${index}Sales`] = item.monthly_sales[applicableMonthYear[index]] ?? 0;
                });
                return res;
            });
            setForecastExcelData([...dataExcel]);
        }
    }, [applicableMonthYear, fData]);

    useEffect(() => {
        if (forecastExcelData?.length && areaCode) {
            document.getElementById('forecast-summary-download-btn')?.click();
        }
    }, [forecastExcelData, areaCode]);

    function onCancelHandler(e) {
        onCancel(e);
        setForecastExcelData([]);
    }

    return (
        <>
            {forecastExcelData && forecastExcelData.length > 0 && (
                <div>
                    <ExcelFile
                        filename={`Forecast_Summary_${areaCode}_${new Date().getDate()}-${new Date().getMonth() + 1}-${new Date().getFullYear()}`}
                        element={<button id="forecast-summary-download-btn" type="default" onClick={onCancelHandler} hidden />}>
                        <ExcelSheet data={forecastExcelData} name={areaCode}>
                            <ExcelColumn label="Area_Code" value="areaCode" />
                            <ExcelColumn label="TSE_Code" value="tseCode" />
                            <ExcelColumn label="DB_Code" value="dbCode" />
                            <ExcelColumn label="DB_Name" value="dbName" />
                            <ExcelColumn label="Customer_Group" value="customerGroup" />
                            <ExcelColumn label="Customer_Group_Desc" value="customerGroupDesc" />
                            <ExcelColumn label="PSKU" value="psku" />
                            <ExcelColumn label="PSKU_Description" value="pskuDesc" />
                            {/* <ExcelColumn label="Class" value="class" /> */}
                            <ExcelColumn label="BUOM" value="buom" />
                            <ExcelColumn label="BUOM_TO_CS" value="buom_to_cs" />
                            <ExcelColumn label="Stock_Norm_Days" value="stockNorm" />
                            <ExcelColumn label="Status" value="status" />
                            {applicableMonthYearName.map((month, idx) => {
                                return <ExcelColumn label={applicableMonthYearName[idx] + '_Sales_Figure'} value={`month${idx}Sales`} />;
                            })}
                            <ExcelColumn label={forecastMonth + '_Forecast_BUOM'} value="forecast" />
                            <ExcelColumn label={'Adjusted_Forecast_BUOM'} value="adjusted_forecast" />
                        </ExcelSheet>
                    </ExcelFile>
                </div>
            )}
        </>
    );
};
export default ExportForecastSummaryDataToExcel;
