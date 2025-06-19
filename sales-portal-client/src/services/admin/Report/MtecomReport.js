import React, { useEffect, useState, useCallback } from 'react';
import { connect } from 'react-redux';
import { DatePicker, Space, Select } from 'antd';
import moment from 'moment';
import '../Report/Report.css';
import * as Action from '../actions/adminAction';
import * as DBAction from '../../distributor/action';
import Auth from '../../../util/middleware/auth';
import Util from '../../../util/helper';
import {
  pages,
  hasViewPermission,
} from '../../../persona/distributorHeader';
import { MT_ECOM_CUSTOMER } from '../../../config/constant';
import { saveAs } from 'file-saver';
import XLSX from 'xlsx';

const { Option } = Select;
const { RangePicker } = DatePicker;
let currentDate = new Date();
currentDate = String(moment(currentDate).format('YYYY-MM-DD'));
let previousDate = String(
  moment().subtract(1, 'days').format('YYYY-MM-DD'),
);

let MtecomReport = (props) => {
  const browserHistory = props.history;
  const [isLoadingDownload, setIsLoadingDownload] = useState(false);
  const [mtEcomReportDateRange, setMtEcomReportDateRange] = useState([
    previousDate,
    currentDate,
  ]);
  const {
    downloadMtEcomReports,
    sso_user_details,
    getSSODetails,
    exportPOData,
  } = props;
  const ssoRole =
    sso_user_details.data &&
    sso_user_details.data.length &&
    sso_user_details.data[0].roles;
  const [selectedCustomerName, setSelectedCustomerName] = useState(
    MT_ECOM_CUSTOMER[0],
  );
  const [customerName, setCustomerName] = useState('');
  const [customerNameList, setCustomerNameList] = useState([]);
  const [asnDate, setAsnDate] = useState('');
  const [soNumber, setSoNumber] = useState([]);
  const [soNumberList, setSoNumberList] = useState([]);

  let data = {};
  var adminRole = Auth.getAdminRole();

  Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
  };

  const handleDateChange = (dateArray, type) => {
    let mtEcomSelectedDate = [previousDate, currentDate];
    if (dateArray[0]) {
      mtEcomSelectedDate[0] = dateArray[0];
    }
    if (dateArray[1]) {
      mtEcomSelectedDate[1] = dateArray[1];
    }
    if (type === 'mt-ecom-report') {
      setMtEcomReportDateRange(mtEcomSelectedDate);
    }
  };

  useEffect(() => {
    if (!sso_user_details || !Object.keys(sso_user_details).length) {
      const adminAccessDetails = Auth.getAdminAccessDetails();
      let sso_detail = {};
      if (
        adminAccessDetails &&
        Object.keys(JSON.parse(adminAccessDetails)).length > 0
      ) {
        sso_detail = JSON.parse(adminAccessDetails);
      }
      const emailId =
        sso_detail &&
        sso_detail.username &&
        sso_detail.username.replace(
          process.env.REACT_APP_COGNITO_IDP_NAME,
          '',
        );
      emailId && getSSODetails(emailId, props.history);
    }
  }, [sso_user_details]);

  useEffect(() => {
    if (ssoRole && !hasViewPermission(pages.MT_ECOM_REPORTS)) {
      browserHistory.push('/admin/mt-ecom-dashboard');
    }
  }, [ssoRole || adminRole]);

  const asnDownload = async () => {
    data = {
      from_date: asnDate[0],
      to_date: asnDate[1],
      customer: customerName,
      so_number: soNumber,
    };
    const response = await props.mtEcomASNDownload(data);
    setCustomerNameList(response?.data?.customer);
    if (response?.data?.customer && response?.data?.customer.length) {
      setCustomerNameList(response?.data?.customer);
    }
    if (
      response?.data?.so_number &&
      response?.data?.so_number.length
    ) {
      setSoNumberList(response?.data?.so_number);
    }
    return response;
  };

  useEffect(() => {
    asnDownload();
  }, [asnDate]);
  useEffect(() => {
    if (customerName) {
      asnDownload();
    }
  }, [customerName]);

  const downloadData = async (loaderOff) => {
    data = {
      from_date: mtEcomReportDateRange[0] || previousDate,
      to_date: mtEcomReportDateRange[1] || currentDate,
    };

    setIsLoadingDownload(true);
    const responseData = await downloadMtEcomReports({ data });
    if (!responseData.length) {
      Util.notificationSender(
        'Error',
        'No data available for the selected date range.',
        false,
      );
    } else {
      const blob = new Blob([responseData], {
        type: 'application/xlsx',
      });
      saveAs(
        blob,
        `MT-ECOM-Reports_${data.from_date}_${data.to_date}.csv`,
      );
      Util.notificationSender(
        'Success',
        'Report downloaded successfully',
        true,
      );
    }
    const Timeout = setTimeout(() => {
      setIsLoadingDownload(loaderOff);
    }, 1000);

    return () => {
      clearTimeout(Timeout);
    };
  };

  const handleCustomerChange = (value) => {
    setSelectedCustomerName(value);
  };
  const handleASNChange = async (value, key) => {
    if (key === 'customerName') {
      setCustomerName(value);
      setSoNumber([]);
      setSoNumberList([]);
      // setAsnDate([]);
    }
    if (key === 'date') {
      if (value[0] && value[1]) {
        setAsnDate(value);
        // asnDownload();
      }
    }
    if (key === 'so_number') {
      if (value.includes('ALL')) {
        const allSONumbers = soNumberList.map(
          (item) => item.so_number,
        );
        setSoNumber(allSONumbers);
      } else {
        setSoNumber(value);
      }
    }
    if (key === 'download') {
      const response = await asnDownload();
      if (response?.data?.asn_data?.length) {
        try {
          const workbook = XLSX.utils.book_new();
          const headers = [
            'PO Number',
            'Invoice Number',
            'Invoice Date',
            'Customer Article Code',
            'SKU Description',
            'Quantity in CV',
            'SAP Caselot',
            'Quantity in Units',
            'Invoice MRP',
            'Value include tax',
            'Delivery Date',
            'Reference No',
          ];
          response?.data?.asn_data?.forEach((soGroup) => {
            const orderedData = soGroup.items.map((item) => {
              const orderedItem = {};
              headers.forEach((header) => {
                orderedItem[header] = item[header];
              });
              return orderedItem;
            });
            const worksheet = XLSX.utils.json_to_sheet(orderedData, {
              header: headers,
              skipHeader: false,
            });
            const headerRange = XLSX.utils.decode_range(
              worksheet['!ref'],
            );
            for (
              let col = headerRange.s.c;
              col <= headerRange.e.c;
              col++
            ) {
              const cellRef = XLSX.utils.encode_cell({
                r: 0,
                c: col,
              });
              worksheet[cellRef].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: 'CCCCCC' } },
              };
            }
            const columnWidths = headers.map((header) => ({
              wch: Math.max(header.length, 15),
            }));
            worksheet['!cols'] = columnWidths;

            XLSX.utils.book_append_sheet(
              workbook,
              worksheet,
              soGroup.so_number.substring(0, 31),
            );
          });

          const excelBuffer = XLSX.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
            compression: true,
          });

          const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });

          saveAs(blob, `ASN_${asnDate[0]}_${asnDate[1]}.xlsx`);

          Util.notificationSender(
            'Success',
            'ASN Downloaded Successfully',
            true,
          );
        } catch (error) {
          console.error('Excel generation error:', error);
          Util.notificationSender(
            'Error',
            'Failed to generate Excel file',
            false,
          );
        }
      } else {
        Util.notificationSender(
          'Error',
          'No ASN data available for the selected date range.',
          false,
        );
      }
    }
  };
  const exportData = async () => {
    let payload = {
      customer_name: selectedCustomerName,
    };
    // setIsLoadingDownload(true)
    const responseData = await exportPOData(payload);
    if (!responseData.length) {
      Util.notificationSender('Error', 'No data available.', false);
    } else {
      Util.notificationSender(
        'Success',
        'PO Summary Exported successfully',
        true,
      );
      await Util.downloadExcelFile(
        responseData,
        'MT-ECOM-PO-Data ' + selectedCustomerName,
      );
    }
  };

  return (
    <>
      <div className="log-wrapper">
        <>
          <h1>Reports</h1>
          {hasViewPermission(pages.MT_ECOM_REPORTS) && (
            <div className="detail-log">
              <div className="header-container">
                <div className="card-row-col">
                  <h2>MT ECOM Report</h2>
                </div>
              </div>
              <div className="session-log-table">
                {/* <Loader> */}
                <div
                  className="card mb-3"
                  style={{ marginLeft: '10px' }}
                >
                  <div className="card-body">
                    <table style={{ width: '100%' }}>
                      <tbody>
                        <tr>
                          <td colSpan="2">
                            <div className="session-date-picker">
                              <Space direction="vertical" size={12}>
                                <RangePicker
                                  defaultValue={[
                                    moment().subtract(1, 'days'),
                                    moment(),
                                  ]}
                                  format="YYYY-MM-DD"
                                  onChange={(value, ds) =>
                                    handleDateChange(
                                      ds,
                                      'mt-ecom-report',
                                    )
                                  }
                                  style={{ fontWeight: '600' }}
                                  disabledDate={(current) => {
                                    const oneMonthAgo =
                                      moment().subtract(1, 'month');
                                    const today =
                                      moment().endOf('day');
                                    return (
                                      current &&
                                      (current < oneMonthAgo ||
                                        current > today)
                                    );
                                  }}
                                />
                              </Space>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            <div className="mt-downloadbtn">
                              <button onClick={() => downloadData()}>
                                Download
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* </Loader> */}
              </div>
            </div>
          )}
        </>
        <>
          {hasViewPermission(pages.MT_ECOM_REPORTS) && (
            <div className="detail-log">
              <div className="header-container">
                <div className="card-row-col">
                  <h2>MT Ecom PO Summary Report</h2>
                </div>
              </div>
              <div className="session-log-table">
                {/* <Loader> */}
                <div
                  className="card mb-3"
                  style={{ marginLeft: '10px' }}
                >
                  <div className="card-body">
                    <table style={{ width: '100%' }}>
                      <tbody>
                        <tr>
                          <td colSpan="2">
                            <div className="session-date-picker">
                              <Space direction="vertical" size={12}>
                                <Select
                                  showSearch
                                  allowClear
                                  className="select-customer"
                                  placeholder="Select Customer Name"
                                  mandatory={true}
                                  optionFilterProp="children"
                                  onChange={(value) =>
                                    handleCustomerChange(value)
                                  }
                                  value={
                                    selectedCustomerName || undefined
                                  }
                                >
                                  {MT_ECOM_CUSTOMER?.map((option) => (
                                    <Option
                                      key={option}
                                      value={option}
                                    >
                                      {option}
                                    </Option>
                                  ))}
                                </Select>
                              </Space>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2">
                            <div className="mt-downloadbtn">
                              <button
                                onClick={() => exportData()}
                                disabled={
                                  selectedCustomerName ? false : true
                                }
                              >
                                Export
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* </Loader> */}
              </div>
            </div>
          )}
        </>
        <>
          {hasViewPermission(pages.MT_ECOM_REPORTS) && (
            <div className="detail-log">
              <div className="header-container">
                <div className="card-row-col">
                  <h2>ASN Download</h2>
                </div>
              </div>
              <div className="session-log-table">
                {/* <Loader> */}
                <div
                  className="card mb-3"
                  style={{ marginLeft: '10px' }}
                >
                  <div className="card-body">
                    <table style={{ width: '100%' }}>
                      <tbody>
                        <tr>
                          <td colSpan="3">
                            <div className="asn-download-select">
                              <label>Customer Name</label>
                              <span className="mandatory-mark">
                                *&nbsp;
                              </span>
                              <br />
                              <Space direction="vertical" size={12}>
                                <Select
                                  showSearch
                                  allowClear
                                  className="select-asn-customer"
                                  placeholder="Select Customer Name"
                                  mandatory={true}
                                  optionFilterProp="children"
                                  onChange={(value) =>
                                    handleASNChange(
                                      value,
                                      'customerName',
                                    )
                                  }
                                  value={customerName || undefined}
                                >
                                  {customerNameList?.map((option) => (
                                    <Option
                                      key={option?.customer}
                                      value={option?.customer}
                                    >
                                      {option?.customer}
                                    </Option>
                                  ))}
                                </Select>
                              </Space>
                            </div>
                          </td>
                          <td colSpan="3">
                            <div className="asn-date-picker">
                              <label>Invoice Date</label>
                              <span className="mandatory-mark">
                                *&nbsp;
                              </span>
                              <br />
                              <Space direction="vertical" size={12}>
                                <RangePicker
                                  format="YYYY-MM-DD"
                                  onChange={(value, ds) =>
                                    handleASNChange(ds, 'date')
                                  }
                                  style={{ fontWeight: '600' }}
                                />
                              </Space>
                            </div>
                          </td>
                          <td colSpan="3">
                            <div className="asn-download-select">
                              <label>SO Number</label>
                              <span className="mandatory-mark">
                                *&nbsp;
                              </span>
                              <br />
                              <Space direction="vertical" size={12}>
                                <Select
                                  mode="multiple"
                                  allowClear
                                  showSearch
                                  maxTagCount={1}
                                  className="select-asn-customer"
                                  placeholder="Select SO Number"
                                  mandatory={true}
                                  optionFilterProp="children"
                                  value={soNumber || undefined}
                                  onChange={(value) =>
                                    handleASNChange(
                                      value,
                                      'so_number',
                                    )
                                  }
                                >
                                  {soNumberList?.length > 0 && (
                                    <Option key="ALL" value="ALL">
                                      Select All
                                    </Option>
                                  )}
                                  {soNumberList?.map((option) => (
                                    <Option
                                      key={option?.so_number}
                                      value={option?.so_number}
                                    >
                                      {option?.so_number}
                                    </Option>
                                  ))}
                                </Select>
                              </Space>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-downloadbtn asn-btn">
                      <button
                        onClick={() =>
                          handleASNChange('', 'download')
                        }
                        disabled={
                          customerName &&
                          asnDate.length &&
                          soNumber.length
                            ? false
                            : true
                        }
                      >
                        Download ASN
                      </button>
                    </div>
                  </div>
                </div>
                {/* </Loader> */}
              </div>
            </div>
          )}
        </>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    sso_user_details: state.admin.get('sso_user_details'),
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    getZoneWiseOrders: (data) =>
      dispatch(Action.getZoneWiseOrders(data)),
    getCategoryWisePortalIssues: (data) =>
      dispatch(Action.getCategoryWisePortalIssues(data)),
    getSSODetails: (emailId, history) =>
      dispatch(Action.getSSODetails(emailId, history)),
    getSdrReportData: (data) =>
      dispatch(Action.getSdrReportData(data)),
    getSdResponseReportData: (data) =>
      dispatch(Action.getSdResponseReportData(data)),
    fetchServiceLevelCategory: (type) =>
      dispatch(DBAction.fetchServiceLevelCategory(type)),
    getActiveSessionReport: (data) =>
      dispatch(Action.getActiveSessionReport(data)),
    downloadMtEcomReports: (dataDownload) =>
      dispatch(Action.downloadMtEcomReports(dataDownload)),
    exportPOData: (data) => dispatch(Action.exportPOData(data)),
    mtEcomASNDownload: (data) =>
      dispatch(Action.mtEcomASNDownload(data)),
  };
};

const ConnectReport = connect(
  mapStateToProps,
  mapDispatchToProps,
)(MtecomReport);

export default ConnectReport;
