import React, { useState, useEffect } from 'react';
import ReactExport from 'react-data-export';
import Util from '../../../util/helper';

let ExportPCUtoExcel = props => {
    //Excel variable
    const ExcelFile = ReactExport.ExcelFile;
    const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
    const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

    const { pcuData, onCancel } = props;
    const [pcuExcelData, setPcuExcelData] = useState([]);

    useEffect(() => {
        let dataExcel = pcuData?.map(item => (
            {
                pc_number: item.pc_number,
                reqDate: `${Util.formatDate(item.created_on)}, ${Util.formatTime(item.created_on)}`,
                createdBy: item.created_by,
                createdByCode: item.code,
                dbCode: item.distributor_code,
                dbName: item.distributor_name,
                plantCode: item.plant_code,
                division: item.division,
                distChannel: item.distribution_channel,
                salesOrg: item.salesorg,
                responseBy: item.update_by,
                resDate: (item.update_on)?`${Util.formatDate(item.update_on)},${Util.formatTime(item.update_on)}`:'',
                status: item.status
            }
        ));
        setPcuExcelData([...dataExcel]);
    }, [pcuData]);

    return (
        <>
            {pcuExcelData && pcuExcelData.length > 0 &&
                <div>
                    <ExcelFile filename={`PC_Update_Requests_${new Date().getFullYear() + '_' + (new Date().getMonth() + 1) + '_' + new Date().getDate()}`}
                        element={<button onClick={onCancel}>Download</button>}>
                        <ExcelSheet data={pcuExcelData} name='Sheet1'>
                            <ExcelColumn label="PC Update Request No." value="pc_number" />
                            <ExcelColumn label="Requested Date" value="reqDate" />
                            <ExcelColumn label="TSE" value="createdBy" />
                            <ExcelColumn label="TSE Code" value="createdByCode" />
                            <ExcelColumn label="DB Code" value="dbCode" />
                            <ExcelColumn label="DB Name" value="dbName" />
                            <ExcelColumn label="Plant Code" value="plantCode" />
                            <ExcelColumn label="Division" value="division" />
                            <ExcelColumn label="Dist Channel" value="distChannel" />
                            <ExcelColumn label="Sales Org" value="salesOrg" />
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
export default ExportPCUtoExcel;