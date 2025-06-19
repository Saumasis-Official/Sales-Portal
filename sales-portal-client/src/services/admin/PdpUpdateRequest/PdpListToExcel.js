import React, { useState, useEffect } from 'react';
import ReactExport from 'react-data-export';
import Util from '../../../util/helper';

let PdpListToExcel = props => {
    //Excel variable
    const ExcelFile = ReactExport.ExcelFile;
    const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
    const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

    const { pdpData, onCancel } = props;
    const [pdpExcelData, setPdpExcelData] = useState([]);

    useEffect(() => {
        let dataExcel = pdpData?.map(item => (
            {
                pdpNo: item.pdp_update_req_no,
                reqDate: `${Util.formatDate(item.created_on)}, ${Util.formatTime(item.created_on)}`,
                dbName: item.distributor_name,
                dbCode: item.distributor_code,
                salesOrg: item.sales_org,
                division: item.division,
                distChannel: item.dist_channel,
                plantCode: item.plant_code,
                pdpCurrent: item.pdp_current,
                pdpRequested: item.pdp_requested,
                refDateCurrent: item.ref_date_current,
                refDateRequested: item.ref_date_requested,
                tseCode: item.tse_code,
                responseComments: (item.response_comments === '' || item.response_comments === null || item.response_comments === undefined)? 'NULL': item.response_comments,
                requestComments: item.request_comments,
                resDate: `${Util.formatDate(item.update_on)},${Util.formatTime(item.update_on)}`,
                status: item.status,
                tseEmail: item.created_by,
                responderEmail: (item.updated_by === '' || item.updated_by === null || item.updated_by === undefined)? 'NULL': item.updated_by,
            }
        ));
        setPdpExcelData([...dataExcel]);
    }, [pdpData]);

    return (
        <>
            {pdpExcelData && pdpExcelData.length > 0 &&
                <div>
                    <ExcelFile filename={`PDP_Update_Requests_${new Date().getFullYear() + '_' + (new Date().getMonth() + 1) + '_' + new Date().getDate()}`}
                        element={<button onClick={onCancel}>Download</button>}>
                        <ExcelSheet data={pdpExcelData} name='Sheet1'>
                            <ExcelColumn label="PDP Req No." value="pdpNo" />
                            <ExcelColumn label="Requested Date" value="reqDate" />
                            <ExcelColumn label="Distributor Name" value="dbName" />
                            <ExcelColumn label="Distributor Code" value="dbCode" />
                            <ExcelColumn label="Sales Org." value="salesOrg" />
                            <ExcelColumn label="Division" value="division" />
                            <ExcelColumn label="Distributor Channel" value="distChannel" />
                            <ExcelColumn label="Plant Code" value="plantCode" />
                            <ExcelColumn label="PDP when requested" value="pdpCurrent" />
                            <ExcelColumn label="SO requested" value="pdpRequested" />
                            <ExcelColumn label="Reference Date when requested" value="refDateCurrent" />
                            <ExcelColumn label="Reference Date requested" value="refDateRequested" />
                            <ExcelColumn label="Request Comments" value="requestComments" />
                            <ExcelColumn label="Response Comments" value="responseComments" />
                            <ExcelColumn label="Response Date" value="resDate" />
                            <ExcelColumn label="Responder Email" value="responderEmail" />
                            <ExcelColumn label="Request Status" value="status" />
                            <ExcelColumn label="TSE code" value="tseCode" />
                            <ExcelColumn label="TSE email" value="tseEmail" />
                        </ExcelSheet>
                    </ExcelFile>
                </div>
            }
        </>
    );

};
export default PdpListToExcel;