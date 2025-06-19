import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import * as Action from '../../actions/adminAction';
import './CfaSurveySettings.css';
import { Tooltip, notification, Checkbox, Row, Col } from 'antd';
import '../AppSettings1.css';
import _, { } from "lodash";
import {
  pages,
  features,
  hasEditPermission,
} from '../../../../persona/distributorHeader';

const DeliveryCodeSettings = (props) => {
  const {
    fetch_plant_details,
    getAppSettingList,
    updateAppSetting,
  } = props;

  const [plantList, setplantList] = useState([]);
  const [selectedPlantGroup, setSelectedPlantGroup] =
    useState([]);
  const [appSettingData, setAppSettingData] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [remarksChanges, setRemarksChanges] = useState({});
  const [hasCheckboxChanged, setHasCheckboxChanged] = useState(false);
  const [
    originalPlantList,
    setOriginalPlantList,
  ] = useState([]);

 
  const fetchData = async () => {
    try {
      const response = await fetch_plant_details()
      if (response && response.data) {
        setplantList(response?.data?.data);
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
      const selectedPlants = appSettingData
        .filter((setting) => setting.key === 'ENABLE_PLANTS_FOR_DELIVERY_CODE')
        .map((setting) => setting.value.split(','))
        .flat();
      setSelectedPlantGroup(selectedPlants);
      setOriginalPlantList(selectedPlants);
    }
  }, [appSettingData]);

  const onPlantChange = (selectedPlants) => {
    let checkedGroups = [];
    plantList.forEach((group) => {
      if (selectedPlants.includes(group.name)) {
        checkedGroups.push(group.name);
      }
    });
    setSelectedPlantGroup(checkedGroups);
    setHasCheckboxChanged(true);
  };

  const handleEditClick = () => {
    const newRemarksChanges = {};
    appSettingData
      .filter((setting) => setting.key === 'ENABLE_PLANTS_FOR_DELIVERY_CODE')
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
    // Prepare the data to be saved with updated remarks and selected plants
    const updatedData = appSettingData
      .filter((setting) => setting.key === 'ENABLE_PLANTS_FOR_DELIVERY_CODE')
      .map((setting) => {
        return {
          key: setting.key,
          value: selectedPlantGroup.join(','),
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
      setSelectedPlantGroup(originalPlantList);
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
  

  return (
    <div className="cgTableBlock">

      <div className='div-btn-container' >
        <h2 className="card-row-col mt-ecom-settings" style={{ marginBottom: '2px' }}>
        Onboard plants for Delivery code pilot
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
            <th className="width60" style={{ textAlign: 'center' }}>
              Plants Enabled For Delivery Code Pilot
            </th>
            <th className="width10">Last updated by</th>
            <th className="width20" style={{ textAlign: 'center' }}>
              Remarks
            </th>
          </tr>
        </thead>
        <tbody>
          {appSettingData

            ?.filter((data) => data.key === 'ENABLE_PLANTS_FOR_DELIVERY_CODE')
            .map((data, i) => {
              return (
                <tr key={data.key}>
                  <td className="app-desc width20">
                    {data.key}
                    <span>
                      {data.description ? data.description : ''}
                    </span>
                  </td>
                  <td className="cg-checkboxes width60">
                    <Checkbox.Group
                      className="custom-checkbox-group"
                      onChange={onPlantChange}
                      disabled={!isEditing}
                      value={selectedPlantGroup}
                    >
                      <Row style={{ height: 'auto' }}>
                        {plantList.map((data, i) => (
                          <Col
                            span={8}
                            key={data.name}
                          >
                            <Checkbox
                              key={data.description}
                              value={data.name}
                              className={`ant-checkbox-wrapper ${selectedPlantGroup.includes(data.name) ? 'checkbox-selected' : ''}`}
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
                            'ENABLE_PLANTS_FOR_DELIVERY_CODE',
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
    </div>
  );
};

const mapStateToProps = (state) => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return {
    getAppSettingList: () => dispatch(Action.getAppSettingList()),
    updateAppSetting: (data) =>
      dispatch(Action.updateAppSetting(data)),
    fetch_plant_details: () =>
      dispatch(Action.fetch_plant_details()),
  };
  };
  

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(DeliveryCodeSettings);
