import React, { useEffect, useState } from "react";
import ReactExport from "react-data-export";
import { customerGroupList } from "../../../constants";
import moment from "moment";
import Util from "../../../util/helper";


const ExportStockNorm = (props) => {
    //Excel variable
    const ExcelFile = ReactExport.ExcelFile;
    const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
    const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

    const { stockNorm, customerGroup, clearData } = props;

    const [stockNormExcelData, setStockNormExcelData] = useState([]);
    const [customerGroupName, setCustomerGroupName] = useState('');
    const [fileName, setFileName] = useState('');

    useEffect(() => {
        if (stockNorm?.length > 0) {
            const data = [];
            stockNorm?.forEach(sn => {

                const areaData = {
                    "Area Code": sn.area_code,
                    "Distributor Code": sn.dist_id,
                    "Distributor Name": sn.name,
                };

                sn?.stock_norm_data?.forEach(p => {
                    const snData = {
                        ...areaData,
                        "PSKU": p.psku,
                        "PSKU Description": p.psku_name,
                        "Class": p.class,
                        "Stock Norm(Days)": p.stock_norm,
                    };
                    data.push(snData);
                });
            });
            const customerGroupName = customerGroupList.find(cg => cg.value === customerGroup)?.label;
            const applicableMonth = stockNorm[0]?.applicable_month;
            const name = `Stock Norm_${customerGroupName}_${Util.applicableMonthToMonthYearString(applicableMonth)}_${moment().format('YYYY_MM_DD, hh-mm A')}`;
            setFileName(name)
            setStockNormExcelData(data);
            setCustomerGroupName(customerGroupName);

        }

    }, [stockNorm]);

    useEffect(() => {
        if (stockNormExcelData?.length) { 
            document.getElementById('export-stock-norm')?.click();
        }
    }, [stockNormExcelData]);

    const onCancelHandler = () => {
        setStockNormExcelData([]);
        clearData();
    }

    return (
        <>
            {stockNormExcelData?.length > 0 &&
                <ExcelFile
                    filename={fileName}
                    element={
                        <button
                            id="export-stock-norm"
                            onClick={onCancelHandler}
                            hidden
                        >Export
                        </button>
                    }
                >
                    <ExcelSheet data={stockNormExcelData} name={`${customerGroupName}`}>
                        {Object.keys(stockNormExcelData[0])?.map((d, index) => {
                            return <ExcelColumn key={`sn-export-col-${index}`} label={d} value={d} />
                        })}
                    </ExcelSheet>

                </ExcelFile>
            }
        </>
    );
};


export default ExportStockNorm;