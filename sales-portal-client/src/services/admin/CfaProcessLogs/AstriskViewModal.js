import React from 'react';

import { Modal } from 'antd';
import Util from '../../../util/helper/index';
import { processColor } from './CfaProcess';
import moment from 'moment';

function AstriskViewModal(props) {
    const { astriskData, astriskMasterData, selectedLog } = props;

    function convertProcessTimes(processTimes) {
        return processTimes.map((process) => ({
            process_name: process.process_name.trim(),
            expected_run_time: Util.convertMinutesToHHMMSS(process.expected_run_time),
            max_time_out: Util.convertMinutesToHHMMSS(process.max_time_out),
        }));
    }

    const convertedProcessTimes = convertProcessTimes(astriskMasterData);

    const arrayOfObjects = Object.keys(astriskData).map((key) => {
        return {
            process_name: key,
            ...astriskData[key],
        };
    });

    const addTimeDifferences = (data) => {
        if (!data) {
            return [];
        }
        const getDifference = data.map((process) => {
            const timeDifference = Util.calTimeDifference(process.headerStartTime, process.headerEndTime);
            return {
                ...process,
                timeDifference,
            };
        });
        return getDifference;
    };

    const getColor = (processName, addTimeDifferences) => {
        const masterDetails = convertedProcessTimes.find((data) => data.process_name === processName);

        const procesLogDetails = addTimeDifferences.find((data) => data.process_name === processName);

        const timeDifference = Util.parseDurationToMilliseconds(procesLogDetails?.timeDifference);
        const maxTimeOut = moment.duration(masterDetails?.max_time_out, 'HH:mm:ss').asMilliseconds();
        const runTime = moment.duration(masterDetails?.expected_run_time, 'HH:mm:ss').asMilliseconds();

        if (!procesLogDetails?.headerStartTime && !procesLogDetails?.headerEndTime) {
            return processColor.grey;
        } else if (!procesLogDetails?.headerEndTime && procesLogDetails?.headerStartTime && timeDifference <= maxTimeOut) {
            return processColor.yellow;
        } else if (timeDifference <= runTime) {
            return processColor.green;
        } else if (timeDifference > runTime && timeDifference <= maxTimeOut) {
            return processColor.orange;
        } else if (timeDifference > maxTimeOut) {
            return processColor.red;
        }
    };

    const asteriskProcessStartTime = selectedLog[2].headerStartTime;
    const asteriskProcessEndTime = selectedLog[2].headerEndTime;

    return (
        <div>
            <Modal
                title={
                    arrayOfObjects.length > 0
                        ? `Asterisk Details (Start: ${asteriskProcessStartTime.split(' ')[1] || '-'} - End: ${asteriskProcessEndTime.split(' ')[1] || '-'})`
                        : `Asterisk Details`
                }
                visible={props.isAsteriskDetails}
                onCancel={props.hideAsteriskDetailsModal}
                footer={null}
                wrapClassName="comment-modal">
                <div className="admin-dashboard-table">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    <span>Process Name</span>
                                </th>
                                <th>
                                    <span>Timing</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {arrayOfObjects.length > 0 ? (
                                arrayOfObjects.map((process) => {
                                    const updated = addTimeDifferences(arrayOfObjects);
                                    const getbackgroundColor = getColor(process.process_name, updated);
                                    return (
                                        <tr>
                                            <td>{process.process_name}</td>
                                            <td
                                                style={{
                                                    backgroundColor: getbackgroundColor,
                                                }}>
                                                Start: {process?.headerStartTime.split(' ')[1] || '-'}
                                                <span style={{ marginLeft: '40px' }}>End: {process?.headerEndTime.split(' ')[1] || '-'}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center' }}>
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

export default AstriskViewModal;
