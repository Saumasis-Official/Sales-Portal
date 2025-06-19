/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Select, notification, Tooltip } from 'antd';
import * as Action from '../../actions/adminAction';
import '../AppSettings1.css';
import { pages, hasViewPermission } from '../../../../persona/distributorHeader';
import Auth from '../../../../util/middleware/auth';
import '../../../../style/admin/Dashboard.css';
import '../../Forecast/StockNormAudit.css';


function CreditLimitSetting(props) {
  const [isEditable, setIsEditable] = useState(false);
  const [isDisable, setIsDisable] = useState(true);
  const [settingData, setSettingData] = useState([]);
  const [settingUpdatedData, setSettingUpdatedData] = useState([]);
  const [appSettingList, setAppSettingList] = useState([]);
  const [customerGroups, setCustomerGroups] = useState([]);

  const browserHistory = props.history;
  const { app_setting_list, getSSODetails, getMaintenanceRequests, getAppSettingList, updateAppSetting, sso_user_details,get_customer_groups } = props
  const { Option } = Select;
  const ssoRole = sso_user_details?.data?.length && sso_user_details?.data[0]?.roles;
  const isSupportAdmin = (ssoRole.includes('SUPPORT'));

  const appSettingsKeyArr = [
    'GT_CREDIT_CG',
    'MT_CREDIT_CG'
  ];

  useEffect(async () => {
    if (appSettingList?.data) {
      let settingList = [];
      for (let data of appSettingList.data) {
        if (appSettingsKeyArr.includes(data.key)) {
          settingList.push({ ...data, disabled: true });
        }
      }
      setSettingData(settingList);
    }
  }, [appSettingList]);

  useEffect(async() => {
    const res = await get_customer_groups();
     setCustomerGroups(res?.data);
  },[])

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
      setIsDisable(false);
      
      // Update settingData
      const updatedSettingData = settingData.map((data) => {
          if (data.key === feature) {
              return {
                  ...data,
                  value: Array.isArray(value) ? value.join(',') : value,
                  disabled: false
              };
          }
          return data;
      });
      setSettingData(updatedSettingData);
      const existingUpdateIndex = settingUpdatedData.findIndex(item => item.key === feature);
      
      if (existingUpdateIndex !== -1) {
          // Update existing entry
          const updatedData = [...settingUpdatedData];
          updatedData[existingUpdateIndex] = {
              ...updatedData[existingUpdateIndex],
              value: Array.isArray(value) ? value.join(',') : value
          };
          setSettingUpdatedData(updatedData);
      } else {
          setSettingUpdatedData([
              ...settingUpdatedData,
              {
                  key: feature,
                  value: Array.isArray(value) ? value.join(',') : value
              }
          ]);
      }
  };


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
      if(!datum.value) {
        return notification.error({
          message: 'Error',
          description: `Please select value for feature ${datum.key}`,
          duration: 5,
          className: 'notification-error',
        });
      } 
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
      <div className="admin-dashboard-wrapper-1">
        <div className="admin-dashboard-block">

          <div className="sn-table-container">

            <div className="admin-dashboard-table">
         
              {!isSupportAdmin && <div className='btn-wrapper'>
                <button type='button' onClick={editOrCancelSettingHandler}>{isEditable ? 'Cancel' : 'Edit'}</button>
                <button type='button' onClick={saveSettingHandler} disabled={isDisable}>Save</button>
              </div>}
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
                          
                          {isEditable ? (
                              data.key === 'GT_CREDIT_CG' ? (
                                  <Select
                                      mode="multiple"
                                      className="user-role-select"
                                      placeholder="Select Customer Groups"
                                      maxTagCount={1}
                                      value={data.value ? data.value.split(',') : []}
                                      onChange={(values) => changeSelectSettingHandler(values.join(','), data.key)}
                                      dropdownClassName="user-role-dropdown"
                                  >
                                      {customerGroups.map(group => (
                                          <Option key={group} value={group}>
                                              {group}
                                          </Option>
                                      ))}
                                  </Select>
                              ) : data.key === 'MT_CREDIT_CG' ? (
                                  <Select
                                      mode="multiple"
                                      className="user-role-select"
                                      placeholder="Select Customer Groups"
                                      maxTagCount={1}
                                      value={data.value ? data.value.split(',') : []}
                                      onChange={(values) => changeSelectSettingHandler(values.join(','), data.key)}
                                      dropdownClassName="user-role-dropdown"
                                  >
                                      {customerGroups.map(group => (
                                          <Option key={group} value={group}>
                                              {group}
                                          </Option>
                                      ))}
                                  </Select>
                              ) : null
                          ) : (
                              <Tooltip placement="left" title={data.value}>{data.value}</Tooltip>
                          )}
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
          </div>
        </div>
      </div>

    </>
  );
}
const mapStateToProps = (state) => {
  return {
    app_setting_list: state.admin.get('app_setting_list'),
    sso_user_details: state.admin.get('sso_user_details'),
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    getAppSettingList: () => dispatch(Action.getAppSettingList()),
    updateAppSetting: (data) =>
      dispatch(Action.updateAppSetting(data)),
    getMaintenanceRequests: () =>
      dispatch(Action.getMaintenanceRequests()),
    get_customer_groups: () =>
      dispatch(Action.get_customer_groups()),
  };
};
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CreditLimitSetting);
