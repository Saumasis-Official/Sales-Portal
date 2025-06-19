import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import * as Action from '../actions/adminAction';
import Tooltip from 'antd/es/tooltip';
import { FormOutlined, InfoCircleOutlined } from '@ant-design/icons';
import CfaDepotModal from './CfaDepotModal';
import Util from '../../../util/helper/index';
import { notification, Select } from 'antd';
import { hasViewPermission, pages } from '../../../persona/distributorHeader';
import { hasPermission, teams } from '../../../persona/pegasus';
import LocalAuth from '../../../util/middleware/auth.js';
import _ from 'lodash';

const { Option } = Select;

function CfaDepot(props) {
  const {
    getCfaDepotMapping,
    updateCfaDepotMapping,
    insertCfaDepotMapping,
    dashboardFilterCategories,
    multipleUpdateCfaDepotMapping,
  } = props;
  const insertData = {
    zone: '',
    depot_code: '',
    sales_org: '',
    distribution_channel: 0,
    division: 0,
    location: '',
    name: '',
    address: '',
    email: '',
    contact_person: '',
    contact_number: '',
    zone_manager_email: '',
    cluster_manager_email: '',
    logistic_email: '',
    remarks: '',
  };

  const updateData = {
    zone: [],
    depot_code: [],
    sales_org: 0,
    distribution_channel: 0,
    division: [],
    location: '',
    name: '',
    address: '',
    email: '',
    contact_person: '',
    contact_number: '',
    zone_manager_email: '',
    cluster_manager_email: '',
    logistic_email: '',
    remarks: '',
  }

  const [tableItems, setTableItems] = useState();
  const [cfaData, setCfaData] = useState();
  const [itemData, setItemData] = useState();
  const [visibility, setVisibility] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [updateMultiple, setUpdateMultiple] = useState(false);
  const [region, setRegion] = useState();
  const [view, setView] = useState(false);
  const [data, setData] = useState([]);
  const [areaDetails, setAreaDetails] = useState([]);
  const [originalTableData, setOriginalTableData] = useState([]);
  const [filter, setFilter] = useState('');

  const deletedStatus = useRef(false)


  useEffect(() => {
    dashboardFilterCategories()
      .then((res) => {
        setAreaDetails(res?.response?.area_details);
        const region = new Set();
        res.response.area_details.forEach((obj) => {
          const value = obj['region'];
          region.add(value);
        });
        setRegion([...region]);
      })
      .catch((error) => { });

    fetchCfaDepotMapping();
  }, []);

  const fetchCfaDepotMapping = () => {
    const body = hasViewPermission(pages.CFA_DEPOT_MAPPING) && hasPermission(teams.LOGISTICS) ? LocalAuth.getUserEmail() : null;
    getCfaDepotMapping(body)
      .then((response) => {
        setCfaData(JSON.parse(JSON.stringify(response?.data?.data)));
        searchHandler({ target: { value: filter } }, JSON.parse(JSON.stringify(response?.data?.data)))
        setOriginalTableData(response.data.data);
      })
      .catch((error) => { });
  }

  const handleVisibility = () => {
    setVisibility(false);
    setIsUpdate(false);
    setView(false);
    setUpdateMultiple(false);
    searchHandler({target:{value:filter}})
  };

  const handleSubmit = (data) => {
    setVisibility(false);
    if (isUpdate) {
      updateCfaDepotMapping(data)
        .then((response) => {
          fetchCfaDepotMapping();
          if (response.data.success) {
            notification.success({
              message: 'Success',
              description: 'File status updated successfully ',
              duration: 2,
              className: 'notification-green',
            });
          } else {
            notification.error({
              message: 'Error',
              description: `Failed to update file status`,
              duration: 5,
              className: 'notification-error error-scroll',
            });
          }
        })
        .catch((error) => {
          fetchCfaDepotMapping();
          notification.error({
            message: 'Error',
            description: `Failed to update file status`,
            duration: 5,
            className: 'notification-error',
          });
        })
    } else if (updateMultiple) {
      multipleUpdateCfaDepotMapping(data)
        .then((response) => {
          fetchCfaDepotMapping();
          if (response.data.success) {
            notification.success({
              message: 'Success',
              description: 'File status updated successfully ',
              duration: 2,
              className: 'notification-green',
            });
          } else {
            notification.error({
              message: 'Error',
              description: `Failed to update file status`,
              duration: 5,
              className: 'notification-error error-scroll',
            });
          }
        })
        .catch((error) => {
          fetchCfaDepotMapping();
          notification.error({
            message: 'Error',
            description: `Failed to update file status`,
            duration: 5,
            className: 'notification-error',
          });
        });
    } else {
      insertCfaDepotMapping(data)
        .then((response) => {
          fetchCfaDepotMapping();
          if (response.data.success) {
            notification.success({
              message: 'Success',
              description: 'File status updated successfully ',
              duration: 2,
              className: 'notification-green',
            });
          } else {
            notification.error({
              message: 'Error',
              description: `Failed to update file status`,
              duration: 5,
              className: 'notification-error error-scroll',
            });
          }
        })
        .catch((error) => {
          fetchCfaDepotMapping();
          notification.error({
            message: 'Error',
            description: `Failed to update file status`,
            duration: 5,
            className: 'notification-error',
          });
        });
    }
  };

  const showRequestModal = (data) => {
    setItemData(data);
    setVisibility(true);
    setIsUpdate(true);
    setView(true)
    setUpdateMultiple(false)
  };

  const showEditRequestModal = (data) => {
    setItemData(data);
    setVisibility(true);
    setIsUpdate(true);
    setUpdateMultiple(false)
  };

  const handleAdd = () => {
    setItemData(insertData);
    setVisibility(true);
    setIsUpdate(false);
    setUpdateMultiple(false);
  };

  const handleUpdates = () => {
    setItemData(updateData);
    setVisibility(true);
    setIsUpdate(false);
    setUpdateMultiple(true);
  }

  const searchHandler = (event, cfaDetails=null) => {
    const { value } = event.target;
    const cfaValue = cfaDetails ? cfaDetails : cfaData;
    setFilter(value);
    const filteredArr = cfaValue.filter(
      (o) =>
        (o.zone?.toLowerCase()?.includes(value.toLowerCase()) ||
        o.depot_code?.toLowerCase()?.includes(value.toLowerCase()) ||
        o.division?.toString()?.includes(value) ||
        o.zone_manager_email
          ?.toLowerCase()
          ?.includes(value.toLowerCase()) ||
        o.cluster_manager_email
          ?.toLowerCase()
          ?.includes(value.toLowerCase()) ||
        o.logistic_email
          ?.toLowerCase()
          ?.includes(value.toLowerCase()) ||
        o.depot_code?.toString().includes(value) ||
          o.email?.toLowerCase()?.includes(value.toLowerCase())) && o.is_deleted == deletedStatus.current
    );
    setTableItems([...filteredArr]);
  };

  const selectedHandler = (e) => {
    deletedStatus.current = e;
    searchHandler({target:{value:filter}})
  }

  return (
    <div className="admin-dashboard-wrapper">
      <div className="admin-dashboard-block">
        <div className="admin-dashboard-head">
          <h2>CFA Depot Mapping</h2>
          <div className="admin-dashboard-search">
            <input
              type="text"
              className="search-fld"
              onChange={searchHandler}
              placeholder="Search by  Zone, Depot Code, Division,Email"
            />
          </div>
          <Select style={{ marginLeft: '20px', marginTop: '40px', marginBottom: '40px' }} defaultValue={false}
            onChange={selectedHandler}>
            <Option value={false}> ACTIVE </Option>
            <Option value={true}>DELETED</Option>
          </Select>
          <button
            type="submit"
            className="add-btn"
            style={{
              width: '10%',
            }}
            onClick={handleUpdates}
          >
            Multi. Update
          </button>
          <button
            type="submit"
            className="add-btn"
            style={{
              width: '15%',
            }}
            onClick={handleAdd}
          >
            Add CFA Depot <img src="/assets/images/plus-icon.svg" alt="" />
          </button>
        </div>
        <div className="admin-dashboard-table table-container">
          <table>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Depot Code</th>
                <th>Sales Org</th>
                <th>Distribution Channel</th>
                <th>Division</th>
                {/* <th>Location</th>
                <th>Name</th>
                <th>Address</th> */}
                <th>Email</th>
                {/* <th>Contact Person</th>
                <th>Contact Number</th> */}
                <th>Logistics Email</th>
                <th>Zone Manager Email</th>
                <th>Cluster Manager Email</th>
                {/* <th>Deleted</th> */}
                {/* <th>Created On</th>
                <th>Updated On</th>
                <th>Updated By</th>
                <th>Remarks</th> */}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tableItems?.map((item, index) => {
                return (
                  <tr key={item.id}>
                    <td>{item.zone}</td>
                    <td>{item.depot_code}</td>
                    <td>{item.sales_org}</td>
                    <td>{item.distribution_channel}</td>
                    <td>{item.division}</td>
                    {/*<td>{item.location}</td>
                    <td>{item.name}</td>
                    <td>{item.address}</td> */}
                    <td>{item.email}</td>
                    {/* <td>{item.contact_person}</td>
                    <td>{item.contact_number}</td> */}
                    <td className="admin-dbname">{item.logistic_email}</td>
                    <td className="admin-dbname">{item.zone_manager_email}</td>
                    <td className="admin-dbname">{item.cluster_manager_email}</td>
                    {/* <td>{item.is_deleted + ' '}</td>
                    <td>{Util.formatDate(item.created_on)},{Util.formatTime(item.created_on)}</td>
                    <td>{Util.formatDate(item.updated_on)},{Util.formatTime(item.updated_on)}</td>
                    <td>{item.updated_by}</td>
                    <td>{item.remarks}</td> */}
                    <td>
                      <button className="info-icon" style={{ backgroundColor: 'inherit', height: "10px", width: "10px", float: "left" }} onClick={() => { showEditRequestModal(item) }}> <Tooltip placement="bottom" title={'Edit'}> <FormOutlined /> </Tooltip> </button>
                      <button className="info-icon" style={{ backgroundColor: 'inherit', height: "10px", width: "10px", float: "right" }} onClick={() => { showRequestModal(item) }}> <Tooltip placement="bottom" title="Info"><InfoCircleOutlined /> </Tooltip> </button>
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 &&
                <tr style={{ textAlign: 'center' }}>
                  <td colSpan="10">No data available</td>
                </tr>}
            </tbody>
          </table>
        </div>
        <CfaDepotModal
          cfaDatas={cfaData}
          datas={itemData}
          region={region}
          onHide={handleVisibility}
          visible={visibility}
          onUpdate={handleSubmit}
          isUpdate={isUpdate}
          view={view}
          updateMultiple={updateMultiple}
          handleMultipleUpdates={updateCfaDepotMapping}
          areaDetails={areaDetails}
        />
      </div>
    </div>
  );
}

const mapDispatchToProps = (dispatch) => {
  return {
    getCfaDepotMapping: (email) => dispatch(Action.getCfaDepotMapping(email)),
    updateCfaDepotMapping: (data) =>
      dispatch(Action.updateCfaDepotMapping(data)),
    insertCfaDepotMapping: (data) =>
      dispatch(Action.insertCfaDepotMapping(data)),
    dashboardFilterCategories: (data) =>
      dispatch(Action.dashboardFilterCategories(data)),
    multipleUpdateCfaDepotMapping: (data) =>
      dispatch(Action.multipleUpdateCfaDepotMapping(data)),
  };
};

export default connect(null, mapDispatchToProps)(CfaDepot);