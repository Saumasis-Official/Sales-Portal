import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import ReactExport from "react-data-export";
import { Select, Button, DatePicker } from 'antd';
import _ from 'lodash';
import moment from "moment";

import * as AdminActions from '../actions/adminAction';
import * as Actions from "../../distributor/actions/dashboardAction"
import Util from '../../../util/helper';
import { ALL_DIVISIONS } from '../../../constants';

const { ExcelFile, ExcelSheet, ExcelColumn } = ReactExport;

const AosAuditReport = (props) => {
    const {
        aosAuditReport
    } = props;
    const currentMonthStart = moment().startOf('month');
    const nextMonthEnd = moment().add(1, 'month').endOf('month');

    const [payload, setPayload] = useState({
        distributor_code: "",
        date: moment().format('YYYY-MM-DD'),
    });
    const [exportData, setExportData] = useState({});
    // const [isLoading, setIsLoading] = useState(false);
    const isLoading = useRef(false)

    const generateSimulation = async () => {
        isLoading.current = true;
        try {
            const aosAuditResponse = await aosAuditReport(payload);
            // check if all the data is present
            const count = Object.values(aosAuditResponse?.data)?.reduce((acc, val) => acc + (val?.length || 0), 0);
            if (count === 0) {
                Util.notificationSender("Error", "No data found.", false);
                return null;
            }
            setExportData({
                "Order Summary": aosAuditResponse?.data?.order_summary,
                "PDP Details": aosAuditResponse?.data?.pdp_details,
                "Order Details": aosAuditResponse?.data?.order_details
            })

        } catch (error) {
            console.error(error);
            Util.notificationSender("Error", "Failed to process.", false);
            return null;
        } finally {
            isLoading.current = false;
        }

    };

    function disabledDate(current) {
        return current < currentMonthStart || current > nextMonthEnd;
    }

    return (
        <div>
            <input
                className='inputs'
                type="text"
                placeholder='DB code'
                value={payload.distributor_code}
                onChange={(e) => setPayload({ ...payload, distributor_code: e.target.value })} />
            <DatePicker
                // disabledDate={disabledDate}
                value={payload.date ? moment(payload.date) : null}
                onChange={(date, dateString) => setPayload({ ...payload, date: dateString })}
            />
            <Button id="simulate-btn" type="submit" onClick={generateSimulation} loading={isLoading.current}>Download</Button>
            {
                exportData && Object.keys(exportData).length > 0 &&
                <ExportAosReport filename={`AOS Audit Report_${payload.distributor_code}_${payload.date}`} exportData={exportData} onCancel={() => setExportData({})} />
            }

        </div>
    );
};


const mapDispatchToProps = dispatch => {
    return {
        aosAuditReport: (payload) => dispatch(AdminActions.aosAuditReport(payload))
    }
}

export default connect(null, mapDispatchToProps)(AosAuditReport);

const ExportAosReport = (props) => {
    const { filename, exportData, onCancel } = props;

    useEffect(() => {
        if (exportData && Object.keys(exportData).length) {
            document.getElementById("aos-audit-download-excel")?.click();
        }

    }, [exportData]);

    const generateSheets = () => {
        return Object.keys(exportData).map(key => {
            const data = exportData[key];
            if (!Array.isArray(data) || data.length === 0) {
                return null;
            }

            // Collect all unique column names
            const allColumns = new Set();
            data.forEach(row => {
                Object.keys(row).forEach(col => allColumns.add(col));
            });

            const columns = Array.from(allColumns).map(col => ({
                title: col,
                width: { wpx: 100 },
                style: { font: { bold: true } }
            }));

            const rows = data.map(row => Object.values(row));

            return (
                <ExcelSheet dataSet={[{ columns, data: rows }]} name={key} key={key} />
            );
        }).filter(sheet => sheet !== null);
    };

    return (
        <div>
            <ExcelFile filename={filename} element={<button id='aos-audit-download-excel' onClick={onCancel}>Download Excel</button>}>
                {generateSheets()}
            </ExcelFile>
        </div>
    );

};
