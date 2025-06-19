import './CfaProcess.css';
import { RightOutlined, MinusOutlined } from '@ant-design/icons';
import * as AdminActions from '../actions/adminAction';
import { connect } from 'react-redux';
import React, { useState, useEffect } from 'react';
import { DatePicker, Select } from 'antd';
import moment from 'moment';
import AstriskViewModal from './AstriskViewModal';
import SAPOrderProcessViewModal from './SAPOrderProcessViewModal';
import Util from '../../../util/helper/index';
import { SAP_ORDER_PROCESS_DELAY } from '../../../config/constant';
import { Tooltip } from 'antd';
import { CFA_CHANNELS } from '../../../config/constant';

const { Option } = Select;
let currentDate = new Date();
currentDate = String(moment(currentDate).format('YYYY-MM-DD'));

export const processColor = {
    red: 'rgb(220,14,14)',
    yellow: '#eeee0bab',
    green: 'rgb(84, 181, 11)',
    orange: '#ee7814',
    grey: 'rgb(158, 147, 147)',
    white: 'white',
};

const CfaProcess = (props) => {
    const { getCfaProcessFlow } = props;

    const [masterData, setMasterData] = useState({});
    const [selectedDate, setSelectedDate] = useState('');
    const [logResult, setProcesslogResult] = useState([]);
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [isSapPopupVisible, setSapIsPopupVisible] = useState(false);
    const [astriskData, setAstriskData] = useState({});
    const [sapData, setSapData] = useState([]);
    const [selectedLog, setSelectedLog] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [channel, setChannel] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filteredData, setFilteredData] = useState([]);
    const [visibleDivs, setVisibleDivs] = useState(null);
    const [errorData, setErrorData] = useState([]);
    const [filteredErrorData, setFilteredErrorData] = useState([]);

    const cardData = [
        { title: 'Total SO', key: 'FINAL_SO' },
        { title: 'Allotted SO', key: 'FINAL_ALLOTTED_SO' },
        { title: 'DO Created', key: 'FINAL_DO_CREATED' },
        { title: 'DO Failed', key: 'FINAL_DO_FAILED' },
        { title: '% DO Conversion', key: 'FINAL_DO_CONV' },
        { title: 'Manual DO Created', key: 'MANUAL_DO_COUNT' },
        { title: 'Total SO(in CV)', key: 'FINAL_SO_CV' },
        { title: 'Allotted SO(in CV)', key: 'FINAL_ALLOTTED_SO_CV' },
        { title: 'DO Created(in CV)', key: 'FINAL_DO_CREATED_CV' },
        { title: 'DO failed(in CV)', key: 'FINAL_DO_FAILED_CV' },
        { title: '% DO Conversion(in CV)', key: 'FINAL_DO_CONV_CV' },
        // { title: 'Manual DO Created(in CV)', key: 'FINAL_MANUAL_DO_CV' },
    ];

    useEffect(() => {
        const queryParams = {
            queryParams: {
                start_date: selectedDate || currentDate,
                channel: channel || [],
            },
        };
        getCfaProcessFlow(queryParams).then((response) => {
            if (response && response.success == true) {
                const { log_result, masters, table_data, errorData } = response.data;
                setProcesslogResult(log_result);
                setMasterData(masters);
                const doStats = table_data?.do_stats;
                setTableData(doStats);
                const errorTableData = errorData?.errorLogs;
                setErrorData(errorTableData);
            } else {
                setProcesslogResult([]);
                setMasterData({});
            }
        });
    }, [selectedDate, channel]);

    useEffect(() => {
        if (tableData && tableData.length > 0) {
            setFilteredData(tableData[selectedIndex]);
        }
        if (errorData && errorData.length > 0) {
            setFilteredErrorData(errorData[selectedIndex]);
        }
    }, [tableData, selectedIndex, errorData]);

    const handleDateChange = (data) => {
        setSelectedDate(data);
        setVisibleDivs(null);
    };

    const disabledDate = (current) => {
        return current && (current < moment().subtract(30, 'days').startOf('day') || current > moment().endOf('day'));
    };

    const showPopup = () => {
        setIsPopupVisible(true);
    };
    const showSapPopUp = () => {
        setSapIsPopupVisible(true);
    };

    const hidePopup = () => {
        setIsPopupVisible(false);
    };
    const hideSapPopup = () => {
        setSapIsPopupVisible(false);
    };

    function astPop(e, arrayIndex) {
        const name = e.target?.id;
        if (name === masterData.processMaster[2].process_name) {
            const headerDetails = logResult[arrayIndex].find((f) => f.header === masterData.processMaster[2].process_name).headerDetails;
            const selectedLog = logResult[arrayIndex];
            setSelectedLog(selectedLog);
            setAstriskData(headerDetails);
            showPopup();
        } else if (name === masterData.processMaster[3].process_name) {
            const headerDetails = logResult[arrayIndex].find((f) => f.header === masterData.processMaster[3].process_name).headerDetails;
            const selectedLog = logResult[arrayIndex];
            setSelectedLog(selectedLog);
            setSapData(headerDetails);
            showSapPopUp();
        }
    }

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

    const convertMasterDataTimes = (processMaster) => {
        if (!processMaster) {
            return [];
        }
        return processMaster.map((process) => {
            return {
                ...process,
                run_time: Util.convertMinutesToHHMMSS(process.run_time),
                max_timeout: Util.convertMinutesToHHMMSS(process.max_timeout),
            };
        });
    };
    const getProcessMasterTimeConversion = convertMasterDataTimes(masterData.processMaster);

    const process5minDelay = Util.convertMinutesToHHMMSS(SAP_ORDER_PROCESS_DELAY);

    const getColor = (processName, addTimeDifferences, index) => {
        const masterDetails = getProcessMasterTimeConversion.find((data) => data.process_name === processName);

        const procesLogDetails = addTimeDifferences.find((data) => data.header === processName);

        const final = (masterDetails, procesLogDetails) => {
            if (index >= 2) {
                const previousLogDetails = addTimeDifferences[index - 1];
                const currentLogDetails = addTimeDifferences[index];

                const currentProcessStartTime = moment.duration(currentLogDetails?.headerStartTime?.split(' ')[1], 'HH:mm:ss').asMilliseconds();

                const previouslofEndTime = moment.duration(previousLogDetails?.headerEndTime.split(' ')[1], 'HH:mm:ss').asMilliseconds();

                const fivemindelayDiff =
                    currentProcessStartTime > previouslofEndTime ? Util.calTimeDifference(previousLogDetails?.headerEndTime, currentLogDetails?.headerStartTime) : 0;

                const areBothTimesPresent = previousLogDetails.headerEndTime && currentLogDetails.headerStartTime ? true : false;

                const startTime = moment(procesLogDetails?.headerStartTime, 'DD.MM.YYYY HH:mm:ss');

                const maxTime = moment.duration(masterDetails?.max_timeout, 'HH:mm:ss').asMilliseconds();

                const timeDiff = Util.parseDurationToMilliseconds(procesLogDetails?.timeDifference);

                const delayDiff = Util.parseDurationToMilliseconds(fivemindelayDiff);

                if (startTime) {
                    if (areBothTimesPresent && delayDiff > moment.duration(process5minDelay, 'HH:mm:ss').asMilliseconds()) {
                        return processColor.red;
                    } else if (!procesLogDetails?.headerEndTime && procesLogDetails?.headerStartTime && timeDiff <= maxTime) {
                        return processColor.yellow;
                    } else if (
                        procesLogDetails?.headerEndTime &&
                        procesLogDetails?.headerStartTime &&
                        timeDiff <= moment.duration(masterDetails?.run_time, 'HH:mm:ss').asMilliseconds()
                    ) {
                        return processColor.green;
                    } else if (timeDiff > maxTime) {
                        return processColor.red;
                    } else if (timeDiff > moment.duration(masterDetails?.run_time, 'HH:mm:ss').asMilliseconds() && timeDiff <= maxTime) {
                        return processColor.orange;
                    } else if (procesLogDetails?.headerStartTime === '-' && procesLogDetails?.headerEndTime === '-') {
                        return processColor.white;
                    } else {
                        return processColor.grey;
                    }
                }
            } else {
                const startTime = moment(procesLogDetails?.headerStartTime, 'DD.MM.YYYY HH:mm:ss');

                const maxTime = moment.duration(masterDetails?.max_timeout, 'HH:mm:ss').asMilliseconds();

                const timeDiff = Util.parseDurationToMilliseconds(procesLogDetails?.timeDifference);

                if (startTime) {
                    if (!procesLogDetails?.headerEndTime && procesLogDetails?.headerStartTime && timeDiff <= maxTime) {
                        return processColor.yellow;
                    } else if (
                        procesLogDetails?.headerEndTime &&
                        procesLogDetails?.headerStartTime &&
                        timeDiff <= moment.duration(masterDetails?.run_time, 'HH:mm:ss').asMilliseconds()
                    ) {
                        return processColor.green;
                    } else if (timeDiff > maxTime) {
                        return processColor.red;
                    } else if (timeDiff > moment.duration(masterDetails?.run_time, 'HH:mm:ss').asMilliseconds() && timeDiff <= maxTime) {
                        return processColor.orange;
                    } else if (procesLogDetails?.headerStartTime === '-' && procesLogDetails?.headerEndTime === '-') {
                        return processColor.white;
                    }
                } else {
                    return processColor.grey;
                }
            }
        };
        const result = final(masterDetails, procesLogDetails);
        return result;
    };

    const handleButtonClick = (index) => {
        setChannel('');
        setVisibleDivs((prevIndex) => (prevIndex === index ? null : index));
        setSelectedIndex(index);
        setTimeout(() => {
            const element = document.getElementById(`data-table-${index}`);
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
        }, 0);
    };

    const handleChange = (value) => {
        setChannel(value);
    };

    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    <div className="admin-dashboard-head">
                        <h2>CFA Dashboard</h2>
                        <div style={{ display: 'flex' }}>
                            {logResult?.length > 0 && (
                                <div className="color-index-container">
                                    <p style={{ marginTop: '3px' }}>Color Index : </p>

                                    <Tooltip placement="bottom" title="Not Started">
                                        <div
                                            className="info-circle"
                                            style={{
                                                backgroundColor: processColor.grey,
                                            }}></div>
                                    </Tooltip>
                                    <Tooltip placement="bottom" title="In progress">
                                        <div
                                            className="info-circle"
                                            style={{
                                                backgroundColor: processColor.yellow,
                                            }}></div>
                                    </Tooltip>
                                    <Tooltip placement="bottom" title="Completed before expected run time">
                                        <div
                                            className="info-circle"
                                            style={{
                                                backgroundColor: processColor.green,
                                            }}></div>
                                    </Tooltip>
                                    <Tooltip placement="bottom" title="Completed between expected run time and max out time">
                                        <div
                                            className="info-circle"
                                            style={{
                                                backgroundColor: processColor.orange,
                                            }}></div>
                                    </Tooltip>
                                    <Tooltip
                                        placement="bottom"
                                        title={
                                            <>
                                                <div>Case 1: Process has not completed till max out time</div>
                                                <div>Case 2: Delay between start of a process and end of previous process is more than 5 mins</div>
                                            </>
                                        }>
                                        <div
                                            className="info-circle"
                                            style={{
                                                backgroundColor: processColor.red,
                                            }}></div>
                                    </Tooltip>
                                    <Tooltip placement="bottom" title="Work flow not started">
                                        <div
                                            className="info-circle"
                                            style={{
                                                backgroundColor: processColor.white,
                                            }}></div>
                                    </Tooltip>
                                </div>
                            )}

                            <DatePicker placeholder={currentDate} style={{ width: '200px' }} onChange={handleDateChange} disabledDate={disabledDate} />
                        </div>
                    </div>

                    {logResult?.length === 0 ? (
                        <div className="no-data-text">
                            <h2 style={{ textAlign: 'center' }}>No logs available for the selected date.</h2>
                        </div>
                    ) : (
                        <>
                            {logResult?.map((array, arrayIndex) => (
                                <>
                                
                                        <div className="process-flow-container">
                                            <div key={arrayIndex} className="process-container">
                                            <div style={{ display: 'flex' }}>
                                                
                                                    {array.map((process, index) => {
                                                        const updated = addTimeDifferences(array);

                                                        const getbackgroundColor = getColor(process.header, updated, index);

                                                        return (
                                                            <div key={index} style={{ marginBottom: '10px' }}>
                                                                <div style={{ marginTop: '10px' }}>
                                                                    <p
                                                                        style={{
                                                                            margin: '0px',
                                                                        }}>
                                                                        Start: {process?.headerStartTime ? process.headerStartTime.split(' ')[1] : '-'}
                                                                    </p>
                                                                    <p
                                                                        style={{
                                                                            margin: '0px',
                                                                        }}>
                                                                        End: {process?.headerEndTime ? process.headerEndTime.split(' ')[1] : '-'}
                                                                    </p>
                                                                </div>

                                                                <div style={{ marginTop: '10px' }}>
                                                                    <div style={{ display: 'flex' }}>
                                                                        <Tooltip placement="bottom" title={process.headerDetails ? 'Click here for more details' : ''}>
                                                                            <div
                                                                                className="style-circle"
                                                                                id={process.header}
                                                                                name={process.header}
                                                                                onClick={(e) => astPop(e, arrayIndex)}
                                                                                style={{
                                                                                    backgroundColor: getbackgroundColor,
                                                                                    cursor: process.headerDetails ? 'pointer' : ' ',
                                                                                }}></div>
                                                                        </Tooltip>
                                                                        {index !== array.length - 1 && (
                                                                            <>
                                                                                <div>
                                                                                    <MinusOutlined className="minus-icon" />
                                                                                </div>
                                                                                <RightOutlined className="right-arrow" />
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className="process-name">{process?.header}</p>
                                                            </div>
                                                        );
                                                    })}
                                                    <div>
                                                        {isPopupVisible && (
                                                            <>
                                                                <AstriskViewModal
                                                                    astriskMasterData={masterData?.asteriskProcessMaster}
                                                                    astriskData={astriskData}
                                                                    selectedLog={selectedLog}
                                                                    isAsteriskDetails={showPopup}
                                                                    hideAsteriskDetailsModal={hidePopup}></AstriskViewModal>
                                                            </>
                                                        )}
                                                        {isSapPopupVisible && (
                                                            <div className="sapModal">
                                                                <SAPOrderProcessViewModal
                                                                    sapData={sapData}
                                                                    sapMasterData={masterData?.sapAmendmentProcessMaster}
                                                                    selectedLog={selectedLog}
                                                                    isSAPDetails={showSapPopUp}
                                                                    hideSAPDetailsModal={hideSapPopup}></SAPOrderProcessViewModal>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <button className="hide-data-btn" onClick={() => handleButtonClick(arrayIndex)}>
                                                    {' '}
                                                    {visibleDivs === arrayIndex ? 'Hide Data Tables' : 'Show Data Tables'}
                                                </button>
                                            </div>
                                            <div style={{ marginRight: '10px' }} id={`data-table-${arrayIndex}`}>
                                                <div style={{ backgroundColor: 'white' }}>
                                                    {visibleDivs === arrayIndex && (
                                                        <div style={{ minHeight: '100px' }}>
                                                            <div className="small-cards">
                                                                <Select
                                                                    mode="multiple"
                                                                    style={{ width: '140px' }}
                                                                    placeholder="Select Channel"
                                                                    allowClear
                                                                    onChange={handleChange}
                                                                    defaultValue={['GT', 'MT']}>
                                                                    {CFA_CHANNELS.map((channel) => (
                                                                        <Option key={channel} value={channel}>
                                                                            {channel}
                                                                        </Option>
                                                                    ))}
                                                                </Select>

                                                                <div className="cards-div">
                                                                    {filteredData &&
                                                                        filteredData.length > 1 &&
                                                                        cardData.map((card, index) => (
                                                                            <div className="single-card" key={index}>
                                                                                <h5>{card.title}</h5>
                                                                                <h5>
                                                                                    {filteredData[filteredData.length - 1][card.key]??0}
                                                                                    {card.key === 'FINAL_DO_CONV' ? '%' : ''}
                                                                                </h5>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>

                                                            <div className="cfa-table-container">
                                                             
                                                                <table>
                                                                    <thead>
                                                                        <tr>
                                                                            <th>CFA NAME (CODE)</th>
                                                                            <th>Total SO</th>
                                                                            <th>Allotted SO</th>
                                                                            <th>DO Created</th>
                                                                            <th>DO Failed</th>
                                                                            <th>% DO Conv</th>
                                                                            <th>Total SO CV</th>
                                                                            <th>Allotted SO CV</th>
                                                                            <th>DO Created CV</th>
                                                                            <th>% DO Conv CV</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {filteredData && filteredData.length > 1 ? (
                                                                            <>
                                                                                {filteredData.slice(0, filteredData.length - 1).map((data, index) => (
                                                                                    <tr key={index}>
                                                                                        <td>
                                                                                            {data.CFA_NAME} ({data.CFA_CODE})
                                                                                        </td>
                                                                                        <td>{data.TOTAL_SO_SUM??'-'}</td>
                                                                                        <td>{data.ALLOTTED_SO_SUM??'-'}</td>
                                                                                        <td>{data.DO_CREATED_SUM??'-'}</td>
                                                                                        <td>{data.DO_FAILED??'-'}</td>
                                                                                        <td>{data.DO_CONVERSION??'-'}%</td>
                                                                                        <td>{data.TOTAL_SO_CV??'-'}</td>
                                                                                        <td>{data.ALLOTTED_SO_CV??'-'}</td>
                                                                                        <td>{data.DO_CREATED_CV??'-'}</td>
                                                                                        <td>{data.DO_CONVERSION_CV ? `${data.DO_CONVERSION_CV}%` :'-'}</td>
                                                                                    </tr>
                                                                                ))}
                                                                                <tr className="fixed-row">
                                                                                    <td>Total</td>
                                                                                    <td>{filteredData[filteredData.length - 1].FINAL_SO}</td>
                                                                                    <td>{filteredData[filteredData.length - 1].FINAL_ALLOTTED_SO}</td>
                                                                                    <td>{filteredData[filteredData.length - 1].FINAL_DO_CREATED}</td>
                                                                                    <td>{filteredData[filteredData.length - 1].FINAL_DO_FAILED}</td>
                                                                                    <td>{filteredData[filteredData.length - 1].FINAL_DO_CONV}%</td>
                                                                                    <td>{filteredData[filteredData.length - 1].FINAL_SO_CV}</td>
                                                                                    <td>{filteredData[filteredData.length - 1].FINAL_ALLOTTED_SO_CV}</td>
                                                                                    <td>{filteredData[filteredData.length - 1].FINAL_DO_CREATED_CV}</td>
                                                                                    <td>{filteredData[filteredData.length - 1].FINAL_DO_CONV_CV}%</td>
                                                                                </tr>
                                                                            </>
                                                                        ) : (
                                                                            <tr>
                                                                                <td
                                                                                    colSpan="10"
                                                                                    className="no-table-data-text"
                                                                                    style={{
                                                                                        textAlign: 'center',
                                                                                    }}>
                                                                                    No data available.
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                               
                                                            </div>

                                                            <div className="cfa-table-container">
                                                               
                                                                <table>
                                                                    <thead>
                                                                        <tr>
                                                                            <th className="cfa-sub-header">Error Text</th>
                                                                            <th className="cfa-sub-header">Sum of Count</th>
                                                                            <th className="cfa-sub-header">Contribution %</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {filteredErrorData && filteredErrorData.length > 1 ? (
                                                                            <>
                                                                                {filteredErrorData.slice(0, filteredErrorData.length - 1).map((data, index) => (
                                                                                    <tr key={index}>
                                                                                        <td>{data?.ERROR_TEXT1}</td>
                                                                                        <td>{data?.COUNT}</td>
                                                                                        <td>{data?.CONTRIBUTION} %</td>
                                                                                    </tr>
                                                                                ))}
                                                                                <tr className="fixed-row">
                                                                                    <td>Total</td>
                                                                                    <td>{filteredErrorData[filteredErrorData.length - 1].total}</td>
                                                                                    <td>{filteredErrorData[filteredErrorData.length - 1].contribution} %</td>
                                                                                </tr>
                                                                            </>
                                                                        ) : (
                                                                            <tr>
                                                                                <td
                                                                                    colSpan="3"
                                                                                    className="no-table-data-text"
                                                                                    style={{
                                                                                        textAlign: 'center',
                                                                                    }}>
                                                                                    No data available.
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                                
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <br></br>
                                        </div>
                                 
                                </>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

const mapStateToProps = () => {
    return {};
};

const mapDispatchToProps = (dispatch) => {
    return {
        getCfaProcessFlow: (data) => dispatch(AdminActions.getCfaProcessFlow(data)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(CfaProcess);
