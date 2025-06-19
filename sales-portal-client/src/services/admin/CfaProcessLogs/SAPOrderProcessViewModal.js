import React from 'react';
import { Modal, Table } from 'antd';
import './CfaProcess.css';
import Util from '../../../util/helper/index';
import moment from 'moment';

function SAPOrderProcessViewModal(props) {
    const { sapData, sapMasterData, selectedLog } = props;

    const processLogData = (data) => {
        const result = {};
        for (const key in data) {
            const entry = data[key];
            const soGTTimeDifference = Util.calTimeDifference(entry?.so_gt_start_time, entry?.so_gt_end_time);
            const doGTTimeDifference = Util.calTimeDifference(entry?.do_gt_start_time, entry?.do_gt_end_time);
            const soMTTimeDifference = Util.calTimeDifference(entry?.so_mt_start_time, entry?.so_mt_end_time);
            const doMTTimeDifference = Util.calTimeDifference(entry.do_mt_start_time, entry.do_mt_end_time);

            result[key] = {
                ...entry,
                so_gt_time_difference: soGTTimeDifference,
                do_gt_time_difference: doGTTimeDifference,
                so_mt_time_difference: soMTTimeDifference,
                do_mt_time_difference: doMTTimeDifference,
            };
        }

        return result;
    };

    const processedData = processLogData(sapData);
    const arrayOfObjects = Object.values(processedData);

    const updateTimeouts = (data) => {
        return data.map((entry) => {
            return {
                ...entry,
                so_mt_max_timeout: Util.convertMinutesToHHMMSS(entry.so_mt_max_timeout),
                do_mt_max_timeout: Util.convertMinutesToHHMMSS(entry.do_mt_max_timeout),
                so_gt_max_timeout: Util.convertMinutesToHHMMSS(entry.so_gt_max_timeout),
                do_gt_max_timeout: Util.convertMinutesToHHMMSS(entry.do_gt_max_timeout),
            };
        });
    };

    const updatedData = updateTimeouts(sapMasterData);

    const sapProcessLog = (cfaId) => {
        const sapProcess = arrayOfObjects.find((data) => data.cfa_id === cfaId);
        return sapProcess;
    };
    const sapMasterLog = (cfaId) => {
        const sapMaster = updatedData.find((data) => data.cfa_id === cfaId);
        return sapMaster;
    };

    const getGTSoBackgroundColor = (cfaId) => {
        const getprocessLog = sapProcessLog(cfaId);
        const getMasterLog = sapMasterLog(cfaId);
        if (getprocessLog.so_gt_start_time) {
            if (Util.parseDurationToMilliseconds(getprocessLog.so_gt_time_difference) > moment.duration(getMasterLog.so_gt_max_timeout, 'HH:mm:ss').asMilliseconds()) {
                return 'rgb(220,14,14)';
            }
        }
    };

    const getGTDoBackgroundColor = (cfaId) => {
        const getprocessLog = sapProcessLog(cfaId);
        const getMasterLog = sapMasterLog(cfaId);
        if (Util.parseDurationToMilliseconds(getprocessLog.do_gt_time_difference) > moment.duration(getMasterLog.do_gt_max_timeout, 'HH:mm:ss').asMilliseconds()) {
            return 'rgb(220,14,14)';
        }
    };

    const getMTSoBackgroundColor = (cfaId) => {
        const getprocessLog = sapProcessLog(cfaId);
        const getMasterLog = sapMasterLog(cfaId);
        if (getprocessLog.so_mt_start_time) {
            if (Util.parseDurationToMilliseconds(getprocessLog.so_mt_time_difference) > moment.duration(getMasterLog.so_mt_max_timeout, 'HH:mm:ss').asMilliseconds()) {
                return 'rgb(220,14,14)';
            }
        }
    };

    const getMTDoBackgroundColor = (cfaId) => {
        const getprocessLog = sapProcessLog(cfaId);
        const getMasterLog = sapMasterLog(cfaId);
        if (getprocessLog.do_mt_start_time) {
            if (Util.parseDurationToMilliseconds(getprocessLog.do_mt_time_difference) > moment.duration(getMasterLog.do_mt_max_timeout, 'HH:mm:ss').asMilliseconds()) {
                return 'rgb(220,14,14)';
            }
        }
    };

    const asteriskProcessStartTime = selectedLog[3].headerStartTime;
    const asteriskProcessEndTime = selectedLog[3].headerEndTime;

    return (
        <div>
            <Modal
                title={
                    Object.keys(sapData).length > 0
                        ? `SAP Order Process Details (Start: ${asteriskProcessStartTime.split(' ')[1] || '-'} - End: ${asteriskProcessEndTime.split(' ')[1] || '-'})`
                        : 'SAP Order Process Details'
                }
                visible={props.isSAPDetails}
                onCancel={props.hideSAPDetailsModal}
                footer={null}
                className="custom-modal-header"
                wrapClassName="comment-modal">
                <div className="distributor-table-container">
                    <table className="distributor-table">
                        <thead>
                            <tr className="form-wrapper ">
                                <th>
                                    <span>Serial No.</span>
                                </th>
                                <th>
                                    <span>CFA Name</span>
                                </th>
                                <th>
                                    <span>CFA ID</span>
                                </th>
                                <th className="sub-modal">
                                    <span>SO Amendment-MT</span>
                                </th>

                                <th className="sub-modal">
                                    <span>DO Creation-MT</span>
                                </th>

                                <th className="sub-modal">
                                    <span>SO Amendment-GT</span>
                                </th>

                                <th className="sub-modal">
                                    <span>DO Creation-GT</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(sapData).length > 0 ? (
                                Object.values(sapData).map((data, index) => {
                                    const cfaId = data['cfa_id'];
                                    return (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{data['cfa_name']}</td>
                                            <td>{data['cfa_id']}</td>
                                            <td
                                                style={{
                                                    backgroundColor: getMTSoBackgroundColor(cfaId),
                                                }}>
                                                Start: {data['so_mt_start_time'] ? data['so_mt_start_time'].split(' ')[1] : '-'}
                                                <br></br>
                                                End: {data['so_mt_end_time'] ? data['so_mt_end_time'].split(' ')[1] : '-'}{' '}
                                            </td>
                                            <td
                                                style={{
                                                    backgroundColor: getMTDoBackgroundColor(cfaId),
                                                }}>
                                                Start: {data['do_mt_start_time'] ? data['do_mt_start_time'].split(' ')[1] : '-'}
                                                <br></br>
                                                End: {data['do_mt_end_time'] ? data['do_mt_end_time'].split(' ')[1] : '-'}{' '}
                                            </td>
                                            <td
                                                style={{
                                                    backgroundColor: getGTSoBackgroundColor(cfaId),
                                                }}>
                                                Start: {data['so_gt_start_time'] ? data['so_gt_start_time'].split(' ')[1] : '-'}
                                                <br></br>
                                                End: {data['so_gt_end_time'] ? data['so_gt_end_time'].split(' ')[1] : '-'}{' '}
                                            </td>
                                            <td
                                                style={{
                                                    backgroundColor: getGTDoBackgroundColor(cfaId),
                                                }}>
                                                Start: {data['do_gt_start_time'] ? data['do_gt_start_time'].split(' ')[1] : '-'}
                                                <br></br>
                                                End: {data['do_gt_end_time'] ? data['do_gt_end_time'].split(' ')[1] : '-'}{' '}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center' }}>
                                        No data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </div>
    );
}

export default SAPOrderProcessViewModal;
