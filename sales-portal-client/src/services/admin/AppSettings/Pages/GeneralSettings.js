import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Select, notification, Tooltip } from 'antd';
import * as Action from '../../actions/adminAction';
import Auth from '../../../../util/middleware/auth';
import '../../../../style/admin/Dashboard.css';
import '../AppSettings1.css';
import Loader from '../../../../components/Loader';
import { hasViewPermission, pages } from '../../../../persona/distributorHeader';
import moment from 'moment';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';
import Helper from '../../../../util/helper';

let AdminAppSetting = props => {
    const browserHistory = props.history;
    const { app_setting_list, getAppSettingList, updateAppSetting, sso_user_details, getSSODetails, getMaintenanceRequests, fetchSSOUsers } = props
    const { Option } = Select;

    const [settingData, setSettingData] = useState([]);
    const [settingUpdatedData, setSettingUpdatedData] = useState([]);
    const [isEditable, setIsEditable] = useState(false);
    const [isDisable, setIsDisable] = useState(true);
    const [ssoUserEmails, setSsoUserEmails] = useState([]);
    const [selectedVpEmails, setSelectedVpEmails] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchBoxValue, setSearchBoxValue] = useState('');
    const [filteredData, setFilteredData] = useState(settingData);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedRoApprovers, setSelectedRoApprovers] = useState([]);

    const ssoRole = sso_user_details?.data?.length && sso_user_details?.data[0]?.roles;
    const isSupportAdmin = (ssoRole?.includes('SUPPORT'));
    const promiseSettingKeys = ['ENABLE_PROMISE_CREDIT_SECOND_START_TIME', 'ENABLE_PROMISE_CREDIT_SECOND_END_TIME'];
    const appSettingsKeyArr = [
        'REPORT_ISSUE',
        'CHANGE_PASSWORD_LOGGED_IN',
        'SHOW_SESSION_INFO',
        'ENABLE_ADMIN_CREATE_ORDER',
        'CART_EXPIRY_WINDOW',
        'PARTNER-MISMATCH-ERROR-RECIPIENTS',
        'ENABLE_PSKU',
        'ENABLE_DIRECT_DISPATCH',
        'ENABLE_BOM_EXPLODE',
        'DEFAULT_SEARCH_BEHAVIOUR',
        'ENABLE_DRAFT',
        'PROFILE_UPDATE',
        'CREDIT_LIMIT_NOTIFICATION',
        'ENABLE_MAINTENANCE',
        'ENABLE_LIQUIDATION',
        'ENABLE_SELF_LIFTING',
        'ENABLE_SEARCH_SWITCH',
        'ENABLE_SERVICE_DELIVERY_REQUESTS',
        'MDM_SYNC',
        'ENABLE_RESERVE_CREDIT',
        // 'ENABLE_ORDER_APPROVAL_RUSH_ORDER',
        'RO_EXPIRY_WINDOW',
        'RO_APPROVALS',
        'ENABLE_QUANTITY_NORM',
        'ENABLE_QUANTITY_NORM',
        'ENABLE_RO_REQUEST',
        // 'ENABLE_RO_RESPONSE',
        'ENABLE_BO',
        'ENABLE_PROMISE_CREDIT_FIRST',
        'ENABLE_PROMISE_CREDIT_SECOND',
        'PDP_APPROVERS',
        'ENABLE_PROMISE_CREDIT_SECOND_START_TIME', 
        'ENABLE_PROMISE_CREDIT_SECOND_END_TIME',
        'PDP_UNLOCK_EXPIRY_WINDOW',
        'PDP_UNLOCK_CONFIRM_TEXT',
        'ENABLE_MT_ECOM_RDD',
        'PDP_UNLOCK_EXPIRY_WINDOW_2',
        'RO_APPROVERS',
        'RO_EXPIRY_WINDOW_2',
        'RO_LOCK_ARS_WINDOW',
    ];

    useEffect(() => {
        if (app_setting_list?.data) {
            let settingList = [];
            for (let data of app_setting_list.data) {
                if (appSettingsKeyArr.includes(data.key)) {
                    settingList.push({ ...data, disabled: true });
                }
                if(data.key === 'PDP_APPROVERS' && data.value){
                    setSelectedVpEmails(data.value?.trim().split(','));
                }
                if(data.key === 'RO_APPROVERS' && data.value){
                    setSelectedRoApprovers(data.value?.trim().split(',') || []);
                }
            }
            setSettingData(settingList);
        }
    }, [app_setting_list])

    useEffect(() => {
        getAppSettingList();
        getMaintenanceRequests();
        async function fetchSSOUserEmails() {
            const res = await fetchSSOUsers(); 
            if (res?.success) {
                setSsoUserEmails(res.data?.map((item) => item.email));
            }
        }
        fetchSSOUserEmails();
    }, []);

    useEffect(() => {
    setFilteredData(
      settingData?.filter(data =>
        data.key.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [settingData, searchTerm])

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
            setSearchTerm('');
            setSearchBoxValue(''); 
            setIsSearchOpen(false);
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
        let exists = false;
        settingUpdatedData.forEach((data) => {
            if (data.key === feature) {
                data.value = value;
                exists = true;
            }
        })
        if (exists) setSettingUpdatedData([...settingUpdatedData]);
        else setSettingUpdatedData([...settingUpdatedData, { key: feature, value }])
    }

    const formatValue = (value) => {
        //check if value is number, else return 0, also check if the value is within range of 0-100, if less than 0 then return 0, if greater than 100 then return 100
        if (isNaN(value)) {
            return '0';
        } else if (value < 0) {
            return '0';
        } else if (value > 100) {
            return '100';
        } else {
            return value.toString();
        }
    }

    const changePromiseTimeSettingHandler = (v,promiseSettingKeys,feature) => {
        let startTime;
        let endTime;
        let otherFeature =  settingData.find((data) =>   data.key !== feature && promiseSettingKeys.includes(data.key))
     
        if(otherFeature.key.includes('START_TIME')){
             startTime = moment(otherFeature.value, 'HH:mm');
             endTime = moment(v, 'HH:mm');
        }
        else {
            startTime = moment(v, 'HH:mm');
            endTime = moment(otherFeature.value, 'HH:mm');
        }
        if(startTime.isAfter(endTime)){
            notification.error({
                message: 'Error',
                description: `Promise credit start time should be less than end time`,
                duration: 5,
                className: 'notification-error',
            });
            return false;
           }
           else {
            return true;
           }
   }


    const changeTextSettingHandler = (event, feature) => {
        const intKeys = ['CART_EXPIRY_WINDOW', 'RO_EXPIRY_WINDOW', 'RO_APPROVALS', 'PDP_UNLOCK_EXPIRY_WINDOW', 'PDP_UNLOCK_EXPIRY_WINDOW_2','RO_EXPIRY_WINDOW_2','RO_LOCK_ARS_WINDOW'];
        const wholeNumKeys = ['CART_EXPIRY_WINDOW','RO_EXPIRY_WINDOW','RO_APPROVALS','PDP_UNLOCK_EXPIRY_WINDOW' , 'PDP_UNLOCK_EXPIRY_WINDOW_2','RO_EXPIRY_WINDOW_2','RO_LOCK_ARS_WINDOW'];
        let v='';
        if (intKeys.includes(feature)) {
            v = event.target.value.toString().toUpperCase();
            if(wholeNumKeys.includes(feature)){
                v = isNaN(parseInt(v)) ? '' : Math.abs(parseInt(v)) + '';
            }else{
                v = isNaN(parseInt(v)) ? '' : parseInt(v) + '';
            }    
        } else if(promiseSettingKeys.includes(feature)){
            v = event.target.value;
            }
        else {
            // v = formatValue(event.target.value);// need to review why this was used
            v = event.target.value;
        }
        const value = v;
        setIsDisable(false);
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
                Helper.notificationSender('Error',`Please enter remarks for feature ${datum.key}`,false);
                return;
            } else if (datum.remarks.trim().length < 10) {
                Helper.notificationSender('Error',`Please enter minimum 10 characters in remarks to update the feature ${datum.key}`,false);
                return;
            } else if(settingUpdatedData.find((data) => data.key === 'PDP_APPROVERS') && !selectedVpEmails.length){
                Helper.notificationSender('Error','Please select at least one email for feature PDP_APPROVERS',false,4);
                return;
            } else if(promiseSettingKeys.includes(datum.key)){
                const status=  changePromiseTimeSettingHandler(datum.value,promiseSettingKeys,datum.key)
                if(!status)
                    return true;
            } else if(settingUpdatedData.find((data) => data.key === 'RO_APPROVERS') && !selectedRoApprovers.length){
                Helper.notificationSender('Error','Please select at least one email for feature RO_APPROVERS',false,4);
                return;
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
                setSearchTerm('');
                setSearchBoxValue(''); 
                setIsSearchOpen(false);
                
            } else {
                notification.error({
                    message: 'Error Occurred',
                    description: (res?.data?.message) ? res.data.message : 'Some error occurred while updating app settings',
                    duration: 5,
                    className: 'notification-error',
                });
            }
        } catch (error) {
            notification.error({
                message: 'Technical Error',
                description: 'Some error occurred while updating app settings',
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

    const handleSelectChange = (value,key) => {
        const valueString = value.join(',');
        if(key === 'PDP_APPROVERS'){
            setSelectedVpEmails(value);
            changeSelectSettingHandler(valueString, 'PDP_APPROVERS');
        }else if(key === 'RO_APPROVERS'){
            setSelectedRoApprovers(value);
            changeSelectSettingHandler(valueString, 'RO_APPROVERS');
        }
        
    }

    
    useEffect(() => {
        if (isSearchOpen) {
            const searchInput = document.querySelector('.search-app-feature'); 
            if (searchInput) {
            searchInput.focus(); 
            }
        }
        }, [isSearchOpen]); 
    

    return (
        <>
            <div className="admin-dashboard-wrapper-1">
                <div className="admin-dashboard-block" >
                    <Loader>
                    {!isSupportAdmin && <div className='btn-wrapper-general'>
                            <button type='button' onClick={editOrCancelSettingHandler}>{isEditable ? 'Cancel' : 'Edit'}</button>
                            <button type='button' onClick={saveSettingHandler} disabled={isDisable}>Save</button>
                        </div>}
                        <div className="admin-dashboard-table">
                            <table>
                                <thead>
                                    <tr>
                                    <th>Feature 
                                {isSearchOpen ? (
                                <> <input
                                    type="text"
                                    className='search-app-feature'
                                    value={searchBoxValue}
                                    onChange={event =>{
                                        setSearchTerm(event.target.value)
                                        setSearchBoxValue(event.target.value);
                                    }}
                                    />
                                    <CloseOutlined className='close-icon'
                                    onClick={() => {
                                        setIsSearchOpen(false);
                                        setSearchTerm('');
                                         setSearchBoxValue('');
                                    }}
                                    
                                    />
                                </>
                                
                                    ) : (
                                    <SearchOutlined className='search-icon'
                                        onClick={() => {
                                            setIsSearchOpen(true)
                                            setSearchBoxValue('');
                                        }}
                                        title='Search Feature'
                                    />
                                    )}
                                    </th>
                                            <th>Value</th>
                                            <th>Last updated by</th>
                                            <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                   {(
                                        filteredData?.map((data) => {
                                            return (
                                                <tr key={data.key}>
                                                    
                                                    <td className='app-desc'>{data.key==='STOCK_NORM'||data.key==='SAFETY_STOCK'?data.key+" "+"(%)":data.key}<span>{data.description ? data.description : ''}</span></td>
                                                    <td>
                                                        <div className='value-col'>
                                                            {isEditable ? (
                                                                <>
                                                                    {data.field_type === "SET" ? (
                                                                        <Select
                                                                            className='user-role-select'
                                                                            value={data.value}
                                                                            onChange={(val) => changeSelectSettingHandler(val, data.key)}
                                                                            dropdownClassName="user-role-dropdown"
                                                                        >
                                                                            {data.allowed_values.map((value, index) => {
                                                                                return <Option key={index} value={value}>{value}</Option>
                                                                            })}
    
                                                                        </Select>) :
                                                                        (data.key === 'PDP_APPROVERS' || data.key === 'RO_APPROVERS') 
                                                                        ? <Select
                                                                            className='user-role-select'
                                                                            placeholder='Select Approver Emails'
                                                                            value={data.key === 'PDP_APPROVERS'? selectedVpEmails : selectedRoApprovers}
                                                                            allowClear
                                                                            mode="multiple"
                                                                            onChange={(val) => handleSelectChange(val,data.key)}
                                                                            options={ssoUserEmails.map((email) => { return { value: email, label: email } })}
                                                                            dropdownClassName="user-role-dropdown"
                                                                            /> 
                                                                            
                                                                        : <input
                                                                            className={data.field_type === 'TEXT' ? 'value-text-fld' : 'time-input-fld'}
                                                                            type={data.field_type === 'TEXT' ? 'text' : 'time'}
                                                                            value={data.value}
                                                                        // pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
                                                                            onChange={(event) => changeTextSettingHandler(event, data.key)}
                                                                        />
                                                                    }</>) :
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
                                        }))}

                                </tbody>
                            </table>
                        </div>
                        {/*  <Panigantion
                        data={userList ? userList : []}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        itemsCount={tse_user_list && tse_user_list.data && tse_user_list.data.totalCount}
                        setModifiedData={onChangePage}
                    />  */}
                    </Loader>
                    {!(filteredData.length > 0) && (<div className='NoDataDiv'>
                    <b> Please check again, No such feature name found.</b>
                </div>)}
                </div>
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
        getSSODetails: (emailId) =>
            dispatch(Action.getSSODetails(emailId)),
        fetchSSOUsers: (data) => dispatch(Action.fetchSSOUsers(data)),
    }
}

const GeneralSettings = connect(
    mapStateToProps,
    mapDispatchToProps
)(AdminAppSetting)


export default GeneralSettings;