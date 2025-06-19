import React, { useState, useEffect } from 'react';
import ReactExport from 'react-data-export';
import Util from '../../../util/helper';

let ExportForecastDataToExcel = (props) => {
    //Excel variable
    const ExcelFile = ReactExport.ExcelFile;
    const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
    const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

    const { fData, onCancel, applicableMonthName } = props;
    const [forecastExcelData, setForecastExcelData] = useState([]);
    const [forecastPSKU, setForecastPSKU] = useState();

    useEffect(() => {
        if (fData?.data?.length > 0) {
            let dataExcel = fData.data?.map((item) => {
                const res = {
                    dbCode: item.distributor_code,
                    dbName: item.distributor_name,
                    customerGroup: item.customer_group,
                    status: item.status,
                    recommended: item.recommended_forecast,
                    adjusted: item.adjusted_forecast,
                    updatedDate: item.updated_on ? `${Util.formatDate(item.updated_on)},${Util.formatTime(item.updated_on)}` : '',
                    customerGroupDesc: item.customer_group_description,
                };
                applicableMonthName.forEach((month, index) => {
                    res[`month${index}Name`] = item.month_names[index];
                    res[`month${index}Sales`] = item.month_sales[index];
                });
                return res;
            });
            setForecastExcelData([...dataExcel]);
            setForecastPSKU(fData.psku);
        }
    }, [fData && fData?.data?.length > 0]);

    return (
        <>
            {forecastExcelData && forecastExcelData.length > 0 && (
                <div>
                    <ExcelFile
                        filename={`Forecast_${forecastPSKU}_${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}`}
                        element={<button onClick={onCancel}>Download</button>}>
                        <ExcelSheet data={forecastExcelData} name="Sheet1">
                            <ExcelColumn label="DB Code" value="dbCode" />
                            <ExcelColumn label="DB Name" value="dbName" />
                            <ExcelColumn label="Customer_Group" value="customerGroup" />
                            <ExcelColumn label="Customer_Group_Desc" value="customerGroupDesc" />
                            <ExcelColumn label="Status" value="status" />
                            {applicableMonthName.map((month, idx) => {
                                return <ExcelColumn label={forecastExcelData[0][`month${idx}Name`] + ' Sales Figure'} value={`month${idx}Sales`} />;
                            })}
                            <ExcelColumn label="Recommended Forecast" value="recommended" />
                            <ExcelColumn label="Adjusted Forecast" value="adjusted" />
                            <ExcelColumn label="Updated On" value="updatedDate" />
                        </ExcelSheet>
                    </ExcelFile>
                </div>
            )}
        </>
    );
};
export default ExportForecastDataToExcel;
