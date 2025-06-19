import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';

import { Select, Tooltip } from 'antd';
import * as Action from '../../actions/adminAction';
import Auth from '../../../../util/middleware/auth';
import '../../../../style/admin/Dashboard.css';
import '../../Forecast/StockNormAudit.css';
import { hasViewPermission, pages } from '../../../../persona/distributorHeader';
import Util from '../../../../util/helper';

let AdminAppSetting = props => {

    const browserHistory = props.history;
    const { sso_user_details, getSSODetails, getMaintenanceRequests, fetchArsConfigurations, updateArsConfigurations } = props

    const { Option } = Select;
    const ssoRole = sso_user_details?.data?.length && sso_user_details?.data[0]?.roles;
    const isSupportAdmin = (ssoRole.includes('SUPPORT'));

    //-----------------------------------------------------=====useState=====-------------------------------------------------------
    const [settingData, setSettingData] = useState([]);
    const [isEditable, setIsEditable] = useState(false);
    const [isDisable, setIsDisable] = useState(true);

    //-----------------------------------------------------=====useRef=====---------------------------------------------------------


    //-----------------------------------------------------=====useEffect=====------------------------------------------------------

    useEffect(() => {
        getArsGeneralSettings();
        getMaintenanceRequests();
    }, []);

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

    //-----------------------------------------------------=====API Calls=====------------------------------------------------------

    async function getArsGeneralSettings() {
        try {
            const res = await fetchArsConfigurations(['GENERAL']);
            if (res?.success) {
                res?.data?.forEach(i => i.disabled = true);
                setSettingData(res?.data);
                setIsEditable(false);
                setIsDisable(true);
            }
        } catch (error) {
            console.log(error);
        }
    };

    const saveSettingHandler = async () => {
        const updatedData = settingData?.filter(i => i.disabled === false);
        const isValid = validateData(updatedData);
        if (isValid) {
            const payload = updatedData.map(i => {
                return {
                    id: i.id,
                    values: i.values,
                    remarks: i.remarks
                }
            });
            updateArsConfigurations({ data: payload })
                .then(res => {
                    if (res.success) {
                        Util.notificationSender('Success', 'Settings updated successfully', true);
                    } else {
                        Util.notificationSender('Error', 'Failed to update settings', false);
                    }
                })
                .catch(() => {
                    Util.notificationSender('Technical Error', 'Failed to update settings', false);
                })
                .finally(() => {
                    getArsGeneralSettings();
                });

        } else {
            getArsGeneralSettings();
        }
        setIsDisable(false);
        setIsEditable(true);
    };

    //-----------------------------------------------------=====Helpers=====--------------------------------------------------------
    const formatValue = (value, applyCap = true, min = 0, max = 100) => {
        /**
         * if applyCap = true, then min and max will be applied to the value
         */
        /**
         * check if value is number, else return 0
         * check if the value is within range of 0-100
         * if less than 0 then return 0
         * if greater than 100 then return 100
         * if value is in decimal form then return rounded value
         */
        if (isNaN(value)) {
            return '0';
        } else if (applyCap && value < 0) {
            return min.toString();
        } else if (applyCap && value > 100) {
            return max.toString();
        } else if (!Number.isInteger(+value)) {
            return Math.round(+value).toString();
        } else {
            return value.toString();
        }
    };

    const validateData = (data) => {
        const errors = new Set();
        let isValid = true;
        if (data?.length > 0) {
            data.forEach((item) => {
                if (!item.values) {
                    errors.push(`Please enter a value for ${item.key}`);
                    isValid = false;
                }
                if (item.remarks && item.remarks.trim().length < 5) {
                    errors.push(`Please enter minimum 5 characters in remarks for ${item.key}`);
                    isValid = false;
                }
            });
        } else {
            isValid = false;
            errors.add('No change found to Save');
        }

        if (!isValid) {
            errors.forEach(error => {
                Util.notificationSender('Validation Error', error, false);
            });
        }

        return isValid;
    }

    //-----------------------------------------------------=====Event Handlers=====-------------------------------------------------

    const editOrCancelSettingHandler = () => {
        if (isEditable) {
            getArsGeneralSettings();
        }
        setIsEditable(!isEditable);
        setIsDisable(true);
    }

    const changeSelectSettingHandler = (value, feature) => {
        setIsDisable(false)
        settingData.map((data) => {
            if (data.key === feature) {
                data.values = value;
                data.disabled = false;
            }
        })
        setSettingData([...settingData]);
    }

    const changeTextSettingHandler = (event, feature) => {
        const numericKeys = ['QUANTITY_NORM_DEFAULT_VALUE'];
        const cappedNumericKeys = ['STOCK_NORM', 'SAFETY_STOCK']        // keys for whom upper and lower limits are fixed
        let value = "";
        if (cappedNumericKeys.includes(feature)) {
            value = formatValue(event.target.value);
        } else if (numericKeys.includes(feature)) {
            value = formatValue(event.target.value, false)
        } else {
            value = event.target.value.toUpperCase();
        }
        settingData.map((data) => {
            if (data.key === feature) {
                data.values = value;
                data.disabled = false;
            }
        })

        setIsDisable(false)
        setSettingData([...settingData]);
    }

    const changeRemarksHandler = (event, feature) => {
        setIsDisable(false)
        settingData.map((data) => {
            if (data.key === feature) {
                data.remarks = event.target.value;
            }
        })
        setSettingData([...settingData]);
    }



    //-----------------------------------------------------=====Render=====---------------------------------------------------------

    return (
        <>
            <div className="sn-table-container">

                <div className="admin-dashboard-table">
                    {/* <h1></h1> */}
                    <table>
                        <thead className='ao-header width10'>
                            <tr>
                                <th>Feature</th>
                                <th>Value</th>
                                <th>Last updated by</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {settingData?.map((data) => {
                                return (
                                    <tr key={data.key}>
                                        <td className='app-desc'>{data.key}<span>{data.description ? data.description : ''}</span></td>
                                        <td>
                                            <div className='value-col'>
                                                {isEditable ?
                                                    <>
                                                        {data.field_type === "SET" ?
                                                            <Select
                                                                className='user-role-select'
                                                                value={data.values}
                                                                onChange={(val) => changeSelectSettingHandler(val, data.key)}
                                                                dropdownClassName="user-role-dropdown"
                                                            >
                                                                {data.allowed_values.map((value, index) => {
                                                                    return <Option key={index} value={value}>{value}</Option>
                                                                })}

                                                            </Select> :
                                                            <input className='value-text-fld' type='text' value={data.values} onChange={(event) => changeTextSettingHandler(event, data.key)} />
                                                        }</> :
                                                    <Tooltip placement="left" title={data.values}>{data.values}</Tooltip>
                                                }
                                            </div>
                                        </td>
                                        <td>{(data.first_name && data.last_name && data.updated_by) ? `${data.first_name} ${data.last_name} (${data.updated_by})` : data.updated_by}</td>
                                        <td className='remarks-value'>
                                            {!isEditable ?
                                                <>{
                                                    (!data.remarks || data.remarks.trim().length === 0) ?
                                                        '-' : <Tooltip placement="left" title={data.remarks}>{data.remarks}</Tooltip>
                                                } </> :
                                                <textarea placeholder='Please enter your remarks (minimum 5 characters)'
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
        getMaintenanceRequests: () => dispatch(Action.getMaintenanceRequests()),
        // getAppSettingList: () => dispatch(Action.getAppSettingList()),
        updateAppSetting: (data) => dispatch(Action.updateAppSetting(data)),
        getSSODetails: (emailId, history) => dispatch(Action.getSSODetails(emailId, history)),
        fetchArsConfigurations: (categoryArr) => dispatch(Action.fetchArsConfigurations(categoryArr, true)),
        updateArsConfigurations: (data) => dispatch(Action.updateArsConfigurations(data))
    }
}

const ARSGeneralSettings = connect(
    mapStateToProps,
    mapDispatchToProps
)(AdminAppSetting)


export default ARSGeneralSettings;