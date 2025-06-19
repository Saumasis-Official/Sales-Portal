import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { DatePicker, Space, Select, message, Tooltip } from 'antd';
import moment from 'moment';
import '../../style/admin/SessionLog.css';
import Paginator from '../../components/Paginator';
import * as Action from './actions/adminAction';
import Auth from '../../util/middleware/auth';
import Util from '../../util/helper';
import debounce from 'lodash.debounce';
import ReactExport from "react-data-export";
import Loader from '../../components/Loader';
import {pages, hasViewPermission} from '../../persona/distributorHeader.js';
import { PoweroffOutlined } from '@ant-design/icons';

const { Option } = Select;
const { RangePicker } = DatePicker;

let currentDate = (new Date())
currentDate = String(moment(currentDate).format("YYYY-MM-DD HH:mm:ss"));
let startDate = String(moment(currentDate).subtract(24, "hours").format("YYYY-MM-DD HH:mm:ss"));
let SessionLog = props => {
    const browserHistory = props.history;
    const ExcelFile = ReactExport.ExcelFile;
    const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
    const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

    const [tableData, setTableData] = useState([]);
    const [selectedType, setSelectedType] = useState("all");
    const [dateRange, setDateRange] = useState([startDate, currentDate]);
    const [formattedData, setFormattedData] = useState([]);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [search, setSearch] = useState('')
    const [showSearch, setShowSearch] = useState('')

    const debouncedSave = useRef(debounce(nextValue => setSearch(nextValue), 500)).current;

    const { sso_user_details, getSSODetails,invalidateSession } = props;
    const ssoRole = sso_user_details.data && sso_user_details.data.length && sso_user_details.data[0].roles;

    useEffect(() => {
        setFormattedData(tableData.slice(0, itemsPerPage));
    }, [tableData]);

    let fromDate = String(Util.convertDataTimeToIST(dateRange).from);
    let toDate = String(Util.convertDataTimeToIST(dateRange).to);

    useEffect(() => {getSessionLogData()},
     [dateRange, selectedType, search]);

    const handleDateChange = (dateArray) => {
        let selectedDate = [startDate, currentDate];
        if (dateArray[0]) {
            selectedDate[0] = dateArray[0];
        }
        if (dateArray[1]) {
            selectedDate[1] = dateArray[1];
        }
        setDateRange(selectedDate)
    }

    const handleTypeChange = (value) => {
        setSelectedType(value);
        if (value === "active") {
            const { fromDate, toDate } = Util.activeSessionToAndFromTimestamp();
            setDateRange([
                String(moment(fromDate).format("YYYY-MM-DD HH:mm:ss")),
                String(moment(toDate).format("YYYY-MM-DD HH:mm:ss"))
            ]);
        } else if (!(dateRange && dateRange.length)) {
            setDateRange([
                String(moment(new Date()).subtract(24, "hours").format("YYYY-MM-DD HH:mm:ss")),
                String(moment(new Date()).format("YYYY-MM-DD HH:mm:ss"))
            ]);
        }
    }
    let countUniqueIDset = new Set()
    function countUniqueID() {
        for (let i = 0; i < tableData.length; i++) {
            countUniqueIDset.add(tableData[i].login_id)
        }
    }
    
    async function handleInvalidate(data){
        let payload = {};
        payload.correlationId=data.correlation_id;
        payload.userId = data.login_id;
        payload.role = data.user_type

        try{
            const response = await invalidateSession(payload);
            if(response){
                getSessionLogData();
                Util.notificationSender("Success",response.message,response.success)
            }
            if(!response.success){
                Util.notificationSender("Error",response.message)
            }
        }
        catch(e){
            Util.notificationSender("Error",e);
        }
        
    }

    countUniqueID();
    const totalIdCount = tableData.length;
    const tableContent = (tableData, selectedType) => {
        return (
            formattedData.map((tableData, i) => {
                return (
                    <tr key={i}>
                        <td>{tableData.login_id}</td>
                        <td>{!!tableData.login_time ? `${Util.formatDate(tableData.login_time)}  ${Util.formatUtcTime(tableData.login_time)}` : "-"}</td>
                        <td>{!!tableData.logout_time ? `${Util.formatDate(tableData.logout_time)}  ${Util.formatUtcTime(tableData.logout_time)}` : "-"}</td>
                        <td>{tableData.failed_attempts_count}</td>
                        <td>{!!tableData.failed_attempt_time ? (Util.formatDate(tableData.login_time)) : "-"}</td>
                        <td>{tableData.correlation_id}</td>
                        {selectedType === "active" &&
                            <td style={{ textAlign: 'center' }}>
                                <button style={{ background: 'none', border: 'none' }} onClick={() => handleInvalidate(tableData)}>
                                    <Tooltip placement='bottom' title="Invalidate Session">
                                        <PoweroffOutlined style={{ color: 'red', fontSize: '20px' }} />
                                    </Tooltip>
                                </button>
                            </td>
                        }
                    </tr>
                )
            })
        )
    }

    const onSearch = (e) => {
        const { value } = e.target
        debouncedSave(value);
        setShowSearch(value);
    }

    useEffect(() => {
        if (!sso_user_details || !Object.keys(sso_user_details).length) {
            const adminAccessDetails = Auth.getAdminAccessDetails();
            let sso_detail = {};
            if (adminAccessDetails && Object.keys(JSON.parse(adminAccessDetails)).length > 0) {
                sso_detail = JSON.parse(adminAccessDetails);
            }
            const emailId = sso_detail && sso_detail.username && sso_detail.username.replace(process.env.REACT_APP_COGNITO_IDP_NAME, '');
            emailId && getSSODetails(emailId,props.history);;
        }
    }, [sso_user_details]);

    useEffect(() => {
        if (ssoRole && !hasViewPermission(pages.SESSION_LOGS)) {
            browserHistory.push("/admin/dashboard");
        }
    }, [ssoRole]);

    const getSessionLogData = function(){
        props.getSessionsLog({
            "from": fromDate,
            "to": toDate,
            "type": selectedType,
            "search": search ? search : ''
        }).then((response) => {
            if (response && response.data && response.data.data) {
                setTableData(response.data.data.result);
            }
            else {
                message.error("No logs found between selected dates");
                setTableData([])
            }
    })
    }

    return (
            <div className="log-wrapper">
                <div className="detail-log">
                        <div className="header-container">
                            <div className="card-row-col">
                                <h3>Session Logs</h3>
                                <h5>{totalIdCount} records found</h5>
                            </div>
                            <div className="card-row-col">
                                <h3>Unique ID Counts</h3>
                                <h5>{countUniqueIDset.size} records found</h5>
                            </div>
                            <div className="session-date-picker">
                        <Space direction="vertical" size={12}>
                            {/* RangePicker to be disabled for "active" because at present it is configured that a session can be active only for 1hr. If we allow selection of data, then data shown will be inaccurate. */}
                                    <RangePicker
                                        ranges={{
                                            Today: [moment(), moment()],
                                            'This Month': [moment().startOf('month'), moment().endOf('month')],
                                        }}
                                        showTime={{ format: 'HH:mm' }}
                                        format="YYYY-MM-DD HH:mm"
                                value={dateRange?.length ? [moment(dateRange[0]), moment(dateRange[1])] : []}
                                disabled={selectedType === "active"}
                                        onChange={(value, ds) => handleDateChange(ds)}
                                    />
                                </Space>
                            </div>
                            <div className="admin-dashboard-search session-log-search">
                                <input
                                    value={showSearch}
                                    onChange={(e) => { onSearch(e) }}
                                    type="text"
                                    className="search-fld"
                                    placeholder="Search by Login ID"
                                />
                            </div>
                            <div className="dropdown-box">
                                <label className="dropDown-label">Type</label>
                                <Select className='width120px' defaultValue={"all"} onChange={(value) => handleTypeChange(value)}>
                                    <Option value="all">All</Option>
                            <Option value="active">Active</Option>
                                    <Option value="success">Success</Option>
                                    <Option value="failure">Failure</Option>
                                </Select>
                            </div>
                        </div>

                        <div className="session-log-table new-session-log-table">
                        <Loader>
                            <table>
                                <thead className="session-logs-th">
                                    <tr>
                                        <th>Login ID</th>
                                        <th>Login Time</th>
                                        <th>Logout Time</th>
                                        <th>Failed Attempts Count</th>
                                        <th>Failed Attempt Time</th>
                                        <th>Correlation ID</th>
                                        {selectedType==="active" && <th style={{textAlign:'center'}}>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableContent(tableData, selectedType)}
                                </tbody>
                            </table>
                            </Loader>
                        </div>
                        <Paginator
                            data={tableData ? tableData : []}
                            itemsPerPage={itemsPerPage}
                            setItemsPerPage={setItemsPerPage}
                            itemsCount={tableData ? tableData.length : 0}
                            setModifiedData={(modifiedData) => {
                                setFormattedData(modifiedData);
                            }}
                        />
                        {(tableData && tableData.length > 0) &&
                            <div className="session-download-btn">
                                <ExcelFile
                                    filename={`Dist_Session_logs_${new Date().getFullYear() + '_' + (new Date().getMonth() + 1) + '_' + new Date().getDate()}`}
                                    element={<button>Download Data</button>}
                                >
                                    <ExcelSheet data={tableData} name="Session_logs">
                                        <ExcelColumn label="Login ID" value="login_id" />
                                        <ExcelColumn label="Login Time" value="login_time" />
                                        <ExcelColumn label="Logout Time" value="logout_time" />
                                        <ExcelColumn label="Failed Attempts count" value="failed_attempts_count" />
                                        <ExcelColumn label="Failed Attempt Time" value="failed_attempt_time" />
                                        <ExcelColumn label="Correlation ID" value="correlation_id" />
                                    </ExcelSheet>
                                </ExcelFile>
                            </div>
                        }
                </div>
        </div>
    )
}

const mapStateToProps = (state) => {
    return {
        sso_user_details: state.admin.get('sso_user_details'),
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        getSessionsLog: (data) => dispatch(Action.getSessionsLog(data)),
        getSSODetails: (emailId, history) => dispatch(Action.getSSODetails(emailId, history)),
        invalidateSession : (data)=>dispatch(Action.invalidateSession(data))
    }
}

const ConnectSession = connect(
    mapStateToProps,
    mapDispatchToProps
)(SessionLog)

export default ConnectSession;
