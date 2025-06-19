import React, { useState, useEffect } from 'react';
import ReactExport from 'react-data-export';
import Util from '../../../util/helper';

let ExportSdrToExcel = props => {
    //Excel variable
    const ExcelFile = ReactExport.ExcelFile;
    const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
    const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

    const { sdrData, onCancel } = props;
    const [sdrExcelData, setSdrExcelData] = useState([]);

    useEffect(() => {
        let dataExcel = sdrData?.map(item => (
            {
                sdNo: item.sd_number,
                reqDate: `${Util.formatDate(item.sd_request_date)}, ${Util.formatTime(item.sd_request_date)}`,
                material: item.material_description,
                soNo: item.so_number,
                dbName: item.name,
                reqReason: item.req_reason,
                resDate: `${Util.formatDate(item.sd_response_date)},${Util.formatTime(item.sd_response_date)}`,
                status: (item.status === 'OPEN')?'PENDING':'CLOSED',
                dbCode: item.distributor_id,
                plantCode: item.plant_code,
                plantName: item.location,
                response: (item.cfa_res_reason === '' || item.cfa_res_reason === null || item.cfa_res_reason === undefined)? 'NULL': item.cfa_res_reason,
                responseComment: (item.sd_res_comments === '' || item.sd_res_comments == null ||item.sd_res_comments == undefined)? 'NULL': item.sd_res_comments
            }
        ));
        setSdrExcelData([...dataExcel]);
    }, [sdrData]);

    return (
        <>
            {sdrExcelData && sdrExcelData.length > 0 &&
                <div>
                    <ExcelFile filename={`SDR_Report_${new Date().getFullYear() + '_' + (new Date().getMonth() + 1) + '_' + new Date().getDate()}`}
                        element={<button onClick={onCancel}>Download</button>}>
                        <ExcelSheet data={sdrExcelData} name='Sheet1'>
                            <ExcelColumn label="SD No." value="sdNo" />
                            <ExcelColumn label="Requested Date" value="reqDate" />
                            <ExcelColumn label="Material" value="material" />
                            <ExcelColumn label="SO No." value="soNo" />
                            <ExcelColumn label="DB Name" value="dbName" />
                            <ExcelColumn label="Reason" value="reqReason" />
                            <ExcelColumn label="Response Date" value="resDate" />
                            <ExcelColumn label="Status" value="status" />
                            <ExcelColumn label="Customer Code" value="dbCode" />
                            <ExcelColumn label="Plant Code" value="plantCode" />
                            <ExcelColumn label="Plant Name" value="plantName" />
                            <ExcelColumn label="Response Reason" value="response" />
                            <ExcelColumn label="Response Comments" value="responseComment" />
                        </ExcelSheet>
                    </ExcelFile>
                </div>
            }
        </>
    );

};
export default ExportSdrToExcel;