import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import * as Action from '../actions/adminAction';
import { Select } from 'antd';
import { status } from '../../../config/constant';
import { hasEditPermission, pages } from '../../../persona/distributorHeader';
import Util from '../../../util/helper';

function Maintenance(props) {
    const [maintenancedetails, setMaintenanceDetails] = useState({});
    const [addorupdatemaintenance, setAddorupdatemaintenance] = useState({});
    const { addNewMaintenance, updateMaintenanceStatus, getMaintenanceRequests } = props;

    const datetime = new Date().toLocaleString();
    const [maintenancemode, setMaintenanceMode] = useState('OPEN');
    const [remark, setRemark] = useState(true);
    const [isEditable, setIsEditable] = useState(false);
    const [isEditableforSave, setIsEditableforSave] = useState(true);
    const [startAndEndDateTime, setStartAndEndDateTime] = useState({
        start_date_time: '',
        end_date_time: '',
    });
    let user_id = window.localStorage.getItem('user_id') ? window.localStorage.getItem('user_id') : null;
    let first_name = window.localStorage.getItem('SSOUserName') ? window.localStorage.getItem('SSOUserName').split(' ')[0] : null;
    async function editOrCancelSettingHandler() {
        if (isEditable == true) {
            setIsEditable(false);
            setIsEditableforSave(true);
            setRemark(true);
        } else {
            setIsEditable(true);
        }
    }

    async function handleMaintenanceMode(mode) {
        setRemark(false);
        setMaintenanceMode(mode);
        setAddorupdatemaintenance({ ...addorupdatemaintenance, status: mode, id: maintenancedetails.id, remark: '' });
        setIsEditableforSave(false);
    }

    async function saveSettingHandler() {
        if (maintenancemode == 'OPEN') {
            if (addorupdatemaintenance.duration < 0) {
                Util.notificationSender('Error', 'Negative duration not allowed', false);
                return;
            }
            await addNewMaintenance(addorupdatemaintenance);
            setRemark(true);
            setIsEditable(false);
            setIsEditableforSave(true);
            getallmaintenancestatus();
        } else {
            await updateMaintenanceStatus(addorupdatemaintenance);
            setRemark(true);
            setIsEditable(false);
            setIsEditableforSave(true);
            getallmaintenancestatus();
        }
    }

    async function getallmaintenancestatus() {
        const response = await getMaintenanceRequests();
        if (response.data) {
            if (response.data.length > 0) {
                setMaintenanceDetails(response.data[0]);
                setStartAndEndDateTime({
                    start_date_time: new Date(`${response.data[0].start_date_time}`).toLocaleString(),
                    end_date_time: new Date(`${response.data[0].end_date_time}`).toLocaleString(),
                });
            }
        }
    }

    useEffect(() => {
        getallmaintenancestatus();
    }, []);

    return (
        <div className="log-wrapper">
            <div className="detail-log">
                <div className="header-container">
                    <div className="card-row-col">
                        <h1>Maintenance</h1>
                    </div>
                </div>
                <div className="admin-dashboard-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>Status</th>
                                <th>Expected Duration(min)</th>
                                {isEditable == false ? (
                                    maintenancedetails.status == 'OPEN' ? (
                                        <th>Start</th>
                                    ) : (
                                        <th>End</th>
                                    )
                                ) : remark == true ? (
                                    maintenancedetails.status == 'OPEN' ? (
                                        <th>Start</th>
                                    ) : (
                                        <th>End</th>
                                    )
                                ) : maintenancemode == 'OPEN' ? (
                                    <th>Start</th>
                                ) : (
                                    <th>End</th>
                                )}
                                <th>Last updated by</th>
                                <th>Remark</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr>
                                <td>Maintenance Mode</td>
                                {isEditable == false ? (
                                    <td>{maintenancedetails.status == 'OPEN' ? 'ON' : 'OFF'}</td>
                                ) : (
                                    <td>
                                        <Select
                                            defaultValue="Select Mode"
                                            style={{
                                                width: 120,
                                            }}
                                            className="user-role-select"
                                            dropdownClassName="user-role-dropdown"
                                            onChange={handleMaintenanceMode}
                                            options={status.map((valuess) => ({
                                                label: valuess.label,
                                                value: valuess.value,
                                            }))}
                                        />
                                    </td>
                                )}
                                {isEditable == false ? (
                                    maintenancedetails.status == 'OPEN' ? (
                                        <td>{maintenancedetails.duration}</td>
                                    ) : (
                                        <td>{maintenancedetails.duration}</td>
                                    )
                                ) : remark == true ? (
                                    <td>{maintenancedetails.duration}</td>
                                ) : maintenancemode == 'OPEN' ? (
                                    <td>
                                        <input
                                            style={{ width: '69px' }}
                                            type="number"
                                            placeholder="Duration in minute"
                                            onChange={(e) => {
                                                setAddorupdatemaintenance({ ...addorupdatemaintenance, duration: e.target.value });
                                            }}
                                        />
                                    </td>
                                ) : (
                                    <td>
                                        <input type="number" placeholder="Duration in minute" disabled={true} style={{ width: '69px' }} />
                                    </td>
                                )}

                                {isEditable == false ? (
                                    maintenancedetails.status == 'OPEN' ? (
                                        <td>{Util.formatDateTime(startAndEndDateTime.start_date_time, 'MM/DD/YYYY, hh:mm:ss A')}</td>
                                    ) : (
                                        <td>{Util.formatDateTime(startAndEndDateTime.end_date_time, 'MM/DD/YYYY, hh:mm:ss A')}</td>
                                    )
                                ) : remark == true ? (
                                    maintenancedetails.status == 'OPEN' ? (
                                        <td>{Util.formatDateTime(startAndEndDateTime.start_date_time, 'MM/DD/YYYY, hh:mm:ss A')}</td>
                                    ) : (
                                        <td>{Util.formatDateTime(startAndEndDateTime.end_date_time, 'MM/DD/YYYY, hh:mm:ss A')}</td>
                                    )
                                ) : maintenancemode == 'OPEN' ? (
                                    <td>{Util.formatDateTime(datetime, 'MM/DD/YYYY, hh:mm:ss A')}</td>
                                ) : (
                                    <td>{Util.formatDateTime(datetime, 'MM/DD/YYYY, hh:mm:ss A')}</td>
                                )}

                                {isEditable == false ? (
                                    <td>
                                        {maintenancedetails.user_name} ({maintenancedetails.user_id}){' '}
                                    </td>
                                ) : remark == true ? (
                                    <td>
                                        {maintenancedetails.user_name} ({maintenancedetails.user_id}){' '}
                                    </td>
                                ) : (
                                    <td>
                                        {first_name}({user_id})
                                    </td>
                                )}

                                {isEditable == false ? (
                                    <td>{maintenancedetails.remark == '' || maintenancedetails.remark == null ? '-' : maintenancedetails.remark}</td>
                                ) : (
                                    <td>
                                        <textarea
                                            placeholder="Please enter your remarks"
                                            onChange={(e) => {
                                                setAddorupdatemaintenance({ ...addorupdatemaintenance, remark: e.target.value });
                                            }}
                                            disabled={remark}
                                        />
                                    </td>
                                )}
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="btn-wrapper">
                    {hasEditPermission(pages.MAINTENANCE) && (
                        <button type="button" onClick={editOrCancelSettingHandler}>
                            {isEditable ? 'Cancel' : 'Edit'}
                        </button>
                    )}
                    <button type="button" onClick={saveSettingHandler} disabled={isEditableforSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

const mapStateToProps = (state, ownProps) => {
    return {
        get_maintenance_mode: state.admin.get('get_maintenance_mode'),
    };
};

const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getMaintenanceRequests: () => dispatch(Action.getMaintenanceRequests()),

        addNewMaintenance: (data) => dispatch(Action.addNewMaintenance(data)),

        updateMaintenanceStatus: (data) => dispatch(Action.updateMaintenanceStatus(data)),
    };
};

const UpdateMaintenance = connect(mapStateToProps, mapDispatchToProps)(Maintenance);

export default UpdateMaintenance;
