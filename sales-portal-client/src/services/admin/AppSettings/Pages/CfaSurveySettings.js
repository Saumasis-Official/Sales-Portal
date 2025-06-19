import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import * as Action from '../../actions/adminAction';
import './CfaSurveySettings.css';
import { Tooltip, notification, Checkbox, Row, Col } from 'antd';
import '../AppSettings1.css';
import _, { } from "lodash";
import { TimePicker, Tag, Button } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import {
  pages,
  features,
  hasEditPermission,
} from '../../../../persona/distributorHeader';

const CfaSurveySettings = (props) => {
  const {
    getCustomerGroupDetails,
    getAppSettingList,
    updateAppSetting,
    getCfaWorkflowCalender,
    updateCfaWorkflowCalender,
  } = props;

  const [customerGroupList, setCustomerGroupList] = useState([]);
  const [selectedCustomerGroups, setSelectedCustomerGroups] =
    useState([]);
  const [appSettingData, setAppSettingData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [remarksChanges, setRemarksChanges] = useState({});
  const [hasCheckboxChanged, setHasCheckboxChanged] = useState(false);
  const [
    originalSelectedCustomerGroups,
    setOriginalSelectedCustomerGroups,
  ] = useState([]);

  const [cfaWorkflowCalender, setCfaWorkflowCalender] = useState([]);
  const [isCFACalenderEditable, setIsEditable] = useState(false);
  const [isDisable, setIsDisable] = useState(true);
  const [updated, setUpdated] = useState({});
  const [inputValue, setInputValue] = useState({});
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [currentRow, setCurrentRow] = useState(null);
  const [originalInputDate, setOriginalInputDate] = useState({});

  const fetchData = async () => {
    try {
      const response = await getCustomerGroupDetails();
      if (response && response.data) {
        setCustomerGroupList(response.data);
      }
      const settingsResponse = await getAppSettingList();

      setAppSettingData(settingsResponse.data);

    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (appSettingData.length > 0) {
      const selectedGroups = appSettingData

        .filter((setting) => setting.key === 'CFA_SURVEY_CGS_ENABLE')
        .map((setting) => setting.value.split(','))
        .flat();
      setSelectedCustomerGroups(selectedGroups);
      setOriginalSelectedCustomerGroups(selectedGroups);
    }
  }, [appSettingData]);

  const onCustomerGroupChange = (selectedGroups) => {
    let checkedGroups = [];
    customerGroupList.forEach((group) => {
      if (selectedGroups.includes(group.name)) {
        checkedGroups.push(group.name);
      }
    });
    setSelectedCustomerGroups(checkedGroups);
    setHasCheckboxChanged(true);
  };

  const handleEditClick = () => {
    const newRemarksChanges = {};
    appSettingData
      .filter((setting) => setting.key === 'CFA_SURVEY_CGS_ENABLE')
      .forEach((setting) => {
        newRemarksChanges[setting.key] = {
          settingKey: setting.key,
          remarks: '',
        };
      });

    setRemarksChanges(newRemarksChanges);
    setIsEditing(true);
  };


  const handleSaveClick = async () => {
    // Prepare the data to be saved with updated remarks and selected customer groups
    const updatedData = appSettingData
      .filter((setting) => setting.key === 'CFA_SURVEY_CGS_ENABLE')
      .map((setting) => {
        return {
          key: setting.key,
          value: selectedCustomerGroups.join(','),
          remarks: remarksChanges[setting.key]
            ? remarksChanges[setting.key].remarks
            : setting.remarks,
        };
      });

    // Validate remarks
    for (let datum of updatedData) {
      if (!datum.remarks) {
        return notification.error({
          message: 'Error',
          description: `Please enter remarks for feature ${datum.key}`,
          duration: 5,
          className: 'notification-error',
        });
      } else if (datum.remarks.trim().length < 5) {
        return notification.error({
          message: 'Error',
          description: `Please enter a minimum of 5 characters in remarks to update the feature ${datum.key}`,
          duration: 5,
          className: 'notification-error',
        });
      }
    }

    try {
      const res = await updateAppSetting({
        app_level_configuration: updatedData,
      });

      if (res?.data?.success) {
        await fetchData();
        setRemarksChanges({});
        notification.success({
          message: 'Success',
          description: 'App settings updated successfully',
          duration: 2,
          className: 'notification-green',
        });
        setIsEditing(false);
      } else {
        notification.error({
          message: 'Error Occurred',
          description:
            res?.data?.message ||
            'Some error occurred while updating app settings',
          duration: 5,
          className: 'notification-error',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Technical Error',
        description:
          'Some error occurred while updating app settings',
        duration: 5,
        className: 'notification-error',
      });
    }
  };

  const handleCancelClick = () => {
    if (isEditing) {
      setSelectedCustomerGroups(originalSelectedCustomerGroups);
    }
    setIsEditing(false);
    setRemarksChanges({});
    setHasCheckboxChanged(false);
  };

  const handleRemarksChange = (event, dataKey, settingKey) => {
    const updatedRemarksChanges = { ...remarksChanges };
    updatedRemarksChanges[dataKey] = {
      settingKey: settingKey,
      remarks: event.target.value,
    };
    setRemarksChanges(updatedRemarksChanges);
  };


  const fetchCfaWorkflowCalender = async () => {
    try {
      const response = await getCfaWorkflowCalender();
      if (response && response.data && response.data.success) {
        const responseData = response.data.data;
        setCfaWorkflowCalender(responseData);
        const tempInputValue = {};
        responseData.forEach((data) => {
          tempInputValue[data.date] = {
            expected_starttime: data.expected_starttime,
          }
        })
        setOriginalInputDate(_.cloneDeep(tempInputValue));
        setInputValue(tempInputValue);
      } else {
        setCfaWorkflowCalender([]);
      }
    } catch (error) {
      console.error(error);
      setCfaWorkflowCalender([]);
    }
  }

  useEffect(() => {
    fetchCfaWorkflowCalender();
  }, []);

  const editOrCancelSettingHandlerForCFACalender = () => {
    setInputValue(originalInputDate);
    setUpdated({});
    if (isCFACalenderEditable) {
      setIsEditable(!isCFACalenderEditable);
      setIsDisable(true);
      setIsTimePickerVisible(false);
    } else {
      setIsEditable(!isCFACalenderEditable);
      setIsDisable(true);
    }
  };

  const handleTimeChange = (time, timeString, row) => {
    setIsDisable(false);
    if (timeString && !inputValue[row.date]?.expected_starttime?.split(',').includes(timeString)) {
      const newTimes = inputValue[row.date]?.expected_starttime
        ? `${inputValue[row.date].expected_starttime},${timeString}`
        : row.expected_starttime;
      setInputValue({ ...inputValue, [row.date]: { expected_starttime: newTimes } });
      setUpdated({ ...updated, [row.date]: { date: row.date, expected_starttime: newTimes } });
    }
    setCurrentRow(null);
    setIsTimePickerVisible(false);
  };

  const handleClose = (removedTime, row) => {
    setIsDisable(false);
    const currTime = inputValue[row.date]?.expected_starttime != null ? inputValue[row.date].expected_starttime?.split(',') : [];
    setInputValue((prev) => ({
      ...prev,
      [row.date]: {
        expected_starttime: currTime.filter(time => time !== removedTime).join(',')
      }
    }));
    setUpdated((prev) => ({
      ...prev,
      [row.date]: {
        date: row.date,
        expected_starttime: currTime.filter(time => time !== removedTime).join(',')
      }
    }));
  };

  const onCfaRemarksChange = (e, data) => {
    const value = e.target.value;
    const copyOf = { ...updated };
    const updatedData = { ...data, remarks: value };
    copyOf[data.date] = updatedData;
    setUpdated((prev) => ({
      ...prev,
      [data.date]: {
        ...prev[data.date],
        date: data.date,
        remarks: value
      }
    }));
  };

  const showTimePicker = (row) => {
    setCurrentRow(row);
    setIsTimePickerVisible(true);
  };

  const handleCancel = () => {
    setIsTimePickerVisible(false);
  };

  const saveCFACalenderSettingHandler = async () => {
    ;
    const payload = [];
    Object.values(updated).forEach((data) => {
      const currentDate = new Date().toISOString().split('T')[0];
      const sortedStartTimes = data.expected_starttime
        .split(',')
        .sort((a, b) => new Date(`${currentDate}T${a}:00Z`) - new Date(`${currentDate}T${b}:00Z`))
        .join(',');
      payload.push({
        date: data.date,
        expected_starttime: sortedStartTimes,
        remarks: data.remarks,
      });
    });

    let hasError = false;
    for (let datum of payload) {
      if (!datum.remarks) {
        notification.error({
          message: 'Error',
          description: `Please enter remarks for feature ${datum.date}`,
          duration: 5,
          className: 'notification-error',
        });
        hasError = true;
      } else if (datum.remarks.trim().length < 10) {
        notification.error({
          message: 'Error',
          description: `Please enter minimum 10 characters in remarks to update the feature ${datum.date}`,
          duration: 5,
          className: 'notification-error',
        });
        hasError = true;
      }
    }

    if (hasError) {
      return;
    }

    try {
      const response = await updateCfaWorkflowCalender(payload);
      if (response && response.data && response.data.success) {
        setUpdated({});
        notification.success({
          message: 'Success',
          description: 'CFA workflow calendar updated successfully',
          duration: 2,
          className: 'notification-green',
        });
        fetchCfaWorkflowCalender();
        setIsEditable(false);
        setIsDisable(true);
      } else {
        notification.error({
          message: 'Error Occurred',
          description:
            response?.data?.message ||
            'Some error occurred while updating CFA workflow calendar',
          duration: 5,
          className: 'notification-error',
        });
      }
    } catch (error) {
      console.error('Error updating CFA workflow calendar:', error);
      notification.error({
        message: 'Technical Error',
        description:
          'Some error occurred while updating CFA workflow calendar',
        duration: 5,
        className: 'notification-error',
      });
    }
  };

  return (
    <div className="cgTableBlock">

      <div className='div-btn-container' >
        <h2 className="card-row-col mt-ecom-settings" style={{ marginBottom: '2px' }}>
          CFA Survey
        </h2>
        <br></br>
        {hasEditPermission(
          pages.APP_SETTINGS,
          features.EDIT_APP_SETTINGS,
        ) && (
            <div className="btn-wrapper">
              <button
                type="button"
                onClick={isEditing ? handleCancelClick : handleEditClick}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={
                  !isEditing ||
                  Object.values(remarksChanges).some(
                    (remark) =>
                      !remark.remarks || remark.remarks.trim().length < 5,
                  )
                }
              >
                Save
              </button>
            </div>
          )}
      </div>

      <table>
        <thead>
          <tr>
            <th className="width20">Feature</th>
            <th className="width50" style={{ textAlign: 'center' }}>
              Customer Groups Enabled
            </th>
            <th className="width10">Last updated by</th>
            <th className="width20" style={{ textAlign: 'center' }}>
              Remarks
            </th>
          </tr>
        </thead>
        <tbody>
          {appSettingData

            ?.filter((data) => data.key === 'CFA_SURVEY_CGS_ENABLE')
            .map((data, i) => {
              return (
                <tr key={data.key}>
                  <td className="app-desc width20">
                    {data.key}
                    <span>
                      {data.description ? data.description : ''}
                    </span>
                  </td>
                  <td className="cg-checkboxes width50">
                    <Checkbox.Group
                      className="custom-checkbox-group"
                      onChange={onCustomerGroupChange}
                      disabled={!isEditing}
                      value={selectedCustomerGroups}
                    >
                      <Row style={{ height: 'auto' }}>
                        {customerGroupList.map((data, i) => (
                          <Col
                            span={12}
                            style={{ marginTop: '5px' }}
                            key={data.name}
                          >
                            <Checkbox
                              key={data.description}
                              value={data.name}
                            >
                              {data.name} - {data.description}
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </Checkbox.Group>
                  </td>
                  <td className="width10">
                    {data.first_name && data.last_name && data.user_id
                      ? `${data.first_name} ${data.last_name} (${data.user_id})`
                      : data.updated_by}
                  </td>
                  <td
                    className="remarks-value width20"
                    style={{ textAlign: 'center' }}
                  >
                    {!isEditing || !hasCheckboxChanged ? (
                      <>
                        {!data.remarks ||
                          data.remarks.trim().length === 0 ? (
                          '-'
                        ) : (
                          <Tooltip
                            placement="left"
                            title={data.remarks}
                          >
                            {data.remarks}
                          </Tooltip>
                        )}
                      </>
                    ) : (
                      <textarea
                        onChange={(e) =>
                          handleRemarksChange(
                            e,
                            data.key,
                            'CFA_SURVEY_CGS_ENABLE',
                          )
                        }
                        value={
                          remarksChanges[data.key]
                            ? remarksChanges[data.key].remarks
                            : data.remarks
                        }
                        rows={5}
                        placeholder="Please enter your remarks (minimum 5 characters)"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>

      <div className='div-btn-container' >
        <h2 className="card-row-col mt-ecom-settings" style={{ marginBottom: '2px' }}>
          CFA process workflow timing table
        </h2>
        <br></br>
        {hasEditPermission(
          pages.APP_SETTINGS,
          features.EDIT_APP_SETTINGS,
        ) && (
            <div className="btn-wrapper">
              <button
                type="button"
                onClick={editOrCancelSettingHandlerForCFACalender}
              >
                {isCFACalenderEditable ? 'Cancel' : 'Edit'}
              </button>
              <button type="button" disabled={isDisable} onClick={saveCFACalenderSettingHandler} >
                Save
              </button>
            </div>
          )}
      </div>

      <div className="cgTableBlock">
        <table>
          <thead>
            <tr>
              <th>Date(s) of month</th>
              <th>Workflow expected start time(s)</th>
              <th className="width90">Last updated by</th>
              <th className="width20">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {cfaWorkflowCalender.map((data, i) => {
              return (
                <tr key={i}>
                  <td>{data.date}</td>
                  <td>
                    {isCFACalenderEditable ? (
                      <div>
                        <div key={data?.date} className="custom-input-container">
                          <div className="custom-input">
                            {(inputValue[data.date]?.expected_starttime != null || data.expected_starttime != null) && (inputValue[data.date]?.expected_starttime || data.expected_starttime)
                              .split(',').map((time, index) => (
                                <Tag
                                  key={index + '' + time}
                                  bordered={false}
                                  closable={inputValue[data.date]?.expected_starttime.split(',').length > 1}
                                  onClose={() => handleClose(time, data)}
                                >
                                  {time}
                                </Tag>
                              ))}
                            <ClockCircleOutlined
                              className="time-picker-icon"
                              onClick={() => showTimePicker(data.date)}
                            />
                          </div>
                        </div>
                        {currentRow === data.date && isTimePickerVisible && (
                          <TimePicker
                            format="HH:mm"
                            onChange={(time, timeString) => handleTimeChange(time, timeString, data)}
                            open={isTimePickerVisible}
                            onOpenChange={() => setCurrentRow(data.date)}
                            placeholder="Select time"
                            renderExtraFooter={() => (
                              <Button onClick={handleCancel} type="link">
                                Cancel
                              </Button>
                            )}
                          />
                        )}
                      </div>

                    ) : (
                      data.expected_starttime
                    )}
                  </td>
                  <td>{data.user_id === 'PORTAL_MANAGED' ? data.user_id : (data.first_name && data.last_name && data.user_id) ? `${data.first_name} ${data.last_name} (${data.user_id})` : `(${data.user_id})`}</td>
                  <td className="remarks-value">
                    {isCFACalenderEditable ? (
                      <textarea
                        disabled={updated[data.date] ? false : true}
                        onChange={(e) => onCfaRemarksChange(e, data)}
                        placeholder="Please enter your remarks (minimum 10 characters)"
                      />
                    ) : (
                      data.remarks
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return {
    getAppSettingList: () => dispatch(Action.getAppSettingList()),
    getCustomerGroupDetails: () =>
      dispatch(Action.getCustomerGroupDetails()),
    updateAppSetting: (data) =>
      dispatch(Action.updateAppSetting(data)),
    getCfaWorkflowCalender: () =>
      dispatch(Action.getCfaWorkflowCalender()),
    updateCfaWorkflowCalender: (data) =>
      dispatch(Action.updateCfaWorkflowCalender(data)),
  };
  };
  

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CfaSurveySettings);
