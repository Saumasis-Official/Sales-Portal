import React, { useEffect, useState, useRef } from 'react';
import { Modal, Select, Input, notification } from 'antd';
import { Link } from 'react-router-dom';
import { Tooltip } from 'antd';
import { CloseCircleOutlined, FormOutlined, EyeOutlined, BorderOutlined } from '@ant-design/icons';
import _ from 'lodash';
import debounce from 'lodash.debounce';
import '../../style/admin/Dashboard.css';
import * as SDAction from './actions/serviceDeliveryAction';
import { connect } from 'react-redux';
import * as DBAction from './action';
import * as AdminAction from '../admin/actions/adminAction';
import LocalAuth from '../../util/middleware/auth';
import * as DashAction from './actions/dashboardAction';
import Util from '../../util/helper/index';
import Panigantion from '../../components/Panigantion';
import Loader from '../../components/Loader';
import './ServiceDeliveryRequests.css'
import ExportSdrToExcel from './SdrToExcel/ExportSdrToExcel';
import '../../style/admin/TSERequests.css';
import { hasViewPermission, hasRaisePermission, hasRespondPermission, pages, features } from '../../persona/requests';
import { authenticatedUsersOnly } from '../../util/middleware';
let ServiceDeliveryRequests = props => {
  const browserHistory = props.history;
  const defaultValues = {
    selectedDBCode: 'Select DB Code',
    selectedSONo: 'Select SO Number',
    selectedMaterialName: 'Select Material',
    selectedPlantCode: 'Material Plant Code',
    selectedCatgeory: 'Select SD Request category',
    selectedCatgeoryDesc: 'Enter comments here'
  }

  const serviceRequestCategoryType = {
    request: 'SD_REQUEST',
    response: 'SD_RESPONSE'
  }

  const {
    getDistributorList,
    sdrList,
    sdrListCount
  } = props

  if (props.location.pathname.split('/')[1] === 'distributor') {
    authenticatedUsersOnly(props.location.pathname, props.history);
  }
 
  const [user, setUser] = useState({});

  const { Option } = Select;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [inputApprovedVal, setInputApprovedVal] = useState('');
  const [sdList, setSdList] = useState([]);
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [pageNo, setPageNo] = useState(1)

  const [serviceLevelCategoryRequest, setServiceLevelCategoryRequest] = useState([]);
  const [selectedCatgeoryDesc, setSelectedCatgeoryDesc] = useState(defaultValues.selectedCatgeoryDesc);
  const [selectedCatgeory, setSelectedCatgeory] = useState(defaultValues.selectedCatgeory);
  const [dbCodes, setDbCodes] = useState([]);
  const [selectedDBCode, setSelectedDBCode] = useState(defaultValues.selectedDBCode);
  const [selectedDBName, setSelectedDBName] = useState('');
  const [selectedSONo, setSelectedSONo] = useState(defaultValues.selectedSONo);
  const [orderList, setOrderList] = useState([])
  const [materialList, setMaterialList] = useState([]);
  const [selectedMaterialCode, setSelectedMaterialCode] = useState('');
  const [selectedMaterialName, setSelectedMaterialName] = useState(defaultValues.selectedMaterialName);
  const [selectedPlantCode, setSelectedPlantCode] = useState(defaultValues.selectedPlantCode);
  const [cfaData, setCfaData] = useState([]);
  const [matchingCFA, setMatchingCFA] = useState({});
  const [sdrNo, setSdrNo] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  const [showSearch, setShowSearch] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isEditRequestModalVisible, setIsEditRequestModalVisible] = useState(false)
  const [serviceLevelCategoryResponse, setServiceLevelCategoryResponse] = useState([]);
  const [exportedList, setExportedList] = useState([]);

  const [label, setlabel] = useState('');
  const [labelId, setlabelId] = useState('')
  const [sd_number, setsd_number] = useState('');
  const [respSuccess, setRespSuccess] = useState(0);
  const [tabShow, SetTabShow] = useState(true);
  const adminAccessToken = LocalAuth.getAdminAccessToken();
  var adminRole = LocalAuth.getAdminRole();


  const debouncedSearch = useRef(debounce(nextValue => setSearch(nextValue), 500)).current;
  const distObj = {
    limit: (adminRole.includes('SUPER_ADMIN') || adminRole.includes('SUPPORT'))? 100 :  0,
    offset: 0,
    search: "",
    status: "ACTIVE"
  }

  const sdrStatus = [{ label: 'ALL', value: 'ALL' }, { label: 'PENDING', value: 'OPEN' }, { label: 'CLOSED', value: 'CLOSE' }];

  useEffect(() => {
    async function getSDRList() {
      await props.getSdrList({ offset, limit, search, status: selectedStatus })
    }
    getSDRList();
    setSdList(sdrList);
    onCheckReset();
  }, [sdrList && sdrList.length, sdrNo, respSuccess, search, limit, offset, selectedStatus]);

  useEffect(() => {
    setSdList(sdrList);
    onCheckReset();
  }, [sdrList]);

  useEffect(() => {
    if (!(serviceLevelCategoryRequest && serviceLevelCategoryRequest.length)) {
      props.fetchServiceLevelCategory(serviceRequestCategoryType.request).then((response) => {

        if (response && response.data && response.data.data)
          setServiceLevelCategoryRequest(response.data.data);
      });
    }

    if (!(serviceLevelCategoryResponse && serviceLevelCategoryResponse.length)) {
      props.fetchServiceLevelCategory(serviceRequestCategoryType.response).then((response) => {

        if (response && response.data && response.data.data)
          setServiceLevelCategoryResponse(response.data.data);
      });
    }
  }, []);



  const updateFunc = async (status) => {

    const reqdata = {
      sd_number: sd_number,
      cfa_reason_id: labelId,
      sd_res_comments: inputApprovedVal,
      status: status
    };

    setlabel('');
    setInputApprovedVal('');

    if (sd_number) {
      const resp = await props.updateCFA(reqdata);
      if (resp.success === true) {
        notification.success({
          message: 'Success',
          description: resp.message,
          duration: 3,
          className: 'notification-green',
        });
        setRespSuccess((prev) => prev + 1)
      }
      else {
        notification.error({
          message: 'Error Occurred',
          description: resp.message,
          duration: 5,
          className: 'notification-error',
        });
      }
    }
    hideEditRequestModal();
  }

  const onSearch = (e) => {
    const { value } = e.target;
    debouncedSearch(value);
    setShowSearch(value);
    setOffset(0);
    setPageNo(1)
  }

  const resetPage = () => {
    debouncedSearch('');
    setShowSearch('')
    setOffset(0);
  }

  const onChangePage = (page, itemsPerPage) => {
    setLimit(itemsPerPage)
    setOffset((page - 1) * limit)
    setPageNo(page)
  }

  const showModal = async () => {

    setIsModalOpen(true);
    let db = await getDistributorList(distObj)
    setDbCodes(() => db.map(o => {
      return ({ id: o.id, name: o.name })
    }));
    let cfas = await props.getCfaDataAdmin('');
    setCfaData(cfas.data.rows);
  };

  const clearPopupData = () => {
    setOrderList([])
    setMaterialList([])
    setSelectedDBCode(defaultValues.selectedDBCode)
    setSelectedSONo(defaultValues.selectedSONo)
    setSelectedMaterialName(defaultValues.selectedMaterialName)
    setSelectedCatgeory(defaultValues.selectedCatgeory)
    setSelectedCatgeoryDesc(defaultValues.selectedCatgeoryDesc)
    setSelectedPlantCode(defaultValues.selectedPlantCode)
  }

  const handleCancel = () => {
    setIsModalOpen(false);
    clearPopupData();
  };

  const handleSubmit = async () => {
    if (matchingCFA.contact_person == undefined) {
      notification.error({
        message: 'CFA error',
        description: 'No  CFA available for this SD_Request',
        duration: 5,
        className: 'notification-error',
      });
      clearPopupData();
    }
    else {
      let sdRequestData =
      {
        "distributor_id": selectedDBCode,
        "req_reason_id": selectedCatgeory + "",
        "so_number": selectedSONo,
        "sd_req_comments": selectedCatgeoryDesc,
        "material_code": selectedMaterialCode,
        "material_description": selectedMaterialName,
        "plant_code": selectedPlantCode,
        "cfa_name": matchingCFA.contact_person,
        "cfa_email": matchingCFA.email,
        "cfa_contact": matchingCFA.contact_number
      }

      let response = await props.addSDRAdmin(sdRequestData);

      if (response.success) {
        setSdrNo(response.data.sd_number)
        setIsSuccessModalOpen(true);
      } else {
        notification.error({
          message: 'SD Request error',
          description: 'Could not send SD Request',
          duration: 5,
          className: 'notification-error',
        });
        clearPopupData();
      }
    }
    setIsModalOpen(false);
  }

  const showEditRequestModal = (sd_number) => {
    setsd_number(sd_number);
    sdList.map((data) => {
      if (data.sd_number === sd_number) {
        setInputApprovedVal(data.sd_res_comments || '');
        setlabel(data.cfa_res_reason || '')
        serviceLevelCategoryResponse.map((category) => {
          if (category.label === data.cfa_res_reason) {
            setlabelId(category.id);
          }
        })
      }
    })
    setIsEditRequestModalVisible(true);
  };

  const hideEditRequestModal = () => {
    setlabel('');
    setlabelId('');
    setInputApprovedVal('');
    setIsEditRequestModalVisible(false);
  };

  const hideModal = () => {
    setIsDetailsModalVisible(false);
  };

  const handleSuccessModalCancel = () => {
    setIsSuccessModalOpen(false);
    clearPopupData();
  }

  const showModalDetails = (event) => {
    sdList.map((data) => {
      if (data.sd_number == event.currentTarget.value) {
        setUser(data)
      }
    })
    setIsDetailsModalVisible(true);
  };

  const handleCategoryChange = (value) => {
    setSelectedCatgeory(value);
    let filteredCategory = serviceLevelCategoryRequest.filter((cat) => { return cat.id === value });

    if (filteredCategory.length > 0) {
      setSelectedCatgeoryDesc(filteredCategory[0].description);
    }
  }

  const handleCommentChange = (value) => {
    setSelectedCatgeoryDesc(value)
  }

  const handleDBCodeChange = async (value) => {
    setSelectedDBCode(value);
    setSelectedDBName((dbCodes.filter(o => o.id === value))[0].name)
    let ol = await props.getOrderList({ distributorId: value });
    setOrderList(ol);

    setSelectedSONo(defaultValues.selectedSONo);
    setSelectedMaterialName(defaultValues.selectedMaterialName)
    setSelectedCatgeory(defaultValues.selectedCatgeory)
    setSelectedCatgeoryDesc(defaultValues.selectedCatgeoryDesc)
    setSelectedPlantCode(defaultValues.selectedPlantCode)
  }

  const handleSONoChange = async (value) => {
    let sod = await props.listSODetails(value, selectedDBCode);

    setSelectedSONo(value);
    setMaterialList(sod)
    setSelectedMaterialName(defaultValues.selectedMaterialName)
    setSelectedCatgeory(defaultValues.selectedCatgeory)
    setSelectedCatgeoryDesc(defaultValues.selectedCatgeoryDesc)
    setSelectedPlantCode(defaultValues.selectedPlantCode)
  }

  const handleMaterialChange = async (value) => {

    let selMaterial = (materialList.filter(o => o.Material_Description === value))[0];
    setSelectedMaterialCode(selMaterial.Material_Number)
    setSelectedMaterialName(value)
    setSelectedPlantCode(selMaterial.Depot_Code)
    let dist_channel = selMaterial.Distribution_Channel;
    let division = selMaterial.Division;
    let sales_org = selMaterial.Sales_Org;
    let depot_code = selMaterial.Depot_Code;

    cfaData.filter(c => c.depot_code == depot_code && c.sales_org == sales_org && c.division == division && c.distribution_channel == dist_channel).forEach((cfa) => setMatchingCFA(cfa))
    setSelectedCatgeory(defaultValues.selectedCatgeory)
    setSelectedCatgeoryDesc(defaultValues.selectedCatgeoryDesc)

  }

  const statusChangeHandler = (value) => {
    setSelectedStatus(value);
    setLimit(itemsPerPage);
    setOffset(0);
    setPageNo(1);
  }
  const tabFunction = (value) => {
    if (value === 'Sales Hierarchy Requests') {
      
      if (hasRespondPermission(pages.SHR)) {
        browserHistory.push({ pathname: "/admin/pending-requests", state: { tabState: "Sales Hierarchy Requests" } });
      } else {
        browserHistory.push({ pathname: "/admin/tse-requests", state: { tabState: "Sales Hierarchy Requests" } });
      }
    } else if (value === 'Pdp Update Requests') {
      browserHistory.push({ pathname: "/admin/pdp-update", state: { tabState: "Pdp Update Requests" } });
    } else if (value === 'Plant Update Requests'){
      browserHistory.push({ pathname: "/admin/tse-requests", state: { tabState: "Plant Update Requests" } });
    } else if(value==='Rush Order Requests'){
      browserHistory.push({ pathname: "/admin/rush-order-requests", state: { tabState: "Rush Order Requests" } });
    } else if(value === 'PDP Unlock Requests'){
        browserHistory.push({ pathname: "/admin/pdp-unlock-requests", state: { tabState: "PDP Unlock Requests" } });
    }

    setShowSearch('');
    debouncedSearch('');
    setSelectedStatus('ALL');
  }

  const selectAllSdr = (e) => {
    if (e.target.checked) {
      setExportedList([...sdList]);
    } else {
      setExportedList([]);
    }
  };
  const checkExisting = (item) => {
    let itemExist = false;
    let filteredArr = exportedList.filter(i => i.sd_number === item.sd_number);
    if (filteredArr.length > 0) {
      itemExist = true;
    }
    return itemExist;
  };
  const exportExcelHandler = (e, item) => {
    if (e.target.checked) {
      setExportedList(exportedList.concat(item))
    } else {
      setExportedList(exportedList.filter((exportItem) => exportItem.sd_number !== item.sd_number))
    }
  };
  const onCheckReset = () => {
    setExportedList([]);
  };

  return (
    <>
      <div className="admin-dashboard-wrapper">
        <div className="admin-dashboard-block">
          <div className="sdr-dashboard-head">
            <h2>Service Delivery Requests</h2>
            {/*   <div className='heading'>Service Delivery Requests</div> */}
            <div className='header-btns-filters'>
              <div className="sdr-dashboard-search">
                <input type="text" className="search-fld"
                  placeholder="Search by SDR No./ DB Name/ DB Code/ Plant Code/ Location"
                  value={showSearch} onChange={(e) => { onSearch(e) }} />
                <div onClick={resetPage} className="search-close"><CloseCircleOutlined /></div>
              </div>
              <div className='sdr-status-filter'>
                <Select
                  showSearch
                  style={{ fontSize: '13px' }}
                  className='width120px'
                  placeholder="Select sdr status"
                  defaultValue={'ALL'}
                  optionFilterProp="children"
                  onChange={statusChangeHandler}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={sdrStatus}
                />
              </div>

            </div>
          </div>
          <div style={{ display: 'flex' }}>
            <div className="req-tabs">
              {hasViewPermission(pages.SHR) && <button id="salesHierarchy" className={`tablink`} onClick={() => { tabFunction('Sales Hierarchy Requests') }}>Sales Hierarchy</button>}
              {hasViewPermission(pages.PDP_REQUESTS) && <button id="pdpUpdate" className={`tablink`} onClick={() => { tabFunction('Pdp Update Requests') }}>PDP Update</button>}
              {hasViewPermission(pages.PDP_UNLOCK) && <button id="pdpUnlock" className={`tablink`} onClick={() => { tabFunction('PDP Unlock Requests') }}>PDP Unlock</button>}
              {hasViewPermission(pages.PLANT_REQUEST) && <button id="plantUpdate" className={`tablink`} onClick={() => { tabFunction('Plant Update Requests') }}>Plant Update</button>}
              <button id="ServiceDelivery" className={`tablink active`} >Service Delivery</button>
              {hasViewPermission(pages.RO_REQUESTS) && <button id="rushOrder" className={`tablink`} onClick={() => { tabFunction('Rush Order Requests') }}>Rush Order</button>}
            </div>

            <div className='header-block-right'>
              <div className='hbr-item1'>
                <div className='dot-pending'></div> <div style={{ marginRight: '4px' }}>Pending</div>
                <div className='dot-closed'></div> <div style={{ marginRight: '4px' }}>Closed</div>
              </div>
              {hasViewPermission(pages.SDR, features.VIEW_RAISE) &&
                <div className='hbr-item2'>
                  <button
                    type="submit" onClick={showModal}
                    className="add-btn">
                    Service Delivery Request <img src="/assets/images/plus-icon.svg" alt="" />
                  </button>
                </div>}
            </div>
          </div>



          <div className="admin-dashboard-table">
            <Loader>
              <div className='requests-table-outer'>
                <table>
                  <thead>
                    <tr>
                      <th className='width3'>
                        {
                          sdList && sdList.length > 0 &&
                          <input id={'checkbox-header'} onChange={(e) => { selectAllSdr(e) }} type="checkbox" />
                        }
                      </th>
                      <th className='width10'>SD No.</th>
                      <th className='width8' style={{ textAlign: 'center' }}>Requested Date</th>
                      <th className='width15' style={{ textAlign: 'center' }}>Material</th>
                      <th className='width5' style={{ textAlign: 'center' }}>SO No.</th>
                      <th className='width15' style={{ textAlign: 'center' }}>Distributor Name</th>
                      <th className='width10' style={{ textAlign: 'center' }}>Reason</th>
                      <th className='width8' style={{ textAlign: 'center' }}>Response Date</th>
                      <th className='width5' style={{ textAlign: 'center' }}>Plant Code</th>
                      <th className='action-title width3' style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sdList.map((item, index) => {
                      const itemExisting = checkExisting(item);
                      return (
                        <tr style={{ backgroundColor: item.status === 'CLOSE' ? "#adefc0" : "rgb(242, 216, 168)" }}>
                          <td style={{ width: "5px" }}>
                            <label htmlFor={index}>
                              <input id={index} type="checkbox" checked={itemExisting} onChange={(event) => exportExcelHandler(event, item)} />
                              <span className="checkmark-box"></span>
                            </label>
                          </td>
                          <td>{item.sd_number}</td>
                          <td style={{ textAlign: 'center' }}>{Util.formatDate(item.sd_request_date)}, {Util.formatTime(item.sd_request_date)}</td>
                          <td style={{ textAlign: 'center' }}>{item.material_description}</td>
                          <td style={{ textAlign: 'center' }}>{item.so_number}</td>
                          <td style={{ textAlign: 'center' }}>{item.name}({item.distributor_id}) </td>
                          <td style={{ textAlign: 'center' }}>{item.req_reason}</td>
                          <td style={{ textAlign: 'center' }}>
                            {item.sd_response_date ? <>{Util.formatDate(item.sd_response_date)}, {Util.formatTime(item.sd_response_date)}</> : '-'}
                          </td>
                          <td style={{ textAlign: 'center' }}><p style={{ margin: "0" }}>{item.plant_code}</p><p style={{ margin: "0" }}>{item.location}</p></td>
                          <td className='admin-ations' style={{ textAlign: 'center' }}>
                            <div className='action-btns'>
                              {hasRespondPermission(pages.SDR) &&
                                <button disabled={item.status === 'CLOSE'}
                                  className="info-icon" onClick={() => { showEditRequestModal(item.sd_number) }}>
                                  <Tooltip placement="bottom"
                                    title={item.status === 'OPEN' ? 'Edit' : ''} ><FormOutlined /></Tooltip>
                                </button>
                              }

                              <button
                                className="info-icon" value={item.sd_number} onClick={showModalDetails}>
                                <Tooltip placement="bottom"
                                  title={item.status === 'CLOSE' ? 'View' : ''} ><EyeOutlined /></Tooltip>
                              </button>

                            </div>
                          </td>
                        </tr>
                      )

                    })}
                    {sdList.length === 0 &&
                      <tr style={{ textAlign: 'center' }}>
                        <td colSpan="10">No request available</td>
                      </tr>}
                  </tbody>
                </table>
              </div>
            </Loader>
          </div>
          <div className="btn-download" style={{ width: "100%", margin: "10px 0" }}>
            {(exportedList && exportedList.length <= 0) ?
              <button disabled>Download</button>
              : <ExportSdrToExcel sdrData={exportedList} onCancel={onCheckReset} />
            }
          </div>

          <Panigantion
            data={sdList ? sdList : []}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            itemsCount={sdList && sdrListCount}
            setModifiedData={onChangePage}
            pageNo={pageNo}
          />
        </div>
      </div>

      {/* New SD Request */}
      <Modal title="Connect with service delivery" style={{ top: 20 }}
        visible={!!isModalOpen}
        onCancel={handleCancel} footer={null}
        wrapClassName='comment-modal'>
        <form>

          <div className="comment-fld">
            <label>DB Code</label>
            <div>
              <Select
                showSearch
                optionFilterProp="children"
                options={dbCodes.map(c => ({ value: c.id, label: c.id }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').includes(input)
                }
                value={selectedDBCode}
                defaultValue={selectedDBCode}
                onChange={value => handleDBCodeChange(value)} />
            </div>
          </div>
          <br />

          <div className="comment-fld">
            <label>SO Number</label>
            <div>
              <Select
                disabled={selectedDBCode === defaultValues.selectedDBCode}
                showSearch
                optionFilterProp="children"
                options={orderList.map(n => ({ value: n.so_number, label: n.so_number }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').includes(input)
                }
                value={selectedSONo} defaultValue={selectedSONo}
                onChange={(value) => handleSONoChange(value)} />
            </div>
          </div>
          <br />

          <div className="comment-fld">
            <label>Material</label>
            <div>
              <Select
                disabled={selectedDBCode === defaultValues.selectedDBCode || selectedSONo === defaultValues.selectedSONo}
                showSearch
                optionFilterProp="children"
                options={materialList.map(m => ({ value: m.Material_Description, label: m.Material_Description }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                value={selectedMaterialName}
                defaultValue={selectedMaterialName}
                onChange={(value) => handleMaterialChange(value)} />
            </div>
          </div>
          <br />

          <div className="comment-fld">
            <label>Plant Code</label>
            <div>
              <Input
                disabled={selectedDBCode === defaultValues.selectedDBCode || selectedSONo === defaultValues.selectedSONo || selectedMaterialName === defaultValues.selectedMaterialName}
                readOnly value={selectedPlantCode} />

            </div>
          </div>
          <br />


          <div className="comment-fld">
            <label>Reason</label>
            <div>
              <Select
                disabled={selectedDBCode === defaultValues.selectedDBCode || selectedSONo === defaultValues.selectedSONo || selectedMaterialName === defaultValues.selectedMaterialName}
                showSearch
                optionFilterProp="children"
                options={
                  serviceLevelCategoryRequest.map(cat => ({ value: cat.id, label: cat.label }))
                }
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                defaultValue={selectedCatgeory}
                value={selectedCatgeory}
                onChange={(value) => handleCategoryChange(value)} />

            </div>
          </div>
          <br />


          <div className="comment-fld">
            <label>Comments</label>
            <div>
              <textarea
                disabled={selectedDBCode === defaultValues.selectedDBCode || selectedSONo === defaultValues.selectedSONo || selectedMaterialName === defaultValues.selectedMaterialName || selectedCatgeory === defaultValues.selectedCatgeory}
                value={selectedCatgeoryDesc}
                maxLength={255}
                onChange={event => handleCommentChange(event.target.value)}

              />
            </div>
          </div>
          <div className="comment-btn">
            <button
              type="button"
              className="sbmt-btn"
              disabled={!hasRaisePermission(pages.SDR) || selectedDBCode === defaultValues.selectedDBCode || selectedSONo === defaultValues.selectedSONo || selectedMaterialName === defaultValues.selectedMaterialName || selectedPlantCode === defaultValues.selectedPlantCode || selectedCatgeory === defaultValues.selectedCatgeory || selectedCatgeoryDesc === defaultValues.selectedCatgeoryDesc}
              onClick={handleSubmit}>
              Submit
            </button>
          </div>
        </form>
      </Modal>

      {/* On submiting pop up */}
      <Modal title="Submitted successfully"
        visible={!!isSuccessModalOpen}
        onCancel={handleSuccessModalCancel} footer={null}
        wrapClassName='comment-modal'>

        <div className="basic-details">
          <h4> <span style={{ color: 'green' }}>{sdrNo}</span> has been successfully submitted.</h4>
          <label>Request Summary</label>
          <div className="alert-success-info">
            <div className="form-wrapper">
              <label>Material :</label>
              <span>{selectedMaterialName} </span>
            </div>
            <div className="form-wrapper">
              <label>SO Number :</label>
              <span>{selectedSONo}</span>
            </div>
            <div className="form-wrapper">
              <label>Distributor Name :</label>
              <span>{selectedDBName}</span>
            </div>

            <div className="form-wrapper mb-0">
              <label>Service Delivery Number : </label>
              <span>{sdrNo}</span>
            </div>
          </div>
          <div className="comment-btn">
            <Link to="/admin/cfa-so-requests">
              <button type="button" className="sbmt-btn" onClick={handleSuccessModalCancel}>
                Close
              </button>
            </Link>
          </div>
        </div>
      </Modal>

      {/* view request */}
      <Modal title="Request Response" visible={!!isDetailsModalVisible}
        onCancel={hideModal} footer={null} wrapClassName='comment-modal'>
        <div className="basic-details">
          <div className="form-wrapper">
            <label >Material :</label>
            <span>{user.material_description} </span>
          </div>
          <div className="form-wrapper">
            <label>SO Number :</label>
            <span>{user.so_number} </span>
          </div>
          <div className="form-wrapper">
            <label>Distributor Name :</label>
            <span>{user.name} ({user.distributor_id})</span>
          </div>
          <div className="form-wrapper">
            <label>Service Delivery Number :</label>
            <span>{user.sd_number}</span>
          </div>
          <div className="form-wrapper">
            <label>SD Reason :</label>
            <span>{user.req_reason} </span>
          </div>
          <div className="form-wrapper">
            <label>SD Comments :</label>
            <span> {user.sd_req_comments} </span>
          </div>
          <div className="form-wrapper">
            <label>Plant Code :</label>
            <span> {`${user.plant_code} (${user.location})`} </span>
          </div>
          <div className="form-wrapper">
            <label>CFA Email ID :</label>
            <span>{user.cfa_email} </span>
          </div>
          <div className="form-wrapper">
            <label>CFA Contact Person :</label>
            <span>{user.cfa_name} </span>
          </div>
          <div className="form-wrapper">
            <label>CFA Contact No. :</label>
            <span>{user.cfa_contact} </span>
          </div>
          <div className="form-wrapper">
            <label>CFA Reason :</label>
            <span>{user.cfa_res_reason} </span>
          </div>
          <div className="form-wrapper">
            <label>CFA Comments :</label>
            <span> {user.sd_res_comments} </span>
          </div>
          <div className="form-wrapper">
            <label>Response Date :</label>
            {user.sd_response_date != null &&
              <>
                <span> {Util.formatDate(user.sd_response_date)}, {Util.formatTime(user.sd_response_date)} </span>
              </>
            }
          </div>
          <div className="form-wrapper">
            <label>Status</label>
            <span
              className={"badges " +
                (user.status == 'OPEN' ? 'bg-pending' : '' ||
                  user.status == 'CLOSE' ? 'bg-approved' : '')
              }
            >{user.status === 'OPEN' ? 'PENDING' : (user.status === 'CLOSE' ? 'CLOSED' : '')}</span>

          </div>
        </div>
      </Modal>

      {/* edit request modal */}
      <Modal title="Request Response" visible={!!isEditRequestModalVisible}
        onCancel={hideEditRequestModal} footer={null} wrapClassName='comment-modal'>
        <form onSubmit={(e) => { e.preventDefault() }}>
          <div className="comment-fld">
            <label>Please Select Reason</label>
            <div>
              <Select placeholder="Select" value={labelId} onChange={(value) => { setlabelId(value) }}>
                {
                  serviceLevelCategoryResponse.map((data, i) => {
                    return (
                      <Option key={i} value={data.id} >{data.label}</Option>
                    )
                  })}
              </Select>
            </div>
          </div>

          <div className="comment-fld">
            <label>Comments</label>
            <div>
              <textarea
                id="comment"
                name="comment"
                value={inputApprovedVal}
                onChange={e => setInputApprovedVal(e.target.value)}
                // onChange={e =>validateUpdateForm(e.target.value)}
                placeholder="Enter comments here"
              />
            </div>
          </div>
          <div className="modal-btn" >
            <button
              type="submit"
              className="border-btn"
              disabled={!inputApprovedVal || !labelId}
              onClick={() => updateFunc("OPEN")}>
              Respond
            </button>
            <button
              type="submit"
              className="sbmt-btn"
              disabled={!inputApprovedVal || !labelId}
              onClick={() => updateFunc("CLOSE")}>
              Respond & Close
            </button>

          </div>
        </form>
      </Modal>

    </>
  )
}
const mapStateToProps = (state) => {
  return {
    sdrList: state.sdr.get('sdr_list').get('data'),
    categories: state.sdr.get('categories'),
    updated_cfa_details: state.sdr.get('updated_cfa_details'),
    sso_user_details: state.admin.get('sso_user_details'),
    distributor_list: state.admin.get('distributor_list'),
    order_list: state.dashboard.get('order_list'),
    sdrListCount: state.sdr.get('sdr_list').get('totalCount'),
    add_sdr_response: state.sdr.get('add_sdr'),

  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    getDistributorList: ({ offset, limit, search, status }) => dispatch(AdminAction.getDistributorList({ offset, limit, search, status })),
    getSdrList: ({ offset, limit, search, status }) => { dispatch(SDAction.getSDList({ offset, limit, search, status })); },
    getCfaDataAdmin: (type) => dispatch(DBAction.getCfaDataAdmin(type)),
    updateCFA: (data) => dispatch(SDAction.updateCFA(data)),
    fetchServiceLevelCategory: (type) => dispatch(DBAction.fetchServiceLevelCategory(type)),
    getOrderList: (data) => dispatch(DashAction.getOrderList(data)),
    listSODetails: (soNumber, login_id) => dispatch(DashAction.listSODetails(soNumber, login_id)),
    addSDRAdmin: (data) => dispatch(SDAction.addSDRAdmin(data)),
  }
}


export default connect(mapStateToProps, mapDispatchToProps)(ServiceDeliveryRequests)
