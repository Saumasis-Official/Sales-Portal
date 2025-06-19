import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';

import { Select, notification, Tooltip } from 'antd';
import * as Action from '../../actions/adminAction';
import Auth from '../../../../util/middleware/auth';
import '../../../../style/admin/Dashboard.css';
import Loader from '../../../../components/Loader';
import '../../Forecast/StockNormAudit.css';
import { hasViewPermission, pages } from '../../../../persona/distributorHeader';
let AdminAppSetting = props => {
    const browserHistory = props.history;
    const { app_setting_list, getAppSettingList, updateAppSetting, sso_user_details, getSSODetails, getMaintenanceRequests } = props

    const { Option } = Select;

    const [settingData, setSettingData] = useState([]);
    const [settingUpdatedData, setSettingUpdatedData] = useState([]);
    const [isEditable, setIsEditable] = useState(false);
    const [isDisable, setIsDisable] = useState(true);

    const ssoRole = sso_user_details?.data?.length && sso_user_details?.data[0]?.roles;
    const isSupportAdmin = (ssoRole === 'SUPPORT');

    const appSettingsKeyArr = [
        'STOCK_NORM',
        'SAFETY_STOCK'
    ];

    useEffect(() => {
        if (app_setting_list?.data) {
            let settingList = [];
            for (let data of app_setting_list.data) {
                if (appSettingsKeyArr.includes(data.key)) {
                    settingList.push({ ...data, disabled: true });
                }
            }
            setSettingData(settingList);
        }
    }, [app_setting_list])

    useEffect(() => {
        getAppSettingList();
        getMaintenanceRequests();
    }, []);

    const editOrCancelSettingHandler = () => {
        if (isEditable) {
            let settingList = [];
            for (let data of app_setting_list.data) {
                if (appSettingsKeyArr.includes(data.key)) {
                    settingList.push({ ...data, disabled: true })
                }
            }
            setSettingData(settingList);
            setSettingUpdatedData([]);
        }
        setIsEditable(!isEditable);
        setIsDisable(true);
    }

    const changeSelectSettingHandler = (value, feature) => {
        setIsDisable(false)
        settingData.map((data) => {
            if (data.key === feature) {
                data.value = value;
                data.disabled = false;
            }
        })
        setSettingData([...settingData]);
        setSettingUpdatedData([...settingUpdatedData, { key: feature, value }])
    }

    const formatValue = (value) => {
        //check if value is number, else return 0, also check if the value is within range of 0-100, if less than 0 then return 0, if greater than 100 then return 100 ,if value is in decimal form then return rounded value 
        if (isNaN(value)) {
            return '0';
        } else if (value < 0) {
            return '0';
        } else if (value > 100) {
            return '100';
        } else if (!Number.isInteger(+value)) {
            return Math.round(+value).toString();
        } else {
            return value.toString();
        }
    }

    const changeTextSettingHandler = (event, feature) => {
        const numericKeys = ['STOCK_NORM', 'SAFETY_STOCK'];
        const value = numericKeys.includes(feature) ? formatValue(event.target.value) : event.target.value.toUpperCase();
        setIsDisable(false)
        settingData.map((data) => {
            if (data.key === feature) {
                data.value = value;
                data.disabled = false;
            }
        })

        setSettingData([...settingData]);
        let exists = false;
        settingUpdatedData.map((data) => {
            if (data.key === feature) {
                data.value = value;
                exists = true;
            }
        });
        if (exists) setSettingUpdatedData([...settingUpdatedData]);
        else setSettingUpdatedData([...settingUpdatedData, { key: feature, value: value }]);
    }

    const changeRemarksHandler = (event, feature) => {
        setIsDisable(false)
        settingData.map((data) => {
            if (data.key === feature) {
                data.remarks = event.target.value;
            }
        })
        setSettingData([...settingData]);
        let remarkState = settingUpdatedData;
        settingUpdatedData.map((item, index) => {
            if (item.key === feature) {
                remarkState[index].remarks = event.target.value;
            }
        })
        setSettingUpdatedData(remarkState)
    }

    const saveSettingHandler = async () => {
        for (let datum of settingUpdatedData) {
            if (!datum.remarks) {
                return notification.error({
                    message: 'Error',
                    description: `Please enter remarks for feature ${datum.key}`,
                    duration: 5,
                    className: 'notification-error',
                });
            } else if (datum.remarks.trim().length < 10) {
                return notification.error({
                    message: 'Error',
                    description: `Please enter minimum 10 characters in remarks to update the feature ${datum.key}`,
                    duration: 5,
                    className: 'notification-error',
                });
            }
        }

        try {
            const res = await updateAppSetting({ app_level_configuration: settingUpdatedData });
            if (res?.data?.success) {
                getAppSettingList();
                setSettingUpdatedData([]);
                notification.success({
                    message: 'Success',
                    description: 'App settings updated successfully',
                    duration: 2,
                    className: 'notification-green',
                });
                setIsDisable(true);
                setIsEditable(false);
            } else {
                notification.error({
                    message: 'Error Occurred',
                    description: (res?.data?.message) ? res.data.message : 'Some error ocurred while updating app settings',
                    duration: 5,
                    className: 'notification-error',
                });
            }
        } catch (error) {
            notification.error({
                message: 'Technical Error',
                description: 'Some error ocurred while updating app settings',
                duration: 5,
                className: 'notification-error',
            });
        }
    }

    useEffect(() => {
        if (!sso_user_details || !Object.keys(sso_user_details).length) {
            const adminAccessDetails = Auth.getAdminAccessDetails();
            let sso_detail = {};
            if (adminAccessDetails && Object.keys(JSON.parse(adminAccessDetails)).length > 0) {
                sso_detail = JSON.parse(adminAccessDetails);
            }
            const emailId = sso_detail?.username?.replace(process.env.REACT_APP_COGNITO_IDP_NAME, '');
            emailId && getSSODetails(emailId, props.history);
        }
    }, [sso_user_details]);

    useEffect(() => {
        if (ssoRole && !hasViewPermission(pages.APP_SETTINGS)) {
            browserHistory.push("/admin/dashboard");
        }
    }, [ssoRole]);



    return (
        <>
            <div className="sn-table-container">

                <div className="admin-dashboard-table">
                    <h1></h1>
                    <table>
                        <thead className='ao-header width10'>
                            <tr>
                                <th>Tolerance levels</th>
                                <th>Value</th>
                                <th>Last updated by</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {settingData?.map((data) => {
                                return (
                                    <tr key={data.key}>
                                        <td className='app-desc'>{data.key === 'STOCK_NORM' || data.key === 'SAFETY_STOCK' ? data.key + " " + "Tolerance Factor" + " " + "(%)" : data.key}<span>{data.description ? data.description : ''}</span></td>
                                        <td>
                                            <div className='value-col'>
                                                {isEditable ?
                                                    <>
                                                        {data.field_type === "SET" ?
                                                            <Select
                                                                className='user-role-select'
                                                                value={data.value}
                                                                onChange={(val) => changeSelectSettingHandler(val, data.key)}
                                                                dropdownClassName="user-role-dropdown"
                                                            >
                                                                {data.allowed_values.map((value, index) => {
                                                                    return <Option key={index} value={value}>{value}</Option>
                                                                })}

                                                            </Select> :
                                                            <input className='value-text-fld' type='text' value={data.value} onChange={(event) => changeTextSettingHandler(event, data.key)} />
                                                        }</> :
                                                    <Tooltip placement="left" title={data.value}>{data.value}</Tooltip>
                                                }
                                            </div>
                                        </td>
                                        <td>{(data.first_name && data.last_name && data.user_id) ? `${data.first_name} ${data.last_name} (${data.user_id})` : data.updated_by}</td>
                                        <td className='remarks-value'>
                                            {!isEditable ?
                                                <>{
                                                    (!data.remarks || data.remarks.trim().length === 0) ?
                                                        '-' : <Tooltip placement="left" title={data.remarks}>{data.remarks}</Tooltip>
                                                } </> :
                                                <textarea placeholder='Please enter your remarks (minimum 10 characters)'
                                                    onChange={(e) => changeRemarksHandler(e, data.key)} disabled={data.disabled} />

                                            }
                                        </td>
                                    </tr>
                                )
                            })}

                        </tbody>
                    </table>
                </div>
                {!isSupportAdmin && <div className='btn-wrapper'>
                    <button type='button' onClick={editOrCancelSettingHandler}>{isEditable ? 'Cancel' : 'Edit'}</button>
                    <button type='button' onClick={saveSettingHandler} disabled={isDisable}>Save</button>
                </div>}
                {/*  <Panigantion
                        data={userList ? userList : []}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        itemsCount={tse_user_list && tse_user_list.data && tse_user_list.data.totalCount}
                        setModifiedData={onChangePage}
                    />  */}
            </div>
        </>
    )
}

const mapStateToProps = (state) => {
    return {
        app_setting_list: state.admin.get('app_setting_list'),
        sso_user_details: state.admin.get('sso_user_details'),
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        getMaintenanceRequests: () =>
            dispatch(Action.getMaintenanceRequests()),
        getAppSettingList: () =>
            dispatch(Action.getAppSettingList()),
        updateAppSetting: (data) =>
            dispatch(Action.updateAppSetting(data)),
        getSSODetails: (emailId, history) =>
            dispatch(Action.getSSODetails(emailId, history)),
    }
}

const StockTolerance = connect(
    mapStateToProps,
    mapDispatchToProps
)(AdminAppSetting)


export default StockTolerance;