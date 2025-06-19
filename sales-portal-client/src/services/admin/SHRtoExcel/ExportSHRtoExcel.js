import React, { useState, useEffect } from 'react';
import ReactExport from 'react-data-export';
import Util from '../../../util/helper';

let ExportSHRtoExcel = props => {
    //Excel variable
    const ExcelFile = ReactExport.ExcelFile;
    const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
    const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

    const { shrData, onCancel } = props;
    const [shrExcelData, setShrExcelData] = useState([]);

    useEffect(() => {
        let dataExcel = shrData?.map(item => (
            {
                sh_number: item.sh_number,
                reqDate: `${Util.formatDate(item.created_on)}, ${Util.formatTime(item.created_on)}`,
                createdBy: item.tse_fname + ' ' + item.tse_lname ,
                createdByCode: item.tse_code,
                dbCode: item.distributor_code,
                dbName: item.db_name,
                existingTseName: item.existing_tse_first_name+ " " + item.existing_tse_last_name,
                existingTseCode: item.existing_tse_code,
                requestType: item.type == "ADD" ? "Distributor is not showing" : item.type == "REMOVE" ? "Distributor does not belongs to TSE" : "",
                responseBy: item.updated_by,
                resDate: (item.updated_by)?`${Util.formatDate(item.updated_on)},${Util.formatTime(item.updated_on)}`:'',
                status: item.status
            }
        ));
        setShrExcelData([...dataExcel]);
    }, [shrData]);

    return (
        <>
            {shrExcelData && shrExcelData.length > 0 &&
                <div>
                    <ExcelFile filename={`SH_Requests_${new Date().getFullYear() + '_' + (new Date().getMonth() + 1) + '_' + new Date().getDate()}`}
                        element={<button onClick={onCancel}>Download</button>}>
                        <ExcelSheet data={shrExcelData} name='Sheet1'>
                            <ExcelColumn label="SH Request No." value="sh_number" />
                            <ExcelColumn label="Requested Date" value="reqDate" />
                            <ExcelColumn label="Requesting TSE Name" value="createdBy" />
                            <ExcelColumn label="Requesting TSE Code" value="createdByCode" />
                            <ExcelColumn label="DB Code" value="dbCode" />
                            <ExcelColumn label="DB Name" value="dbName" />
                            <ExcelColumn label="Existing TSE Name" value="existingTseName" />
                            <ExcelColumn label="Existing TSE Code" value="existingTseCode" />
                            <ExcelColumn label="Request Type" value="requestType" />
                            <ExcelColumn label="Response By" value="responseBy" />
                            <ExcelColumn label="Response Date" value="resDate" />
                            <ExcelColumn label="Status" value="status" />
                        </ExcelSheet>
                    </ExcelFile>
                </div>
            }
        </>
    );

};
export default ExportSHRtoExcel;